import React, { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { REVIEW_MIN_CHARS } from '../../../shared/constants.js';
import {
  Button, Chip, EmptyState, ErrorState, Field, FieldError, FieldLabel, Gap, Loading, Notice, Row, Screen, StarInput, T,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useApi } from '@/lib/useApi';
import { useForm } from '@/lib/useForm';

type Elig = {
  eligible: boolean; needed: number; confirmedClasses: number; levelLabel: string | null; tutorName: string;
  existing: { rating: number; comment: string; recommend: boolean } | null;
};

const HINTS = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'];

export default function WriteReview() {
  const { tutorId } = useLocalSearchParams<{ tutorId: string }>();
  const toast = useToast();
  const { data, loading, error, retry } = useApi<Elig>(`/parent/tutors/${tutorId}/review-eligibility`, { refetchOnFocus: false });
  const f = useForm({ rating: 0, comment: '', recommend: null as boolean | null });

  useEffect(() => {
    if (data?.existing) f.setValues({ rating: data.existing.rating, comment: data.existing.comment, recommend: data.existing.recommend });
  }, [data?.existing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Screen edges={[]}><Loading /></Screen>;
  if (error || !data) return <Screen edges={[]}><ErrorState message={error ?? ''} onRetry={retry} /></Screen>;
  if (!data.eligible) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="lock-closed-outline" title="Review not unlocked yet"
          text={data.needed > 0
            ? `Reviews unlock after 4 classes that the tutor logged and you confirmed. ${data.needed} to go.`
            : 'Only families whose child actually studied with this tutor can leave a review.'}
          action="Go back" onAction={() => router.back()} />
      </Screen>
    );
  }
  const v = f.values;
  const len = v.comment.trim().length;

  async function submit() {
    const ok = f.validate([
      ['rating', v.rating < 1, 'Tap 1 to 5 stars.'],
      ['comment', len < REVIEW_MIN_CHARS, `Please write at least ${REVIEW_MIN_CHARS} characters (now ${len}).`],
      ['recommend', v.recommend == null, 'Please choose Yes or No.'],
    ]);
    if (!ok) return;
    const res = await f.submit(() => api<{ message: string }>(`/parent/tutors/${tutorId}/review`, { method: 'PUT', body: v }));
    if (res.ok) {
      toast.show((res.data as { message: string }).message);
      router.back();
    } else toast.show(res.message, 'error');
  }

  return (
    <Screen edges={['bottom']}>
      <T v="h2">{data.existing ? 'Edit your review of' : 'How was'} {data.tutorName}?</T>
      <Row gap={6} style={{ marginTop: 6 }} wrap>
        <T v="caption" tone="primary">✓ Verified student</T>
        {data.levelLabel && <T v="caption" tone="muted">· {data.levelLabel}</T>}
      </Row>
      <Gap h={18} />
      <FieldLabel>Your rating</FieldLabel>
      <StarInput value={v.rating} onChange={(n) => f.set('rating', n)} />
      {v.rating > 0 && <T v="small" tone="muted">{HINTS[v.rating]}</T>}
      <FieldError text={f.errors.rating} />
      <Gap h={16} />
      <Field label="Your review" value={v.comment} onChangeText={(x) => f.set('comment', x)} multiline maxLength={1000}
        placeholder="What did your child learn? Was the tutor on time, patient and safe?" error={f.errors.comment}
        counter={{ value: len, min: REVIEW_MIN_CHARS, max: 1000 }} />
      <FieldLabel>Would you recommend this tutor?</FieldLabel>
      <Row gap={8}>
        <Chip label="Yes" icon="thumbs-up-outline" selected={v.recommend === true} onPress={() => f.set('recommend', true)} />
        <Chip label="No" icon="thumbs-down-outline" selected={v.recommend === false} onPress={() => f.set('recommend', false)} />
      </Row>
      <FieldError text={f.errors.recommend} />
      <Gap h={20} />
      <Notice tone="info">Be honest and specific. Don't share phone numbers or addresses. Tutors are not allowed to offer discounts or favours for reviews — please report it if they do.</Notice>
      <Gap h={20} />
      <Button title={data.existing ? 'Update review' : 'Post review'} onPress={submit} loading={f.busy} />
    </Screen>
  );
}
