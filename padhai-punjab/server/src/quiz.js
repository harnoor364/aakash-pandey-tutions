// Child-safety quiz. Answers never leave the server; the app only receives questions.
export const QUIZ = [
  {
    q: 'You arrive for a home class and no adult is at home — only the student. What do you do?',
    options: [
      'Start the class and tell the parent later',
      'Do not enter. Leave and message the parent to reschedule',
      'Teach at the doorstep for a short time',
    ],
    answer: 1,
  },
  {
    q: 'Where should home classes take place?',
    options: [
      "In the student's bedroom so it's quiet",
      'In any room with the door closed',
      'In an open, common area of the home',
    ],
    answer: 2,
  },
  {
    q: 'A student asks to follow you on Instagram and chat on WhatsApp. What is the right answer?',
    options: [
      'Politely say no. Talk about classes only with the parent',
      'Accept, but only chat about studies',
      'Give your number but tell them not to share it',
    ],
    answer: 0,
  },
  {
    q: 'A student keeps ignoring homework. What may you do?',
    options: [
      'A light slap is fine if the parent allows it',
      'Talk to the parent. Never use any physical punishment',
      'Make the student stand outside the room',
    ],
    answer: 1,
  },
  {
    q: 'You notice bruises and the child seems scared to go home after tuition. What do you do?',
    options: [
      'Nothing — it is a family matter',
      'Ask the child to keep it a secret between you',
      'Tell the Padhai Punjab safety team or call Childline 1098',
    ],
    answer: 2,
  },
];

export const quizForClient = () => QUIZ.map(({ q, options }) => ({ q, options }));

export function gradeQuiz(answers) {
  if (!Array.isArray(answers) || answers.length !== QUIZ.length) return { passed: false, wrong: QUIZ.length };
  const wrong = QUIZ.filter((item, i) => Number(answers[i]) !== item.answer).length;
  return { passed: wrong === 0, wrong };
}
