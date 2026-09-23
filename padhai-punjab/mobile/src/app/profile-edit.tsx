import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StepAbout, StepBasics, StepFees, StepTeach } from '@/components/TutorSteps';
import { Button, ErrorState, Gap, Loading, Screen, Section } from '@/components/ui';
import { api, appendFile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { emptyTutorForm, profilePayload, stepRules } from '@/lib/tutorForm';
import type { Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { useForm } from '@/lib/useForm';

export default function ProfileEdit() {
  const toast = useToast();
  const { refresh } = useAuth();
  const me = useApi<{ profile: Tutor; private: { email: string | null; phone: string; offersHome: boolean } }>('/tutor/me', { refetchOnFocus: false });
  const f = useForm(emptyTutorForm());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!me.data || loaded) return;
    const p = me.data.profile;
    const [first, ...rest] = p.name.split(' ');
    f.setValues({
      ...emptyTutorForm(me.data.private.phone), firstName: first, lastName: rest.join(' '), email: me.data.private.email ?? '',
      city: p.city, areas: p.areas, qualification: p.qualification, experienceYears: String(p.experienceYears), languages: p.languages,
      intro: p.intro, classFrom: p.classFrom, classTo: p.classTo, schoolSubjects: p.schoolSubjects, boards: p.boards,
      collegeSubjects: p.collegeSubjects, offersHome: me.data.private.offersHome,
      offersOnline: p.offersOnline, monthlyFee: String(p.monthlyFee), hourPrice: p.hourPrice != null ? String(p.hourPrice) : '',
      topicPrice: p.topicPrice != null ? String(p.topicPrice) : '', availableDays: p.availableDays, availableTimes: p.availableTimes,
    });
    setLoaded(true);
  }, [me.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (me.loading || !loaded) return <Screen edges={[]}>{me.error ? <ErrorState message={me.error} onRetry={me.retry} /> : <Loading />}</Screen>;

  async function save() {
    const rules = [0, 1, 2, 3].flatMap((s) => stepRules(s, f.values, { requirePhoto: false }));
    if (!f.validate(rules)) return toast.show('Please fix the highlighted fields.', 'error');
    const res = await f.submit(async () => {
      if (f.values.photo) {
        const form = new FormData();
        await appendFile(form, 'photo', f.values.photo);
        await api('/tutor/photo', { form });
      }
      return api<{ message: string }>('/tutor/profile', { method: 'PUT', body: profilePayload(f.values) });
    });
    if (res.ok) {
      await refresh();
      toast.show(res.data.message);
      router.back();
    } else toast.show(res.message, 'error');
  }

  const props = { v: f.values, set: f.set, errors: f.errors as Record<string, string | undefined> };
  return (
    <Screen edges={['bottom']}>
      <StepBasics {...props} />
      <Section title="About you"><StepAbout {...props} existingPhotoUrl={me.data?.profile.photoUrl} /></Section>
      <Section title="What you teach"><StepTeach {...props} /></Section>
      <Section title="Fees and timings"><StepFees {...props} /></Section>
      <Gap h={20} />
      <Button title="Save profile" onPress={save} loading={f.busy} />
    </Screen>
  );
}
