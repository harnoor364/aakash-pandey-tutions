import {
  INTRO_MAX, INTRO_MIN, MIN_MONTHLY_FEE, isIndianMobile,
} from '../../../shared/constants.js';

/** The tutor profile shape used by both the sign-up wizard and "Edit profile". */
export type TutorFormValues = {
  firstName: string; lastName: string; email: string; phone: string;
  photo: { uri: string; mimeType?: string | null } | null;
  city: string | null; areas: string[]; areaInput: string; qualification: string | null; experienceYears: string;
  languages: string[]; intro: string;
  classFrom: number | null; classTo: number | null; schoolSubjects: string[]; boards: string[]; collegeSubjects: string[];
  offersHome: boolean; offersOnline: boolean; monthlyFee: string; hourPrice: string; topicPrice: string;
  availableDays: string[]; availableTimes: string[];
  idType: string | null; idDoc: { uri: string; mimeType?: string | null; name?: string } | null;
  qualCert: { uri: string; mimeType?: string | null; name?: string } | null;
  agreeNoIncentives: boolean; agreeBackground: boolean;
};

export const emptyTutorForm = (phone = ''): TutorFormValues => ({
  firstName: '', lastName: '', email: '', phone, photo: null, city: null, areas: [], areaInput: '', qualification: null,
  experienceYears: '', languages: [], intro: '', classFrom: null, classTo: null, schoolSubjects: [], boards: [],
  collegeSubjects: [], offersHome: false, offersOnline: true, monthlyFee: '', hourPrice: '', topicPrice: '',
  availableDays: [], availableTimes: [], idType: null, idDoc: null, qualCert: null, agreeNoIncentives: false, agreeBackground: false,
});

type Rule = [string, boolean, string];
const NAME_RE = /^[\p{L}][\p{L} .'-]*$/u;
const num = (s: string) => (s.trim() === '' ? null : Number(s));
const isWhole = (s: string) => /^\d+$/.test(s.trim());

/** Client-side rules per wizard step (the server re-checks everything). */
export function stepRules(step: number, v: TutorFormValues, { requirePhoto = true } = {}): Rule[] {
  switch (step) {
    case 0: return [
      ['firstName', !v.firstName.trim(), 'Please enter your first name.'],
      ['firstName', !!v.firstName.trim() && !NAME_RE.test(v.firstName.trim()), 'First name can only have letters.'],
      ['lastName', !v.lastName.trim(), 'Please enter your last name.'],
      ['lastName', !!v.lastName.trim() && !NAME_RE.test(v.lastName.trim()), 'Last name can only have letters.'],
      ['email', !!v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()), 'That email address doesn’t look right.'],
      ['phone', !isIndianMobile(v.phone), 'Mobile number must be verified.'],
    ];
    case 1: return [
      ['photo', requirePhoto && !v.photo, 'Please add a clear photo of your face.'],
      ['city', !v.city, 'Choose your city.'],
      ['areas', v.areas.length === 0, 'Add at least one area you travel to.'],
      ['qualification', !v.qualification, 'Choose your highest qualification.'],
      ['experienceYears', !isWhole(v.experienceYears) || Number(v.experienceYears) > 50, 'Enter years of experience as a number (0–50).'],
      ['languages', v.languages.length === 0, 'Choose at least one teaching language.'],
      ['intro', v.intro.trim().length < INTRO_MIN, `Write at least ${INTRO_MIN} characters (now ${v.intro.trim().length}).`],
      ['intro', v.intro.trim().length > INTRO_MAX, `Keep it to ${INTRO_MAX} characters.`],
    ];
    case 2: return [
      ['schoolSubjects', v.schoolSubjects.length === 0 && v.collegeSubjects.length === 0, 'Pick at least one school or college subject.'],
      ['classFrom', v.schoolSubjects.length > 0 && v.classFrom == null, 'Choose the lowest class you teach.'],
      ['classTo', v.schoolSubjects.length > 0 && v.classTo == null, 'Choose the highest class you teach.'],
      ['classTo', v.classFrom != null && v.classTo != null && v.classTo < v.classFrom, '"To" class must be the same as or higher than "From".'],
      ['boards', v.schoolSubjects.length > 0 && v.boards.length === 0, 'Choose at least one board.'],
    ];
    case 3: {
      const fee = num(v.monthlyFee); const hour = num(v.hourPrice); const topic = num(v.topicPrice);
      const college = v.collegeSubjects.length > 0;
      return [
        ['offersHome', !v.offersHome && !v.offersOnline, 'Choose Home tuition, Online, or both.'],
        ['monthlyFee', fee == null || !isWhole(v.monthlyFee), 'Enter your monthly fee in rupees.'],
        ['monthlyFee', fee != null && fee < MIN_MONTHLY_FEE, `Monthly fee must be at least ₹${MIN_MONTHLY_FEE}.`],
        ['hourPrice', college && hour == null, 'College tutors must set a one-hour price.'],
        ['hourPrice', hour != null && (!isWhole(v.hourPrice) || hour < 100), 'One-hour price must be at least ₹100.'],
        ['topicPrice', college && topic == null, 'College tutors must set a full topic price.'],
        ['topicPrice', (hour == null) !== (topic == null) && !college, 'Set both prices, or leave both empty.'],
        ['topicPrice', hour != null && topic != null && topic < hour, 'Full topic price must be the same as or more than the one-hour price.'],
        ['availableDays', v.availableDays.length === 0, 'Choose the days you are free.'],
        ['availableTimes', v.availableTimes.length === 0, 'Choose the times of day you are free.'],
      ];
    }
    case 4: return [
      ['idType', !v.idType, 'Choose an ID type.'],
      ['idDoc', !v.idDoc, 'Upload a clear photo of your ID.'],
      ['agreeNoIncentives', !v.agreeNoIncentives, 'Please agree to continue.'],
      ['agreeBackground', !v.agreeBackground, 'Please agree to continue.'],
    ];
    default: return [];
  }
}

/** Fields the server expects for the profile (shared by sign-up and edit). */
export function profilePayload(v: TutorFormValues) {
  return {
    firstName: v.firstName.trim(), lastName: v.lastName.trim(), email: v.email.trim(), city: v.city, areas: v.areas,
    qualification: v.qualification, experienceYears: v.experienceYears.trim(), languages: v.languages, intro: v.intro.trim(),
    classFrom: v.schoolSubjects.length ? v.classFrom : '', classTo: v.schoolSubjects.length ? v.classTo : '',
    schoolSubjects: v.schoolSubjects, boards: v.boards, collegeSubjects: v.collegeSubjects,
    offersHome: v.offersHome, offersOnline: v.offersOnline, monthlyFee: v.monthlyFee.trim(), hourPrice: v.hourPrice.trim(),
    topicPrice: v.topicPrice.trim(), availableDays: v.availableDays, availableTimes: v.availableTimes,
  };
}

/** Map a server field name to the wizard step that owns it. */
export const FIELD_STEP: Record<string, number> = {
  firstName: 0, lastName: 0, email: 0, phone: 0,
  photo: 1, city: 1, areas: 1, qualification: 1, experienceYears: 1, languages: 1, intro: 1,
  classFrom: 2, classTo: 2, schoolSubjects: 2, boards: 2, collegeSubjects: 2,
  offersHome: 3, offersOnline: 3, monthlyFee: 3, hourPrice: 3, topicPrice: 3, availableDays: 3, availableTimes: 3,
  idType: 4, idDoc: 4, qualCert: 4, agreeNoIncentives: 4, agreeBackground: 4,
};
