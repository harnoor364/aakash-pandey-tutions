import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl,
  ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { absoluteUrl } from '@/lib/api';
import { initials } from '@/lib/format';
import { fonts, Palette, radius, space, useTheme } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ---------- Text ----------
type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'label' | 'caption' | 'price';
type Tone = 'text' | 'muted' | 'primary' | 'danger' | 'brass' | 'onPrimary' | 'warn';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.serifBold, fontSize: 36, lineHeight: 42 },
  h1: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 36 },
  h2: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 25 },
  small: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 19 },
  price: { fontFamily: fonts.bodyBold, fontSize: 22, lineHeight: 28 },
};

const toneColor = (c: Palette, t: Tone) => ({
  text: c.text, muted: c.muted, primary: c.primary, danger: c.danger, brass: c.onBrass, onPrimary: c.onPrimary, warn: c.warn,
})[t];

export function T({ v = 'body', tone = 'text', center, style, children, ...rest }: {
  v?: Variant; tone?: Tone; center?: boolean; style?: StyleProp<TextStyle>; children: React.ReactNode;
} & React.ComponentProps<typeof Text>) {
  const { c } = useTheme();
  const isHeading = v === 'display' || v === 'h1' || v === 'h2' || v === 'h3';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      style={[variants[v], { color: toneColor(c, tone) }, center && { textAlign: 'center' }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

/** Gurmukhi text in a font that supports it. */
export function Pa({ size = 18, tone = 'primary', style, children }: { size?: number; tone?: Tone; style?: StyleProp<TextStyle>; children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: fonts.gurmukhi, fontSize: size, lineHeight: size * 1.6, color: toneColor(c, tone) }, style]}>{children}</Text>;
}

// ---------- Layout ----------
export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true, edges = ['top'], footer }: {
  children: React.ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; padded?: boolean;
  edges?: ('top' | 'bottom')[]; footer?: React.ReactNode;
}) {
  const { c } = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && styles.padded, { paddingBottom: 48 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : <View style={[{ flex: 1 }, padded && styles.padded]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Row({ children, gap = space.sm, style, wrap, ...rest }: {
  children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean;
} & Omit<React.ComponentProps<typeof View>, 'style' | 'children'>) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]} {...rest}>{children}</View>;
}

export function Gap({ h = space.lg }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function Card({ children, style, onPress, accessibilityLabel }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string;
}) {
  const { c, dark } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.surface, borderRadius: radius.lg, padding: 18, borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border, shadowColor: c.shadow, shadowOpacity: dark ? 0 : 0.06, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: dark ? 0 : 1,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.92 }, style]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, right, children, style }: { title: string; right?: React.ReactNode; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: space.xl }, style]}>
      <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
        <T v="h3" style={{ flexShrink: 1 }}>{title}</T>
        {right}
      </Row>
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: space.md }, style]} />;
}

// ---------- Buttons ----------
export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style, accessibilityHint }: {
  title: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline';
  icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; accessibilityHint?: string;
}) {
  const { c } = useTheme();
  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: 'transparent', fg: c.primary, border: c.primary },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    danger: { bg: c.danger, fg: c.surface, border: c.danger },
    dangerOutline: { bg: 'transparent', fg: c.danger, border: c.danger },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          minHeight: small ? 44 : 52, paddingHorizontal: small ? 16 : 22, borderRadius: radius.pill, borderWidth: 1.5,
          backgroundColor: palette.bg, borderColor: palette.border, alignItems: 'center', justifyContent: 'center',
          flexDirection: 'row', gap: 8,
        },
        pressed && { opacity: 0.85 },
        off && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : icon ? <Ionicons name={icon} size={small ? 18 : 20} color={palette.fg} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: fonts.bodyBold, fontSize: small ? 15 : 17, color: palette.fg }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress, label, color, size = 24, style }: {
  name: IconName; onPress: () => void; label: string; color?: string; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed }) => [{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 }, pressed && { backgroundColor: c.surfaceAlt }, style]}>
      <Ionicons name={name} size={size} color={color || c.text} />
    </Pressable>
  );
}

export function LinkText({ children, onPress, tone = 'primary', icon }: { children: React.ReactNode; onPress: () => void; tone?: Tone; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Row gap={6}>
        {icon && <Ionicons name={icon} size={18} color={toneColor(c, tone)} />}
        <T v="label" tone={tone} style={{ textDecorationLine: 'underline' }}>{children}</T>
      </Row>
    </Pressable>
  );
}

