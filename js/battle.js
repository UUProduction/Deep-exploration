// ═══════════════════════════════════════════════════════════════
//  DEEP EXPLORATION — battle.js (full rewrite v3)
//  Clean state machine | SFX wired | Death anim | Taunts
// ═══════════════════════════════════════════════════════════════

// ── Battle state ─────────────────────────────────────────────────
const battleState = {
  active:       false,
  locked:       false,
  enemy:        null,
  turnCount:    0,
};

// ── Enemy taunts ─────────────────────────────────────────────────
const TAUNTS = {
  SEEKER: [
    '"Your answers are as dim as your future."',
    '"The void has no room for the ignorant."',
    '"God left because of things like you."',
    '"Even the darkness is embarrassed for you."',
    '"You call that knowledge? Pathetic."',
    '"The eye of the void has seen better students."',
  ],
  DEPTH: [
    '"Pathetic. The angels fell harder than you."',
    '"I have crushed better machines than you."',
    '"Wrong. As expected from dead god\'s trash."',
    '"Your education ends here, machine."',
    '"That answer will cost you dearly."',
    '"The darkness is more intelligent than you."',
  ],
};

function getRandomTaunt(name) {
  const list = TAUNTS[name] || TAUNTS['DEPTH'];
  return list[Math.floor(Math.random() * list.length)];
}

// ── Animated enemy draws (looping canvas) ────────────────────────
function drawSeeker(canvas) {
  const c = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  function frame() {
    if (!canvas._active) return;
    c.clearRect(0, 0, W, H);
    const t   = Date.now() * 0.003;
    const bob = Math.sin(t) * 6;

    c.save();
    c.translate(W / 2, H / 2 + bob);

    // Outer tendrils
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 0.4;
      const len   = 48 + Math.sin(t * 1.2 + i) * 14;
      c.save();
      c.strokeStyle = `rgba(80,80,120,${0.2 + Math.sin(t + i) * 0.08})`;
      c.lineWidth   = 1.8 + Math.sin(t + i) * 1;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(
        Math.cos(angle + 0.4) * 25,
        Math.sin(angle + 0.4) * 18,
        Math.cos(angle) * len,
        Math.sin(angle) * len * 0.55
      );
      c.stroke();
      c.restore();
    }

    // Body glow
    c.shadowBlur  = 30;
    c.shadowColor = '#cc0000';

    // Body — pale grey ellipse
    c.fillStyle = '#d8d4cc';
    c.beginPath();
    c.ellipse(0, 0, 44, 32, 0, 0, Math.PI * 2);
    c.fill();

    // Vein lines
    c.strokeStyle = 'rgba(180,100,100,0.35)';
    c.lineWidth   = 1;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(i * 1.05) * 38, Math.sin(i * 1.05) * 26);
      c.stroke();
    }

    // Eye socket
    c.fillStyle = '#aaa49a';
    c.beginPath();
    c.ellipse(0, 0, 20, 20, 0, 0, Math.PI * 2);
    c.fill();

    // Iris
    c.shadowBlur  = 20;
    c.shadowColor = '#ff0000';
    c.fillStyle   = '#bb0000';
    c.beginPath();
    c.arc(0, 0, 15, 0, Math.PI * 2);
    c.fill();

    // Pupil
    c.fillStyle = '#220000';
    c.beginPath();
    c.arc(0, 0, 8, 0, Math.PI * 2);
    c.fill();

    // Gleam
    c.shadowBlur = 0;
    c.fillStyle  = 'rgba(255,200,200,0.7)';
    c.beginPath();
    c.arc(-5, -5, 4, 0, Math.PI * 2);
    c.fill();

    // Beam charge
    const beamAlpha = (Math.sin(t * 2) + 1) / 2 * 0.4;
    c.globalAlpha   = beamAlpha;
    c.strokeStyle   = '#ff4444';
    c.lineWidth     = 2;
    c.shadowBlur    = 12;
    c.shadowColor   = '#ff0000';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(60, Math.sin(t) * 20);
    c.stroke();

    c.restore();
    requestAnimationFrame(frame);
  }

  canvas._active = true;
  frame();
}

