import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EXAMPLE_TOPICS, SESSION_KINDS, SESSION_LEVELS, SUBJECTS_BY_LEVEL, formatRupees } from '../../../../shared/constants.js';
import { SessionItem } from '@/components/SessionItem';
import { TabHeader } from '@/components/TabHeader';
import { TutorCard, useSaveToggle } from '@/components/TutorCard';
import {
  Chip, ChipGroup, EmptyState, ErrorState, Field, FieldLabel, Gap, Loading, Row, Screen, T,
} from '@/components/ui';
import { radius, useTheme } from '@/lib/theme';
import type { Session, Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Level = (typeof SESSION_LEVELS)[number];
type Kind = keyof typeof SESSION_KINDS;

export default function OneHourClasses() {
  const [tab, setTab] = useState<'book' | 'mine'>('book');
  const mine = useApi<{ sessions: Session[] }>('/parent/sessions');
  const active = mine.data?.sessions.filter((s) => ['waiting', 'booked', 'please_confirm'].includes(s.status)).length ?? 0;

  return (
    <Screen refreshing={mine.refreshing} onRefresh={mine.refresh}>
      <TabHeader title="One-hour classes" subtitle="Stuck on one topic? Book a focused class for Class 9–12 or college." />
      <Row gap={8} style={{ marginTop: 8, marginBottom: 12 }}>
        <Chip label="Book a class" selected={tab === 'book'} onPress={() => setTab('book')} />
        <Chip label={`My booked classes${active ? ` (${active})` : ''}`} selected={tab === 'mine'} onPress={() => setTab('mine')} />
      </Row>
      {tab === 'book' ? <BookFlow /> : <MyClasses {...mine} onBook={() => setTab('book')} />}
    </Screen>
  );
}

function BookFlow() {
  const { c } = useTheme();
  const [level, setLevel] = useState<Level>('Class 12');
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [kind, setKind] = useState<Kind>('hour');
  const subjects = (SUBJECTS_BY_LEVEL as Record<string, string[]>)[level];
  const examples = subject ? (EXAMPLE_TOPICS as Record<string, string[]>)[subject] ?? [] : [];
  const path = subject ? `/session-tutors?level=${encodeURIComponent(level)}&subject=${encodeURIComponent(subject)}&kind=${kind}` : null;
  const list = useApi<{ tutors: Tutor[] }>(path);
  const toggleSave = useSaveToggle((t, saved) => list.setData((d) => d && { tutors: d.tutors.map((x) => (x.id === t.id ? { ...x, saved } : x)) }));

  return (
    <View>
      <FieldLabel>Level</FieldLabel>
      <ChipGroup options={SESSION_LEVELS} value={level} onChange={(l: Level) => { setLevel(l); setSubject(null); }} />
      <Gap h={18} />
      <FieldLabel>Subject</FieldLabel>
      <ChipGroup options={subjects} value={subject} onChange={setSubject} />

      {subject && (
        <>
          <Gap h={18} />
          <Field label="Topic" value={topic} onChangeText={setTopic} placeholder="e.g. Integration by parts" maxLength={120} hint="Tap an example or type your own." style={{ marginBottom: 8 }} />
          <Row wrap gap={8}>
            {examples.map((ex) => <Chip key={ex} label={ex} selected={topic === ex} onPress={() => setTopic(ex)} icon="bulb-outline" />)}
          </Row>

          <Gap h={20} />
          <FieldLabel>Class type</FieldLabel>
          <Row gap={10} style={{ alignItems: 'stretch' }}>
            {(Object.keys(SESSION_KINDS) as Kind[]).map((k) => {
              const selected = kind === k;
              return (
                <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="radio" accessibilityState={{ selected }}
                  style={{ flex: 1, padding: 14, borderRadius: radius.md, borderWidth: 2, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.surface }}>
                  <Row gap={6}>
                    <Ionicons name={k === 'hour' ? 'time-outline' : 'library-outline'} size={20} color={c.primary} />
                    <T v="label" style={{ flex: 1 }}>{SESSION_KINDS[k].label}</T>
                  </Row>
                  <T v="caption" tone="muted" style={{ marginTop: 4 }}>{SESSION_KINDS[k].blurb}</T>
                </Pressable>
              );
            })}
          </Row>

          <T v="h3" style={{ marginTop: 24, marginBottom: 10 }}>Tutors for {subject}</T>
          {list.loading ? <Loading /> : list.error ? <ErrorState message={list.error} onRetry={list.retry} /> : !list.data?.tutors.length ? (
            <EmptyState icon="school-outline" title="No tutors for this yet" text={`No tutor takes ${level} ${subject} classes right now. Try another subject or check again soon.`} />
          ) : list.data.tutors.map((t) => (
            <TutorCard
              key={t.id}
              tutor={t}
              showRank
              onToggleSave={toggleSave}
              priceOverride={{ label: `${SESSION_KINDS[kind].label} price`, amount: t.price ?? 0, nextFree: t.nextFree ?? null }}
              bookLabel="Book class"
              onBook={() => router.push({ pathname: '/book-class', params: { tutorId: String(t.id), level, subject, kind, topic } })}
            />
          ))}
        </>
      )}
      {!subject && (
        <T tone="muted" style={{ marginTop: 16 }}>Choose a subject to see tutors and prices. Prices start around {formatRupees(350)} per hour.</T>
      )}
    </View>
  );
}

function MyClasses({ data, loading, error, retry, reload, onBook }: {
  data: { sessions: Session[] } | null; loading: boolean; error: string | null; retry: () => void; reload: () => void; onBook: () => void;
}) {
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data?.sessions.length) {
    return <EmptyState icon="calendar-outline" title="No classes booked yet" text="Book a one-hour or full-topic class with a verified tutor." action="Book a class" onAction={onBook} />;
  }
  return <View>{data.sessions.map((s) => <SessionItem key={s.id} s={s} onChanged={reload} />)}</View>;
}
