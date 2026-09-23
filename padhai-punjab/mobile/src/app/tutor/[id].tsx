import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { RatingBreakdown, ReviewItem } from '@/components/Reviews';
import { RatingLine, availabilityText, useSaveToggle } from '@/components/TutorCard';
import {
  Avatar, Button, Card, EmptyState, ErrorState, Gap, IconButton, InfoLine, LinkText, Loading, Notice, Row, Screen,
  Section, T, Tag, TrustBadges,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { classRange, formatRupees, plural } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { Review, Tutor } from '@/lib/types';
import { useApi } from '@/lib/useApi';

export default function TutorProfile() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const { c } = useTheme();
  const { user } = useAuth();
  const { data, setData, loading, error, retry, refreshing, refresh } = useApi<{ tutor: Tutor; reviews: Review[] }>(`/tutors/${id}`);
  const toggleSave = useSaveToggle((_t, saved) => setData((d) => d && { ...d, tutor: { ...d.tutor, saved } }));
  const isParent = user?.role === 'parent' && !preview;

  if (loading) return <Screen edges={[]}><Loading /></Screen>;
  if (error || !data) return <Screen edges={[]}><ErrorState message={error ?? 'Not found'} onRetry={retry} /></Screen>;
  const t = data.tutor;
  const range = classRange(t.classFrom, t.classTo);

  return (
    <Screen edges={[]} refreshing={refreshing} onRefresh={refresh}>
      {preview && <View style={{ marginBottom: 12 }}><Notice tone="info" title="Preview">This is how parents see your profile.</Notice></View>}
      <View style={{ alignItems: 'center' }}>
        <Avatar name={t.name} url={t.photoUrl} size={112} />
        <T v="h1" center style={{ marginTop: 12 }}>{t.name}</T>
        <T tone="muted" center>{t.qualification} · {plural(t.experienceYears, 'year')} experience</T>
        <View style={{ marginTop: 8 }}><RatingLine tutor={t} /></View>
        <View style={{ marginTop: 10 }}><TrustBadges homeSafe={t.badges.homeSafe} idVerified={t.badges.idVerified} /></View>
        {isParent && (
          <IconButton name={t.saved ? 'heart' : 'heart-outline'} color={t.saved ? c.danger : c.muted} label={t.saved ? 'Remove from saved' : 'Save tutor'}
            onPress={() => toggleSave(t)} style={{ position: 'absolute', right: 0, top: 0 }} />
        )}
      </View>

      <Card style={{ marginTop: 20 }}>
        <T>{t.intro}</T>
        <Gap h={10} />
        <InfoLine icon="location-outline">{t.city} · {t.areas.join(', ')}</InfoLine>
        {range && <InfoLine icon="school-outline">{range}{t.boards.length ? ` · ${t.boards.join(', ')}` : ''}</InfoLine>}
        <InfoLine icon="chatbubbles-outline">Teaches in {t.languages.join(', ')}</InfoLine>
        <InfoLine icon="time-outline">{availabilityText(t)}</InfoLine>
        <InfoLine icon={t.homeAvailable ? 'home-outline' : 'laptop-outline'}>
          {t.homeAvailable && t.offersOnline ? 'Home tuition and online' : t.homeAvailable ? 'Home tuition' : 'Online only'}
        </InfoLine>
        {t.verifiedStudents > 0 && <InfoLine icon="people-outline">{plural(t.verifiedStudents, 'verified student')}</InfoLine>}
        {!t.homeAvailable && t.homeUnavailableReason && t.offersOnline && (
          <T v="caption" tone="muted" style={{ marginTop: 8 }}>{t.homeUnavailableReason}</T>
        )}
      </Card>

      {t.schoolSubjects.length > 0 && (
        <Section title="School subjects"><Row wrap gap={6}>{t.schoolSubjects.map((s) => <Tag key={s} label={s} />)}</Row></Section>
      )}
      {t.collegeSubjects.length > 0 && (
        <Section title="College subjects"><Row wrap gap={6}>{t.collegeSubjects.map((s) => <Tag key={s} label={s} />)}</Row></Section>
      )}

      <Section title="Fees">
        <Card>
          <FeeRow label="Monthly tuition" value={formatRupees(t.monthlyFee)} />
          {t.hourPrice != null && <FeeRow label="One-hour class" value={formatRupees(t.hourPrice)} />}
          {t.topicPrice != null && <FeeRow label="Full topic class (up to 2 hours)" value={formatRupees(t.topicPrice)} />}
        </Card>
      </Section>

      {isParent && (
        <View style={{ gap: 10, marginTop: 20 }}>
          {t.classFrom != null && (
            <Button title="Book free demo" icon="calendar-outline" onPress={() => router.push({ pathname: '/book-demo', params: { tutorId: String(t.id) } })} />
          )}
          {t.hourPrice != null && (
            <Button title="Book a one-hour class" variant="secondary" icon="time-outline" onPress={() => router.push({ pathname: '/book-class', params: { tutorId: String(t.id) } })} />
          )}
        </View>
      )}

      <Section title="Reviews" right={<LinkText onPress={() => router.push('/how-it-works')}>How this works</LinkText>}>
        <RatingBreakdown stats={t.rating} />
        <Gap h={12} />
        {data.reviews.length ? data.reviews.map((r) => <ReviewItem key={r.id} review={r} />) : (
          <EmptyState icon="star-outline" title="New tutor, no reviews yet" text="Only families whose child actually studied with this tutor can leave a review." />
        )}
      </Section>
    </Screen>
  );
}

function FeeRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
      <T style={{ flex: 1 }}>{label}</T>
      <T v="bodyStrong" tone="primary">{value}</T>
    </Row>
  );
}
