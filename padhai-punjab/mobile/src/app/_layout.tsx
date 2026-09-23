import React, { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Hind_400Regular, Hind_500Medium, Hind_600SemiBold } from '@expo-google-fonts/hind';
import { NotoSansGurmukhi_500Medium } from '@expo-google-fonts/noto-sans-gurmukhi';
import { AuthProvider, useAuth } from '@/lib/auth';
import { fonts, ThemeProvider, useTheme } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold, CormorantGaramond_700Bold,
    Hind_400Regular, Hind_500Medium, Hind_600SemiBold,
    NotoSansGurmukhi_500Medium,
  });
  if (!loaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { c, dark } = useTheme();
  const { ready } = useAuth();
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;

  const modal = (title: string) => ({ title, presentation: 'modal' as const, headerShown: true });
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: c.bg },
          headerShadowVisible: false,
          headerTintColor: c.primary,
          headerTitleStyle: { fontFamily: fonts.serifBold, fontSize: 22, color: c.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="role" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(tutor)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="tutor-signup" options={{ headerShown: true, title: 'Become a tutor' }} />
        <Stack.Screen name="tutor/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="book-demo" options={modal('Book a free demo')} />
        <Stack.Screen name="book-class" options={modal('Book a class')} />
        <Stack.Screen name="review" options={modal('Write a review')} />
        <Stack.Screen name="report" options={modal('Report a safety concern')} />
        <Stack.Screen name="how-it-works" options={modal('How reviews and ranking work')} />
        <Stack.Screen name="account" options={{ headerShown: true, title: 'Account' }} />
        <Stack.Screen name="profile-edit" options={{ headerShown: true, title: 'Edit profile' }} />
        <Stack.Screen name="safety/[step]" options={{ headerShown: true, title: 'Safety check' }} />
        <Stack.Screen name="admin-tutor/[id]" options={{ headerShown: true, title: 'Review tutor' }} />
      </Stack>
    </>
  );
}
