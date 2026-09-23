import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PhulkariStrip } from '@/components/Phulkari';
import { Button, Gap, LinkText, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { radius, useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Me, Role } from '@/lib/types';

const OPTIONS: { role: Role; title: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { role: 'parent', title: 'Parent or student', text: 'Find a trusted tutor, book a free demo, or book a one-hour class.', icon: 'people-outline' },
  { role: 'tutor', title: 'Tutor', text: 'Create your profile, get verified, and teach at home or online.', icon: 'school-outline' },
];

export default function RolePicker() {
  const { c } = useTheme();
  const { user, setUser, signOut } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState<Role | null>(user?.role ?? null);
  const [busy, setBusy] = useState(false);
  const options = user?.isAdminPhone
    ? [...OPTIONS, { role: 'admin' as Role, title: 'Admin', text: 'Review tutors, safety reports and reviews.', icon: 'shield-checkmark-outline' as const }]
    : OPTIONS;

  async function save() {
    if (!role) return toast.show('Please choose how you will use Padhai Punjab.', 'error');
    setBusy(true);
    try {
      const res = await api<{ user: Me }>('/me/role', { body: { role } });
      setUser(res.user);
      router.replace('/');
    } catch (e: any) {
      toast.show(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <PhulkariStrip />
      <Gap h={28} />
      <T v="h1">How will you use Padhai Punjab?</T>
      <T tone="muted" style={{ marginTop: 6, marginBottom: 20 }}>You can change this later from your account.</T>
      {options.map((o) => {
        const selected = role === o.role;
        return (
          <Pressable
            key={o.role}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${o.title}. ${o.text}`}
            onPress={() => setRole(o.role)}
            style={{
              flexDirection: 'row', gap: 14, alignItems: 'center', padding: 18, borderRadius: radius.lg, marginBottom: 12,
              borderWidth: 2, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.surface,
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: selected ? c.primary : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={o.icon} size={26} color={selected ? c.onPrimary : c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="h3">{o.title}</T>
              <T v="small" tone="muted">{o.text}</T>
            </View>
            <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected ? c.primary : c.muted} />
          </Pressable>
        );
      })}
      <Gap h={12} />
      <Button title="Continue" onPress={save} loading={busy} disabled={!role} />
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <LinkText tone="muted" onPress={async () => { await signOut(); router.replace('/login'); }}>Use a different number</LinkText>
      </View>
    </Screen>
  );
}
