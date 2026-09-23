// Shared constants and validation rules for Padhai Punjab.
// Imported by both the API server (Node) and the mobile app (Metro), so keep this
// file dependency-free plain JavaScript.

export const TAGLINE_PA = 'ਤੁਹਾਡੇ ਬੱਚੇ ਲਈ ਸਹੀ ਅਧਿਆਪਕ';
export const TAGLINE_EN = 'The right teacher for your child';

// All 23 districts of Punjab.
export const DISTRICTS = [
  'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
  'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
  'Malerkotla', 'Mansa', 'Moga', 'Mohali', 'Nawanshahr', 'Pathankot', 'Patiala',
  'Rupnagar', 'Sangrur', 'Sri Muktsar Sahib', 'Tarn Taran',
];

export const BOARDS = ['PSEB', 'CBSE', 'ICSE'];
export const LANGUAGES = ['Punjabi', 'Hindi', 'English'];
export const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const SCHOOL_SUBJECTS = [
  'Maths', 'Science', 'English', 'Punjabi', 'Hindi', 'Social Science', 'EVS',
  'Physics', 'Chemistry', 'Biology', 'Accountancy', 'Business Studies',
  'Economics', 'Computer Science',
];

export const COLLEGE_SUBJECTS = [
  'Engineering Maths', 'Statistics', 'Programming (C/Python)', 'Java',
  'Data Structures', 'Financial Accounting', 'Cost Accounting', 'Economics',
  'Physics', 'Chemistry',
];

// One-hour / topic classes are for these levels only.
export const SESSION_LEVELS = ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'College'];

export const SUBJECTS_BY_LEVEL = {
  'Class 9': ['Maths', 'Science', 'English', 'Social Science', 'Punjabi', 'Hindi', 'Computer Science'],
  'Class 10': ['Maths', 'Science', 'English', 'Social Science', 'Punjabi', 'Hindi', 'Computer Science'],
  'Class 11': ['Maths', 'Physics', 'Chemistry', 'Biology', 'Accountancy', 'Business Studies', 'Economics', 'English', 'Computer Science'],
  'Class 12': ['Maths', 'Physics', 'Chemistry', 'Biology', 'Accountancy', 'Business Studies', 'Economics', 'English', 'Computer Science'],
  College: COLLEGE_SUBJECTS,
};

export const EXAMPLE_TOPICS = {
  Maths: ['Integration by parts', 'Quadratic equations', 'Trigonometric identities', 'Probability'],
  Science: ['Chemical reactions and equations', 'Light – reflection and refraction', 'Life processes'],
  Physics: ['Electrostatics – Gauss law', 'Rotational motion', 'Ray optics', 'Current electricity'],
  Chemistry: ['Mole concept', 'Chemical bonding', 'Organic reaction mechanisms', 'Electrochemistry'],
  Biology: ['Human reproduction', 'Genetics – Mendel’s laws', 'Photosynthesis'],
  English: ['Letter writing', 'Tenses', 'Reported speech', 'Unseen passage'],
  'Social Science': ['Nationalism in India', 'Resources and development', 'Map work'],
  Punjabi: ['ਲੇਖ ਰਚਨਾ (essay writing)', 'ਵਿਆਕਰਨ (grammar)', 'Letter writing in Punjabi'],
  Hindi: ['पत्र लेखन (letter writing)', 'व्याकरण (grammar)', 'Unseen passage'],
  Accountancy: ['Partnership – admission of a partner', 'Cash flow statement', 'Ratio analysis'],
  'Business Studies': ['Principles of management', 'Marketing mix', 'Financial markets'],
  Economics: ['Demand and elasticity', 'National income', 'Money and banking'],
  'Computer Science': ['Python lists and loops', 'SQL queries', 'File handling'],
  'Engineering Maths': ['Laplace transforms', 'Eigenvalues and eigenvectors', 'Partial differentiation'],
  Statistics: ['Hypothesis testing', 'Regression', 'Probability distributions'],
  'Programming (C/Python)': ['Pointers in C', 'Recursion', 'Python dictionaries'],
  Java: ['OOP – inheritance', 'Exception handling', 'Collections framework'],
  'Data Structures': ['Linked lists', 'Binary search trees', 'Graph traversal (BFS/DFS)'],
  'Financial Accounting': ['Journal and ledger', 'Depreciation', 'Final accounts'],
  'Cost Accounting': ['Marginal costing', 'Standard costing – variances', 'Job costing'],
};

export const SESSION_KINDS = {
  hour: { label: 'One-hour class', minutes: 60, blurb: '60 minutes on one doubt or topic' },
  topic: { label: 'Full topic class', minutes: 120, blurb: 'Up to 2 hours, with practice questions' },
};

