import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BOARDS, CLASSES, DISTRICTS, SCHOOL_SUBJECTS, TAGLINE_PA } from '../../../../shared/constants.js';
import { PhulkariStrip } from '@/components/Phulkari';
import { TabHeader } from '@/components/TabHeader';
import { TutorCard, useSaveToggle } from '@/components/TutorCard';
import {
  Button, Card, Chip, ChipGroup, EmptyState, ErrorState, FieldLabel, Gap, LinkText, Loading, Pa, Row, Screen, Select, T,
} from '@/components/ui';
import { plural } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Filters = { city: string | null; cls: number | null; subject: string | null; board: string | null; mode: 'home' | 'online' | null };
const SORTS = [
  { key: 'best', label: 'Best ranked' },
  { key: 'fee', label: 'Fee: low to high' },
  { key: 'experience', label: 'Most experienced' },
] as const;

export default function FindTutors() {
  const { c } = useTheme();
  const [filters, setFilters] = useState<Filters>({ city: null, cls: null, subject: null, board: null, mode: null });
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('best');
  const [showFilters, setShowFilters] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.city) p.set('city', filters.city);
    if (filters.cls) p.set('cls', String(filters.cls));
    if (filters.subject) p.set('subject', filters.subject);
    if (filters.board) p.set('board', filters.board);
    if (filters.mode) p.set('mode', filters.mode);
    p.set('sort', sort);
    return `/tutors?${p.toString()}`;
  }, [filters, sort]);

  const { data, setData, loading, error, refreshing, refresh, retry } = useApi<{ tutors: Tutor[]; total: number }>(query);
  const toggleSave = useSaveToggle((t, saved) => setData((d) => d && { ...d, tutors: d.tutors.map((x) => (x.id === t.id ? { ...x, saved } : x)) }));
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const active = Object.values(filters).filter(Boolean).length;
  const moreActive = [filters.cls, filters.subject, filters.board].filter(Boolean).length;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} padded={false}>
      <PhulkariStrip />
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <TabHeader title="Find a tutor" />
        <Pa size={17}>{TAGLINE_PA}</Pa>
        <T tone="muted">Verified tutors for home and online tuition across Punjab.</T>

        <Card style={{ marginTop: 18 }}>
          <Select label="City" value={filters.city} options={DISTRICTS} onChange={(v) => set('city', v)} searchable allowClear clearLabel="All of Punjab" placeholder="All of Punjab" />
          <FieldLabel hint="Home tutors have passed all 8 safety checks.">Tuition type</FieldLabel>
          <Row wrap gap={8}>
            <Chip label="Any" selected={!filters.mode} onPress={() => set('mode', null)} />
            <Chip label="Home" icon="home-outline" selected={filters.mode === 'home'} onPress={() => set('mode', 'home')} />
            <Chip label="Online" icon="laptop-outline" selected={filters.mode === 'online'} onPress={() => set('mode', 'online')} />
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <Row gap={8}>
              <Ionicons name="options-outline" size={20} color={c.primary} />
              <T v="label">Class, subject and board{moreActive ? ` (${moreActive})` : ''}</T>
            </Row>
            <LinkText onPress={() => setShowFilters((s) => !s)}>{showFilters ? 'Hide' : 'Show'}</LinkText>
          </Row>
          {showFilters && (
            <View style={{ marginTop: 12 }}>
              <Row gap={12} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Select label="Class" value={filters.cls} options={CLASSES} format={(n) => `Class ${n}`} onChange={(v) => set('cls', v)} allowClear clearLabel="Any class" placeholder="Any class" />
                </View>
                <View style={{ flex: 1 }}>
                  <Select label="Subject" value={filters.subject} options={SCHOOL_SUBJECTS} onChange={(v) => set('subject', v)} allowClear clearLabel="Any subject" placeholder="Any subject" />
                </View>
              </Row>
              <FieldLabel>Board</FieldLabel>
              <ChipGroup options={['Any', ...BOARDS]} value={filters.board ?? 'Any'} onChange={(v: string) => set('board', v === 'Any' ? null : v)} />
            </View>
          )}
          {active > 0 && (
            <Button title="Clear all filters" variant="ghost" small style={{ marginTop: 6, alignSelf: 'flex-start' }}
              onPress={() => setFilters({ city: null, cls: null, subject: null, board: null, mode: null })} />
          )}
        </Card>

        <T v="label" style={{ marginTop: 20, marginBottom: 8 }}>Sort by</T>
        <Row wrap gap={8}>
          {SORTS.map((s) => <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />)}
        </Row>

        <Row style={{ justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }} wrap>
          <T v="h3">{data ? plural(data.total, 'tutor') : 'Tutors'}</T>
          <LinkText icon="help-circle-outline" onPress={() => router.push('/how-it-works')}>How ranking works</LinkText>
        </Row>

        {loading ? <Loading label="Finding tutors…" /> : error ? <ErrorState message={error} onRetry={retry} /> : data && data.tutors.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No tutors match yet"
            text={filters.mode === 'home'
              ? 'No home-safe verified tutors match these filters. Try online tuition or a nearby city.'
              : 'Try a nearby city, another board, or fewer filters.'}
            action="Clear filters"
            onAction={() => setFilters({ city: null, cls: null, subject: null, board: null, mode: null })}
          />
        ) : (
          data?.tutors.map((t) => (
            <TutorCard key={t.id} tutor={t} onToggleSave={toggleSave} mode={filters.mode} showRank />
          ))
        )}
      </View>
    </Screen>
  );
}
