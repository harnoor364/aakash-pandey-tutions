import React from 'react';
import { router } from 'expo-router';
import { TabHeader } from '@/components/TabHeader';
import { Badge, Button, Card, EmptyState, ErrorState, InfoLine, Loading, Notice, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { useApi } from '@/lib/useApi';

type Req = {
  id: number; parentName: string; childName: string; cls: number; subject: string; mode: 'home' | 'online'; area: string | null;
  timeSlot: string; status: 'pending' | 'accepted' | 'declined'; createdAt: string; phone: string | null;
};

export default function DemoRequests() {
  const toast = useToast();
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<{ requests: Req[] }>('/tutor/demo-requests');
  const me = useApi<{ private: { homeUnlocked: boolean; idStatus: string } }>('/tutor/me');

  const act = async (r: Req, action: 'accept' | 'decline') => {
    try {
      const res = await api<{ message: string }>(`/tutor/demo-requests/${r.id}/${action}`, { body: {} });
      toast.show(res.message);
      reload();
    } catch (e: any) {
      toast.show(e.message, 'error');
    }
  };
  const pending = data?.requests.filter((r) => r.status === 'pending') ?? [];
  const answered = data?.requests.filter((r) => r.status !== 'pending') ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={() => { refresh(); me.reload(); }}>
      <TabHeader title="Demo requests" subtitle="Parents asking for a free first class." />
      {me.data && !me.data.private.homeUnlocked && (
        <Notice tone="warn" title="You appear for online classes only">
          Finish your 8 safety checks to unlock home tuition.
        </Notice>
      )}
      {me.data && !me.data.private.homeUnlocked && (
        <Button title="Go to safety checks" small variant="ghost" icon="shield-checkmark-outline" style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/(tutor)/safety')} />
      )}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : !data?.requests.length ? (
        <EmptyState icon="mail-open-outline" title="No requests yet" text="When parents book a free demo with you, it shows up here. A complete profile with a clear photo gets more requests." action="Preview my profile" onAction={() => router.navigate('/(tutor)/profile')} />
      ) : (
        <>
          <Section title={`New (${pending.length})`}>
            {!pending.length && <T tone="muted">You're all caught up.</T>}
            {pending.map((r) => (
              <Card key={r.id} style={{ marginBottom: 12 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="h3" style={{ flex: 1 }}>{r.childName}, Class {r.cls}</T>
                  <Badge label={r.mode === 'home' ? 'Home' : 'Online'} tone={r.mode === 'home' ? 'brass' : 'neutral'} />
                </Row>
                <InfoLine icon="book-outline">{r.subject}</InfoLine>
                <InfoLine icon="person-outline">Parent: {r.parentName}</InfoLine>
                {r.area && <InfoLine icon="location-outline">{r.area}</InfoLine>}
                <InfoLine icon="time-outline">Prefers {r.timeSlot}</InfoLine>
                <InfoLine icon="calendar-outline">Received {prettyDate(r.createdAt)}</InfoLine>
                <Row gap={10} style={{ marginTop: 14 }}>
                  <Button title="Accept" small icon="checkmark" onPress={() => act(r, 'accept')} style={{ flex: 1 }} />
                  <Button title="Decline" small variant="secondary" onPress={() => act(r, 'decline')} style={{ flex: 1 }} />
                </Row>
              </Card>
            ))}
          </Section>
          {answered.length > 0 && (
            <Section title="Answered">
              {answered.map((r) => (
                <Card key={r.id} style={{ marginBottom: 10 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="bodyStrong" style={{ flex: 1 }}>{r.childName} · Class {r.cls} · {r.subject}</T>
                    {r.status === 'accepted' ? <Badge label="Accepted" tone="success" /> : <Badge label="Declined" tone="neutral" />}
                  </Row>
                  {r.phone && <InfoLine icon="call-outline">{r.parentName}: +91 {r.phone}</InfoLine>}
                </Card>
              ))}
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}
