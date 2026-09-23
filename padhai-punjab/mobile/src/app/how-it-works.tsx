import React from 'react';
import { View } from 'react-native';
import { REVIEW_UNLOCK_CLASSES, TRUST_PRIOR_MEAN, TRUST_PRIOR_WEIGHT, trustScore } from '../../../shared/constants.js';
import { Card, Gap, InfoLine, Row, Screen, Section, T } from '@/components/ui';
import { useTheme } from '@/lib/theme';

const EXAMPLE_A = [5, 5];
const EXAMPLE_B = { n: 90, avg: 4.8 };

export default function HowItWorks() {
  const { c } = useTheme();
  const a = trustScore(EXAMPLE_A);
  const b = trustScore(Array(EXAMPLE_B.n).fill(EXAMPLE_B.avg));
  return (
    <Screen edges={['bottom']}>
      <T tone="muted">Every review on Padhai Punjab comes from a family whose child actually studied with the tutor.</T>

      <Section title="Who can review">
        <Card>
          <InfoLine icon="home-outline">Regular tuition: the review unlocks after {REVIEW_UNLOCK_CLASSES} classes that the tutor logged AND you confirmed.</InfoLine>
          <InfoLine icon="time-outline">One-hour or topic classes: rating unlocks after the tutor marks the class done AND the student confirms they attended.</InfoLine>
          <InfoLine icon="person-outline">One review per family per tutor. You can edit it later.</InfoLine>
          <InfoLine icon="checkmark-circle-outline">Every review shows "✓ Verified student", the class or level, and how many classes were attended (or the topic).</InfoLine>
          <InfoLine icon="ban-outline">Tutors agree never to offer discounts or favours for reviews. Our team removes reviews only for clear policy violations, and every removal is logged.</InfoLine>
        </Card>
      </Section>

      <Section title="How tutors are ranked">
        <Card>
          <T>A plain average would let a tutor with two 5-star reviews beat a tutor with 90 reviews averaging 4.8. That isn't fair, so we use a trust score:</T>
          <View style={{ backgroundColor: c.brassSoft, borderRadius: 12, padding: 14, marginVertical: 14 }}>
            <T v="bodyStrong" center style={{ color: c.onBrass }}>
              score = ({TRUST_PRIOR_WEIGHT} × {TRUST_PRIOR_MEAN.toFixed(1)} + sum of all ratings) ÷ ({TRUST_PRIOR_WEIGHT} + number of ratings)
            </T>
          </View>
          <T>Every tutor starts as if they had {TRUST_PRIOR_WEIGHT} reviews of {TRUST_PRIOR_MEAN.toFixed(1)} stars. Real reviews slowly pull the score up or down, so a score is only high when many families agree.</T>
          <Gap h={14} />
          <Row gap={10} style={{ alignItems: 'stretch' }}>
            <Example title="2 reviews, all 5★" score={a} />
            <Example title="90 reviews, avg 4.8★" score={b} winner />
          </Row>
          <Gap h={12} />
          <T v="small" tone="muted">New tutors show "New tutor, no reviews yet" instead of a zero rating.</T>
        </Card>
      </Section>
    </Screen>
  );
}

function Example({ title, score, winner }: { title: string; score: number; winner?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: winner ? c.primary : c.border, backgroundColor: winner ? c.primarySoft : c.surface }}>
      <T v="caption" tone="muted">{title}</T>
      <T v="h2" tone={winner ? 'primary' : 'text'}>{score.toFixed(2)}</T>
      {winner && <T v="caption" tone="primary">Ranks higher</T>}
    </View>
  );
}
