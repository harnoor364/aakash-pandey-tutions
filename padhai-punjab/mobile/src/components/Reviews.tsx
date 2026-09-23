import React from 'react';
import { View } from 'react-native';
import { prettyDate, plural } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { RatingStats, Review } from '@/lib/types';
import { Badge, Card, Row, Stars, T } from './ui';

export function RatingBreakdown({ stats }: { stats: RatingStats }) {
  const { c } = useTheme();
  const max = Math.max(1, ...Object.values(stats.breakdown));
  return (
    <Card>
      <Row gap={20} style={{ alignItems: 'flex-start' }}>
        <View style={{ alignItems: 'center', minWidth: 88 }}>
          {stats.count ? (
            <>
              <T v="display" tone="primary">{stats.average?.toFixed(1)}</T>
              <Stars value={stats.average ?? 0} size={15} />
              <T v="caption" tone="muted" style={{ marginTop: 4 }}>{plural(stats.count, 'review')}</T>
            </>
          ) : (
            <T v="small" tone="muted" center>No reviews yet</T>
          )}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {(['5', '4', '3', '2', '1'] as const).map((k) => (
            <Row key={k} gap={8} accessibilityLabel={`${k} stars: ${stats.breakdown[k]} reviews`}>
              <T v="caption" style={{ width: 26 }}>{k}★</T>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
                <View style={{ width: `${(stats.breakdown[k] / max) * 100}%`, height: '100%', backgroundColor: c.brass, borderRadius: 4 }} />
              </View>
              <T v="caption" tone="muted" style={{ width: 28, textAlign: 'right' }}>{stats.breakdown[k]}</T>
            </Row>
          ))}
        </View>
      </Row>
    </Card>
  );
}

export function ReviewItem({ review, showTutor }: { review: Review; showTutor?: boolean }) {
  return (
    <Card style={{ marginBottom: 12 }}>
      <Row style={{ justifyContent: 'space-between' }} wrap>
        <Stars value={review.rating} />
        <T v="caption" tone="muted">{prettyDate(review.createdAt)}{review.edited ? ' · edited' : ''}</T>
      </Row>
      {showTutor && review.tutorName && <T v="label" style={{ marginTop: 6 }}>About {review.tutorName}</T>}
      <T style={{ marginTop: 8 }}>{review.comment}</T>
      <Row wrap gap={6} style={{ marginTop: 10 }}>
        <Badge label="✓ Verified student" tone="success" />
        <Badge label={review.levelLabel} tone="neutral" />
        {review.classesAttended != null && <Badge label={`Attended ${review.classesAttended} classes`} tone="neutral" />}
        {review.topic && <Badge label={`Topic: ${review.topic}`} tone="neutral" />}
      </Row>
      <Row style={{ marginTop: 8, justifyContent: 'space-between' }} wrap>
        <T v="caption" tone="muted">{review.reviewerName ? `${review.reviewerName}'s family` : 'Parent'}</T>
        <T v="caption" tone={review.recommend ? 'primary' : 'muted'}>{review.recommend ? '👍 Recommends' : 'Does not recommend'}</T>
      </Row>
    </Card>
  );
}
