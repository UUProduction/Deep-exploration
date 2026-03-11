const GRADE_SUBJECTS = {
  1: { ela: 'grade 1 spelling — 3 to 4 letter CVC words like cat, dog, sun',    math: 'grade 1 addition and subtraction within 20' },
  2: { ela: 'grade 2 spelling — common sight words and short vowel patterns',    math: 'grade 2 addition/subtraction within 100' },
  3: { ela: 'grade 3 vocabulary — prefixes, suffixes, and spelling patterns',    math: 'grade 3 multiplication and division basics' },
  4: { ela: 'grade 4 ELA — homophones, synonyms, antonyms, and spelling',        math: 'grade 4 fractions and multi-digit multiplication' },
  5: { ela: 'grade 5 vocabulary — figurative language and spelling',             math: 'grade 5 decimals and order of operations' },
  6: { ela: 'grade 6 ELA — vocabulary in context and advanced spelling',         math: 'grade 6 ratios, expressions, and integers' },
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
  "isCritWord": true or false
}

isCritWord is true if the question involves a difficult or rare word that deserves a critical hit bonus.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const raw  = data.content.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('API error:', err);
    // Fallback question
    return {
      subject: 'ELA',
      question: 'Which of these is spelled correctly?',
      choices: ['A. recieve', 'B. receive', 'C. receve', 'D. recieeve'],
      correctIndex: 1,
      isCritWord: false
    };
  }
}

async function loadQuestion() {
  document.getElementById('q-text').textContent = 'Loading question...';
  document.getElementById('q-choices').innerHTML = '';
  document.getElementById('q-result').textContent = '';

  currentQuestion = await fetchQuestion();

  document.getElementById('q-subject-tag').textContent = currentQuestion.subject;
  document.getElementById('q-text').textContent = currentQuestion.question;

  const choicesEl = document.getElementById('q-choices');
  currentQuestion.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.onclick = () => {
      const correct = i === currentQuestion.correctIndex;
      const isCrit  = correct && currentQuestion.isCritWord;
      handleAnswer(i, correct, isCrit);
    };
    choicesEl.appendChild(btn);
  });
}

// ── Text-to-speech via Web Speech API (free, no API key needed) ──
function speakQuestion() {
  if (!currentQuestion) return;
  const utterance = new SpeechSynthesisUtterance(currentQuestion.question);
  utterance.rate  = 0.88;
  utterance.pitch = 1;
  utterance.lang  = 'en-US';

  // Pick a clear voice if available
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')
  );
  if (preferred) utterance.voice = preferred;

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

window.loadQuestion  = loadQuestion;
window.speakQuestion = speakQuestion;
