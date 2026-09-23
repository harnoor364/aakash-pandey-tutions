import React, { useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Divider, ErrorState, Field, Gap, InfoLine, Loading, Notice, Row, Screen, Section, T, TrustBadges } from '@/components/ui';
import { absoluteUrl, api, getAuthToken } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Check = { key: string; title: string; done: boolean; data: any; fileUrl: string | null; updatedAt: string | null };
type Detail = {
  tutor: Tutor;
  private: {
    phone: string; email: string | null; idType: string; idStatus: string; idRejectReason: string | null; idDocUrl: string | null;
    qualCertUrl: string | null; photoUrl: string | null; homeSafeStatus: string; homeSafeReason: string | null; homePaused: boolean; suspended: boolean;
  };
  checks: Check[];
  reports: { id: number; reason: string; status: string; created_at: string }[];
};

function Doc({ url, label, size = 150 }: { url: string | null; label: string; size?: number }) {
  const { c } = useTheme();
  const uri = absoluteUrl(url);
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      {uri ? (
        <Image source={{ uri, headers: { Authorization: `Bearer ${getAuthToken()}` } }} style={{ width: '100%', height: size, borderRadius: 12, backgroundColor: c.surfaceAlt }} resizeMode="cover" accessibilityLabel={label} />
      ) : (
        <View style={{ width: '100%', height: size, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><T v="caption" tone="muted">No file</T></View>
      )}
      <T v="caption" tone="muted" style={{ marginTop: 4 }}>{label}</T>
    </View>
  );
}

export default function AdminTutor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data, loading, error, retry, reload } = useApi<Detail>(`/admin/tutors/${id}`);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(kind: 'id-check' | 'home-safe', approve: boolean) {
    if (!approve && reason.trim().length < 5) return toast.show('Write a reason the tutor will see (at least 5 characters).', 'error');
    setBusy(`${kind}-${approve}`);
    try {
      const res = await api<{ message: string }>(`/admin/tutors/${id}/${kind}`, { body: { approve, reason } });
      toast.show(res.message);
      setReason('');
      reload();
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Screen edges={[]}><Loading /></Screen>;
  if (error || !data) return <Screen edges={[]}><ErrorState message={error ?? ''} onRetry={retry} /></Screen>;
  const p = data.private;
  const check = (k: string) => data.checks.find((x) => x.key === k)!;
  const selfie = check('selfie');
  const refs = check('references').data?.refs ?? [];

  return (
    <Screen edges={['bottom']}>
      <T v="h1">{data.tutor.name}</T>
      <T tone="muted">{data.tutor.city} · +91 {p.phone}{p.email ? ` · ${p.email}` : ''}</T>
      <View style={{ marginTop: 8 }}><TrustBadges homeSafe={data.tutor.badges.homeSafe} idVerified={data.tutor.badges.idVerified} /></View>
      {p.homePaused && <View style={{ marginTop: 10 }}><Notice tone="danger">Home visits are paused because of a safety report.</Notice></View>}

      <Section title="Selfie vs ID photo">
        <Card>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            <Doc url={selfie.fileUrl} label="Live selfie (front camera)" size={180} />
            <Doc url={p.idDocUrl} label={`${p.idType} photo`} size={180} />
          </Row>
          <Gap h={12} />
          <Row gap={12}><Doc url={p.photoUrl} label="Profile photo" size={120} /><Doc url={p.qualCertUrl} label="Qualification (sign-up)" size={120} /></Row>
          <Divider />
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label">ID check</T>
            <Badge label={p.idStatus} tone={p.idStatus === 'verified' ? 'success' : p.idStatus === 'rejected' ? 'danger' : 'warn'} />
          </Row>
          {p.idStatus !== 'verified' && (
            <Row gap={10} style={{ marginTop: 10 }}>
              <Button title="Verify ID" small icon="checkmark" onPress={() => decide('id-check', true)} loading={busy === 'id-check-true'} style={{ flex: 1 }} />
              <Button title="Reject ID" small variant="dangerOutline" onPress={() => decide('id-check', false)} loading={busy === 'id-check-false'} style={{ flex: 1 }} />
            </Row>
          )}
        </Card>
      </Section>

      <Section title="Safety checks">
        {data.checks.map((ch) => (
          <Card key={ch.key} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="h3" style={{ flex: 1 }}>{ch.title}</T>
              {ch.done ? <Badge label="Done" /> : <Badge label="Missing" tone="danger" />}
            </Row>
            {ch.data && <CheckData k={ch.key} d={ch.data} />}
            {ch.fileUrl && ch.key !== 'selfie' && <View style={{ marginTop: 10 }}><Doc url={ch.fileUrl} label="Uploaded document" size={160} /></View>}
            {ch.updatedAt && <T v="caption" tone="muted" style={{ marginTop: 6 }}>Updated {prettyDate(ch.updatedAt)}</T>}
          </Card>
        ))}
      </Section>

      {refs.length > 0 && (
        <Section title="Call references">
          {refs.map((r: any) => (
            <Card key={r.mobile} style={{ marginBottom: 10 }}>
              <T v="bodyStrong">{r.name}</T>
              <T v="small" tone="muted">{r.relationship}</T>
              <Button title={`Call +91 ${r.mobile}`} small variant="secondary" icon="call-outline" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => Linking.openURL(`tel:+91${r.mobile}`)} />
            </Card>
          ))}
        </Section>
      )}

      {data.reports.length > 0 && (
        <Section title="Safety reports">
          {data.reports.map((r) => <InfoLine key={r.id} icon="warning-outline">#{r.id} · {r.reason} · {r.status.replace('_', ' ')} · {prettyDate(r.created_at)}</InfoLine>)}
        </Section>
      )}

      <Section title="Home-safe decision">
        <Card>
          <T>Status: <T v="bodyStrong">{p.homeSafeStatus.replace('_', ' ')}</T></T>
          {p.homeSafeReason && <T v="small" tone="muted">Last reason: {p.homeSafeReason}</T>}
          <Gap h={12} />
          <Field label="Reason (needed to reject)" value={reason} onChangeText={setReason} multiline maxLength={300} placeholder="e.g. Police certificate photo is blurred. Please upload a clearer copy." />
          <Row gap={10}>
            <Button title="Approve" icon="shield-checkmark" onPress={() => decide('home-safe', true)} loading={busy === 'home-safe-true'} disabled={p.homeSafeStatus !== 'under_review'} style={{ flex: 1 }} />
            <Button title="Reject" variant="dangerOutline" onPress={() => decide('home-safe', false)} loading={busy === 'home-safe-false'} disabled={p.homeSafeStatus !== 'under_review'} style={{ flex: 1 }} />
          </Row>
          {p.homeSafeStatus !== 'under_review' && <T v="caption" tone="muted" style={{ marginTop: 8 }}>Decisions are possible once the tutor submits all 8 checks.</T>}
        </Card>
      </Section>
    </Screen>
  );
}

function CheckData({ k, d }: { k: string; d: any }) {
  const lines: string[] = {
    aadhaar: [`Aadhaar: ${d.masked}`],
    selfie: ['Captured live with front camera'],
    police: [`Certificate: ${d.certNumber}`, `Issued: ${d.issueDate} · valid until ${d.validUntil}`],
    address: [d.address, `PIN ${d.pin} · ${d.proofType}`],
    qualification: [`${d.degree}, ${d.university}`],
    references: (d.refs ?? []).map((r: any) => `${r.name} (${r.relationship})`),
    training: ['Passed the child-safety quiz (all answers correct)'],
    interview: [`Interview: ${d.date} at ${d.time}`],
  }[k] ?? [];
  return <View style={{ marginTop: 6 }}>{lines.map((l) => <T key={l} v="small">{l}</T>)}</View>;
}
