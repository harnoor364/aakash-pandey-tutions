import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { TabHeader } from '@/components/TabHeader';
import { Badge, Button, Card, EmptyState, ErrorState, Field, InfoLine, Loading, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { useApi } from '@/lib/useApi';

type Report = {
  id: number; tutorId: number; tutorName: string; reason: string; details: string | null; status: string; reporterName: string | null;
  reporterPhone: string; parentContacted: boolean; adminNotes: string | null; createdAt: string; homePaused: boolean; tutorSuspended: boolean;
};

const STATUS: Record<string, { label: string; tone: 'danger' | 'warn' | 'success' | 'neutral' }> = {
  open: { label: 'Open', tone: 'danger' }, pause_kept: { label: 'Pause kept', tone: 'warn' },
  pause_lifted: { label: 'Pause lifted', tone: 'success' }, tutor_suspended: { label: 'Tutor suspended', tone: 'neutral' },
};

export default function AdminReports() {
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<{ reports: Report[] }>('/admin/reports');
  const open = data?.reports.filter((r) => r.status === 'open' || r.status === 'pause_kept') ?? [];
  const closed = data?.reports.filter((r) => r.status !== 'open' && r.status !== 'pause_kept') ?? [];
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="Safety reports" subtitle="Call every family within 2 hours." />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : !data?.reports.length ? (
        <EmptyState icon="shield-checkmark-outline" title="No reports" text="Nothing has been reported. Good." />
      ) : (
        <>
          <Section title={`Needs action (${open.length})`}>{open.length ? open.map((r) => <ReportCard key={r.id} r={r} onChanged={reload} />) : <T tone="muted">All handled.</T>}</Section>
          {closed.length > 0 && <Section title="Closed">{closed.map((r) => <ReportCard key={r.id} r={r} onChanged={reload} />)}</Section>}
        </>
      )}
    </Screen>
  );
}

function ReportCard({ r, onChanged }: { r: Report; onChanged: () => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState(r.adminNotes ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (action: string) => {
    setBusy(action);
    try {
      const res = await api<{ message: string }>(`/admin/reports/${r.id}`, { body: { action, notes } });
      toast.show(res.message);
      onChanged();
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const s = STATUS[r.status] ?? STATUS.open;
  const actionable = r.status === 'open' || r.status === 'pause_kept';
  return (
    <Card style={{ marginBottom: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3" style={{ flex: 1 }}>#{r.id} · {r.tutorName}</T>
        <Badge label={s.label} tone={s.tone} />
      </Row>
      <T v="bodyStrong" style={{ marginTop: 6 }}>{r.reason}</T>
      {r.details && <T v="small" style={{ marginTop: 4 }}>"{r.details}"</T>}
      <InfoLine icon="person-outline">{r.reporterName ?? 'Parent'} · +91 {r.reporterPhone}</InfoLine>
      <InfoLine icon="calendar-outline">{prettyDate(r.createdAt)}</InfoLine>
      <InfoLine icon={r.homePaused ? 'pause-circle-outline' : 'play-circle-outline'}>{r.tutorSuspended ? 'Tutor suspended' : r.homePaused ? 'Home visits paused' : 'Home visits active'}</InfoLine>
      <Row gap={10} wrap style={{ marginTop: 12 }}>
        <Button title="Call parent" small icon="call-outline" variant="secondary" onPress={() => Linking.openURL(`tel:+91${r.reporterPhone}`)} />
        <Button title={r.parentContacted ? 'Contacted ✓' : 'Mark contacted'} small variant="ghost" disabled={r.parentContacted} loading={busy === 'contacted'} onPress={() => act('contacted')} />
        <Button title="View tutor" small variant="ghost" onPress={() => router.push({ pathname: '/admin-tutor/[id]', params: { id: String(r.tutorId) } })} />
      </Row>
      {actionable && (
        <View style={{ marginTop: 12 }}>
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline maxLength={2000} placeholder="What the family said, what you decided and why" />
          <Row gap={8} wrap>
            <Button title="Keep pause" small variant="secondary" loading={busy === 'keep_pause'} onPress={() => act('keep_pause')} />
            <Button title="Lift pause" small loading={busy === 'lift_pause'} onPress={() => act('lift_pause')} />
            <Button title="Suspend tutor" small variant="danger" loading={busy === 'suspend'} onPress={() => act('suspend')} />
          </Row>
        </View>
      )}
      {!actionable && r.adminNotes && <T v="small" tone="muted" style={{ marginTop: 8 }}>Notes: {r.adminNotes}</T>}
    </Card>
  );
}
