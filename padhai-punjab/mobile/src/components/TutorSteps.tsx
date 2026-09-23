import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BOARDS, CLASSES, COLLEGE_SUBJECTS, DISTRICTS, ID_TYPES, INTRO_MAX, INTRO_MIN, LANGUAGES, MIN_MONTHLY_FEE,
  QUALIFICATIONS, SCHOOL_SUBJECTS, TIMES_OF_DAY, WEEKDAYS,
} from '../../../shared/constants.js';
import { absoluteUrl } from '@/lib/api';
import { pickProfilePhoto } from '@/lib/pickImage';
import { useTheme } from '@/lib/theme';
import type { TutorFormValues } from '@/lib/tutorForm';
import { DocPicker } from './DocPicker';
import {
  Button, Checkbox, Chip, ChipGroup, Field, FieldError, FieldLabel, Gap, Notice, Row, Select, T,
} from './ui';

type Props = {
  v: TutorFormValues;
  set: <K extends keyof TutorFormValues>(k: K, val: TutorFormValues[K]) => void;
  errors: Record<string, string | undefined>;
};

export function StepBasics({ v, set, errors, phoneVerified = true }: Props & { phoneVerified?: boolean }) {
  const { c } = useTheme();
  return (
    <View>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <Field label="First name" value={v.firstName} onChangeText={(x) => set('firstName', x)} error={errors.firstName} autoComplete="given-name" style={{ flex: 1 }} maxLength={40} />
        <Field label="Last name" value={v.lastName} onChangeText={(x) => set('lastName', x)} error={errors.lastName} autoComplete="family-name" style={{ flex: 1 }} maxLength={40} />
      </Row>
      <T v="label" style={{ marginBottom: 6 }}>Mobile number</T>
      <Row gap={8} style={{ minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, paddingHorizontal: 14, backgroundColor: c.surfaceAlt }}>
        <T v="bodyStrong" style={{ flex: 1 }}>+91 {v.phone}</T>
        {phoneVerified && <Row gap={4}><Ionicons name="checkmark-circle" size={18} color={c.primary} /><T v="caption" tone="primary">OTP verified</T></Row>}
      </Row>
      <T v="caption" tone="muted" style={{ marginTop: 4, marginBottom: 16 }}>One mobile number can have only one tutor account.</T>
      <FieldError text={errors.phone} />
      <Field label="Email (optional)" value={v.email} onChangeText={(x) => set('email', x)} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    </View>
  );
}

export function StepAbout({ v, set, errors, existingPhotoUrl }: Props & { existingPhotoUrl?: string | null }) {
  const { c } = useTheme();
  const photoUri = v.photo?.uri ?? absoluteUrl(existingPhotoUrl);
  const addArea = () => {
    const a = v.areaInput.trim();
    if (a && !v.areas.includes(a) && v.areas.length < 12) set('areas', [...v.areas, a]);
    set('areaInput', '');
  };
  return (
    <View>
      <FieldLabel hint="A clear, recent photo of your face. Parents check it at the door.">Profile photo</FieldLabel>
      <Row gap={16}>
        <Pressable onPress={async () => { const p = await pickProfilePhoto(); if (p) set('photo', p); }} accessibilityRole="button" accessibilityLabel="Choose profile photo"
          style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: errors.photo ? c.danger : c.brass }}>
          {photoUri ? <Image source={{ uri: photoUri }} style={{ width: 104, height: 104 }} /> : <Ionicons name="camera-outline" size={34} color={c.muted} />}
        </Pressable>
        <Button title={photoUri ? 'Change photo' : 'Add photo'} small variant="secondary" icon="image-outline"
          onPress={async () => { const p = await pickProfilePhoto(); if (p) set('photo', p); }} />
      </Row>
      <FieldError text={errors.photo} />
      <Gap h={16} />
      <Select label="City" value={v.city} options={DISTRICTS} onChange={(x) => set('city', x)} searchable error={errors.city} />
      <Field label="Areas you travel to" value={v.areaInput} onChangeText={(x) => set('areaInput', x)} placeholder="e.g. Model Town" onSubmitEditing={addArea}
        returnKeyType="done" error={errors.areas} hint="Type an area and tap Add. Add as many as you like." style={{ marginBottom: 8 }} maxLength={40} />
      <Row wrap gap={8}>
        <Button title="Add area" small variant="secondary" icon="add" onPress={addArea} />
        {v.areas.map((a) => <Chip key={a} label={`${a}  ✕`} onPress={() => set('areas', v.areas.filter((x) => x !== a))} />)}
      </Row>
      <Gap h={16} />
      <Select label="Highest qualification" value={v.qualification} options={QUALIFICATIONS} onChange={(x) => set('qualification', x)} error={errors.qualification} />
      <Field label="Years of teaching experience" value={v.experienceYears} onChangeText={(x) => set('experienceYears', x.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" error={errors.experienceYears} maxLength={2} />
      <FieldLabel>Teaching languages</FieldLabel>
      <ChipGroup options={LANGUAGES} value={v.languages} multi onChange={(x: string[]) => set('languages', x)} />
      <FieldError text={errors.languages} />
      <Gap h={16} />
      <Field label="Introduce yourself to parents" value={v.intro} onChangeText={(x) => set('intro', x)} multiline maxLength={INTRO_MAX}
        placeholder="What do you teach, how do you teach, and what results have your students had?"
        counter={{ value: v.intro.trim().length, min: INTRO_MIN, max: INTRO_MAX }} error={errors.intro} />
    </View>
  );
}