export const TIMES_OF_DAY = {
  morning: { label: 'Morning', range: '7–11 am', hours: [7, 8, 9, 10] },
  afternoon: { label: 'Afternoon', range: '12–4 pm', hours: [12, 13, 14, 15] },
  evening: { label: 'Evening', range: '5–9 pm', hours: [17, 18, 19, 20] },
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEMO_TIME_SLOTS = [
  'Morning (7–11 am)', 'Afternoon (12–4 pm)', 'Evening (5–9 pm)', 'Weekend only',
];

export const QUALIFICATIONS = [
  'B.A.', 'B.Sc.', 'B.Com.', 'B.Tech / B.E.', 'B.Ed.', 'M.A.', 'M.Sc.', 'M.Com.',
  'M.Tech / M.E.', 'MCA', 'M.Ed.', 'Ph.D.', 'CA / CMA', 'Other',
];

export const ID_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving licence', 'Passport'];

export const ADDRESS_PROOF_TYPES = [
  'Aadhaar', 'Electricity bill', 'Water bill', 'Rent agreement', 'Passport', 'Bank passbook',
];

export const REFERENCE_RELATIONSHIPS = [
  'School principal or teacher', "Past student's parent", 'Coaching centre owner',
  'College professor', 'Employer',
];

export const SAFETY_STEPS = [
  { key: 'aadhaar', title: 'Aadhaar e-KYC', why: 'Confirms you are a real person with a government-verified identity.' },
  { key: 'selfie', title: 'Live selfie', why: 'We match a live photo of you to your Aadhaar photo, so families know it is really you.' },
  { key: 'police', title: 'Police verification', why: 'A Punjab Police certificate shows you have no criminal record. It must be renewed every year.' },
  { key: 'address', title: 'Current address', why: 'We need to know where you live. It is never shown to families.' },
  { key: 'qualification', title: 'Qualification certificate', why: 'Proves the degree you list on your profile.' },
  { key: 'references', title: 'Two references', why: 'People who have seen you teach vouch for you. No family members.' },
  { key: 'training', title: 'Child safety training', why: 'Every home tutor must know and follow our child-safety rules.' },
  { key: 'interview', title: 'Video interview', why: 'A short call with our safety team before you visit any home.' },
];

export const CHILD_SAFETY_RULES = [
  'A parent or another adult must be at home during every class.',
  'Teach only in an open, common area of the home — never in a closed room.',
  'No private chats, calls or social media with students. Talk to parents only.',
  'No physical punishment of any kind, ever.',
  'No gifts, rides, or meetings with the student outside class.',
  'Enter the home visit code from the parent at every home class.',
  'If you see signs that a child is being harmed, tell our safety team or call Childline 1098.',
];

export const REPORT_REASONS = [
  "Tutor didn't match their profile photo",
  'Inappropriate behaviour, language or touching',
  'Wanted to be alone with the child or in a closed room',
  "Asked for the child's personal number or social media",
  'Came without a booking or visit code',
  'Something else',
];

// Reviews and ranking
export const REVIEW_UNLOCK_CLASSES = 4;
export const TRUST_PRIOR_WEIGHT = 8;
export const TRUST_PRIOR_MEAN = 4.0;
export const MIN_MONTHLY_FEE = 500;
export const INTRO_MIN = 60;
export const INTRO_MAX = 400;
export const REVIEW_MIN_CHARS = 20;
export const POLICE_MAX_AGE_MONTHS = 6;
export const INTERVIEW_TIMES = ['11:00', '15:00', '18:00'];

// ---- Validation helpers (used on both client and server) ----

export const isIndianMobile = (v) => /^[6-9]\d{9}$/.test(String(v ?? '').trim());
export const isOtp = (v) => /^\d{4}$/.test(String(v ?? '').trim());
export const isAadhaar = (v) => /^[2-9]\d{11}$/.test(String(v ?? '').replace(/\s/g, ''));
export const isPunjabPin = (v) => /^1[456]\d{4}$/.test(String(v ?? '').trim());
export const maskAadhaar = (v) => `XXXX XXXX ${String(v).replace(/\s/g, '').slice(-4)}`;

/** Bayesian average: (8 × 4.0 + sum of ratings) ÷ (8 + number of ratings). */
export function trustScore(ratings) {
  const sum = ratings.reduce((a, b) => a + b, 0);
  return (TRUST_PRIOR_WEIGHT * TRUST_PRIOR_MEAN + sum) / (TRUST_PRIOR_WEIGHT + ratings.length);
}

export function formatHour(h) {
  const suffix = h >= 12 ? 'pm' : 'am';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${suffix}`;
}

export function formatRupees(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}