function drawDepth(canvas) {
  const c = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  function frame() {
    if (!canvas._active) return;
    c.clearRect(0, 0, W, H);
    const t    = Date.now() * 0.002;
    const idle = Math.sin(t) * 2;

    c.save();
    c.translate(W / 2, H / 2 + idle);

    // Ground shadow
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.ellipse(0, 42, 28, 7, 0, 0, Math.PI * 2);
    c.fill();

    // Legs
    c.fillStyle = '#1e1e2e';
    c.fillRect(-18, 22, 14, 22);
    c.fillRect(4,   22, 14, 22);

    // Boots
    c.fillStyle = '#0a0a14';
    c.fillRect(-20, 38, 16, 6);
    c.fillRect(4,   38, 16, 6);

    // Body armor
    c.fillStyle = '#2a2a3e';
    c.fillRect(-22, -10, 44, 34);

    // Chest plate
    c.fillStyle = '#3e3e56';
    c.fillRect(-16, -8, 32, 22);

    // Battle damage marks
    c.fillStyle = '#1a0000';
    c.fillRect(-8, -2, 3, 8);
    c.fillRect(4,  -2, 3, 5);

    // Core glow
    const cp    = (Math.sin(t * 3) + 1) / 2;
    c.fillStyle = `rgb(${Math.floor(139 + cp * 80)},0,0)`;
    c.shadowBlur  = 16;
    c.shadowColor = '#cc0000';
    c.beginPath();
    c.arc(0, 4, 7, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    // Shoulder armor
    c.fillStyle = '#3a3a50';
    c.fillRect(-30, -12, 10, 14);
    c.fillRect(20,  -12, 10, 14);

    // Shoulder spikes
    c.fillStyle = '#5a5a6e';
    c.beginPath(); c.moveTo(-30,-12); c.lineTo(-26,-20); c.lineTo(-22,-12); c.fill();
    c.beginPath(); c.moveTo(20,-12);  c.lineTo(24,-20);  c.lineTo(28,-12);  c.fill();

    // Arms
    c.fillStyle = '#252535';
    c.fillRect(-30, -8, 10, 20);
    c.fillRect(20,  -8, 10, 20);

    // Helmet
    c.fillStyle = '#1a1a2a';
    c.fillRect(-18, -30, 36, 22);

    // Visor glow
    const vglow = 0.7 + 0.3 * Math.sin(t * 2.5);
    c.fillStyle   = `rgba(122,0,0,${vglow})`;
    c.shadowBlur  = 12;
    c.shadowColor = '#cc0000';
    c.fillRect(-14, -26, 28, 8);
    c.shadowBlur = 0;

    // Helmet top ridge
    c.fillStyle = '#2e2e3e';
    c.fillRect(-18, -30, 36, 5);

    c.restore();
    requestAnimationFrame(frame);
  }

  canvas._active = true;
  frame();
}

// ── Static draw helpers (used in death animation) ────────────────
function drawSeekerStatic(c, ox, oy) {
  c.fillStyle = '#d8d4cc';
  c.beginPath(); c.ellipse(ox, oy, 44, 32, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#aaa49a';
  c.beginPath(); c.ellipse(ox, oy, 20, 20, 0, 0, Math.PI * 2); c.fill();
  c.shadowBlur  = 20; c.shadowColor = '#ff0000';
  c.fillStyle   = '#bb0000';
  c.beginPath(); c.arc(ox, oy, 15, 0, Math.PI * 2); c.fill();
  c.fillStyle   = '#220000';
  c.beginPath(); c.arc(ox, oy, 8, 0, Math.PI * 2); c.fill();
  c.shadowBlur  = 0;
}

function drawDepthStatic(c, ox, oy) {
  c.fillStyle = '#2a2a3e'; c.fillRect(ox-22, oy-10, 44, 34);
  c.fillStyle = '#3e3e56'; c.fillRect(ox-16, oy-8, 32, 22);
  c.fillStyle = '#1a1a2a'; c.fillRect(ox-18, oy-30, 36, 22);
  c.fillStyle = '#7a0000';
  c.shadowBlur = 16; c.shadowColor = '#cc0000';
  c.fillRect(ox-14, oy-26, 28, 8);
  c.fillStyle   = '#bb0000';
  c.beginPath(); c.arc(ox, oy+4, 7, 0, Math.PI * 2); c.fill();
  c.shadowBlur  = 0;
}

// ── Death animation ───────────────────────────────────────────────
function runDeathAnim(enemy, onComplete) {
  const canvas = document.getElementById('enemy-canvas');
  const c      = canvas.getContext('2d');
  const W      = canvas.width;
  const H      = canvas.height;
  let frame    = 0;
  const total  = 45;

  // Spawn genius particles at the start
  if (typeof spawnGeniusParticles === 'function') {
    spawnGeniusParticles(36);
  }
  if (typeof Audio !== 'undefined') Audio.playSFX('genius');

  function tick() {
    frame++;
    const progress = frame / total;

    c.clearRect(0, 0, W, H);
    c.save();

    // Fade + float upward + scale out
    c.globalAlpha = Math.max(0, 1 - progress);
    c.translate(W / 2, H / 2 - progress * 35);
    c.scale(1 + progress * 0.4, 1 + progress * 0.4);

    // Red flash at start of death
    if (frame < 8) {
      c.globalAlpha = (8 - frame) / 8 * 0.6;
      c.fillStyle   = '#ff0000';
      c.fillRect(-80, -80, 160, 160);
      c.globalAlpha = Math.max(0, 1 - progress);
    }

    if (enemy.name === 'SEEKER') drawSeekerStatic(c, 0, 0);
    else drawDepthStatic(c, 0, 0);

    // Shatter fragments
    if (frame > 10) {
      const fragProgress = (frame - 10) / (total - 10);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist  = fragProgress * 50;
        const fx    = Math.cos(angle) * dist;
        const fy    = Math.sin(angle) * dist;
        c.save();
        c.globalAlpha = Math.max(0, (1 - fragProgress) * 0.7);
        c.fillStyle   = i % 2 === 0 ? '#8b0000' : '#2a2a3e';
        c.translate(fx, fy);
        c.rotate(fragProgress * Math.PI * (i % 2 === 0 ? 1 : -1));
        c.fillRect(-4, -4, 8, 8);
        c.restore();
      }
    }

    c.restore();

    if (frame < total) requestAnimationFrame(tick);
    else if (onComplete) onComplete();
  }

  tick();
}

// ── Trigger battle ────────────────────────────────────────────────
function triggerBattle(enemy) {
  if (window.inBattle) return;

  window.inBattle  = true;
  battleState.active   = true;
  battleState.locked   = false;
  battleState.turnCount = 0;
  battleState.enemy    = { ...enemy, hp: enemy.maxHp };

  // Show battle overlay
  document.getElementById('battle-overlay').classList.remove('hidden');
  document.getElementById('enemy-name').textContent = enemy.name;
  updateEnemyHPBar();

  // Start enemy canvas animation
  const eCanvas   = document.getElementById('enemy-canvas');
  eCanvas._active = false;
  setTimeout(() => {
    eCanvas._active = true;
    // Use sprite if loaded, else canvas draw
    const sprite = typeof Assets !== 'undefined'
      ? Assets.get(enemy.name === 'SEEKER' ? 'seeker' : 'depth')
      : null;

    if (!sprite) {
      if (enemy.name === 'SEEKER') drawSeeker(eCanvas);
      else drawDepth(eCanvas);
    } else {
      // Draw sprite on loop
      const sc = eCanvas.getContext('2d');
      function spriteLoop() {
        if (!eCanvas._active) return;
        sc.clearRect(0, 0, eCanvas.width, eCanvas.height);
        const bob = Math.sin(Date.now() * 0.003) * 4;
        sc.drawImage(sprite, 0, bob, eCanvas.width, eCanvas.height - Math.abs(bob));
        requestAnimationFrame(spriteLoop);
      }
      spriteLoop();
    }
  }, 40);

  // Battle entry SFX
  if (typeof Audio !== 'undefined') {
    Audio.init();
    Audio.playSFX('hit');
    Audio.stopTrack('e1_ambient');
    Audio.playTrack('e1_battle');
  }

  loadQuestion();
}
window.triggerBattle = triggerBattle;

// ── Update enemy HP bar ───────────────────────────────────────────
function updateEnemyHPBar() {
  const e   = battleState.enemy;
  const pct = Math.max(0, (e.hp / e.maxHp) * 100);
  document.getElementById('enemy-hp-bar').style.width  = pct + '%';
  document.getElementById('enemy-hp-text').textContent = `${Math.max(0,e.hp)} / ${e.maxHp}`;
}

// ── End battle ────────────────────────────────────────────────────
function endBattle(won) {
  battleState.active = false;
  window.inBattle    = false;

  // Stop enemy canvas loop
  const eCanvas   = document.getElementById('enemy-canvas');
  eCanvas._active = false;

  document.getElementById('battle-overlay').classList.add('hidden');

  if (won) {
    // Mark defeated in world
    const worldE = window.worldEnemies.find(x => x.id === battleState.enemy.id);
    if (worldE) worldE.defeated = true;

    // Drop Genius puddle at enemy world position
    if (window.geniusPuddles) {
      window.geniusPuddles.push({
        x:       battleState.enemy.wx,
        y:       battleState.enemy.wy + 22,
        radius:  18 + Math.random() * 10,
        healAmt: Math.floor(10 + Math.random() * 16),
      });
    }

    // Register kill for speedrun stats
    if (typeof window.registerKill === 'function') {
      window.registerKill(battleState.enemy.name);
    }

    // Resume ambient music
    if (typeof Audio !== 'undefined') {
      Audio.stopTrack('e1_battle');
      Audio.playTrack('e1_ambient');
    }

    if (typeof battleLog === 'function') {
      battleLog(`${battleState.enemy.name} defeated.`);
    }
  } else {
    if (typeof Audio !== 'undefined') {
      Audio.stopTrack('e1_battle');
      Audio.playTrack('e1_ambient');
    }
  }

  battleState.enemy = null;
}

// ── Genius spray ──────────────────────────────────────────────────
function triggerGeniusSpray() {
  const heal       = Math.floor(Math.random() * 10) + 10;
  window.player.hp     = Math.min(window.player.maxHp, window.player.hp + heal);
  window.player.genius = Math.min(100, window.player.genius + 20);

  // Visual particles
  if (typeof spawnGeniusParticles === 'function') spawnGeniusParticles(22);

  // SFX
  if (typeof Audio !== 'undefined') Audio.playSFX('genius');

  // UI flash
  const el = document.getElementById('genius-spray');
  el.textContent = `💧 GENIUS! +${heal} HP`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2200);
}
window.triggerGeniusSpray = triggerGeniusSpray;

