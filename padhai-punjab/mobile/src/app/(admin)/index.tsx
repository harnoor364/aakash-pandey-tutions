import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { TabHeader } from '@/components/TabHeader';
import { Avatar, Badge, Card, EmptyState, ErrorState, InfoLine, Loading, Row, Screen, Section, T } from '@/components/ui';
import { getAuthToken } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

type Q = { id: number; name: string; city: string; photoUrl: string | null; homeSafeStatus: string; idStatus: string; createdAt: string; stepsDone: number };

export default function AdminQueue() {
  const { data, loading, error, retry, refreshing, refresh } = useApi<{ tutors: Q[] }>('/admin/queue');
  const safety = data?.tutors.filter((t) => t.homeSafeStatus === 'under_review') ?? [];
  const idOnly = data?.tutors.filter((t) => t.homeSafeStatus !== 'under_review') ?? [];
  const headers = { Authorization: `Bearer ${getAuthToken()}` };
  const row = (t: Q) => (
    <Card key={t.id} style={{ marginBottom: 12 }} onPress={() => router.push({ pathname: '/admin-tutor/[id]', params: { id: String(t.id) } })} accessibilityLabel={`Review ${t.name}`}>
      <Row gap={12}>
        <Avatar name={t.name} url={t.photoUrl} size={52} headers={headers} />
        <View style={{ flex: 1 }}>
          <T v="h3">{t.name}</T>
          <T v="small" tone="muted">{t.city} · joined {prettyDate(t.createdAt)}</T>
        </View>
      </Row>
      <Row wrap gap={6} style={{ marginTop: 10 }}>
        {t.homeSafeStatus === 'under_review' && <Badge label={`Safety checks ${t.stepsDone}/8 · under review`} tone="warn" />}
        {t.idStatus === 'pending' && <Badge label="ID check pending" tone="warn" />}
      </Row>
      <InfoLine icon="chevron-forward">Tap to review documents</InfoLine>
    </Card>
  );
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="Tutor queue" subtitle="Check documents before anyone teaches in a home." />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : !data?.tutors.length ? (
        <EmptyState icon="checkmark-done-outline" title="Queue is empty" text="No tutors are waiting for review right now." />
      ) : (
        <>
          <Section title={`Home-safety review (${safety.length})`}>{safety.length ? safety.map(row) : <T tone="muted">None waiting.</T>}</Section>
          <Section title={`ID checks (${idOnly.length})`}>{idOnly.length ? idOnly.map(row) : <T tone="muted">None waiting.</T>}</Section>
        </>
      )}
    </Screen>
  );
}
