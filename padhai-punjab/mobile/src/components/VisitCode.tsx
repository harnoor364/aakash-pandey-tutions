import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius, useTheme } from '@/lib/theme';
import { Row, T } from './ui';

/** The home visit code. Shown ONLY to the parent/student; the tutor must ask for it at the door. */
export function VisitCode({ code }: { code: string }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.brass, backgroundColor: c.brassSoft, padding: 16 }}>
      <Row gap={8}>
        <Ionicons name="key-outline" size={20} color={c.onBrass} />
        <T v="label" style={{ color: c.onBrass }}>Home visit code</T>
      </Row>
      <T
        accessibilityLabel={`Home visit code ${code.split('').join(' ')}`}
        style={{ fontFamily: fonts.bodyBold, fontSize: 44, lineHeight: 56, letterSpacing: 14, textAlign: 'center', color: c.text, marginVertical: 6 }}
      >
        {code}
      </T>
      <T v="small" style={{ color: c.onBrass }}>
        Share it only when the tutor is at your door and matches their profile photo. A new code is made after every class.
      </T>
    </View>
  );
}