export function StepTeach({ v, set, errors }: Props) {
  return (
    <View>
      <T v="h3">School (Class 1–12)</T>
      <Gap h={10} />
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><Select label="From class" value={v.classFrom} options={CLASSES} format={(n) => `Class ${n}`} onChange={(x) => set('classFrom', x)} error={errors.classFrom} /></View>
        <View style={{ flex: 1 }}><Select label="To class" value={v.classTo} options={CLASSES} format={(n) => `Class ${n}`} onChange={(x) => set('classTo', x)} error={errors.classTo} /></View>
      </Row>
      <FieldLabel>School subjects</FieldLabel>
      <ChipGroup options={SCHOOL_SUBJECTS} value={v.schoolSubjects} multi onChange={(x: string[]) => set('schoolSubjects', x)} />
      <FieldError text={errors.schoolSubjects} />
      <Gap h={16} />
      <FieldLabel>Boards</FieldLabel>
      <ChipGroup options={BOARDS} value={v.boards} multi onChange={(x: string[]) => set('boards', x)} />
      <FieldError text={errors.boards} />
      <Gap h={24} />
      <T v="h3">College</T>
      <T v="small" tone="muted" style={{ marginBottom: 10 }}>College subjects are taught as one-hour or full-topic classes.</T>
      <ChipGroup options={COLLEGE_SUBJECTS} value={v.collegeSubjects} multi onChange={(x: string[]) => set('collegeSubjects', x)} />
      <FieldError text={errors.collegeSubjects} />
    </View>
  );
}

export function StepFees({ v, set, errors }: Props) {
  const college = v.collegeSubjects.length > 0;
  return (
    <View>
      <FieldLabel>How do you teach?</FieldLabel>
      <Row wrap gap={8}>
        <Chip label="Home tuition" icon="home-outline" selected={v.offersHome} onPress={() => set('offersHome', !v.offersHome)} />
        <Chip label="Online" icon="laptop-outline" selected={v.offersOnline} onPress={() => set('offersOnline', !v.offersOnline)} />
      </Row>
      <FieldError text={errors.offersHome} />
      {v.offersHome && (
        <View style={{ marginTop: 12 }}>
          <Notice tone="warn" title="Home tuition stays locked for now">You'll appear for online classes first. Home tuition unlocks after you finish all 8 safety checks and our team approves them.</Notice>
        </View>
      )}
      <Gap h={16} />
      <Field label="Monthly fee (₹)" value={v.monthlyFee} onChangeText={(x) => set('monthlyFee', x.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad"
        error={errors.monthlyFee} hint={`Minimum ₹${MIN_MONTHLY_FEE}. For regular classes, per subject.`} />
      <T v="h3">One-hour and topic classes</T>
      <T v="small" tone="muted" style={{ marginBottom: 12 }}>{college ? 'Required because you teach college subjects.' : 'Optional. For Class 9–12 students who need help with one topic.'}</T>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <Field label="One-hour (₹)" value={v.hourPrice} onChangeText={(x) => set('hourPrice', x.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" error={errors.hourPrice} style={{ flex: 1 }} />
        <Field label="Full topic (₹)" value={v.topicPrice} onChangeText={(x) => set('topicPrice', x.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" error={errors.topicPrice} style={{ flex: 1 }} hint="Up to 2 hours" />
      </Row>
      <FieldLabel>Days you are free</FieldLabel>
      <ChipGroup options={WEEKDAYS} value={v.availableDays} multi onChange={(x: string[]) => set('availableDays', x)} />
      <FieldError text={errors.availableDays} />
      <Gap h={16} />
      <FieldLabel>Times of day</FieldLabel>
      <ChipGroup options={Object.keys(TIMES_OF_DAY)} value={v.availableTimes} multi onChange={(x: string[]) => set('availableTimes', x)}
        labels={(k) => { const t = TIMES_OF_DAY[k as keyof typeof TIMES_OF_DAY]; return `${t.label} (${t.range})`; }} />
      <FieldError text={errors.availableTimes} />
    </View>
  );
}

export function StepVerify({ v, set, errors }: Props) {
  return (
    <View>
      <T tone="muted" style={{ marginBottom: 16 }}>Documents are stored privately. Only the Padhai Punjab safety team can see them — never families.</T>
      <FieldLabel>ID type</FieldLabel>
      <ChipGroup options={ID_TYPES} value={v.idType} onChange={(x: string) => set('idType', x)} />
      <FieldError text={errors.idType} />
      <Gap h={16} />
      <DocPicker label={`Photo of your ${v.idType ?? 'ID'}`} hint="All four corners visible, no glare." value={v.idDoc} onChange={(f) => set('idDoc', f)} error={errors.idDoc} />
      <DocPicker label="Qualification certificate (optional)" hint="Degree or final mark sheet." value={v.qualCert} onChange={(f) => set('qualCert', f)} error={errors.qualCert} />
      <Checkbox checked={v.agreeNoIncentives} onChange={(x) => set('agreeNoIncentives', x)} error={errors.agreeNoIncentives}
        label="I will never offer discounts, free classes or favours in exchange for reviews." />
      <Checkbox checked={v.agreeBackground} onChange={(x) => set('agreeBackground', x)} error={errors.agreeBackground}
        label="I agree to a background check and to follow Padhai Punjab's child-safety rules." />
    </View>
  );
}
