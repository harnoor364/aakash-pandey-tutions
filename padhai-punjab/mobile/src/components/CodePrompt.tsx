import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { fonts, radius, useTheme } from '@/lib/theme';
import { Button, Field, FieldError, Gap, Row, T } from './ui';

/**
 * Modal for logging a class / marking a class done. For home classes the tutor must type the
 * 4-digit visit code that only the parent can see.
 */
export function ClassPrompt({ visible, title, needsCode, needsTopic, busy, error, onCancel, onSubmit }: {
  visible: boolean; title: string; needsCode: boolean; needsTopic?: boolean; busy?: boolean; error?: string | null;
  onCancel: () => void; onSubmit: (v: { code: string; topic: string }) => void;
}) {
  const { c } = useTheme();
  const [code, setCode] = useState('');
  const [topic, setTopic] = useState('');
  const close = () => { setCode(''); setTopic(''); onCancel(); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={close} accessibilityLabel="Close" />
      <View style={{ position: 'absolute', left: 16, right: 16, top: '18%', backgroundColor: c.bg, borderRadius: 24, padding: 20 }}>
        <T v="h2">{title}</T>
        <Gap h={12} />
        {needsTopic && (
          <Field label="What did you teach?" value={topic} onChangeText={setTopic} placeholder="e.g. Quadratic equations – factorisation" maxLength={120} />
        )}
        {needsCode && (
          <>
            <T v="label">Home visit code</T>
            <T v="caption" tone="muted" style={{ marginBottom: 8 }}>Ask the parent for the 4-digit code shown in their app. It changes after every class.</T>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel="Home visit code"
              placeholder="• • • •"
              placeholderTextColor={c.muted}
              style={{ height: 60, borderRadius: radius.md, borderWidth: 1.5, borderColor: error ? c.danger : c.brass, fontFamily: fonts.bodyBold, fontSize: 28, letterSpacing: 16, textAlign: 'center', color: c.text, backgroundColor: c.surface }}
            />
          </>
        )}
        <FieldError text={error} />
        <Gap h={16} />
        <Row gap={10}>
          <Button title="Cancel" variant="secondary" onPress={close} style={{ flex: 1 }} />
          <Button title="Save" onPress={() => onSubmit({ code, topic })} loading={busy}
            disabled={(needsCode && code.length !== 4) || (needsTopic && topic.trim().length < 3)} style={{ flex: 1 }} />
        </Row>
      </View>
    </Modal>
  );
}
