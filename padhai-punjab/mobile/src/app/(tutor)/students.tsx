import React, { useState } from 'react';
import { View } from 'react-native';
import { ClassPrompt } from '@/components/CodePrompt';
import { TabHeader } from '@/components/TabHeader';
import { Badge, Button, Card, Divider, EmptyState, ErrorState, InfoLine, Loading, Notice, Row, Screen, Section, T } from '@/components/ui';
import { api } from '@/lib/api';
import { dayLabel, plural } from '@/lib/format';
import { useToast } from '@/lib/toast';
import type { ClassLog } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Student = {
  id: number; childName: string; cls: number; subject: string; mode: 'home' | 'online'; area: string | null; status: 'active' | 'ended';
  parentName: string | null; phone: string | null; logs: ClassLog[];
};

export default function MyStudents() {
  const toast = useToast();
  const { data, loading, error, retry, refreshing, refresh, reload } = useApi<{ students: Student[]; homePaused: boolean }>('/tutor/students');
  const [logFor, setLogFor] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  async function logClass(s: Student, topic: string, code: string) {
    setBusy(true);
    setPromptError(null);
    try {
      const res = await api<{ message: string }>(`/tutor/enrolments/${s.id}/logs`, { body: { topic, visitCode: code } });
      toast.show(res.message);
      setLogFor(null);
      reload();
    } catch (e: any) {
      setPromptError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const active = data?.students.filter((s) => s.status === 'active') ?? [];
  const ended = data?.students.filter((s) => s.status === 'ended') ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="My students" subtitle="Log each class. Parents confirm it, and reviews unlock after 4." />
      {data?.homePaused && <Notice tone="danger" title="Home visits paused">A safety concern was reported. Our team will contact you. You can't log home classes until this is resolved.</Notice>}
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : !data?.students.length ? (
        <EmptyState icon="people-outline" title="No students yet" text="When you accept a demo request, the student appears here so you can log each class." />
      ) : (
        <>
          <Section title={`Active (${active.length})`}>
            {active.map((s) => {
              const confirmed = s.logs.filter((l) => l.parentConfirmed).length;
              const waiting = s.logs.filter((l) => l.parentConfirmed === null).length;
              return (
                <Card key={s.id} style={{ marginBottom: 14 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="h3" style={{ flex: 1 }}>{s.childName}</T>
                    <Badge label={s.mode === 'home' ? 'Home' : 'Online'} tone={s.mode === 'home' ? 'brass' : 'neutral'} />
                  </Row>
                  <InfoLine icon="book-outline">Class {s.cls} · {s.subject}</InfoLine>
                  {s.parentName && <InfoLine icon="person-outline">{s.parentName}{s.phone ? ` · +91 ${s.phone}` : ''}</InfoLine>}
                  {s.area && <InfoLine icon="location-outline">{s.area}</InfoLine>}
                  <InfoLine icon="checkmark-done-outline">{plural(confirmed, 'class')} confirmed{waiting ? ` · ${waiting} waiting for parent` : ''}</InfoLine>
                  <Button title="Log a class" small icon="add-circle-outline" style={{ marginTop: 14, alignSelf: 'flex-start' }}
                    disabled={s.mode === 'home' && data.homePaused}
                    onPress={() => { setPromptError(null); setLogFor(s); }} />
                  {s.logs.length > 0 && <Divider />}
                  {s.logs.slice(0, 6).map((l) => (
                    <Row key={l.id} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
                      <T v="small" style={{ flex: 1 }}>{dayLabel(l.date)} · {l.topic}</T>
                      {l.parentConfirmed === null ? <Badge label="Waiting" tone="warn" /> : l.parentConfirmed ? <Badge label="Confirmed" tone="success" /> : <Badge label="Parent said no" tone="danger" />}
                    </Row>
                  ))}
                </Card>
              );
            })}
          </Section>
          {ended.length > 0 && (
            <Section title="Past students">
              {ended.map((s) => (
                <Card key={s.id} style={{ marginBottom: 10 }}>
                  <T v="bodyStrong">{s.childName} · Class {s.cls} · {s.subject}</T>
                  <T v="small" tone="muted">{plural(s.logs.filter((l) => l.parentConfirmed).length, 'confirmed class')}</T>
                </Card>
              ))}
            </Section>
          )}
        </>
      )}
      <ClassPrompt
        visible={!!logFor}
        title={`Log today's class${logFor ? ` with ${logFor.childName}` : ''}`}
        needsCode={logFor?.mode === 'home'}
        needsTopic
        busy={busy}
        error={promptError}
        onCancel={() => setLogFor(null)}
        onSubmit={({ code, topic }) => logFor && logClass(logFor, topic, code)}
      />
      <View />
    </Screen>
  );
}
