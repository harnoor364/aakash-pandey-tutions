import React, { useState } from 'react';
import { View } from 'react-native';
import { SESSION_KINDS } from '../../../../shared/constants.js';
import { ClassPrompt } from '@/components/CodePrompt';
import { statusBadge } from '@/components/SessionItem';
import { TabHeader } from '@/components/TabHeader';
import { Button, Card, EmptyState, ErrorState, InfoLine, Loading, Notice, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { dayLabel, formatHour, formatRupees } from '@/lib/format';
import { useToast } from '@/lib/toast';
import type { Session } from '@/lib/types';
import { useApi } from '@/lib/useApi';

export default function TutorClasses() {
  const toast = useToast();
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<{ sessions: Session[] }>('/tutor/sessions');
  const [doneFor, setDoneFor] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const act = async (s: Session, action: 'accept' | 'decline' | 'done', body: object = {}) => {
    setBusy(true);
    try {
      const res = await api<{ message: string }>(`/tutor/sessions/${s.id}/${action}`, { body });
      toast.show(res.message);
      setDoneFor(null);
      reload();
    } catch (e: any) {
      if (action === 'done' && doneFor) setPromptError(e.message);
      else toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const groups = {
    new: data?.sessions.filter((s) => s.status === 'waiting') ?? [],
    upcoming: data?.sessions.filter((s) => s.status === 'booked') ?? [],
    past: data?.sessions.filter((s) => !['waiting', 'booked'].includes(s.status)) ?? [],
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="One-hour classes" subtitle="Single-topic and one-hour bookings." />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : !data?.sessions.length ? (
        <EmptyState icon="time-outline" title="No class bookings yet" text="Set a one-hour and full-topic price in your profile so Class 9–12 and college students can book you." />
      ) : (
        <>
          <Section title={`New requests (${groups.new.length})`}>
            {!groups.new.length && <T tone="muted">No new requests.</T>}
            {groups.new.map((s) => (
              <SessionCard key={s.id} s={s}>
                <Row gap={10} style={{ marginTop: 14 }}>
                  <Button title="Accept" small icon="checkmark" onPress={() => act(s, 'accept')} style={{ flex: 1 }} />
                  <Button title="I'm not free" small variant="secondary" onPress={() => act(s, 'decline')} style={{ flex: 1 }} />
                </Row>
              </SessionCard>
            ))}
          </Section>
          <Section title={`Booked (${groups.upcoming.length})`}>
            {!groups.upcoming.length && <T tone="muted">Nothing booked right now.</T>}
            {groups.upcoming.map((s) => (
              <SessionCard key={s.id} s={s}>
                {s.startsInFuture ? (
                  <T v="caption" tone="muted" style={{ marginTop: 12 }}>You can mark this class done once it has started.</T>
                ) : (
                  <Button title="Mark as done" small icon="checkmark-done" style={{ marginTop: 14 }} onPress={() => {
                    if (s.mode === 'home') { setPromptError(null); setDoneFor(s); } else act(s, 'done');
                  }} />
                )}
              </SessionCard>
            ))}
          </Section>
          {groups.past.length > 0 && (
            <Section title="Past">
              {groups.past.map((s) => <SessionCard key={s.id} s={s} />)}
            </Section>
          )}
        </>
      )}
      <ClassPrompt
        visible={!!doneFor}
        title="Mark home class as done"
        needsCode
        busy={busy}
        error={promptError}
        onCancel={() => setDoneFor(null)}
        onSubmit={({ code }) => doneFor && act(doneFor, 'done', { visitCode: code })}
      />
    </Screen>
  );
}

function SessionCard({ s, children }: { s: Session; children?: React.ReactNode }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T v="h3">{s.topic}</T>
          <T v="small" tone="muted">{s.level} · {s.subject} · {s.studentName}</T>
        </View>
        {statusBadge(s.status)}
      </Row>
      <InfoLine icon="calendar-outline">{dayLabel(s.day)}, {formatHour(s.startHour)} · {SESSION_KINDS[s.kind].label}</InfoLine>
      <InfoLine icon={s.mode === 'home' ? 'home-outline' : 'laptop-outline'}>{s.mode === 'home' ? `Home · ${s.area}` : 'Online'} · {formatRupees(s.price)}</InfoLine>
      {s.confusing && <InfoLine icon="help-circle-outline">"{s.confusing}"</InfoLine>}
      {s.phone && <InfoLine icon="call-outline">+91 {s.phone}</InfoLine>}
      {s.status === 'please_confirm' && <View style={{ marginTop: 10 }}><Notice tone="info">Waiting for the student to confirm they attended.</Notice></View>}
      {children}
    </Card>
  );
}
