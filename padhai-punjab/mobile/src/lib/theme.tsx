import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getItem, setItem } from './storage';

const light = {
  bg: '#F7F2E8',
  surface: '#FFFDF8',
  surfaceAlt: '#F1EADC',
  primary: '#4E6B5C',
  primaryPressed: '#3F584B',
  onPrimary: '#FFFDF8',
  primarySoft: '#E3ECE5',
  tag: '#E2E9F0',
  onTag: '#34495A',
  brass: '#B8975A',
  brassSoft: '#F3EBDA',
  onBrass: '#6E5627',
  text: '#2C3833',
  muted: '#5C6862',
  border: '#E4DBCB',
  danger: '#9E4A3D',
  dangerSoft: '#F5E3DE',
  warn: '#7A5C22',
  warnSoft: '#F5EBD6',
  overlay: 'rgba(44,56,51,0.35)',
  shadow: '#6B5B3E',
  phulkari: ['#B8975A', '#4E6B5C', '#C9A96E', '#9E4A3D'],
};

type Palette = typeof light;

// Deep green palette for dark mode.
const dark: Palette = {
  bg: '#122019',
  surface: '#1A2B23',
  surfaceAlt: '#22362C',
  primary: '#8FB5A0',
  primaryPressed: '#A6C6B4',
  onPrimary: '#0F1D16',
  primarySoft: '#23392E',
  tag: '#263846',
  onTag: '#C9D6E2',
  brass: '#CDB07A',
  brassSoft: '#342D1E',
  onBrass: '#E3CC9C',
  text: '#ECE6D8',
  muted: '#A9B5AD',
  border: '#2E4238',
  danger: '#E3978A',
  dangerSoft: '#3A2521',
  warn: '#E3C88F',
  warnSoft: '#373020',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  phulkari: ['#CDB07A', '#8FB5A0', '#B08D52', '#C27466'],
};

export const fonts = {
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  body: 'Hind_400Regular',
  bodyMedium: 'Hind_500Medium',
  bodyBold: 'Hind_600SemiBold',
  gurmukhi: 'NotoSansGurmukhi_500Medium',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export type ThemePref = 'system' | 'light' | 'dark';
type ThemeCtx = { c: Palette; dark: boolean; pref: ThemePref; setPref: (p: ThemePref) => void };

const Ctx = createContext<ThemeCtx>({ c: light, dark: false, pref: 'system', setPref: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    getItem('themePref').then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
    });
  }, []);

  const value = useMemo(() => {
    const isDark = pref === 'system' ? system === 'dark' : pref === 'dark';
    return {
      c: isDark ? dark : light,
      dark: isDark,
      pref,
      setPref: (p: ThemePref) => { setPrefState(p); setItem('themePref', p); },
    };
  }, [pref, system]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
export type { Palette };
