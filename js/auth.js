// ── Background canvas (same ember effect as intro) ──────────────
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let W, H, particles = [];

function resizeCanvas() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function makeParticle() {
  return {
    x: Math.random() * W,
    y: H + 10,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 0.5 + 0.15,
    opacity: Math.random() * 0.6 + 0.1,
    drift: (Math.random() - 0.5) * 0.3,
    color: Math.random() > 0.5 ? '#8b0000' : '#ff4500'
  };
}

for (let i = 0; i < 70; i++) {
  const p = makeParticle();
  p.y = Math.random() * H;
  particles.push(p);
}

function drawBg() {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W);
  g.addColorStop(0, '#0a0005');
  g.addColorStop(1, '#050508');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    p.y -= p.speed;
    p.x += p.drift;
    p.opacity += (Math.random() - 0.5) * 0.03;
    p.opacity = Math.max(0.05, Math.min(0.8, p.opacity));
    if (p.y < -10) { Object.assign(p, makeParticle()); }
  });
  requestAnimationFrame(drawBg);
}
drawBg();

// ── Tab switching ───────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('panel-signup').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('panel-signin').classList.toggle('hidden', tab !== 'signin');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
}

// ── Grade selection ─────────────────────────────────────────────
let selectedGrade = null;
function selectGrade(el, grade) {
  document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedGrade = grade;
}

// ── Sign Up ─────────────────────────────────────────────────────
function handleSignUp() {
  const nickname    = document.getElementById('su-nickname').value.trim();
  const displayname = document.getElementById('su-displayname').value.trim();
  const email       = document.getElementById('su-email').value.trim();
  const password    = document.getElementById('su-password').value;
  const errEl       = document.getElementById('su-error');

  if (!nickname || !displayname || !email || !password || !selectedGrade) {
    errEl.textContent = 'All fields required. Choose your grade.';
    return;
  }
  if (!email.endsWith('@gmail.com')) {
    errEl.textContent = 'Must use a Gmail address.';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  errEl.textContent = '';

  // Save to localStorage for now (swap with Firebase later)
  const profile = { nickname, displayname, email, grade: selectedGrade };
  localStorage.setItem('de_profile', JSON.stringify(profile));
  localStorage.setItem('de_loggedin', 'true');

  // Transition to lore / game
  document.querySelector('.auth-wrapper').style.opacity = '0';
  document.querySelector('.auth-wrapper').style.transition = 'opacity 1s ease';
  setTimeout(() => { window.location.href = 'lore.html'; }, 1000);
}

// ── Sign In ─────────────────────────────────────────────────────
function handleSignIn() {
  const email    = document.getElementById('si-email').value.trim();
  const password = document.getElementById('si-password').value;
  const errEl    = document.getElementById('si-error');
  const profile  = JSON.parse(localStorage.getItem('de_profile') || 'null');

  if (!email || !password) {
    errEl.textContent = 'Enter your Gmail and password.';
    return;
  }
  if (!profile || profile.email !== email) {
    errEl.textContent = 'No soul found with that Gmail.';
    return;
  }

  errEl.textContent = '';
  localStorage.setItem('de_loggedin', 'true');

  document.querySelector('.auth-wrapper').style.opacity = '0';
  document.querySelector('.auth-wrapper').style.transition = 'opacity 1s ease';
  setTimeout(() => { window.location.href = 'game.html'; }, 1000);
}
