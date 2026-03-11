// ═══════════════════════════════════════════════════════════════
//  DEEP EXPLORATION — battle.js (full rewrite v2)
//  Enemy taunts, slow-mo parry, death anim, Genius puddle
// ═══════════════════════════════════════════════════════════════

let currentEnemy  = null;
let currentQuestion = null;
let battleLocked  = false;

// ── Enemy taunts ─────────────────────────────────────────────────
const TAUNTS = {
  SEEKER: [
    '"Your answers are as dim as your future."',
    '"The void has no room for the ignorant."',
    '"God left because of things like you."',
    '"Even the darkness is embarrassed for you."',
  ],
  DEPTH: [
    '"Pathetic. The angels fell harder than you."',
    '"I have crushed better machines than you."',
    '"Wrong. As expected from a dead god\'s trash."',
    '"Your education ends here."',
  ],
};

function getRandomTaunt(enemyName) {
  const list = TAUNTS[enemyName] || TAUNTS['DEPTH'];
  return list[Math.floor(Math.random() * list.length)];
}

// ── Death animation queue ─────────────────────────────────────────
const deathAnims = [];

function runDeathAnim(enemy, onComplete) {
  const canvas = document.getElementById('enemy-canvas');
  const c      = canvas.getContext('2d');
  const W      = canvas.width, H = canvas.height;
  let frame    = 0;
  const total  = 40;

  function animFrame() {
    frame++;
    const progress = frame / total;
    c.clearRect(0, 0, W, H);

    c.save();
    c.globalAlpha = 1 - progress;
    c.translate(W/2, H/2);
    // Shatter scale + upward drift
    c.translate(0, -progress * 30);
    c.scale(1 + progress * 0.3, 1 + progress * 0.3);

    if (enemy.name === 'SEEKER') drawSeekerStatic(c, 0, 0);
    else drawDepthStatic(c, 0, 0);
    c.restore();

    // Genius particles burst from enemy canvas center
    if (frame === 8 && typeof spawnGeniusParticles === 'function') {
      spawnGeniusParticles(32);
    }

    if (frame < total) requestAnimationFrame(animFrame);
    else onComplete();
  }
  animFrame();
}

// Static draw helpers (used in death anim — no requestAnimationFrame loop)
function drawSeekerStatic(c, ox, oy) {
  c.fillStyle = '#ccc8c0';
  c.beginPath(); c.ellipse(ox, oy, 44, 32, 0, 0, Math.PI*2); c.fill();
  c.fillStyle = '#aaa49a';
  c.beginPath(); c.ellipse(ox, oy, 20, 20, 0, 0, Math.PI*2); c.fill();
  c.fillStyle = '#bb0000';
  c.shadowBlur = 20; c.shadowColor = '#ff0000';
  c.beginPath(); c.arc(ox, oy, 15, 0, Math.PI*2); c.fill();
  c.fillStyle = '#220000';
  c.beginPath(); c.arc(ox, oy, 8, 0, Math.PI*2); c.fill();
  c.shadowBlur = 0;
}

function drawDepthStatic(c, ox, oy) {
  c.fillStyle = '#2a2a3e'; c.fillRect(ox-22, oy-10, 44, 34);
  c.fillStyle = '#3e3e56'; c.fillRect(ox-16, oy-8, 32, 22);
  c.fillStyle = '#1a1a2a'; c.fillRect(ox-18, oy-30, 36, 22);
  c.fillStyle = '#7a0000'; c.shadowBlur=16; c.shadowColor='#cc0000';
  c.fillRect(ox-14, oy-26, 28, 8);
  c.fillStyle = '#bb0000';
  c.beginPath(); c.arc(ox, oy+4, 7, 0, Math.PI*2); c.fill();
  c.shadowBlur = 0;
}