// ---------- Chips, tags and badges ----------
export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [{
        minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: selected ? c.primary : c.surface, borderWidth: 1, borderColor: selected ? c.primary : c.border,
      }, pressed && { opacity: 0.85 }]}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={c.onPrimary} /> : icon ? <Ionicons name={icon} size={16} color={c.text} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: selected ? c.onPrimary : c.text }}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<V extends string | number>({ options, value, onChange, multi, labels }: {
  options: readonly V[]; value: V | V[] | null | undefined; onChange: (v: any) => void; multi?: boolean; labels?: (v: V) => string;
}) {
  const selected = (o: V) => (multi ? ((value as V[]) || []).includes(o) : value === o);
  return (
    <Row wrap gap={space.sm}>
      {options.map((o) => (
        <Chip key={String(o)} label={labels ? labels(o) : String(o)} selected={selected(o)}
          onPress={() => {
            if (!multi) return onChange(o);
            const arr = ((value as V[]) || []);
            onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
          }} />
      ))}
    </Row>
  );
}

export function Tag({ label }: { label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.tag, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
      <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onTag }}>{label}</Text>
    </View>
  );
}

export function Badge({ label, tone = 'success', icon }: { label: string; tone?: 'success' | 'warn' | 'danger' | 'brass' | 'neutral'; icon?: IconName }) {
  const { c } = useTheme();
  const p = {
    success: [c.primarySoft, c.primary], warn: [c.warnSoft, c.warn], danger: [c.dangerSoft, c.danger],
    brass: [c.brassSoft, c.onBrass], neutral: [c.surfaceAlt, c.muted],
  }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: p[0], borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      {icon && <Ionicons name={icon} size={14} color={p[1]} />}
      <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: fonts.bodyBold, fontSize: 13.5, color: p[1] }}>{label}</Text>
    </View>
  );
}

export function TrustBadges({ homeSafe, idVerified }: { homeSafe: boolean; idVerified: boolean }) {
  return (
    <Row wrap gap={6}>
      {homeSafe && <Badge label="🛡 Home-safe verified" tone="success" />}
      {idVerified ? <Badge label="✓ ID verified" tone="success" /> : <Badge label="ID check pending" tone="warn" icon="time-outline" />}
    </Row>
  );
}

// ---------- Stars ----------
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const { c } = useTheme();
  return (
    <Row gap={2} style={{ flexShrink: 0 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} size={size} color={c.brass}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} />
      ))}
    </Row>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { c } = useTheme();
  return (
    <Row gap={4} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} accessibilityRole="button" accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}
          style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={value >= i ? 'star' : 'star-outline'} size={38} color={c.brass} />
        </Pressable>
      ))}
    </Row>
  );
}

// ---------- Forms ----------
export function Field({ label, error, hint, counter, style, inputStyle, ...input }: {
  label: string; error?: string | null; hint?: string; counter?: { value: number; min?: number; max: number };
  style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle>;
} & TextInputProps) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      <T v="label" style={{ marginBottom: 6 }}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={c.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxFontSizeMultiplier={1.5}
        style={[{
          minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12,
          fontFamily: fonts.body, fontSize: 17, color: c.text, backgroundColor: c.surface,
          borderColor: error ? c.danger : focused ? c.primary : c.border,
        }, input.multiline && { minHeight: 110, textAlignVertical: 'top' }, inputStyle]}
        {...input}
      />
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          {error ? <FieldError text={error} /> : hint ? <T v="caption" tone="muted">{hint}</T> : null}
        </View>
        {counter && (
          <T v="caption" tone={(counter.min && counter.value < counter.min) || counter.value > counter.max ? 'danger' : 'muted'}>
            {counter.value}/{counter.max}{counter.min ? ` (min ${counter.min})` : ''}
          </T>
        )}
      </Row>
    </View>
  );
}

export function FieldError({ text }: { text?: string | null }) {
  const { c } = useTheme();
  if (!text) return null;
  return (
    <Row gap={6} style={{ marginTop: 2 }} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={16} color={c.danger} />
      <T v="caption" tone="danger" style={{ flex: 1 }}>{text}</T>
    </Row>
  );
}

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <T v="label">{children}</T>
      {hint ? <T v="caption" tone="muted">{hint}</T> : null}
    </View>
  );
}

