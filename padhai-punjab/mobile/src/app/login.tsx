import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { TAGLINE_EN, TAGLINE_PA, isIndianMobile, isOtp } from '../../../shared/constants.js';
import { PhulkariStrip } from '@/components/Phulkari';
import { Button, Card, Field, Gap, LinkText, Notice, Pa, Row, Screen, T } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fonts, radius, useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Me } from '@/lib/types';

export default function Login() {
  const { c } = useTheme();
  const { signIn } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode() {
    setError(null);
    if (!isIndianMobile(phone)) {
      setError('Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ devOtp?: string; message: string }>('/auth/otp', { body: { phone } });
      setDevOtp(res.devOtp ?? null);
      setStep('otp');
      setWait(30);
      toast.show(`Code sent to +91 ${phone}`);
      setTimeout(() => otpRef.current?.focus(), 150);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(code = otp) {
    setError(null);
    if (!isOtp(code)) {
      setError('Enter the 4-digit code we sent you.');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ token: string; user: Me }>('/auth/verify', { body: { phone, otp: code } });
      await signIn(res.token, res.user);
      toast.show('Welcome to Padhai Punjab');
      router.replace('/');
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PhulkariStrip />
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 28 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <T v="h1" tone="onPrimary" style={{ fontSize: 34, lineHeight: 40 }}>ਪ</T>
        </View>
        <T v="display" center>Padhai Punjab</T>
        <Pa size={19} style={{ textAlign: 'center', marginTop: 4 }}>{TAGLINE_PA}</Pa>
        <T tone="muted" center>{TAGLINE_EN}</T>
      </View>

      <Card>
        {step === 'phone' ? (
          <>
            <T v="h2">Log in or sign up</T>
            <T tone="muted" style={{ marginBottom: 16 }}>We'll send a 4-digit code by SMS. No password needed.</T>
            <T v="label" style={{ marginBottom: 6 }}>Mobile number</T>
            <Row gap={8} style={{ alignItems: 'flex-start' }}>
              <View style={{ height: 52, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.border, justifyContent: 'center', backgroundColor: c.surfaceAlt }}>
                <T v="bodyStrong">+91</T>
              </View>
              <Field
                label=""
                style={{ flex: 1, marginBottom: 0 }}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                placeholder="98765 43210"
                maxLength={10}
                accessibilityLabel="Mobile number"
                error={error}
                onSubmitEditing={sendCode}
                inputStyle={{ fontSize: 19, letterSpacing: 1 }}
              />
            </Row>
            <Gap h={16} />
            <Button title="Send code" onPress={sendCode} loading={busy} icon="chatbubble-ellipses-outline" />
          </>
        ) : (
          <>
            <T v="h2">Enter the code</T>
            <T tone="muted" style={{ marginBottom: 16 }}>Sent to +91 {phone}.</T>
            <TextInput
              ref={otpRef}
              value={otp}
              onChangeText={(v) => {
                const d = v.replace(/\D/g, '').slice(0, 4);
                setOtp(d);
                if (d.length === 4) verify(d);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={4}
              accessibilityLabel="4-digit code"
              placeholder="• • • •"
              placeholderTextColor={c.muted}
              style={{
                height: 64, borderRadius: radius.md, borderWidth: 1.5, borderColor: error ? c.danger : c.primary,
                fontFamily: fonts.bodyBold, fontSize: 30, letterSpacing: 18, textAlign: 'center', color: c.text, backgroundColor: c.surface,
              }}
            />
            {error && <View style={{ marginTop: 8 }}><Notice tone="danger">{error}</Notice></View>}
            {devOtp && (
              <View style={{ marginTop: 12 }}>
                <Notice tone="info" title="Test mode">{`SMS is not connected on this server. Your code is ${devOtp}.`}</Notice>
              </View>
            )}
            <Gap h={16} />
            <Button title="Verify and continue" onPress={() => verify()} loading={busy} />
            <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <LinkText onPress={() => { setStep('phone'); setOtp(''); setError(null); }}>Change number</LinkText>
              {wait > 0 ? <T v="caption" tone="muted">Resend in {wait}s</T> : <LinkText onPress={sendCode}>Resend code</LinkText>}
            </Row>
          </>
        )}
      </Card>

      <Gap h={24} />
      <Row gap={10} style={{ justifyContent: 'center' }} wrap>
        <T v="caption" tone="muted" center>🛡 Every home tutor is police-verified and trained in child safety.</T>
      </Row>
    </Screen>
  );
}
