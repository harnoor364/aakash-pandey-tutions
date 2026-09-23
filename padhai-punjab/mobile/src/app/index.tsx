import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

/** Send each user to the right place: login → role → (tutor sign-up) → their tabs. */
export default function Index() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  if (!user.role) return <Redirect href="/role" />;
  if (user.role === 'admin') return <Redirect href="/(admin)" />;
  if (user.role === 'tutor') return user.tutor ? <Redirect href="/(tutor)" /> : <Redirect href="/tutor-signup" />;
  return <Redirect href="/(parent)" />;
}