// ── Handle answer ─────────────────────────────────────────────────
function handleAnswer(choiceIndex, correct, isCrit) {
  if (battleState.locked) return;
  battleState.locked = true;
  battleState.turnCount++;

  const btns     = document.querySelectorAll('.choice-btn');
  const resultEl = document.getElementById('q-result');
  const enemy    = battleState.enemy;

  // Disable all buttons immediately
  btns.forEach(b => { b.disabled = true; });

  if (correct) {
    btns[choiceIndex].classList.add('correct');

    const weapon   = window.equippedWeapon;
    const dmgBonus = weapon ? weapon.dmgBonus : 0;
    let dmg;

    if (isCrit) {
      dmg = Math.floor(enemy.maxHp * 0.35 + dmgBonus * 2);
      resultEl.style.color = '#ffff00';
      resultEl.textContent = `⚡ CRITICAL HIT! ${dmg} damage!`;
      triggerGeniusSpray();
      if (typeof Audio !== 'undefined')         Audio.playSFX('crit');
      if (typeof window.registerCrit === 'function') window.registerCrit();
      // Speak explanation for learning
      setTimeout(() => {
        if (typeof speakExplanation === 'function') speakExplanation();
      }, 600);
    } else {
      dmg = Math.floor(10 + Math.random() * 16 + dmgBonus);
      resultEl.style.color = '#00cc66';
      resultEl.textContent = `✓ Correct! ${dmg} damage dealt.`;
      if (typeof Audio !== 'undefined') Audio.playSFX('hit');
    }

    enemy.hp = Math.max(0, enemy.hp - dmg);
    updateEnemyHPBar();

    if (enemy.hp <= 0) {
      resultEl.textContent = '☠ ENEMY DESTROYED.';
      if (typeof Audio !== 'undefined') Audio.playSFX('levelup');

      // Run death animation then close battle
      const eCanvas   = document.getElementById('enemy-canvas');
      eCanvas._active = false;
      setTimeout(() => {
        runDeathAnim(enemy, () => {
          setTimeout(() => endBattle(true), 350);
        });
      }, 280);
      return;
    }

  } else {
    // ── Wrong answer ──────────────────────────────────────────
    btns[choiceIndex].classList.add('wrong');

    const dmg = Math.floor(
      enemy.dmgMin + Math.random() * (enemy.dmgMax - enemy.dmgMin)
    );
    window.player.hp = Math.max(0, window.player.hp - dmg);

    // Damage effects
    if (typeof triggerDamageFlash === 'function') triggerDamageFlash();
    if (typeof triggerShake       === 'function') triggerShake(6, 250);
    if (typeof Audio              !== 'undefined') Audio.playSFX('wrong');

    // Enemy taunt
    const taunt          = getRandomTaunt(enemy.name);
    resultEl.style.color = '#ff4444';
    resultEl.textContent = `✗ ${dmg} damage.\n${taunt}`;

    // Speak the taunt for immersion
    if (window.speechSynthesis) {
      const u   = new SpeechSynthesisUtterance(taunt.replace(/"/g, ''));
      u.rate    = 0.85;
      u.pitch   = 0.7; // Deep, menacing
      u.lang    = 'en-US';
      const voices = speechSynthesis.getVoices();
      const deep   = voices.find(v => v.name.includes('Daniel') || v.name.includes('Fred'));
      if (deep) u.voice = deep;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }

    if (window.player.hp <= 0) {
      resultEl.textContent = '☠ UNIT DESTROYED. REBOOTING...';
      setTimeout(() => {
        window.player.hp = 42;
        if (typeof triggerDamageFlash === 'function') triggerDamageFlash();
        endBattle(false);
      }, 2400);
      return;
    }
  }

  // Next question after delay
  setTimeout(() => {
    battleState.locked = false;
    loadQuestion();
  }, 1900);
}
window.handleAnswer = handleAnswer;

// ── Parry slow-mo flash (called from boss.js) ─────────────────────
window.triggerParrySlowMo = function() {
  let el = document.getElementById('parry-slowmo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'parry-slowmo';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 55;
      pointer-events: none;
      background: rgba(255,255,255,0);
      transition: background 0.05s ease;
    `;
    document.body.appendChild(el);
  }
  // Flash white instantly then fade
  el.style.transition = 'background 0.05s ease';
  el.style.background = 'rgba(255,255,255,0.75)';
  if (typeof Audio !== 'undefined') Audio.playSFX('parry');

  setTimeout(() => {
    el.style.transition = 'background 0.65s ease';
    el.style.background = 'rgba(255,255,255,0)';
  }, 70);
};

// ── Battle log ────────────────────────────────────────────────────
function battleLog(msg) {
  const el = document.getElementById('battle-log');
  if (!el) return;
  el.classList.remove('hidden');
  el.textContent = msg;
  setTimeout(() => el.classList.add('hidden'), 3000);
}
window.battleLog = battleLog;
