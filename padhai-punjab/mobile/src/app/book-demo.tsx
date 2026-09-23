import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { DEMO_TIME_SLOTS, isIndianMobile } from '../../../shared/constants.js';
import {
  Avatar, Button, Chip, ChipGroup, ErrorState, Field, FieldError, FieldLabel, Gap, Loading, Notice, Row, Screen, Select, T,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import type { Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { useForm } from '@/lib/useForm';

export default function BookDemo() {
  const { tutorId, mode: modeParam } = useLocalSearchParams<{ tutorId: string; mode?: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, retry } = useApi<{ tutor: Tutor }>(`/tutors/${tutorId}`, { refetchOnFocus: false });
  const f = useForm({
    parentName: user?.name ?? '', phone: user?.phone ?? '', childName: '', cls: null as number | null,
    subject: null as string | null, mode: null as 'home' | 'online' | null, area: '', timeSlot: null as string | null,
  });
  const t = data?.tutor;

  useEffect(() => {
    if (!t) return;
    const preferred = modeParam === 'home' && t.homeAvailable ? 'home' : modeParam === 'online' && t.offersOnline ? 'online' : null;
    f.set('mode', preferred ?? (t.homeAvailable && !t.offersOnline ? 'home' : !t.homeAvailable && t.offersOnline ? 'online' : null));
    if (t.schoolSubjects.length === 1) f.set('subject', t.schoolSubjects[0]);
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Screen edges={[]}><Loading /></Screen>;
  if (error || !t) return <Screen edges={[]}><ErrorState message={error ?? 'Tutor not found'} onRetry={retry} /></Screen>;
  const classes = t.classFrom != null ? Array.from({ length: (t.classTo ?? t.classFrom) - t.classFrom + 1 }, (_, i) => t.classFrom! + i) : [];
  const v = f.values;

  async function submit() {
    const ok = f.validate([
      ['parentName', v.parentName.trim().length < 2, 'Please enter your name.'],
      ['phone', !isIndianMobile(v.phone), 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'],
      ['childName', v.childName.trim().length < 2, "Please enter your child's name."],
      ['cls', v.cls == null, "Choose your child's class."],
      ['subject', !v.subject, 'Choose a subject.'],
      ['mode', !v.mode, 'Choose home tuition or online.'],
      ['area', v.mode === 'home' && v.area.trim().length < 2, 'Enter your area or locality so the tutor knows where to come.'],
      ['timeSlot', !v.timeSlot, 'Choose a preferred time.'],
    ]);
    if (!ok) return toast.show('Please fix the highlighted fields.', 'error');
    const res = await f.submit(() => api<{ message: string }>('/parent/demo-requests', { body: { tutorId: t!.id, ...v } }));
    if (res.ok) {
      toast.show((res.data as { message: string }).message);
      router.back();
    } else toast.show(res.message, 'error');
  }

  return (
    <Screen edges={['bottom']}>
      <Row gap={12} style={{ marginBottom: 16 }}>
        <Avatar name={t.name} url={t.photoUrl} size={52} />
        <View style={{ flex: 1 }}>
          <T v="h3">{t.name}</T>
          <T v="small" tone="muted">The first class is a free demo. No payment now.</T>
        </View>
      </Row>

      <Field label="Your name" value={v.parentName} onChangeText={(x) => f.set('parentName', x)} error={f.errors.parentName} autoComplete="name" maxLength={60} />
      <Field label="Your mobile number" value={v.phone} onChangeText={(x) => f.set('phone', x.replace(/\D/g, '').slice(0, 10))} error={f.errors.phone} keyboardType="phone-pad" maxLength={10} hint="Shared with the tutor only after they accept." />
      <Field label="Child's name" value={v.childName} onChangeText={(x) => f.set('childName', x)} error={f.errors.childName} maxLength={60} />
      <Select label="Class" value={v.cls} options={classes} format={(n) => `Class ${n}`} onChange={(x) => f.set('cls', x)} error={f.errors.cls} />

      <FieldLabel>Subject</FieldLabel>
      <ChipGroup options={t.schoolSubjects} value={v.subject} onChange={(x: string) => f.set('subject', x)} />
      <FieldError text={f.errors.subject} />
      <Gap h={16} />

      <FieldLabel>Home or online</FieldLabel>
      <Row wrap gap={8}>
        <Chip label="Home tuition" icon="home-outline" selected={v.mode === 'home'} onPress={t.homeAvailable ? () => f.set('mode', 'home') : undefined} />
        <Chip label="Online" icon="laptop-outline" selected={v.mode === 'online'} onPress={t.offersOnline ? () => f.set('mode', 'online') : undefined} />
      </Row>
      {!t.homeAvailable && <T v="caption" tone="muted" style={{ marginTop: 6 }}>{t.homeUnavailableReason}</T>}
      {!t.offersOnline && <T v="caption" tone="muted" style={{ marginTop: 6 }}>This tutor teaches at home only.</T>}
      <FieldError text={f.errors.mode} />
      <Gap h={16} />

      {v.mode === 'home' && (
        <>
          <Field label="Your area or locality" value={v.area} onChangeText={(x) => f.set('area', x)} error={f.errors.area} placeholder="e.g. Model Town" maxLength={80}
            hint={`${t.firstName} travels to: ${t.areas.join(', ')}`} style={{ marginBottom: 8 }} />
          <Row wrap gap={8}>{t.areas.map((a) => <Chip key={a} label={a} selected={v.area === a} onPress={() => f.set('area', a)} />)}</Row>
          <Gap h={16} />
          <Notice tone="success" title="Home visit safety">After the tutor accepts, you'll get a 4-digit home visit code. Share it only when the tutor is at your door and matches their photo.</Notice>
          <Gap h={16} />
        </>
      )}

      <FieldLabel>Preferred time</FieldLabel>
      <ChipGroup options={DEMO_TIME_SLOTS} value={v.timeSlot} onChange={(x: string) => f.set('timeSlot', x)} />
      <FieldError text={f.errors.timeSlot} />

      <Gap h={24} />
      <Button title="Send demo request" onPress={submit} loading={f.busy} icon="paper-plane-outline" />
    </Screen>
  );
}
