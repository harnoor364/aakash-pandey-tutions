// Validation for tutor sign-up and profile edits (steps 1–5 of the wizard).
import {
  BOARDS, COLLEGE_SUBJECTS, DISTRICTS, ID_TYPES, INTRO_MAX, INTRO_MIN, LANGUAGES,
  MIN_MONTHLY_FEE, QUALIFICATIONS, SCHOOL_SUBJECTS, TIMES_OF_DAY, WEEKDAYS,
} from '../../shared/constants.js';
import { asArray, bad, requireOneOf, requireText, str, toBool } from './util.js';

const NAME_RE = /^[\p{L}][\p{L} .'-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function subset(values, allowed, field, label, { min = 0 } = {}) {
  const arr = [...new Set(asArray(values).map(str).filter(Boolean))];
  const badOne = arr.find((v) => !allowed.includes(v));
  if (badOne) throw bad(`"${badOne}" is not a valid ${label}.`, field);
  if (arr.length < min) throw bad(`Please choose at least ${min === 1 ? 'one' : min} ${label}.`, field);
  return arr;
}

function int(v, field, label, { min, max } = {}) {
  const n = Number(v);
  if (v === '' || v == null || !Number.isInteger(n)) throw bad(`Please enter ${label} as a whole number.`, field);
  if (min != null && n < min) throw bad(`${label[0].toUpperCase()}${label.slice(1)} must be at least ${min}.`, field);
  if (max != null && n > max) throw bad(`${label[0].toUpperCase()}${label.slice(1)} must be ${max} or less.`, field);
  return n;
}

const optionalInt = (v, ...rest) => (v === '' || v == null ? null : int(v, ...rest));

export function validateTutorProfile(body, { signup = false } = {}) {
  const out = {};

  // Step 1 – name & contact
  out.first_name = requireText(body.firstName, 'firstName', 'your first name', { max: 40 });
  out.last_name = requireText(body.lastName, 'lastName', 'your last name', { max: 40 });
  if (!NAME_RE.test(out.first_name)) throw bad('First name can only have letters.', 'firstName');
  if (!NAME_RE.test(out.last_name)) throw bad('Last name can only have letters.', 'lastName');
  const email = str(body.email);
  if (email && !EMAIL_RE.test(email)) throw bad('That email address doesn’t look right.', 'email');
  out.email = email || null;

  // Step 2 – about you
  out.city = requireOneOf(str(body.city), DISTRICTS, 'city', 'your city');
  out.areas = asArray(body.areas).map(str).filter(Boolean).slice(0, 12);
  if (!out.areas.length) throw bad('Add at least one area you can travel to or teach from.', 'areas');
  if (out.areas.some((a) => a.length > 40)) throw bad('Each area name must be 40 characters or fewer.', 'areas');
  out.qualification = requireOneOf(str(body.qualification), QUALIFICATIONS, 'qualification', 'your highest qualification');
  out.experience_years = int(body.experienceYears, 'experienceYears', 'years of experience', { min: 0, max: 50 });
  out.languages = subset(body.languages, LANGUAGES, 'languages', 'teaching language', { min: 1 });
  const intro = str(body.intro);
  if (intro.length < INTRO_MIN) throw bad(`Your introduction needs at least ${INTRO_MIN} characters (now ${intro.length}).`, 'intro');
  if (intro.length > INTRO_MAX) throw bad(`Your introduction can be at most ${INTRO_MAX} characters (now ${intro.length}).`, 'intro');
  out.intro = intro;

  // Step 3 – what you teach
  out.school_subjects = subset(body.schoolSubjects, SCHOOL_SUBJECTS, 'schoolSubjects', 'school subject');
  out.college_subjects = subset(body.collegeSubjects, COLLEGE_SUBJECTS, 'collegeSubjects', 'college subject');
  if (!out.school_subjects.length && !out.college_subjects.length) {
    throw bad('Pick at least one school or college subject you teach.', 'schoolSubjects');
  }
  if (out.school_subjects.length) {
    out.class_from = int(body.classFrom, 'classFrom', 'the lowest class', { min: 1, max: 12 });
    out.class_to = int(body.classTo, 'classTo', 'the highest class', { min: 1, max: 12 });
    if (out.class_to < out.class_from) throw bad('"To" class must be the same as or higher than "From" class.', 'classTo');
    out.boards = subset(body.boards, BOARDS, 'boards', 'board', { min: 1 });
  } else {
    out.class_from = null;
    out.class_to = null;
    out.boards = subset(body.boards, BOARDS, 'boards', 'board');
  }

  // Step 4 – fees & timings
  out.offers_home = toBool(body.offersHome) ? 1 : 0;
  out.offers_online = toBool(body.offersOnline) ? 1 : 0;
  if (!out.offers_home && !out.offers_online) throw bad('Choose Home tuition, Online, or both.', 'offersHome');
  out.monthly_fee = int(body.monthlyFee, 'monthlyFee', 'monthly fee', { min: MIN_MONTHLY_FEE, max: 100000 });
  out.hour_price = optionalInt(body.hourPrice, 'hourPrice', 'one-hour class price', { min: 100, max: 20000 });
  out.topic_price = optionalInt(body.topicPrice, 'topicPrice', 'full topic class price', { min: 100, max: 40000 });
  if (out.college_subjects.length) {
    if (out.hour_price == null) throw bad('College tutors must set a one-hour class price.', 'hourPrice');
    if (out.topic_price == null) throw bad('College tutors must set a full topic class price.', 'topicPrice');
  }
  if ((out.hour_price == null) !== (out.topic_price == null)) {
    throw bad('Set both the one-hour and the full topic price, or leave both empty.', out.hour_price == null ? 'hourPrice' : 'topicPrice');
  }
  if (out.hour_price != null && out.topic_price < out.hour_price) {
    throw bad('Full topic class price must be the same as or more than the one-hour price.', 'topicPrice');
  }
  out.available_days = subset(body.availableDays, WEEKDAYS, 'availableDays', 'day', { min: 1 });
  out.available_times = subset(body.availableTimes, Object.keys(TIMES_OF_DAY), 'availableTimes', 'time of day', { min: 1 });

  // Step 5 – verification (sign-up only; ID documents are not editable from the profile)
  if (signup) {
    out.id_type = requireOneOf(str(body.idType), ID_TYPES, 'idType', 'an ID type');
    if (!toBool(body.agreeNoIncentives)) {
      throw bad('Please agree not to offer discounts or favours in exchange for reviews.', 'agreeNoIncentives');
    }
    if (!toBool(body.agreeBackground)) {
      throw bad('Please agree to the background check and child-safety rules.', 'agreeBackground');
    }
    out.agreed_no_incentives = 1;
    out.agreed_background = 1;
  }

  for (const k of ['areas', 'languages', 'school_subjects', 'college_subjects', 'boards', 'available_days', 'available_times']) {
    out[k] = JSON.stringify(out[k]);
  }
  return out;
}
