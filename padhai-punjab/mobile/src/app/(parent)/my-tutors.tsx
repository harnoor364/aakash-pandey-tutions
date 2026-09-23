import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { SessionItem } from '@/components/SessionItem';
import { TabHeader } from '@/components/TabHeader';
import { VisitCode } from '@/components/VisitCode';
import {
  Avatar, Badge, Button, Card, Divider, EmptyState, ErrorState, Gap, InfoLine, LinkText, Loading, Notice, ProgressBar,
  Row, Screen, Section, T,
} from '@/components/ui';
import { api } from '@/lib/api';
import { dayLabel, plural, prettyDate } from '@/lib/format';
import { useToast } from '@/lib/toast';
import type { ClassLog, Session } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Pending = { id: number; tutorId: number; tutorName: string; childName: string; cls: number; subject: string; mode: string; timeSlot: string; status: string; createdAt: string };
type Active = {
  id: number; tutorId: number; tutorName: string; tutorPhotoUrl: string | null; childName: string; cls: number; subject: string;
  mode: 'home' | 'online'; area: string | null; status: string; logs: ClassLog[]; confirmedClasses: number; reviewUnlockAt: number;
  canReview: boolean; hasReview: boolean; visitCode: string | null; homePaused: boolean;
};
type Data = { pending: Pending[]; active: Active[]; past: Active[] };

