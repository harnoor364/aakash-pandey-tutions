import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PickedFile } from '@/lib/api';
import { pickDocument } from '@/lib/pickImage';
import { radius, useTheme } from '@/lib/theme';
import { Button, FieldError, Row, T } from './ui';

/** Upload box for a document photo: camera or gallery, with a thumbnail once chosen. */
export function DocPicker({ label, hint, value, onChange, error }: {
  label: string; hint?: string; value: PickedFile | null; onChange: (f: PickedFile | null) => void; error?: string | null;
}) {
  const { c } = useTheme();
  const pick = async (s: 'camera' | 'library') => { const f = await pickDocument(s); if (f) onChange(f); };
  return (
    <View style={{ marginBottom: 16 }}>
      <T v="label">{label}</T>
      {hint && <T v="caption" tone="muted">{hint}</T>}
      <View style={{ marginTop: 8, borderRadius: radius.md, borderWidth: 1.5, borderStyle: value ? 'solid' : 'dashed', borderColor: error ? c.danger : value ? c.primary : c.border, padding: 12, backgroundColor: c.surface }}>
        {value ? (
          <Row gap={12}>
            <Image source={{ uri: value.uri }} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: c.surfaceAlt }} accessibilityLabel={`${label} preview`} />
            <View style={{ flex: 1 }}>
              <Row gap={6}><Ionicons name="checkmark-circle" size={18} color={c.primary} /><T v="label" tone="primary">Photo added</T></Row>
              <Button title="Replace" small variant="ghost" onPress={() => pick('library')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
            </View>
          </Row>
        ) : (
          <Row gap={10} wrap>
            <Button title="Take photo" small icon="camera-outline" variant="secondary" onPress={() => pick('camera')} />
            <Button title="Choose from gallery" small icon="images-outline" variant="secondary" onPress={() => pick('library')} />
          </Row>
        )}
      </View>
      <FieldError text={error} />
    </View>
  );
}
