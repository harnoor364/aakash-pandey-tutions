import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { StepAbout, StepBasics, StepFees, StepTeach, StepVerify } from '@/components/TutorSteps';
import { Button, Gap, Notice, ProgressBar, Row, Screen, T } from '@/components/ui';
import { api, appendFile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { FIELD_STEP, emptyTutorForm, profilePayload, stepRules } from '@/lib/tutorForm';
import { useForm } from '@/lib/useForm';

const STEPS = ['Mobile number', 'About you', 'What you teach', 'Fees and timings', 'Verification'];

export default function TutorSignup() {
  const { c } = useTheme();
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const f = useForm(emptyTutorForm(user?.phone ?? ''));
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    // One phone number = one tutor account.
    if (user?.tutor) router.replace('/(tutor)');
    if (user?.name && !f.values.firstName) {
      const [first, ...rest] = user.name.split(' ');
      f.set('firstName', first);
      f.set('lastName', rest.join(' '));
    }
  }, [user?.tutor]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (n: number) => { setStep(n); scroll.current?.scrollTo({ y: 0, animated: false }); };

  function next() {
    if (!f.validate(stepRules(step, f.values))) return toast.show('Please fix the highlighted fields.', 'error');
    if (step < STEPS.length - 1) go(step + 1);
    else submit();
  }

  async function submit() {
    const v = f.values;
    const form = new FormData();
    Object.entries({ ...profilePayload(v), idType: v.idType, agreeNoIncentives: v.agreeNoIncentives, agreeBackground: v.agreeBackground })
      .forEach(([k, val]) => form.append(k, Array.isArray(val) ? JSON.stringify(val) : String(val ?? '')));
    if (v.photo) await appendFile(form, 'photo', v.photo);
    if (v.idDoc) await appendFile(form, 'idDoc', v.idDoc);
    if (v.qualCert) await appendFile(form, 'qualCert', v.qualCert);
    const res = await f.submit(() => api<{ message: string }>('/tutor/signup', { form }));
    if (res.ok) {
      await refresh();
      toast.show('Your profile is live with "ID check pending".');
      router.replace('/(tutor)/safety');
    } else {
      toast.show(res.message, 'error');
      if (res.field && FIELD_STEP[res.field] != null) go(FIELD_STEP[res.field]);
    }
  }

  const props = { v: f.values, set: f.set, errors: f.errors as Record<string, string | undefined> };
  return (
    <Screen edges={['bottom']} scroll={false} padded={false}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="label" tone="primary">Step {step + 1} of {STEPS.length}</T>
          <T v="caption" tone="muted">{STEPS[step]}</T>
        </Row>
        <View style={{ marginTop: 8 }}><ProgressBar value={step + 1} total={STEPS.length} height={8} /></View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <T v="h1">{STEPS[step]}</T>
        <Gap h={12} />
        {step === 0 && <StepBasics {...props} />}
        {step === 1 && <StepAbout {...props} />}
        {step === 2 && <StepTeach {...props} />}
        {step === 3 && <StepFees {...props} />}
        {step === 4 && (
          <>
            <StepVerify {...props} />
            <Notice tone="info">After sign-up your profile goes live with "ID check pending". Home tuition stays locked until our safety checks are approved.</Notice>
          </>
        )}
      </ScrollView>
      <Row gap={10} style={{ padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface }}>
        {step > 0 && <Button title="Back" variant="secondary" onPress={() => go(step - 1)} style={{ flex: 1 }} />}
        <Button title={step === STEPS.length - 1 ? 'Create my profile' : 'Next'} onPress={next} loading={f.busy} style={{ flex: 2 }} />
      </Row>
    </Screen>
  );
}