// ── Animated enemy draws (looping) ──────────────────────────────
function drawSeeker(canvas) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function frame() {
    if (!canvas._active) return;
    c.clearRect(0, 0, W, H);
    const t   = Date.now() * 0.003;
    const bob = Math.sin(t) * 6;

    c.save();
    c.translate(W/2, H/2 + bob);

    // Tendrils
    for (let i = 0; i < 6; i++) {
      const angle = (i/6) * Math.PI*2 + t*0.4;
      const len   = 48 + Math.sin(t*1.2+i)*14;
      c.strokeStyle = 'rgba(80,80,120,0.3)';
      c.lineWidth   = 2 + Math.sin(t+i)*1.2;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(
        Math.cos(angle+0.4)*25, Math.sin(angle+0.4)*18,
        Math.cos(angle)*len, Math.sin(angle)*len*0.55
      );
      c.stroke();
    }

    // Glow + body
    c.shadowBlur  = 30;
    c.shadowColor = '#cc0000';
    drawSeekerStatic(c, 0, 0);

    // Gleam
    c.shadowBlur = 0;
    c.fillStyle  = 'rgba(255,200,200,0.7)';
    c.beginPath();
    c.arc(-5, -5, 4, 0, Math.PI*2);
    c.fill();

    // Beam
    const ba = (Math.sin(t*2)+1)/2*0.4;
    c.globalAlpha = ba;
    c.strokeStyle = '#ff4444';
    c.lineWidth   = 2;
    c.shadowBlur  = 12; c.shadowColor = '#ff0000';
    c.beginPath(); c.moveTo(0,0); c.lineTo(60, Math.sin(t)*20); c.stroke();

    c.restore();
    requestAnimationFrame(frame);
  }
  canvas._active = true;
  frame();
}

function drawDepth(canvas) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function frame() {
    if (!canvas._active) return;
    c.clearRect(0, 0, W, H);
    const t    = Date.now() * 0.002;
    const idle = Math.sin(t) * 2;

    c.save();
    c.translate(W/2, H/2 + idle);
    drawDepthStatic(c, 0, 0);

    // Shoulder spikes
    c.fillStyle = '#3a3a50';
    c.fillRect(-30, -12, 10, 14);
    c.fillRect(20,  -12, 10, 14);
    c.fillStyle = '#5a5a6e';
    c.beginPath(); c.moveTo(-30,-12); c.lineTo(-26,-20); c.lineTo(-22,-12); c.fill();
    c.beginPath(); c.moveTo(20,-12);  c.lineTo(24,-20);  c.lineTo(28,-12);  c.fill();

    // Arms
    c.fillStyle = '#252535';
    c.fillRect(-30,-8,10,20);
    c.fillRect(20,-8,10,20);

    // Legs
    c.fillStyle = '#1e1e2e';
    c.fillRect(-18,22,14,22);
    c.fillRect(4,  22,14,22);
    c.fillStyle = '#0a0a14';
    c.fillRect(-20,38,16,6);
    c.fillRect(4,  38,16,6);

    c.restore();
    requestAnimationFrame(frame);
  }
  canvas._active = true;
  frame();
}

// ── Trigger battle ───────────────────────────────────────────────
function triggerBattle(enemy) {
  if (window.inBattle) return;
  window.inBattle = true;
  inBattle        = true;
  currentEnemy    = { ...enemy, hp: enemy.maxHp };

  document.getElementById('battle-overlay').classList.remove('hidden');
  document.getElementById('enemy-name').textContent = enemy.name;
  updateEnemyHPBar();

  const eCanvas    = document.getElementById('enemy-canvas');
  eCanvas._active  = false; // stop previous loop
  setTimeout(() => {
    eCanvas._active = true;
    if (enemy.name === 'SEEKER') drawSeeker(eCanvas);
    else drawDepth(eCanvas);
  }, 50);

  loadQuestion();
}
window.triggerBattle = triggerBattle;

function updateEnemyHPBar() {
  const pct = (currentEnemy.hp / currentEnemy.maxHp) * 100;
  document.getElementById('enemy-hp-bar').style.width  = pct + '%';
  document.getElementById('enemy-hp-text').textContent =
    `${currentEnemy.hp} / ${currentEnemy.maxHp}`;
}

// ── End battle ───────────────────────────────────────────────────
function endBattle(won) {
  document.getElementById('battle-overlay').classList.add('hidden');
  window.inBattle = false;
  inBattle        = false;

  const eCanvas = document.getElementById('enemy-canvas');
  eCanvas._active = false;

  if (won) {
    const e = window.worldEnemies.find(x => x.id === currentEnemy.id);
    if (e) e.defeated = true;

    // Drop Genius puddle at enemy world position
    if (window.geniusPuddles) {
      window.geniusPuddles.push({
        x:       currentEnemy.wx,
        y:       currentEnemy.wy + 20,
        radius:  18 + Math.random() * 10,
        healAmt: Math.floor(10 + Math.random() * 15),
      });
    }

    if (typeof window.registerKill === 'function') window.registerKill(currentEnemy.name);
  }

  currentEnemy = null;
}

