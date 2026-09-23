import React from 'react';
import { View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { fonts, useTheme } from '@/lib/theme';
import type { Role } from '@/lib/types';
import { IconButton, Row, T } from './ui';

export function TabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
      <View style={{ flex: 1 }}>
        <T v="h1">{title}</T>
        {subtitle ? <T tone="muted">{subtitle}</T> : null}
      </View>
      <Row gap={0}>
        {right}
        <IconButton name="person-circle-outline" size={30} label="Account and settings" onPress={() => router.push('/account')} />
      </Row>
    </Row>
  );
}

type TabDef = { name: string; title: string; icon: React.ComponentProps<typeof Ionicons>['name'] };

/** Bottom tab navigator shared by the parent, tutor and admin areas. Guards the role. */
export function RoleTabs({ role, tabs }: { role: Role; tabs: TabDef[] }) {
  const { c } = useTheme();
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  if (user.role !== role) return <Redirect href="/" />;
  if (role === 'tutor' && !user.tutor) return <Redirect href="/tutor-signup" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: tabs.length > 4 ? 11.5 : 13 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={(focused ? t.icon.replace('-outline', '') : t.icon) as TabDef['icon']} color={color} size={size ?? 24} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
