import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TabHeader } from '@/components/TabHeader';
import { Badge, Button, Card, ErrorState, Gap, Loading, Notice, ProgressBar, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { prettyDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useApi } from '@/lib/useApi';

type Step = { key: string; title: string; why: string; status: 'done' | 'not_started'; summary: string | null };
type Safety = {
  steps: Step[]; done: number; total: number; status: 'not_submitted' | 'under_review' | 'approved' | 'rejected'; reason: string | null;
  canSubmit: boolean; policeValidUntil: string | null; policeRenewSoon: boolean; homePaused: boolean;
};

export default function SafetyChecks() {
  const { c } = useTheme();
  const toast = useToast();
  const { refresh: refreshMe } = useAuth();
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<Safety>('/tutor/safety');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await api<{ message: string }>('/tutor/safety/submit', { body: {} });
      toast.show(res.message);
      reload();
      refreshMe();
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const locked = data?.status === 'under_review';
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="Safety checks" subtitle="All 8 must be approved before you can teach in anyone's home." />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : data && (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h2">{data.done} of {data.total} done</T>
              <StatusBadge status={data.status} />
            </Row>
            <View style={{ marginTop: 10 }}><ProgressBar value={data.done} total={data.total} /></View>
            {data.status === 'approved' && !data.homePaused && (
              <View style={{ marginTop: 12 }}><Notice tone="success" title="🛡 Home-safe verified">Home tuition is unlocked. Parents can now book you for home classes.</Notice></View>
            )}
            {data.homePaused && (
              <View style={{ marginTop: 12 }}><Notice tone="danger" title="Home visits paused">A family reported a safety concern. Our safety team will contact you. Home visits stay paused until they finish.</Notice></View>
            )}
            {data.status === 'under_review' && (
              <View style={{ marginTop: 12 }}><Notice tone="warn" title="Under review (3–5 working days)">Our safety team is checking your documents and will call your references. We'll let you know by SMS.</Notice></View>
            )}
            {data.status === 'rejected' && (
              <View style={{ marginTop: 12 }}><Notice tone="danger" title="Changes needed">{data.reason ?? 'Please update your checks and submit again.'}</Notice></View>
            )}
            {data.status === 'not_submitted' && data.done < data.total && (
              <T v="small" tone="muted" style={{ marginTop: 10 }}>Until then you appear for online classes only.</T>
            )}
          </Card>

          {data.policeValidUntil && (
            <View style={{ marginTop: 12 }}>
              <Notice tone={data.policeRenewSoon ? 'warn' : 'info'} title={`Police certificate valid until ${prettyDate(data.policeValidUntil)}`}>
                {data.policeRenewSoon ? 'Renew it now at your Saanjh Kendra or on the PP Saanjh portal, then upload the new one. Home tuition pauses when it expires.' : 'We will remind you to renew it before it expires.'}
              </Notice>
            </View>
          )}

          <Gap h={16} />
          {data.steps.map((s, i) => (
            <Card key={s.key} style={{ marginBottom: 12 }}>
              <Row gap={12} style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: s.status === 'done' ? c.primary : c.surfaceAlt }}>
                  {s.status === 'done' ? <Ionicons name="checkmark" size={20} color={c.onPrimary} /> : <T v="label" tone="muted">{i + 1}</T>}
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">{s.title}</T>
                  <T v="small" tone="muted">{s.why}</T>
                  {s.summary && <T v="caption" tone="primary" style={{ marginTop: 4 }}>{s.summary}</T>}
                  <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
                    {s.status === 'done' ? <Badge label="Done" tone="success" icon="checkmark" /> : <Badge label="Not started" tone="neutral" />}
                    <Button title={s.status === 'done' ? 'Edit' : 'Start'} small variant={s.status === 'done' ? 'secondary' : 'primary'} disabled={locked}
                      onPress={() => router.push({ pathname: '/safety/[step]', params: { step: s.key } })} />
                  </Row>
                </View>
              </Row>
            </Card>
          ))}
          {data.status === 'approved' && (
            <T v="caption" tone="muted" style={{ marginBottom: 8 }}>Changing a check after approval sends your profile back for review, and home tuition locks until it's approved again.</T>
          )}
          <Button title={locked ? 'Submitted for review' : 'Submit for review'} icon="send-outline" disabled={!data.canSubmit} loading={busy} onPress={submit} />
          {!data.canSubmit && data.status === 'not_submitted' && (
            <T v="caption" tone="muted" center style={{ marginTop: 6 }}>Finish all 8 checks to submit. {data.total - data.done} left.</T>
          )}
        </>
      )}
    </Screen>
  );
}

function StatusBadge({ status }: { status: Safety['status'] }) {
  switch (status) {
    case 'approved': return <Badge label="Approved" tone="success" icon="shield-checkmark" />;
    case 'under_review': return <Badge label="Under review" tone="warn" icon="hourglass-outline" />;
    case 'rejected': return <Badge label="Changes needed" tone="danger" />;
    default: return <Badge label="Not submitted" tone="neutral" />;
  }
}