export default function MyTutors() {
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<Data>('/parent/my-tutors');
  const sessions = useApi<{ sessions: Session[] }>('/parent/sessions');
  const pastSessions = sessions.data?.sessions.filter((s) => s.status === 'completed') ?? [];

  const empty = data && !data.pending.length && !data.active.length && !data.past.length && !pastSessions.length;
  return (
    <Screen refreshing={refreshing} onRefresh={() => { refresh(); sessions.reload(); }}>
      <TabHeader title="My tutors & reviews" />
      <LinkText icon="help-circle-outline" onPress={() => router.push('/how-it-works')}>How reviews and ranking work</LinkText>
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : empty ? (
        <EmptyState icon="people-outline" title="No tutors yet" text="Book a free demo with a verified tutor. Your requests, tutors and classes will appear here." action="Find tutors" onAction={() => router.navigate('/(parent)')} />
      ) : data && (
        <>
          {data.pending.length > 0 && (
            <Section title="Demo requests">
              {data.pending.map((p) => (
                <Card key={p.id} style={{ marginBottom: 12 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="h3" style={{ flex: 1 }}>{p.tutorName}</T>
                    {p.status === 'pending' ? <Badge label="Waiting for reply" tone="warn" icon="hourglass-outline" /> : <Badge label="Tutor not available" tone="neutral" />}
                  </Row>
                  <InfoLine icon="person-outline">{p.childName} · Class {p.cls} · {p.subject}</InfoLine>
                  <InfoLine icon={p.mode === 'home' ? 'home-outline' : 'laptop-outline'}>{p.mode === 'home' ? 'Home tuition' : 'Online'} · {p.timeSlot}</InfoLine>
                  <InfoLine icon="calendar-outline">Sent {prettyDate(p.createdAt)}</InfoLine>
                  {p.status === 'declined' && (
                    <Button title="Find another tutor" small variant="secondary" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.navigate('/(parent)')} />
                  )}
                </Card>
              ))}
            </Section>
          )}

          <Section title="Active tutors">
            {data.active.length ? data.active.map((a) => <ActiveTutor key={a.id} a={a} onChanged={reload} />) : (
              <T tone="muted">When a tutor accepts your demo request, they'll show up here.</T>
            )}
          </Section>

          {(data.past.length > 0 || pastSessions.length > 0) && (
            <Section title="Past classes">
              {data.past.map((a) => (
                <Card key={a.id} style={{ marginBottom: 12 }}>
                  <T v="h3">{a.tutorName}</T>
                  <InfoLine icon="person-outline">{a.childName} · Class {a.cls} · {a.subject}</InfoLine>
                  <InfoLine icon="checkmark-done-outline">{plural(a.confirmedClasses, 'confirmed class', )}</InfoLine>
                  {a.canReview && <Button title={a.hasReview ? 'Edit your review' : 'Write a review'} small icon="star-outline" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.push({ pathname: '/review', params: { tutorId: String(a.tutorId) } })} />}
                </Card>
              ))}
              {pastSessions.map((s) => <SessionItem key={`s${s.id}`} s={s} onChanged={sessions.reload} />)}
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}

function ActiveTutor({ a, onChanged }: { a: Active; onChanged: () => void }) {
  const toast = useToast();
  const togo = Math.max(0, a.reviewUnlockAt - a.confirmedClasses);
  const confirm = async (log: ClassLog, attended: boolean) => {
    try {
      const res = await api<{ message: string }>(`/parent/class-logs/${log.id}/confirm`, { body: { attended } });
      toast.show(res.message);
      onChanged();
    } catch (e: any) {
      toast.show(e.message, 'error');
    }
  };
  const waiting = a.logs.filter((l) => l.parentConfirmed === null);
  const answered = a.logs.filter((l) => l.parentConfirmed !== null).slice(0, 5);

  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gap={12}>
        <Avatar name={a.tutorName} url={a.tutorPhotoUrl} size={52} />
        <View style={{ flex: 1 }}>
          <T v="h3">{a.tutorName}</T>
          <T v="small" tone="muted">{a.childName} · Class {a.cls} · {a.subject} · {a.mode === 'home' ? `Home, ${a.area}` : 'Online'}</T>
        </View>
      </Row>

      {a.mode === 'home' && (
        <View style={{ marginTop: 14 }}>
          {a.homePaused ? (
            <Notice tone="danger" title="Home visits paused">Our safety team is looking into a report. Do not let the tutor in until we call you.</Notice>
          ) : a.visitCode ? <VisitCode code={a.visitCode} /> : null}
        </View>
      )}

      <Gap h={14} />
      {a.canReview ? (
        <Button title={a.hasReview ? 'Edit your review' : 'Write a review'} icon="star-outline" onPress={() => router.push({ pathname: '/review', params: { tutorId: String(a.tutorId) } })} />
      ) : (
        <View>
          <T v="label">Review unlocks after {a.reviewUnlockAt} confirmed classes: {togo} to go.</T>
          <View style={{ marginTop: 8 }}><ProgressBar value={a.confirmedClasses} total={a.reviewUnlockAt} /></View>
        </View>
      )}

      <Divider style={{ marginTop: 16 }} />
      <T v="label" style={{ marginBottom: 6 }}>Classes logged by the tutor</T>
      {!a.logs.length && <T v="small" tone="muted">No classes logged yet. After each class, the tutor logs it and you confirm it here.</T>}
      {waiting.map((l) => (
        <View key={l.id} style={{ paddingVertical: 10 }}>
          <T v="bodyStrong">{dayLabel(l.date)} · {l.topic}</T>
          <T v="small" tone="muted">Did this class happen?</T>
          <Row gap={10} style={{ marginTop: 8 }}>
            <Button title="Yes, confirm" small icon="checkmark" onPress={() => confirm(l, true)} style={{ flex: 1 }} />
            <Button title="No" small variant="secondary" onPress={() => confirm(l, false)} />
          </Row>
        </View>
      ))}
      {answered.map((l) => (
        <Row key={l.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
          <T v="small" style={{ flex: 1 }}>{dayLabel(l.date)} · {l.topic}</T>
          {l.parentConfirmed ? <Badge label="Confirmed" tone="success" icon="checkmark" /> : <Badge label="Didn't happen" tone="neutral" />}
        </Row>
      ))}

      <Row style={{ justifyContent: 'flex-end', marginTop: 6 }}>
        <LinkText tone="danger" icon="flag-outline"
          onPress={() => router.push({ pathname: '/report', params: { tutorId: String(a.tutorId), enrolmentId: String(a.id), tutorName: a.tutorName } })}>
          Report a safety concern
        </LinkText>
      </Row>
    </Card>
  );
}
