// ═══════════════════════════════════════════════════════════════════════
//  DEEP EXPLORATION — api.js
// ═══════════════════════════════════════════════════════════════════════

const ANTHROPIC_KEY = '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';

const GRADE_SUBJECTS = {
  1: { ela: 'grade 1 spelling — 3 to 4 letter CVC words like cat, dog, sun', math: 'grade 1 addition and subtraction within 20' },
  2: { ela: 'grade 2 spelling — common sight words and short vowel patterns', math: 'grade 2 addition/subtraction within 100' },
  3: { ela: 'grade 3 vocabulary — prefixes, suffixes, and spelling patterns', math: 'grade 3 multiplication and division basics' },
  4: { ela: 'grade 4 ELA — homophones, synonyms, antonyms, and spelling', math: 'grade 4 fractions and multi-digit multiplication' },
  5: { ela: 'grade 5 vocabulary — figurative language and spelling', math: 'grade 5 decimals and order of operations' },
  6: { ela: 'grade 6 ELA — vocabulary in context and advanced spelling', math: 'grade 6 ratios, expressions, and integers' },
};

const profile = JSON.parse(localStorage.getItem('de_profile') || '{}');
const grade   = profile.grade || 3;

async function fetchQuestion() {
  const subjects = GRADE_SUBJECTS[grade];
  const isELA    = Math.random() > 0.5;
  const subject  = isELA ? 'ELA' : 'Math';
  const topic    = isELA ? subjects.ela : subjects.math;

  const prompt = `You are a teacher creating a battle question for a student in grade ${grade}.
Topic: ${topic}
Subject: ${subject}

Generate ONE multiple choice question. Return ONLY valid JSON, no markdown, no explanation.
Format:
{
  "subject": "${subject}",
  "question": "...",
  "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctIndex": 0,
  "isCritWord": true or false,
  "explanation": "one sentence explanation of the correct answer"
}

isCritWord is true if the question involves a difficult or rare word that deserves a critical hit bonus.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data  = await res.json();
    const raw   = data.content.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn('API error, using fallback:', err);
    return fallbackQuestion();
  }
}

function fallbackQuestion() {
  const fallbacks = [
    { subject:'ELA',  question:'Which word is spelled correctly?', choices:['A. recieve','B. receive','C. receve','D. recieeve'], correctIndex:1, isCritWord:false, explanation:'"Receive" follows the i before e except after c rule.' },
    { subject:'Math', question:'What is 7 × 8?', choices:['A. 54','B. 56','C. 58','D. 64'], correctIndex:1, isCritWord:false, explanation:'7 × 8 = 56.' },
    { subject:'ELA',  question:'What is a synonym for "happy"?', choices:['A. Sad','B. Angry','C. Joyful','D. Tired'], correctIndex:2, isCritWord:false, explanation:'Joyful means feeling great happiness.' },
    { subject:'Math', question:'What is 144 ÷ 12?', choices:['A. 10','B. 11','C. 12','D. 13'], correctIndex:2, isCritWord:false, explanation:'144 ÷ 12 = 12.' },
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

async function loadQuestion() {
  const textEl    = document.getElementById('q-text');
  const choicesEl = document.getElementById('q-choices');
  const resultEl  = document.getElementById('q-result');
  const tagEl     = document.getElementById('q-subject-tag');

  textEl.textContent    = 'Loading...';
  choicesEl.innerHTML   = '';
  resultEl.textContent  = '';

  currentQuestion = await fetchQuestion();

  tagEl.textContent  = currentQuestion.subject;
  textEl.textContent = currentQuestion.question;

  currentQuestion.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className   = 'choice-btn';
    btn.textContent = choice;
    btn.onclick = () => {
      const correct = i === currentQuestion.correctIndex;
      const isCrit  = correct && currentQuestion.isCritWord;
      handleAnswer(i, correct, isCrit);
    };
    choicesEl.appendChild(btn);
  });
}

function speakQuestion() {
  if (!currentQuestion) return;
  const u = new SpeechSynthesisUtterance(currentQuestion.question);
  u.rate  = 0.88;
  u.lang  = 'en-US';
  const voices    = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'));
  if (preferred) u.voice = preferred;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

window.loadQuestion  = loadQuestion;
window.speakQuestion = speakQuestion;
