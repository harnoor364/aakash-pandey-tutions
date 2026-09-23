import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import {
  ADDRESS_PROOF_TYPES, CHILD_SAFETY_RULES, INTERVIEW_TIMES, REFERENCE_RELATIONSHIPS, SAFETY_STEPS, isAadhaar,
  isIndianMobile, isPunjabPin,
} from '../../../../shared/constants.js';
import { DocPicker } from '@/components/DocPicker';
import {
  Button, Card, Checkbox, ChipGroup, EmptyState, ErrorState, Field, FieldError, FieldLabel, Gap, Loading, Notice, Row, Screen, T,
} from '@/components/ui';
import { api, appendFile, PickedFile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, dayLabel, todayIst } from '@/lib/format';
import { radius, useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useApi } from '@/lib/useApi';
import { useForm } from '@/lib/useForm';

export default function SafetyStep() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const meta = SAFETY_STEPS.find((s) => s.key === step);
  const toast = useToast();
  const finish = (message: string) => { toast.show(message); router.back(); };
  if (!meta) return <Screen edges={[]}><EmptyState icon="help-outline" title="Unknown step" text="Please go back and choose a check." /></Screen>;

  const body = {
    aadhaar: <AadhaarStep onDone={finish} />,
    selfie: <SelfieStep onDone={finish} />,
    police: <PoliceStep onDone={finish} />,
    address: <AddressStep onDone={finish} />,
    qualification: <QualificationStep onDone={finish} />,
    references: <ReferencesStep onDone={finish} />,
    training: <TrainingStep onDone={finish} />,
    interview: <InterviewStep onDone={finish} />,
  }[meta.key];

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: meta.title }} />
      <Notice tone="info" title="Why we ask">{meta.why}</Notice>
      <Gap h={20} />
      {body}
    </Screen>
  );
}

type StepProps = { onDone: (message: string) => void };

