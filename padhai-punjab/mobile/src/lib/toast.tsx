import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius, useTheme } from './theme';

type Kind = 'success' | 'error' | 'info';
type ToastCtx = { show: (message: string, kind?: Kind) => void };
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, kind: Kind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    AccessibilityInfo.announceForAccessibility(message);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, kind === 'error' ? 4500 : 3200);
  }, [opacity]);

  const icon = toast?.kind === 'error' ? 'alert-circle' : toast?.kind === 'info' ? 'information-circle' : 'checkmark-circle';
  const bg = toast?.kind === 'error' ? c.danger : c.text;

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[styles.wrap, { bottom: insets.bottom + 84, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
        >
          <View style={[styles.toast, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={22} color={c.bg} />
            <Text style={[styles.text, { color: c.bg }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: radius.md, maxWidth: 520, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  text: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22, flexShrink: 1 },
});
