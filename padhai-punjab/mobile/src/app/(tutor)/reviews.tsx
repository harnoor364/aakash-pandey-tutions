import React from 'react';
import { router } from 'expo-router';
import { RatingBreakdown, ReviewItem } from '@/components/Reviews';
import { TabHeader } from '@/components/TabHeader';
import { EmptyState, ErrorState, Gap, LinkText, Loading, Notice, Screen, Section, T } from '@/components/ui';
import type { RatingStats, Review } from '@/lib/types';
import { useApi } from '@/lib/useApi';

export default function TutorReviews() {
  const { data, loading, error, retry, refreshing, refresh } = useApi<{ stats: RatingStats; reviews: Review[] }>('/tutor/reviews');
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TabHeader title="My reviews" />
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={retry} /> : data && (
        <>
          <RatingBreakdown stats={data.stats} />
          <Gap h={8} />
          <T v="small" tone="muted">Trust score used for ranking: {data.stats.trustScore.toFixed(2)}</T>
          <LinkText onPress={() => router.push('/how-it-works')}>How reviews and ranking work</LinkText>
          <Gap h={8} />
          <Notice tone="info">Only families who confirmed 4 classes (or a completed one-hour class) can review you. Offering discounts or favours for reviews is not allowed.</Notice>
          <Section title="All reviews">
            {data.reviews.length ? data.reviews.map((r) => <ReviewItem key={r.id} review={r} />) : (
              <EmptyState icon="star-outline" title="No reviews yet" text="Log every class so parents can confirm it. After 4 confirmed classes, they can review you." />
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}