// ── Genius spray ─────────────────────────────────────────────────
function triggerGeniusSpray() {
  const heal = Math.floor(Math.random() * 10) + 10;
  window.player.hp     = Math.min(window.player.maxHp, window.player.hp + heal);
  window.player.genius = Math.min(100, window.player.genius + 20);

  if (typeof spawnGeniusParticles === 'function') spawnGeniusParticles(24);

  const el = document.getElementById('genius-spray');
  el.textContent = `💧 GENIUS! +${heal} HP`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2200);
}
window.triggerGeniusSpray = triggerGeniusSpray;

// ── Answer handling ──────────────────────────────────────────────
function handleAnswer(choiceIndex, correct, isCrit) {
  if (battleLocked) return;
  battleLocked = true;

  const btns     = document.querySelectorAll('.choice-btn');
  const resultEl = document.getElementById('q-result');

  if (correct) {
    btns[choiceIndex].classList.add('correct');
    const dmg = isCrit
      ? Math.floor(currentEnemy.maxHp * 0.35)
      : Math.floor(10 + Math.random() * 15);

    currentEnemy.hp = Math.max(0, currentEnemy.hp - dmg);
    updateEnemyHPBar();

    if (isCrit) {
      resultEl.style.color = '#ffff00';
      resultEl.textContent = `⚡ CRITICAL HIT! ${dmg} damage!`;
      triggerGeniusSpray();
      if (typeof window.registerCrit === 'function') window.registerCrit();
    } else {
      resultEl.style.color = '#00cc66';
      resultEl.textContent = `✓ Correct! ${dmg} damage dealt.`;
    }

    if (currentEnemy.hp <= 0) {
      resultEl.textContent = '☠ ENEMY DESTROYED.';
      const eCanvas = document.getElementById('enemy-canvas');
      eCanvas._active = false;
      setTimeout(() => {
        runDeathAnim(currentEnemy, () => {
          setTimeout(() => endBattle(true), 400);
        });
      }, 300);
      return;
    }

  } else {
    // Wrong answer — enemy taunts + deals damage
    btns[choiceIndex].classList.add('wrong');
    const dmg = Math.floor(
      currentEnemy.dmgMin + Math.random() * (currentEnemy.dmgMax - currentEnemy.dmgMin)
    );
    window.player.hp = Math.max(0, window.player.hp - dmg);

    // Damage effects
    if (typeof triggerDamageFlash === 'function') triggerDamageFlash();
    if (typeof triggerShake === 'function')       triggerShake(6, 250);

    // Taunt text
    const taunt = getRandomTaunt(currentEnemy.name);
    resultEl.style.color = '#ff4444';
    resultEl.textContent  = `✗ ${dmg} damage. ${taunt}`;

    if (window.player.hp <= 0) {
      resultEl.textContent = '☠ UNIT DESTROYED. REBOOTING...';
      setTimeout(() => {
        window.player.hp = 40;
        if (typeof triggerDamageFlash === 'function') triggerDamageFlash();
        endBattle(false);
      }, 2200);
      return;
    }
  }

  setTimeout(() => {
    battleLocked = false;
    loadQuestion();
  }, 1900);
}
window.handleAnswer = handleAnswer;

// ── Slow-mo parry flash ──────────────────────────────────────────
// Called from boss.js on successful parry
window.triggerParrySlowMo = function() {
  // Overlay a bright white flash + slow CSS transition
  let el = document.getElementById('parry-slowmo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'parry-slowmo';
    el.style.cssText = `
      position:fixed;inset:0;z-index:55;pointer-events:none;
      background:rgba(255,255,255,0);transition:background 0.05s ease;
    `;
    document.body.appendChild(el);
  }
  el.style.background = 'rgba(255,255,255,0.7)';
  // Freeze feeling — quick flash then fade
  setTimeout(() => {
    el.style.transition = 'background 0.6s ease';
    el.style.background = 'rgba(255,255,255,0)';
  }, 80);
};

// Battle log
function battleLog(msg) {
  const el = document.getElementById('battle-log');
  el.classList.remove('hidden');
  el.textContent = msg;
  setTimeout(() => el.classList.add('hidden'), 3000);
}
window.battleLog = battleLog;