/** Tappable field that opens a searchable list (e.g. 23 districts). */
export function Select<V extends string | number>({ label, value, options, onChange, placeholder = 'Choose', error, format, searchable, allowClear, clearLabel = 'Any' }: {
  label: string; value: V | null | undefined; options: readonly V[]; onChange: (v: V | null) => void; placeholder?: string;
  error?: string | null; format?: (v: V) => string; searchable?: boolean; allowClear?: boolean; clearLabel?: string;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const fmt = (v: V) => (format ? format(v) : String(v));
  const filtered = useMemo(() => options.filter((o) => fmt(o).toLowerCase().includes(q.toLowerCase())), [options, q]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ marginBottom: space.lg }}>
      <T v="label" style={{ marginBottom: 6 }}>{label}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value != null ? fmt(value) : placeholder}`}
        onPress={() => setOpen(true)}
        style={{ minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: error ? c.danger : c.border, backgroundColor: c.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}
      >
        <T style={{ flex: 1 }} tone={value != null ? 'text' : 'muted'}>{value != null ? fmt(value) : placeholder}</T>
        <Ionicons name="chevron-down" size={20} color={c.muted} />
      </Pressable>
      <FieldError text={error} />
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: 24 }}>
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
            <T v="h3">{label}</T>
            <IconButton name="close" label="Close" onPress={() => setOpen(false)} />
          </Row>
          {searchable && (
            <View style={{ paddingHorizontal: 20 }}>
              <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={c.muted} accessibilityLabel="Search"
                style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 17, color: c.text, backgroundColor: c.surface, marginBottom: 8 }} />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o)}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={allowClear ? (
              <SelectRow label={clearLabel} selected={value == null} onPress={() => { onChange(null); setOpen(false); setQ(''); }} />
            ) : null}
            renderItem={({ item }) => (
              <SelectRow label={fmt(item)} selected={item === value} onPress={() => { onChange(item); setOpen(false); setQ(''); }} />
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function SelectRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={({ pressed }) => [{ minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }, pressed && { backgroundColor: c.surfaceAlt }]}>
      <T style={{ flex: 1 }} v={selected ? 'bodyStrong' : 'body'} tone={selected ? 'primary' : 'text'}>{label}</T>
      {selected && <Ionicons name="checkmark" size={20} color={c.primary} />}
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, label, error }: { checked: boolean; onChange: (v: boolean) => void; label: string; error?: string | null }) {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: space.md }}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44, paddingVertical: 4 }}>
        <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: error ? c.danger : checked ? c.primary : c.muted, backgroundColor: checked ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          {checked && <Ionicons name="checkmark" size={18} color={c.onPrimary} />}
        </View>
        <T style={{ flex: 1 }}>{label}</T>
      </Pressable>
      <FieldError text={error} />
    </View>
  );
}

// ---------- Feedback ----------
export function ProgressBar({ value, total, height = 10 }: { value: number; total: number; height?: number }) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(1, total ? value / total : 0));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: value }}
      style={{ height, borderRadius: height, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: c.primary, borderRadius: height }} />
    </View>
  );
}

export function EmptyState({ icon, title, text, action, onAction }: { icon: IconName; title: string; text: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 16 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Ionicons name={icon} size={34} color={c.primary} />
      </View>
      <T v="h2" center>{title}</T>
      <T tone="muted" center style={{ marginTop: 6, maxWidth: 360 }}>{text}</T>
      {action && onAction && <Button title={action} onPress={onAction} style={{ marginTop: 20 }} />}
    </View>
  );
}

export function Notice({ children, tone = 'info', icon, title }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'danger' | 'success'; icon?: IconName; title?: string }) {
  const { c } = useTheme();
  const [bg, fg] = { info: [c.tag, c.onTag], warn: [c.warnSoft, c.warn], danger: [c.dangerSoft, c.danger], success: [c.primarySoft, c.primary] }[tone];
  const ic = icon || ({ info: 'information-circle', warn: 'time', danger: 'warning', success: 'shield-checkmark' } as const)[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.md, padding: 14, flexDirection: 'row', gap: 10 }}>
      <Ionicons name={ic} size={22} color={fg} />
      <View style={{ flex: 1 }}>
        {title && <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: fg, marginBottom: 2 }}>{title}</Text>}
        {typeof children === 'string' ? <Text style={{ fontFamily: fonts.body, fontSize: 15.5, lineHeight: 22, color: fg }}>{children}</Text> : children}
      </View>
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 12 }} accessibilityLabel={label}>
      <ActivityIndicator color={c.primary} size="large" />
      <T tone="muted">{label}</T>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyState icon="cloud-offline-outline" title="Couldn't load this" text={message} action="Try again" onAction={onRetry} />;
}

// ---------- Avatar ----------
export function Avatar({ name, url, size = 64, headers }: { name: string; url?: string | null; size?: number; headers?: Record<string, string> }) {
  const { c } = useTheme();
  const uri = absoluteUrl(url);
  if (uri) {
    return <Image accessibilityLabel={`Photo of ${name}`} source={{ uri, headers }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceAlt, borderWidth: 2, borderColor: c.brassSoft }} />;
  }
  return (
    <View accessibilityLabel={`${name} (no photo)`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.brassSoft }}>
      <Text style={{ fontFamily: fonts.serifBold, fontSize: size * 0.38, color: c.primary }}>{initials(name)}</Text>
    </View>
  );
}

export function InfoLine({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Row gap={8} style={{ alignItems: 'flex-start', marginTop: 6 }}>
      <Ionicons name={icon} size={17} color={c.muted} style={{ marginTop: 3 }} />
      <T v="small" tone="text" style={{ flex: 1 }}>{children}</T>
    </Row>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: 20, paddingTop: 12 },
});
