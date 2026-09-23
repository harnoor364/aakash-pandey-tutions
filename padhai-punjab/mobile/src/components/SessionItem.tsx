import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { SESSION_KINDS } from '../../../shared/constants.js';
import { api } from '@/lib/api';
import { dayLabel, formatHour, formatRupees } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Session } from '@/lib/types';
import { VisitCode } from './VisitCode';
import { Badge, Button, Card, Gap, InfoLine, LinkText, Notice, Row, T } from './ui';

const STEPS = ['Waiting for tutor', 'Booked', 'Please confirm', 'Completed'];
const STEP_INDEX: Record<string, number> = { waiting: 0, booked: 1, please_confirm: 2, completed: 3 };

export function statusBadge(s: Session['status']) {
  switch (s) {
    case 'waiting': return <Badge label="Waiting for tutor" tone="warn" icon="hourglass-outline" />;
    case 'booked': return <Badge label="Booked" tone="success" icon="calendar" />;
    case 'please_confirm': return <Badge label="Please confirm" tone="brass" icon="help-circle" />;
    case 'completed': return <Badge label="Completed" tone="success" icon="checkmark-done" />;
    case 'declined': return <Badge label="Tutor not free" tone="neutral" />;
    case 'not_attended': return <Badge label="Marked not attended" tone="neutral" />;
    case 'cancelled': return <Badge label="Cancelled" tone="neutral" />;
    default: return null;
  }
}

export function StatusSteps({ status }: { status: Session['status'] }) {
  const { c } = useTheme();
  const idx = STEP_INDEX[status];
  if (idx == null) return null;
  return (
    <View accessibilityLabel={`Status: ${STEPS[idx]}`} style={{ flexDirection: 'row', gap: 4, marginTop: 12 }}>
      {STEPS.map((s, i) => (
        <View key={s} style={{ flex: 1 }}>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: i <= idx ? c.primary : c.surfaceAlt }} />
          <T v="caption" tone={i === idx ? 'primary' : 'muted'} style={{ fontSize: 12, marginTop: 4 }}>{s}</T>
        </View>
      ))}
    </View>
  );
}

export function SessionItem({ s, onChanged }: { s: Session; onChanged: () => void }) {
  const toast = useToast();
  const act = async (path: string, body?: object) => {
    try {
      const res = await api<{ message: string }>(path, { body: body ?? {} });
      toast.show(res.message);
      onChanged();
    } catch (e: any) {
      toast.show(e.message, 'error');
    }
  };
  const live = ['waiting', 'booked', 'please_confirm'].includes(s.status);
  return (
    <Card style={{ marginBottom: 14 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T v="h3">{s.topic}</T>
          <T v="small" tone="muted">{s.level} · {s.subject} · with {s.tutorName}</T>
        </View>
        {statusBadge(s.status)}
      </Row>
      <InfoLine icon="calendar-outline">{dayLabel(s.day)}, {formatHour(s.startHour)} · {SESSION_KINDS[s.kind].label}</InfoLine>
      <InfoLine icon={s.mode === 'home' ? 'home-outline' : 'laptop-outline'}>{s.mode === 'home' ? `Home · ${s.area}` : 'Online'} · {formatRupees(s.price)}</InfoLine>
      <StatusSteps status={s.status} />

      {s.mode === 'home' && s.status === 'booked' && s.visitCode && !s.homePaused && (
        <View style={{ marginTop: 14 }}><VisitCode code={s.visitCode} /></View>
      )}
      {s.homePaused && live && (
        <View style={{ marginTop: 12 }}><Notice tone="danger">Home visits from this tutor are paused while our safety team looks into a report.</Notice></View>
      )}

      {s.status === 'please_confirm' && (
        <View style={{ marginTop: 14 }}>
          <T v="bodyStrong">Did this class happen?</T>
          <Row gap={10} style={{ marginTop: 8 }}>
            <Button title="Yes, I attended" small icon="checkmark" onPress={() => act(`/parent/sessions/${s.id}/confirm`, { attended: true })} style={{ flex: 1 }} />
            <Button title="No" small variant="secondary" onPress={() => act(`/parent/sessions/${s.id}/confirm`, { attended: false })} />
          </Row>
        </View>
      )}
      {s.status === 'completed' && s.canReview && (
        <Button title={s.hasReview ? 'Edit your rating' : 'Rate this class'} small icon="star-outline" style={{ marginTop: 14 }}
          onPress={() => router.push({ pathname: '/review', params: { tutorId: String(s.tutorId) } })} />
      )}
      <Gap h={4} />
      <Row style={{ justifyContent: 'space-between' }} wrap>
        {(s.status === 'waiting' || s.status === 'booked') ? (
          <LinkText tone="muted" onPress={() => act(`/parent/sessions/${s.id}/cancel`)}>Cancel class</LinkText>
        ) : <View />}
        <LinkText tone="danger" icon="flag-outline"
          onPress={() => router.push({ pathname: '/report', params: { tutorId: String(s.tutorId), sessionId: String(s.id), tutorName: s.tutorName ?? '' } })}>
          Report a safety concern
        </LinkText>
      </Row>
    </Card>
  );
}
