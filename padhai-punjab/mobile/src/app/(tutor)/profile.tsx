import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { DocPicker } from '@/components/DocPicker';
import { TabHeader } from '@/components/TabHeader';
import { TutorCard } from '@/components/TutorCard';
import { Badge, Button, Card, ChipGroup, ErrorState, FieldLabel, Gap, InfoLine, Loading, Notice, Row, Screen, Section, T } from '@/components/ui';
import { ID_TYPES } from '../../../../shared/constants.js';
import { api, appendFile, PickedFile } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import { useToast } from '@/lib/toast';
import type { Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Me = {
  profile: Tutor;
  private: {
    email: string | null; phone: string; idType: string; idStatus: 'pending' | 'verified' | 'rejected'; idRejectReason: string | null;
    homeSafeStatus: string; homePaused: boolean; suspended: boolean; offersHome: boolean; homeUnlocked: boolean; policeValidUntil: string | null;
  };
};

export default function TutorProfileTab() {
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<Me>('/tutor/me');
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="My profile" />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : data && (
        <>
          {data.private.suspended && <Notice tone="danger" title="Account suspended">Your profile is hidden from families. Please contact the Padhai Punjab safety team.</Notice>}
          <Card>
            <T v="h3">Verification</T>
            <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <T>ID ({data.private.idType})</T>
              {data.private.idStatus === 'verified' ? <Badge label="✓ ID verified" /> : data.private.idStatus === 'rejected' ? <Badge label="Rejected" tone="danger" /> : <Badge label="ID check pending" tone="warn" />}
            </Row>
            <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <T>Home tuition</T>
              {data.private.homeUnlocked ? <Badge label="🛡 Unlocked" /> : <Badge label="Locked" tone="neutral" />}
            </Row>
            {data.private.policeValidUntil && <InfoLine icon="shield-outline">Police certificate valid until {prettyDate(data.private.policeValidUntil)}</InfoLine>}
            {!data.private.homeUnlocked && data.private.offersHome && (
              <Button title="Finish safety checks" small variant="secondary" icon="shield-checkmark-outline" style={{ marginTop: 12, alignSelf: 'flex-start' }} onPress={() => router.navigate('/(tutor)/safety')} />
            )}
          </Card>
          {data.private.idStatus === 'rejected' && <ReuploadId reason={data.private.idRejectReason} onDone={reload} />}

          <Row gap={10} style={{ marginTop: 16 }}>
            <Button title="Edit profile" icon="create-outline" onPress={() => router.push('/profile-edit')} style={{ flex: 1 }} />
            <Button title="Full preview" variant="secondary" icon="eye-outline" onPress={() => router.push({ pathname: '/tutor/[id]', params: { id: String(data.profile.id), preview: '1' } })} style={{ flex: 1 }} />
          </Row>

          <Section title="How parents see you">
            <View pointerEvents="none">
              <TutorCard tutor={{ ...data.profile, rank: undefined }} onBook={() => {}} />
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

function ReuploadId({ reason, onDone }: { reason: string | null; onDone: () => void }) {
  const toast = useToast();
  const [idType, setIdType] = useState<string | null>(null);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  async function upload() {
    if (!idType || !file) return toast.show('Choose the ID type and add a photo.', 'error');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('idType', idType);
      await appendFile(form, 'idDoc', file);
      const res = await api<{ message: string }>('/tutor/id-document', { form });
      toast.show(res.message);
      onDone();
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card style={{ marginTop: 12 }}>
      <Notice tone="danger" title="Please upload your ID again">{reason ?? 'The photo was not clear enough.'}</Notice>
      <Gap h={12} />
      <FieldLabel>ID type</FieldLabel>
      <ChipGroup options={ID_TYPES} value={idType} onChange={setIdType} />
      <Gap h={12} />
      <DocPicker label="ID photo" value={file} onChange={setFile} />
      <Button title="Upload ID" onPress={upload} loading={busy} />
    </Card>
  );
}
