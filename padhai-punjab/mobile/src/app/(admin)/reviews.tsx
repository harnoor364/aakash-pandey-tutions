import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { ReviewItem } from '@/components/Reviews';
import { TabHeader } from '@/components/TabHeader';
import { Button, ChipGroup, EmptyState, ErrorState, Gap, InfoLine, Loading, Notice, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Review } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Data = {
  reasons: string[];
  reviews: Review[];
  removals: { id: number; reviewId: number; reason: string; adminPhone: string; createdAt: string; snapshot: { rating: number; comment: string } }[];
};

export default function AdminReviews() {
  const { c } = useTheme();
  const toast = useToast();
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<Data>('/admin/reviews');
  const [target, setTarget] = useState<Review | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!target || !reason) return;
    setBusy(true);
    try {
      const res = await api<{ message: string }>(`/admin/reviews/${target.id}/remove`, { body: { reason } });
      toast.show(res.message);
      setTarget(null);
      setReason(null);
      reload();
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="Reviews" subtitle="Remove only for policy violations. Every removal is logged." />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : data && (
        <>
          <Section title="Latest reviews">
            {!data.reviews.length && <EmptyState icon="chatbox-outline" title="No reviews" text="Reviews will appear here." />}
            {data.reviews.map((r) => (
              <View key={r.id}>
                <ReviewItem review={r} showTutor />
                <Button title="Remove for policy violation" small variant="dangerOutline" icon="trash-outline" style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 16 }} onPress={() => setTarget(r)} />
              </View>
            ))}
          </Section>
          <Section title="Removal log">
            {!data.removals.length ? <T tone="muted">No reviews have been removed.</T> : data.removals.map((m) => (
              <InfoLine key={m.id} icon="document-text-outline">
                {prettyDate(m.createdAt)} · review #{m.reviewId} ({m.snapshot.rating}★) · {m.reason} · by +91 {m.adminPhone}
              </InfoLine>
            ))}
          </Section>
        </>
      )}
      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={() => setTarget(null)} accessibilityLabel="Close" />
        <View style={{ position: 'absolute', left: 16, right: 16, top: '15%', backgroundColor: c.bg, borderRadius: 24, padding: 20 }}>
          <T v="h2">Remove this review?</T>
          <T v="small" tone="muted" style={{ marginTop: 4 }}>"{target?.comment}"</T>
          <Gap h={12} />
          <Notice tone="warn">Low ratings are not a reason to remove a review. Choose the policy it breaks:</Notice>
          <Gap h={12} />
          <ChipGroup options={data?.reasons ?? []} value={reason} onChange={setReason} />
          <Gap h={16} />
          <Row gap={10}>
            <Button title="Cancel" variant="secondary" onPress={() => setTarget(null)} style={{ flex: 1 }} />
            <Button title="Remove" variant="danger" onPress={remove} loading={busy} disabled={!reason} style={{ flex: 1 }} />
          </Row>
        </View>
      </Modal>
    </Screen>
  );
}
