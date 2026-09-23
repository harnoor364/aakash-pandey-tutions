import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { REPORT_REASONS } from '../../../shared/constants.js';
import { Button, EmptyState, Field, FieldError, FieldLabel, Gap, Notice, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { radius, useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useForm } from '@/lib/useForm';

export default function ReportConcern() {
  const { c } = useTheme();
  const { tutorId, enrolmentId, sessionId, tutorName } = useLocalSearchParams<{ tutorId: string; enrolmentId?: string; sessionId?: string; tutorName?: string }>();
  const toast = useToast();
  const f = useForm({ reason: null as string | null, details: '' });
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    const ok = f.validate([
      ['reason', !f.values.reason, 'Please choose what happened.'],
      ['details', f.values.reason === 'Something else' && !f.values.details.trim(), 'Please tell us briefly what happened.'],
    ]);
    if (!ok) return;
    const res = await f.submit(() => api<{ message: string }>('/parent/reports', {
      body: { tutorId: Number(tutorId), enrolmentId: enrolmentId ? Number(enrolmentId) : null, sessionId: sessionId ? Number(sessionId) : null, ...f.values },
    }));
    if (res.ok) {
      const msg = (res.data as { message: string }).message;
      toast.show('Report sent. Home visits are paused.');
      setDone(msg);
    } else toast.show(res.message, 'error');
  }

  if (done) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="shield-checkmark-outline" title="Thank you for telling us" text={done} action="Done" onAction={() => router.back()} />
        <EmergencyBox />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <EmergencyBox />
      <Gap h={20} />
      <T v="h3">What happened{tutorName ? ` with ${tutorName}` : ''}?</T>
      <Gap h={10} />
      {REPORT_REASONS.map((r) => {
        const selected = f.values.reason === r;
        return (
          <Pressable key={r} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => f.set('reason', r)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: selected ? c.danger : c.border, backgroundColor: selected ? c.dangerSoft : c.surface }}>
            <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? c.danger : c.muted} />
            <T style={{ flex: 1 }}>{r}</T>
          </Pressable>
        );
      })}
      <FieldError text={f.errors.reason} />
      <Gap h={12} />
      <Field label="Details (optional)" value={f.values.details} onChangeText={(x) => f.set('details', x)} multiline maxLength={2000}
        placeholder="Anything that will help our safety team" error={f.errors.details} />
      <Notice tone="warn">When you send this, all home visits from this tutor are paused straight away until our safety team has spoken to you.</Notice>
      <Gap h={20} />
      <Button title="Send report" variant="danger" icon="flag" onPress={submit} loading={f.busy} />
    </Screen>
  );
}

function EmergencyBox() {
  return (
    <Notice tone="danger" title="In an emergency">
      <View>
        <T v="small" tone="danger">If a child is in danger right now, call 112. For child protection help, call Childline 1098.</T>
        <Row gap={10} style={{ marginTop: 10 }} wrap>
          <Button title="Call 112" small variant="danger" icon="call" onPress={() => Linking.openURL('tel:112')} />
          <Button title="Call 1098" small variant="dangerOutline" icon="call-outline" onPress={() => Linking.openURL('tel:1098')} />
        </Row>
      </View>
    </Notice>
  );
}
