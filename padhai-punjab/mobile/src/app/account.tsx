import React from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { TAGLINE_PA } from '../../../shared/constants.js';
import { PhulkariStrip } from '@/components/Phulkari';
import { Button, Card, ChipGroup, Gap, InfoLine, LinkText, Pa, Screen, Section, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ThemePref, useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const ROLE_LABEL = { parent: 'Parent / Student', tutor: 'Tutor', admin: 'Admin' } as const;
const THEMES: ThemePref[] = ['system', 'light', 'dark'];

export default function Account() {
  const { user, signOut } = useAuth();
  const { pref, setPref } = useTheme();
  const toast = useToast();
  return (
    <Screen edges={['bottom']}>
      <Card>
        <T v="h2">{user?.name || 'Your account'}</T>
        <InfoLine icon="call-outline">+91 {user?.phone}</InfoLine>
        <InfoLine icon="person-outline">{user?.role ? ROLE_LABEL[user.role] : 'No role chosen'}</InfoLine>
        <Gap h={12} />
        <Button title="Switch role" variant="secondary" small icon="swap-horizontal" style={{ alignSelf: 'flex-start' }} onPress={() => router.push('/role')} />
      </Card>

      <Section title="Appearance">
        <ChipGroup options={THEMES} value={pref} onChange={setPref} labels={(p) => ({ system: 'Match phone', light: 'Light', dark: 'Dark' })[p]} />
      </Section>

      <Section title="Safety help">
        <Card>
          <T>If a child is in danger right now, call 112. For child protection help, call Childline 1098.</T>
          <LinkText icon="call-outline" onPress={() => Linking.openURL('tel:1098')}>Call Childline 1098</LinkText>
          <LinkText icon="help-circle-outline" onPress={() => router.push('/how-it-works')}>How reviews and ranking work</LinkText>
        </Card>
      </Section>

      <Gap h={28} />
      <Button title="Log out" variant="dangerOutline" icon="log-out-outline" onPress={async () => {
        await signOut();
        toast.show('You have been logged out.', 'info');
        router.replace('/login');
      }} />
      <Gap h={32} />
      <PhulkariStrip />
      <Pa size={16} style={{ textAlign: 'center', marginTop: 8 }}>{TAGLINE_PA}</Pa>
    </Screen>
  );
}
