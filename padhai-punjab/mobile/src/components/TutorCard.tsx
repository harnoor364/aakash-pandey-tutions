import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TIMES_OF_DAY } from '../../../shared/constants.js';
import { api } from '@/lib/api';
import { classRange, formatRupees, nextFreeLabel, plural } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Tutor } from '@/lib/types';
import { Avatar, Badge, Button, Card, Gap, IconButton, InfoLine, Row, Stars, T, Tag, TrustBadges } from './ui';

export function RatingLine({ tutor }: { tutor: Tutor }) {
  if (!tutor.rating.count) {
    return <Badge label="New tutor, no reviews yet" tone="brass" icon="sparkles-outline" />;
  }
  return (
    <Row gap={6} wrap>
      <Stars value={tutor.rating.average ?? 0} />
      <T v="label">{tutor.rating.average?.toFixed(1)}</T>
      <T v="caption" tone="muted">({plural(tutor.rating.count, 'review')})</T>
    </Row>
  );
}

export function availabilityText(t: Tutor) {
  const times = t.availableTimes.map((k) => TIMES_OF_DAY[k as keyof typeof TIMES_OF_DAY]?.label).filter(Boolean).join(', ');
  const days = t.availableDays.length === 7 ? 'Every day' : t.availableDays.join(', ');
  return `${days} · ${times}`;
}

export function useSaveToggle(onChanged?: (t: Tutor, saved: boolean) => void) {
  const toast = useToast();
  return async (t: Tutor) => {
    try {
      const res = await api<{ message: string }>(`/parent/saved/${t.id}`, { method: t.saved ? 'DELETE' : 'PUT' });
      onChanged?.(t, !t.saved);
      toast.show(res.message);
    } catch (e: any) {
      toast.show(e.message, 'error');
    }
  };
}

export function TutorCard({ tutor, onToggleSave, mode, showRank, priceOverride, onBook, bookLabel = 'Book free demo' }: {
  tutor: Tutor; onToggleSave?: (t: Tutor) => void; mode?: 'home' | 'online' | null; showRank?: boolean;
  priceOverride?: { label: string; amount: number; nextFree?: Tutor['nextFree'] }; onBook?: () => void; bookLabel?: string;
}) {
  const { c } = useTheme();
  const subjects = [...tutor.schoolSubjects, ...tutor.collegeSubjects.filter((s) => !tutor.schoolSubjects.includes(s))];
  const range = classRange(tutor.classFrom, tutor.classTo);
  return (
    <Card onPress={() => router.push(`/tutor/${tutor.id}`)} accessibilityLabel={`${tutor.name}, ${tutor.city}. Open profile`} style={{ marginBottom: 16 }}>
      {showRank && tutor.rank != null && (
        <View style={{ position: 'absolute', top: 0, left: 18, backgroundColor: tutor.rank === 1 ? c.brass : c.surfaceAlt, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
          <T v="caption" style={{ color: tutor.rank === 1 ? '#1F2A25' : c.muted }}>#{tutor.rank} in your search</T>
        </View>
      )}
      <Row style={{ alignItems: 'flex-start', marginTop: showRank ? 14 : 0 }} gap={14}>
        <Avatar name={tutor.name} url={tutor.photoUrl} size={68} />
        <View style={{ flex: 1 }}>
          <T v="h3">{tutor.name}</T>
          <T v="small" tone="muted">{tutor.qualification} · {plural(tutor.experienceYears, 'year')} experience</T>
          <View style={{ marginTop: 6 }}><RatingLine tutor={tutor} /></View>
        </View>
        {onToggleSave && (
          <IconButton name={tutor.saved ? 'heart' : 'heart-outline'} color={tutor.saved ? c.danger : c.muted}
            label={tutor.saved ? `Remove ${tutor.firstName} from saved` : `Save ${tutor.firstName}`} onPress={() => onToggleSave(tutor)} />
        )}
      </Row>

      <Gap h={10} />
      <TrustBadges homeSafe={tutor.badges.homeSafe} idVerified={tutor.badges.idVerified} />

      <Gap h={12} />
      <Row wrap gap={6}>{subjects.slice(0, 6).map((s) => <Tag key={s} label={s} />)}</Row>

      <InfoLine icon="location-outline">{tutor.city} · {tutor.areas.join(', ')}</InfoLine>
      {(range || tutor.collegeSubjects.length > 0) && (
        <InfoLine icon="school-outline">
          {[range, tutor.collegeSubjects.length ? 'College' : null].filter(Boolean).join(' + ')}
          {tutor.boards.length ? ` · ${tutor.boards.join(', ')}` : ''}
        </InfoLine>
      )}
      <InfoLine icon="chatbubbles-outline">{tutor.languages.join(', ')}</InfoLine>
      <InfoLine icon="time-outline">{availabilityText(tutor)}</InfoLine>
      <InfoLine icon={tutor.homeAvailable ? 'home-outline' : 'laptop-outline'}>
        {tutor.homeAvailable && tutor.offersOnline ? 'Home tuition and online' : tutor.homeAvailable ? 'Home tuition only' : 'Online only'}
      </InfoLine>
      {tutor.verifiedStudents > 0 && (
        <InfoLine icon="people-outline">{plural(tutor.verifiedStudents, 'verified student')}</InfoLine>
      )}

      <Row style={{ justifyContent: 'space-between', marginTop: 14, alignItems: 'flex-end' }} wrap>
        <View>
          {priceOverride ? (
            <>
              <T v="caption" tone="muted">{priceOverride.label}</T>
              <T v="price" tone="primary">{formatRupees(priceOverride.amount)}</T>
              {priceOverride.nextFree !== undefined && (
                <Row gap={4}><Ionicons name="calendar-outline" size={15} color={c.primary} /><T v="caption" tone="primary">{nextFreeLabel(priceOverride.nextFree)}</T></Row>
              )}
            </>
          ) : (
            <>
              <T v="caption" tone="muted">Monthly fee</T>
              <T v="price" tone="primary">{formatRupees(tutor.monthlyFee)}</T>
            </>
          )}
        </View>
        {onBook !== undefined ? (
          <Button title={bookLabel} small onPress={onBook} icon="calendar-outline" />
        ) : (
          <Button title="Book free demo" small icon="calendar-outline"
            onPress={() => router.push({ pathname: '/book-demo', params: { tutorId: String(tutor.id), mode: mode ?? '' } })} />
        )}
      </Row>
    </Card>
  );
}
