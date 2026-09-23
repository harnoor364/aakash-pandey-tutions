import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { EXAMPLE_TOPICS, SESSION_KINDS, SESSION_LEVELS, SUBJECTS_BY_LEVEL, isIndianMobile } from '../../../shared/constants.js';
import {
  Avatar, Button, Card, Chip, ChipGroup, ErrorState, Field, FieldError, FieldLabel, Gap, Loading, Row, Screen, T,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dayLabel, formatHour, formatRupees } from '@/lib/format';
import { useToast } from '@/lib/toast';
import type { Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { useForm } from '@/lib/useForm';

type Kind = keyof typeof SESSION_KINDS;

function levelsFor(t: Tutor) {
  return SESSION_LEVELS.filter((l) => {
    const subs = (SUBJECTS_BY_LEVEL as Record<string, string[]>)[l];
    if (l === 'College') return t.collegeSubjects.length > 0;
    const n = Number(l.replace('Class ', ''));
    return t.classFrom != null && t.classFrom <= n && n <= (t.classTo ?? 0) && t.schoolSubjects.some((s) => subs.includes(s));
  });
}
function subjectsFor(t: Tutor, level: string) {
  const subs = (SUBJECTS_BY_LEVEL as Record<string, string[]>)[level] ?? [];
  return level === 'College' ? t.collegeSubjects : t.schoolSubjects.filter((s) => subs.includes(s));
}

export default function BookClass() {
  const p = useLocalSearchParams<{ tutorId: string; level?: string; subject?: string; kind?: string; topic?: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const tutorQ = useApi<{ tutor: Tutor }>(`/tutors/${p.tutorId}`, { refetchOnFocus: false });
  const f = useForm({
    level: p.level || null as string | null, subject: p.subject || null as string | null, kind: (p.kind === 'topic' ? 'topic' : 'hour') as Kind,
    studentName: user?.name ?? '', phone: user?.phone ?? '', topic: p.topic ?? '', confusing: '',
    day: null as string | null, startHour: null as number | null, mode: null as 'home' | 'online' | null, area: '',
  });
  const v = f.values;
  const slots = useApi<{ days: { day: string; hours: number[] }[] }>(`/tutors/${p.tutorId}/slots?kind=${v.kind}`, { refetchOnFocus: false });
  const t = tutorQ.data?.tutor;
  const levels = useMemo(() => (t ? levelsFor(t) : []), [t]);

  if (tutorQ.loading) return <Screen edges={[]}><Loading /></Screen>;
  if (tutorQ.error || !t) return <Screen edges={[]}><ErrorState message={tutorQ.error ?? 'Tutor not found'} onRetry={tutorQ.retry} /></Screen>;
  const subjects = v.level ? subjectsFor(t, v.level) : [];
  const examples = v.subject ? (EXAMPLE_TOPICS as Record<string, string[]>)[v.subject] ?? [] : [];
  const price = v.kind === 'topic' ? t.topicPrice : t.hourPrice;
  const dayHours = slots.data?.days.find((d) => d.day === v.day)?.hours ?? [];

  async function submit() {
    const ok = f.validate([
      ['level', !v.level, 'Choose a level.'],
      ['subject', !v.subject, 'Choose a subject.'],
      ['studentName', v.studentName.trim().length < 2, "Please enter the student's name."],
      ['phone', !isIndianMobile(v.phone), 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.'],
      ['topic', v.topic.trim().length < 3, 'Tell the tutor which topic you need help with.'],
      ['day', !v.day, 'Choose a day.'],
      ['startHour', v.startHour == null, 'Choose a start time.'],
      ['mode', !v.mode, 'Choose home or online.'],
      ['area', v.mode === 'home' && v.area.trim().length < 2, 'Enter your area or locality.'],
    ]);
    if (!ok) return toast.show('Please fix the highlighted fields.', 'error');
    const res = await f.submit(() => api<{ message: string }>('/parent/sessions', { body: { tutorId: t!.id, ...v } }));
    if (res.ok) {
      toast.show((res.data as { message: string }).message);
      router.back();
    } else {
      toast.show(res.message, 'error');
      if (/no longer free/.test(res.message)) { slots.reload(); f.set('startHour', null); }
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Row gap={12} style={{ marginBottom: 16 }}>
        <Avatar name={t.name} url={t.photoUrl} size={52} />
        <View style={{ flex: 1 }}>
          <T v="h3">{t.name}</T>
          <T v="small" tone="muted">{SESSION_KINDS[v.kind].label} · {price != null ? formatRupees(price) : '—'}</T>
        </View>
      </Row>

      <FieldLabel>Level</FieldLabel>
      <ChipGroup options={levels} value={v.level} onChange={(l: string) => { f.set('level', l); f.set('subject', null); }} />
      <FieldError text={f.errors.level} />
      {v.level && (
        <>
          <Gap h={16} />
          <FieldLabel>Subject</FieldLabel>
          <ChipGroup options={subjects} value={v.subject} onChange={(s: string) => f.set('subject', s)} />
          <FieldError text={f.errors.subject} />
        </>
      )}
      <Gap h={16} />
      <FieldLabel>Class type</FieldLabel>
      <ChipGroup options={['hour', 'topic'] as Kind[]} value={v.kind} labels={(k) => `${SESSION_KINDS[k].label} · ${formatRupees((k === 'topic' ? t.topicPrice : t.hourPrice) ?? 0)}`}
        onChange={(k: Kind) => { f.set('kind', k); f.set('startHour', null); }} />
      <T v="caption" tone="muted" style={{ marginTop: 6 }}>{SESSION_KINDS[v.kind].blurb}</T>
      <Gap h={16} />

      <Field label="Student's name" value={v.studentName} onChangeText={(x) => f.set('studentName', x)} error={f.errors.studentName} maxLength={60} />
      <Field label="Mobile number" value={v.phone} onChangeText={(x) => f.set('phone', x.replace(/\D/g, '').slice(0, 10))} error={f.errors.phone} keyboardType="phone-pad" maxLength={10} />
      <Field label="Topic" value={v.topic} onChangeText={(x) => f.set('topic', x)} error={f.errors.topic} maxLength={120} placeholder="e.g. Integration by parts" style={{ marginBottom: 8 }} />
      {examples.length > 0 && <Row wrap gap={8}>{examples.map((ex) => <Chip key={ex} label={ex} selected={v.topic === ex} onPress={() => f.set('topic', ex)} />)}</Row>}
      <Gap h={16} />
      <Field label="What's confusing? (optional)" value={v.confusing} onChangeText={(x) => f.set('confusing', x)} multiline maxLength={500}
        placeholder="e.g. I don't know which part to choose as u" counter={{ value: v.confusing.length, max: 500 }} />

      <FieldLabel hint="Next 7 days">Day</FieldLabel>
      {slots.loading ? <Loading label="Checking free times…" /> : (
        <Row wrap gap={8}>
          {slots.data?.days.map((d) => (
            <Chip key={d.day} label={dayLabel(d.day)} selected={v.day === d.day}
              onPress={d.hours.length ? () => { f.set('day', d.day); f.set('startHour', null); } : undefined} />
          ))}
        </Row>
      )}
      <FieldError text={f.errors.day} />
      {slots.data && slots.data.days.every((d) => !d.hours.length) && <T v="caption" tone="muted" style={{ marginTop: 6 }}>No free slots in the next 7 days. Please try another tutor.</T>}
      {v.day && (
        <>
          <Gap h={16} />
          <FieldLabel>Start time</FieldLabel>
          <ChipGroup options={dayHours} value={v.startHour} labels={formatHour} onChange={(h: number) => f.set('startHour', h)} />
          <FieldError text={f.errors.startHour} />
        </>
      )}
      <Gap h={16} />

      <FieldLabel>Home or online</FieldLabel>
      <Row wrap gap={8}>
        <Chip label="Home" icon="home-outline" selected={v.mode === 'home'} onPress={t.homeAvailable ? () => f.set('mode', 'home') : undefined} />
        <Chip label="Online" icon="laptop-outline" selected={v.mode === 'online'} onPress={t.offersOnline ? () => f.set('mode', 'online') : undefined} />
      </Row>
      {!t.homeAvailable && <T v="caption" tone="muted" style={{ marginTop: 6 }}>{t.homeUnavailableReason}</T>}
      <FieldError text={f.errors.mode} />
      {v.mode === 'home' && (
        <>
          <Gap h={16} />
          <Field label="Your area or locality" value={v.area} onChangeText={(x) => f.set('area', x)} error={f.errors.area} maxLength={80} hint={`${t.firstName} travels to: ${t.areas.join(', ')}`} />
        </>
      )}

      <Card style={{ marginTop: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>Total</T>
          <T v="price" tone="primary">{price != null ? formatRupees(price) : '—'}</T>
        </Row>
        <T v="caption" tone="muted">Pay the tutor after the class. You'll be asked to confirm it happened.</T>
      </Card>
      <Gap h={20} />
      <Button title="Request this class" onPress={submit} loading={f.busy} icon="checkmark-circle-outline" />
    </Screen>
  );
}
