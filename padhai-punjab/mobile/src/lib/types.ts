export type Role = 'parent' | 'tutor' | 'admin';

export type Me = {
  id: number;
  phone: string;
  name: string | null;
  role: Role | null;
  isAdminPhone: boolean;
  tutor: { id: number; name: string; homeSafeStatus: string; idStatus: string } | null;
};

export type RatingStats = {
  count: number;
  average: number | null;
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
  trustScore: number;
};

export type Tutor = {
  id: number;
  name: string;
  firstName: string;
  photoUrl: string | null;
  city: string;
  areas: string[];
  qualification: string;
  experienceYears: number;
  languages: string[];
  intro: string;
  classFrom: number | null;
  classTo: number | null;
  schoolSubjects: string[];
  boards: string[];
  collegeSubjects: string[];
  offersOnline: boolean;
  homeAvailable: boolean;
  homeUnavailableReason: string | null;
  monthlyFee: number;
  hourPrice: number | null;
  topicPrice: number | null;
  availableDays: string[];
  availableTimes: string[];
  rating: RatingStats;
  verifiedStudents: number;
  badges: { homeSafe: boolean; idVerified: boolean };
  saved: boolean;
  rank?: number;
  price?: number;
  nextFree?: { day: string; hour: number } | null;
};

export type Review = {
  id: number;
  rating: number;
  comment: string;
  recommend: boolean;
  levelLabel: string;
  classesAttended: number | null;
  topic: string | null;
  reviewerName: string | null;
  verified: boolean;
  createdAt: string;
  edited: boolean;
  tutorName?: string;
  tutorId?: number;
};

export type ClassLog = { id: number; date: string; topic: string; parentConfirmed: boolean | null };

export type SessionStatus = 'waiting' | 'booked' | 'declined' | 'please_confirm' | 'completed' | 'not_attended' | 'cancelled';

export type Session = {
  id: number;
  tutorId?: number;
  tutorName?: string;
  studentName?: string;
  level: string;
  subject: string;
  topic: string;
  confusing: string | null;
  kind: 'hour' | 'topic';
  price: number;
  day: string;
  startHour: number;
  durationHours: number;
  mode: 'home' | 'online';
  area: string | null;
  status: SessionStatus;
  visitCode?: string | null;
  homePaused?: boolean;
  canReview?: boolean;
  hasReview?: boolean;
  phone?: string | null;
  startsInFuture?: boolean;
};