// 1. Aadhaar e-KYC
function AadhaarStep({ onDone }: StepProps) {
  const toast = useToast();
  const f = useForm({ aadhaar: '', otp: '' });
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const digits = f.values.aadhaar.replace(/\D/g, '');
  const pretty = digits.replace(/(\d{4})(?=\d)/g, '$1 ');

  async function send() {
    if (!f.validate([
      ['aadhaar', digits.length !== 12, 'Aadhaar number must be 12 digits.'],
      ['aadhaar', digits.length === 12 && !isAadhaar(digits), 'Aadhaar numbers never start with 0 or 1. Please check the number.'],
    ])) return;
    const res = await f.submit(() => api<{ message: string; devOtp?: string }>('/tutor/safety/aadhaar/start', { body: { aadhaar: digits } }));
    if (res.ok) { setSent(true); setDevOtp(res.data.devOtp ?? null); toast.show(res.data.message); } else if (!res.field) toast.show(res.message, 'error');
  }
  async function verify() {
    if (!f.validate([['otp', !/^\d{4,6}$/.test(f.values.otp), 'Enter the OTP you received.']])) return;
    const res = await f.submit(() => api<{ message: string }>('/tutor/safety/aadhaar/verify', { body: { otp: f.values.otp } }));
    if (res.ok) onDone(res.data.message); else if (!res.field) toast.show(res.message, 'error');
  }

  return (
    <View>
      <Field label="Aadhaar number" value={pretty} onChangeText={(x) => f.set('aadhaar', x.replace(/\D/g, '').slice(0, 12))} keyboardType="number-pad"
        maxLength={14} placeholder="1234 5678 9012" error={f.errors.aadhaar} editable={!sent} inputStyle={{ letterSpacing: 1.5 }}
        hint="We only keep the last 4 digits (XXXX XXXX 1234). The full number is never stored." />
      {!sent ? (
        <Button title="Send OTP" onPress={send} loading={f.busy} icon="chatbubble-ellipses-outline" />
      ) : (
        <>
          <Field label="OTP sent to your Aadhaar-linked mobile" value={f.values.otp} onChangeText={(x) => f.set('otp', x.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad" maxLength={6} error={f.errors.otp} textContentType="oneTimeCode" />
          {devOtp && <View style={{ marginBottom: 12 }}><Notice tone="info" title="Test mode">{`e-KYC provider not connected. Your OTP is ${devOtp}.`}</Notice></View>}
          <Button title="Verify Aadhaar" onPress={verify} loading={f.busy} />
          <Button title="Change number" variant="ghost" onPress={() => { setSent(false); f.set('otp', ''); }} />
        </>
      )}
    </View>
  );
}

// 2. Live selfie — front camera only, no gallery.
function SelfieStep({ onDone }: StepProps) {
  const { c } = useTheme();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);

  async function capture() {
    const pic = await cam.current?.takePictureAsync({ quality: 0.7, skipProcessing: false });
    if (pic?.uri) setShot({ uri: pic.uri, mimeType: 'image/jpeg', name: 'selfie.jpg' });
  }
  async function upload() {
    if (!shot) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('source', 'front-camera');
      await appendFile(form, 'selfie', shot);
      const res = await api<{ message: string }>('/tutor/safety/selfie', { form });
      onDone(res.message);
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!permission) return <Loading />;
  if (!permission.granted) {
    return (
      <EmptyState icon="camera-outline" title="Camera access needed" text="The selfie must be taken live with your front camera. Gallery photos are not accepted."
        action={permission.canAskAgain ? 'Allow camera' : undefined} onAction={requestPermission} />
    );
  }
  return (
    <View>
      <T tone="muted" style={{ marginBottom: 12 }}>Face the camera in good light. Remove sunglasses or a mask. Keep your face inside the circle.</T>
      <View style={{ alignSelf: 'center', width: 280, height: 280, borderRadius: 140, overflow: 'hidden', borderWidth: 3, borderColor: c.brass, backgroundColor: c.surfaceAlt }}>
        {shot ? (
          <Image source={{ uri: shot.uri }} style={{ width: 280, height: 280, transform: [{ scaleX: -1 }] }} accessibilityLabel="Your selfie" />
        ) : (
          <CameraView ref={cam} facing="front" mirror style={{ flex: 1 }} onCameraReady={() => setReady(true)} />
        )}
      </View>
      <Gap h={20} />
      {shot ? (
        <Row gap={10}>
          <Button title="Retake" variant="secondary" icon="refresh" onPress={() => setShot(null)} style={{ flex: 1 }} />
          <Button title="Use this selfie" icon="checkmark" onPress={upload} loading={busy} style={{ flex: 1 }} />
        </Row>
      ) : (
        <Button title="Take selfie" icon="camera" onPress={capture} disabled={!ready} />
      )}
    </View>
  );
}

// 3. Police verification certificate
function toIso(dmy: string) {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}
function maskDate(x: string) {
  const d = x.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
}

function PoliceStep({ onDone }: StepProps) {
  const toast = useToast();
  const f = useForm({ certNumber: '', issueDate: '', file: null as PickedFile | null });
  async function save() {
    const iso = toIso(f.values.issueDate);
    const sixMonthsAgo = addDays(todayIst(), -183);
    if (!f.validate([
      ['certNumber', f.values.certNumber.trim().length < 4, 'Enter the certificate number.'],
      ['issueDate', !iso, 'Enter the issue date as DD/MM/YYYY.'],
      ['issueDate', !!iso && iso > todayIst(), "The issue date can't be in the future."],
      ['issueDate', !!iso && iso < sixMonthsAgo, 'The certificate must be issued in the last 6 months.'],
      ['certificate', !f.values.file, 'Please upload a photo of the certificate.'],
    ])) return;
    const form = new FormData();
    form.append('certNumber', f.values.certNumber.trim());
    form.append('issueDate', iso!);
    await appendFile(form, 'certificate', f.values.file!);
    const res = await f.submit(() => api<{ message: string }>('/tutor/safety/police', { form }));
    if (res.ok) onDone(res.data.message); else if (!res.field) toast.show(res.message, 'error');
  }
  return (
    <View>
      <Card style={{ marginBottom: 16 }}>
        <T v="label">How to get it</T>
        <T v="small" tone="muted">Apply for a "Police Clearance / Character Verification" certificate at your nearest Saanjh Kendra or on the PP Saanjh portal (Punjab Police). It usually takes 7–15 days.</T>
      </Card>
      <Field label="Certificate number" value={f.values.certNumber} onChangeText={(x) => f.set('certNumber', x)} error={f.errors.certNumber} autoCapitalize="characters" maxLength={40} />
      <Field label="Issue date" value={f.values.issueDate} onChangeText={(x) => f.set('issueDate', maskDate(x))} placeholder="DD/MM/YYYY" keyboardType="number-pad" maxLength={10}
        error={f.errors.issueDate} hint="Must be within the last 6 months. Valid for 1 year from this date." />
      <DocPicker label="Certificate photo" value={f.values.file} onChange={(x) => f.set('file', x)} error={f.errors.certificate} />
      <Button title="Save certificate" onPress={save} loading={f.busy} />
    </View>
  );
}

// 4. Current address (private)
function AddressStep({ onDone }: StepProps) {
  const toast = useToast();
  const f = useForm({ address: '', pin: '', proofType: null as string | null, file: null as PickedFile | null });
  async function save() {
    const v = f.values;
    if (!f.validate([
      ['address', v.address.trim().length < 15, 'Please enter your full address (house, street, area, city).'],
      ['pin', !/^\d{6}$/.test(v.pin), 'PIN code must be 6 digits.'],
      ['pin', /^\d{6}$/.test(v.pin) && !isPunjabPin(v.pin), 'Please enter a Punjab PIN code (it starts with 14, 15 or 16).'],
      ['proofType', !v.proofType, 'Choose the type of proof.'],
      ['proof', !v.file, 'Please upload your address proof.'],
    ])) return;
    const form = new FormData();
    form.append('address', v.address.trim());
    form.append('pin', v.pin);
    form.append('proofType', v.proofType!);
    await appendFile(form, 'proof', v.file!);
    const res = await f.submit(() => api<{ message: string }>('/tutor/safety/address', { form }));
    if (res.ok) onDone(res.data.message); else if (!res.field) toast.show(res.message, 'error');
  }
  return (
    <View>
      <Notice tone="success" icon="lock-closed">Your address is never shown to families.</Notice>
      <Gap h={16} />
      <Field label="Full address" value={f.values.address} onChangeText={(x) => f.set('address', x)} multiline maxLength={300} error={f.errors.address} autoComplete="street-address" />
      <Field label="PIN code" value={f.values.pin} onChangeText={(x) => f.set('pin', x.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} error={f.errors.pin} autoComplete="postal-code" />
      <FieldLabel>Proof type</FieldLabel>
      <ChipGroup options={ADDRESS_PROOF_TYPES} value={f.values.proofType} onChange={(x: string) => f.set('proofType', x)} />
      <FieldError text={f.errors.proofType} />
      <Gap h={16} />
      <DocPicker label="Address proof photo" value={f.values.file} onChange={(x) => f.set('file', x)} error={f.errors.proof} />
      <Button title="Save address" onPress={save} loading={f.busy} />
    </View>
  );
}

// 5. Qualification certificate
function QualificationStep({ onDone }: StepProps) {
  const toast = useToast();
  const f = useForm({ degree: '', university: '', file: null as PickedFile | null });
  async function save() {
    if (!f.validate([
      ['degree', f.values.degree.trim().length < 2, 'Enter your degree, e.g. M.Sc. Mathematics.'],
      ['university', f.values.university.trim().length < 2, 'Enter the university or board.'],
      ['certificate', !f.values.file, 'Please upload your degree or mark sheet.'],
    ])) return;
    const form = new FormData();
    form.append('degree', f.values.degree.trim());
    form.append('university', f.values.university.trim());
    await appendFile(form, 'certificate', f.values.file!);
    const res = await f.submit(() => api<{ message: string }>('/tutor/safety/qualification', { form }));
    if (res.ok) onDone(res.data.message); else if (!res.field) toast.show(res.message, 'error');
  }
  return (
    <View>
      <Field label="Degree" value={f.values.degree} onChangeText={(x) => f.set('degree', x)} placeholder="e.g. M.Sc. Mathematics" error={f.errors.degree} maxLength={80} />
      <Field label="University or board" value={f.values.university} onChangeText={(x) => f.set('university', x)} placeholder="e.g. Punjabi University, Patiala" error={f.errors.university} maxLength={120} />
      <DocPicker label="Certificate photo" value={f.values.file} onChange={(x) => f.set('file', x)} error={f.errors.certificate} />
      <Button title="Save qualification" onPress={save} loading={f.busy} />
    </View>
  );
}

// 6. Two references
function ReferencesStep({ onDone }: StepProps) {
  const toast = useToast();
  const { user } = useAuth();
  const blank = { name: '', mobile: '', relationship: null as string | null };
  const f = useForm({ r0: { ...blank }, r1: { ...blank }, notFamily: false });
  const setRef = (i: 0 | 1, k: keyof typeof blank, val: string) => f.set(i === 0 ? 'r0' : 'r1', { ...f.values[i === 0 ? 'r0' : 'r1'], [k]: val });

  async function save() {
    const { r0, r1 } = f.values;
    const rules: [string, boolean, string][] = [];
    [r0, r1].forEach((r, i) => {
      rules.push([`refs.${i}.name`, r.name.trim().length < 2, `Enter reference ${i + 1}'s name.`]);
      rules.push([`refs.${i}.mobile`, !isIndianMobile(r.mobile), 'Enter a valid 10-digit mobile number.']);
      rules.push([`refs.${i}.mobile`, r.mobile === user?.phone, "This can't be your own number."]);
      rules.push([`refs.${i}.relationship`, !r.relationship, 'Choose how you know them.']);
    });
    rules.push(['refs.1.mobile', isIndianMobile(r0.mobile) && r0.mobile === r1.mobile, 'The two references must have different numbers.']);
    rules.push(['notFamily', !f.values.notFamily, 'Please confirm neither reference is a family member.']);
    if (!f.validate(rules)) return;
    const res = await f.submit(() => api<{ message: string }>('/tutor/safety/references', {
      body: { refs: [r0, r1].map((r) => ({ ...r, name: r.name.trim() })), notFamily: f.values.notFamily },
    }));
    if (res.ok) onDone(res.data.message); else if (!res.field) toast.show(res.message, 'error');
  }

  return (
    <View>
      <T tone="muted" style={{ marginBottom: 16 }}>Choose people who have seen you teach. Family members are not accepted. Our team may call them.</T>
      {([0, 1] as const).map((i) => {
        const r = i === 0 ? f.values.r0 : f.values.r1;
        return (
          <Card key={i} style={{ marginBottom: 16 }}>
            <T v="h3" style={{ marginBottom: 10 }}>Reference {i + 1}</T>
            <Field label="Full name" value={r.name} onChangeText={(x) => setRef(i, 'name', x)} error={f.errors[`refs.${i}.name`]} maxLength={60} />
            <Field label="Mobile number" value={r.mobile} onChangeText={(x) => setRef(i, 'mobile', x.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} error={f.errors[`refs.${i}.mobile`]} />
            <FieldLabel>How do you know them?</FieldLabel>
            <ChipGroup options={REFERENCE_RELATIONSHIPS} value={r.relationship} onChange={(x: string) => setRef(i, 'relationship', x)} />
            <FieldError text={f.errors[`refs.${i}.relationship`]} />
          </Card>
        );
      })}
      <Checkbox checked={f.values.notFamily} onChange={(x) => f.set('notFamily', x)} error={f.errors.notFamily} label="Neither reference is a member of my family." />
      <Button title="Save references" onPress={save} loading={f.busy} />
    </View>
  );
}

// 7. Child safety training + quiz
function TrainingStep({ onDone }: StepProps) {
  const { c } = useTheme();
  const toast = useToast();
  const [read, setRead] = useState(false);
  const [started, setStarted] = useState(false);
  const quiz = useApi<{ questions: { q: string; options: string[] }[] }>(started ? '/tutor/safety/quiz' : null, { refetchOnFocus: false });
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (quiz.data) setAnswers(quiz.data.questions.map(() => null)); }, [quiz.data]);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await api<{ message: string }>('/tutor/safety/training', { body: { readRules: true, answers } });
      onDone(res.message);
    } catch (e: any) {
      setResult(e.message);
      toast.show('Not quite — please try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!started) {
    return (
      <View>
        <T v="h3" style={{ marginBottom: 10 }}>Our child-safety rules</T>
        {CHILD_SAFETY_RULES.map((r, i) => (
          <Row key={r} gap={12} style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <T v="label" tone="primary">{i + 1}</T>
            </View>
            <T style={{ flex: 1 }}>{r}</T>
          </Row>
        ))}
        <Gap h={8} />
        <Checkbox checked={read} onChange={setRead} label="I have read these rules and will follow them at every class." />
        <Button title="Start the quiz" onPress={() => setStarted(true)} disabled={!read} icon="school-outline" />
        <T v="caption" tone="muted" center style={{ marginTop: 8 }}>5 questions. You need all 5 correct to pass. You can retry.</T>
      </View>
    );
  }
  if (quiz.loading) return <Loading />;
  if (quiz.error || !quiz.data) return <ErrorState message={quiz.error ?? ''} onRetry={quiz.retry} />;
  return (
    <View>
      {quiz.data.questions.map((q, qi) => (
        <Card key={qi} style={{ marginBottom: 14 }}>
          <T v="bodyStrong">{qi + 1}. {q.q}</T>
          <Gap h={8} />
          {q.options.map((o, oi) => {
            const selected = answers[qi] === oi;
            return (
              <Pressable key={oi} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 48, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6, borderRadius: radius.sm, borderWidth: 1.5, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : 'transparent' }}>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? c.primary : c.muted} />
                <T style={{ flex: 1 }}>{o}</T>
              </Pressable>
            );
          })}
        </Card>
      ))}
      {result && <View style={{ marginBottom: 12 }}><Notice tone="danger">{result}</Notice></View>}
      <Button title={result ? 'Try again' : 'Submit answers'} onPress={submit} loading={busy} disabled={answers.some((a) => a == null)} />
      {result && <Button title="Read the rules again" variant="ghost" onPress={() => { setStarted(false); setResult(null); }} />}
    </View>
  );
}

