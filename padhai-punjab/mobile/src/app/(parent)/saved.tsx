import React from 'react';
import { router } from 'expo-router';
import { TabHeader } from '@/components/TabHeader';
import { TutorCard, useSaveToggle } from '@/components/TutorCard';
import { EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import type { Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';

export default function Saved() {
  const { data, setData, loading, error, retry, refreshing, refresh } = useApi<{ tutors: Tutor[] }>('/parent/saved');
  const toggleSave = useSaveToggle((t) => setData((d) => d && { tutors: d.tutors.filter((x) => x.id !== t.id) }));
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="Saved tutors" subtitle="Tutors you've hearted, to compare later." />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : !data?.tutors.length ? (
        <EmptyState icon="heart-outline" title="Nothing saved yet" text="Tap the heart on any tutor to keep them here while you decide." action="Find tutors" onAction={() => router.navigate('/(parent)')} />
      ) : data.tutors.map((t) => <TutorCard key={t.id} tutor={t} onToggleSave={toggleSave} />)}
    </Screen>
  );
}