// 8. Video interview slot
function InterviewStep({ onDone }: StepProps) {
  const toast = useToast();
  const slots = useApi<{ days: string[]; times: string[] }>('/tutor/safety/interview-slots', { refetchOnFocus: false });
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const label = (t: string) => ({ '11:00': '11 am', '15:00': '3 pm', '18:00': '6 pm' } as Record<string, string>)[t] ?? t;

  async function save() {
    setBusy(true);
    try {
      const res = await api<{ message: string }>('/tutor/safety/interview', { body: { date, time } });
      onDone(res.message);
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  if (slots.loading) return <Loading />;
  if (slots.error || !slots.data) return <ErrorState message={slots.error ?? ''} onRetry={slots.retry} />;
  return (
    <View>
      <T tone="muted" style={{ marginBottom: 16 }}>A 15-minute video call with our safety team. Keep your ID ready. We'll send the link by SMS.</T>
      <FieldLabel hint="Next 5 working days (no Sundays)">Day</FieldLabel>
      <ChipGroup options={slots.data.days} value={date} onChange={setDate} labels={dayLabel} />
      <Gap h={16} />
      <FieldLabel>Time</FieldLabel>
      <ChipGroup options={INTERVIEW_TIMES} value={time} onChange={setTime} labels={label} />
      <Gap h={24} />
      <Button title="Book interview" onPress={save} loading={busy} disabled={!date || !time} icon="videocam-outline" />
    </View>
  );
}
