// ── THE ENTITY — Boss of E1 ──────────────────────────────────────
const ENTITY_BOSS = {
  name: 'THE ENTITY',
  title: 'First Warden of the Abandoned Dark',
  hp: 420, maxHp: 420,
  phase: 1,
  attacks: [
    {
      id: 'ORB_SPRAY',
      name: 'Orb Spray of Darkness',
      description: 'Tendrils of void erupt outward.',
      baseDmg: 38,
      critDmg: 48,
      critChance: 0.28,
      parryable: true,
    },
    {
      id: 'SHADOW_ENCLOSURE',
      name: 'Shadow Enclosure',
      description: 'The darkness folds around you.',
      baseDmg: 28,
      critDmg: 27,   // added on top if crit
      critChance: 0.32,
      parryable: true,
    }
  ]
};

// ── Parry state ──────────────────────────────────────────────────
const PARRY_WINDOW_MS = 480; // small window — blink and miss it
let parryState = {
  active: false,
  windowOpen: false,
  timerBar: 0,
  timerMax: PARRY_WINDOW_MS,
  timerInterval: null,
  currentAttack: null,
  succeeded: false,
};

// ── Boss battle state ────────────────────────────────────────────
let bossState = {
  active: false,
  hp: ENTITY_BOSS.maxHp,
  phase: 1,
  turnLocked: false,
  pendingAttack: null,
};

// ── Inject boss UI into DOM ──────────────────────────────────────
function injectBossUI() {
  // Boss HP bar (ULTRAKILL style — top center)
  const bossHUD = document.createElement('div');
  bossHUD.id = 'boss-hud';
  bossHUD.innerHTML = `
    <div id="boss-hud-inner">
      <div id="boss-name-top">THE ENTITY</div>
      <div id="boss-title-top">First Warden of the Abandoned Dark</div>
      <div id="boss-hp-track">
        <div id="boss-hp-fill"></div>
        <div id="boss-hp-ghost"></div>
      </div>
      <div id="boss-hp-num">420 / 420</div>
    </div>
  `;
  document.body.appendChild(bossHUD);

  // Parry button
  const parryBtn = document.createElement('div');
  parryBtn.id = 'parry-btn';
  parryBtn.innerHTML = `
    <div id="parry-label">PARRY</div>
    <div id="parry-timer-bar"><div id="parry-timer-fill"></div></div>
  `;
  parryBtn.onclick = attemptParry;
  document.body.appendChild(parryBtn);

  // Boss attack announcement
  const attackAnnounce = document.createElement('div');
  attackAnnounce.id = 'attack-announce';
  document.body.appendChild(attackAnnounce);

  injectBossStyles();
}

function injectBossStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── Boss HUD ── */
    #boss-hud {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 40;
      display: none;
      justify-content: center;
      padding: 10px 20px 0;
    }
    #boss-hud.visible { display: flex; }
    #boss-hud-inner {
      width: min(700px, 90vw);
      text-align: center;
    }
    #boss-name-top {
      font-family: 'Press Start 2P', 'Share Tech Mono', monospace;
      font-size: clamp(0.55rem, 1.8vw, 0.85rem);
      color: #fff;
      letter-spacing: 0.25em;
      text-shadow: 2px 2px 0 #000, 0 0 20px rgba(255,255,255,0.3);
      margin-bottom: 2px;
    }
    #boss-title-top {
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.5rem;
      color: #555;
      letter-spacing: 0.3em;
      margin-bottom: 6px;
    }
    #boss-hp-track {
      position: relative;
      width: 100%;
      height: 12px;
      background: #0a0a0a;
      border: 2px solid #1a1a1a;
      border-top-color: #333;
      overflow: hidden;
    }
    #boss-hp-fill {
      position: absolute;
      top: 0; left: 0;
      height: 100%;
      width: 100%;
      background: linear-gradient(to right, #cc0000, #ff2200, #ff6600);
      transition: width 0.5s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
    }
    #boss-hp-ghost {
      position: absolute;
      top: 0; left: 0;
      height: 100%;
      width: 100%;
      background: rgba(255,100,0,0.3);
      transition: width 1.2s ease;
    }
    #boss-hp-num {
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.55rem;
      color: #666;
      margin-top: 3px;
      letter-spacing: 0.2em;
    }

    /* ── Parry Button ── */
    #parry-btn {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 45;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      animation: parry-pop 0.18s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    #parry-btn.visible { display: flex; }
    #parry-label {
      font-family: 'Press Start 2P', 'Share Tech Mono', monospace;
      font-size: clamp(0.8rem, 2.5vw, 1.1rem);
      color: #fff;
      letter-spacing: 0.3em;
      text-shadow: 3px 3px 0 #8b0000, 0 0 20px rgba(255,100,0,0.8);
      padding: 10px 28px;
      border: 2px solid #ff4500;
      background: rgba(139,0,0,0.4);
      box-shadow: 0 0 30px rgba(255,69,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    }
    #parry-label:hover { background: rgba(200,0,0,0.5); }
    #parry-timer-bar {
      width: 160px;
      height: 5px;
      background: #1a0000;
      border: 1px solid #5a0000;
    }
    #parry-timer-fill {
      height: 100%;
      width: 100%;
      background: linear-gradient(to right, #ff4500, #ffaa00);
      transition: width linear;
    }

    /* ── Attack Announce ── */
    #attack-announce {
      position: fixed;
      top: 38%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 44;
      display: none;
      text-align: center;
      pointer-events: none;
    }
    #attack-announce.visible { display: block; }
    .announce-name {
      font-family: 'Press Start 2P', 'Share Tech Mono', monospace;
      font-size: clamp(0.7rem, 2.5vw, 1.2rem);
      color: #ff2200;
      text-shadow: 3px 3px 0 #000, 0 0 30px rgba(255,34,0,0.7);
      letter-spacing: 0.2em;
      animation: announce-slam 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    .announce-desc {
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.6rem;
      color: #666;
      letter-spacing: 0.3em;
      margin-top: 6px;
    }

    @keyframes parry-pop {
      from { transform: translateX(-50%) scale(0.7); opacity: 0; }
      to   { transform: translateX(-50%) scale(1);   opacity: 1; }
    }
    @keyframes announce-slam {
      from { transform: scale(1.4); opacity: 0; filter: blur(6px); }
      to   { transform: scale(1);   opacity: 1; filter: blur(0); }
    }
  `;
  document.head.appendChild(style);

  // Load 8-bit font
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
  document.head.appendChild(link);
}

// ── Update boss HP bar ───────────────────────────────────────────
let ghostHpTimeout = null;
function updateBossHPBar() {
  const pct = (bossState.hp / ENTITY_BOSS.maxHp) * 100;
  document.getElementById('boss-hp-fill').style.width  = pct + '%';
  document.getElementById('boss-hp-num').textContent   =
    `${bossState.hp} / ${ENTITY_BOSS.maxHp}`;

  // Ghost bar lags behind
  clearTimeout(ghostHpTimeout);
  ghostHpTimeout = setTimeout(() => {
    document.getElementById('boss-hp-ghost').style.width = pct + '%';
  }, 600);
}

// ── Trigger boss fight ───────────────────────────────────────────
function triggerBossFight() {
  if (bossState.active) return;
  bossState.active = true;
  bossState.hp = ENTITY_BOSS.maxHp;
  inBattle = true;
  window.inBattle = true;

  injectBossUI();
  document.getElementById('boss-hud').classList.add('visible');
  document.getElementById('battle-overlay').classList.remove('hidden');

  // Override enemy canvas with Entity
  document.getElementById('enemy-name').textContent = 'THE ENTITY';
  const eCanvas = document.getElementById('enemy-canvas');
  drawEntityBoss(eCanvas);
  updateBossHPBar();

  // Boss lore flash before first turn
  flashLore('"You carry the stench of Heaven. Disgusting."', () => {
    bossState.turnLocked = false;
    loadQuestion();
  });
}

// ── Flash lore line ──────────────────────────────────────────────
function flashLore(text, cb) {
  const el = document.getElementById('q-text');
  el.style.color = '#8b0000';
  el.style.fontStyle = 'italic';
  el.textContent = text;
  document.getElementById('q-choices').innerHTML = '';
  setTimeout(() => {
    el.style.color = '';
    el.style.fontStyle = '';
    if (cb) cb();
  }, 2200);
}

// ── Boss attacks player ──────────────────────────────────────────
function bossAttackSequence(afterCb) {
  if (!bossState.active) return;

  const attack = ENTITY_BOSS.attacks[Math.floor(Math.random() * ENTITY_BOSS.attacks.length)];
  bossState.pendingAttack = attack;
  parryState.currentAttack = attack;

  // Show attack name
  const announceEl = document.getElementById('attack-announce');
  announceEl.innerHTML = `
    <div class="announce-name">${attack.name}</div>
    <div class="announce-desc">${attack.description}</div>
  `;
  announceEl.classList.add('visible');

  setTimeout(() => {
    announceEl.classList.remove('visible');
    // Show parry window
    openParryWindow(attack, afterCb);
  }, 1000);
}

// ── Parry window ─────────────────────────────────────────────────
function openParryWindow(attack, afterCb) {
  parryState.windowOpen = true;
  parryState.succeeded = false;
  parryState.timerBar = PARRY_WINDOW_MS;

  const btn  = document.getElementById('parry-btn');
  const fill = document.getElementById('parry-timer-fill');
  btn.classList.add('visible');

  // Animate timer bar draining
  fill.style.transition = `width ${PARRY_WINDOW_MS}ms linear`;
  fill.style.width = '100%';
  requestAnimationFrame(() => {
    fill.style.width = '0%';
  });

  // Window closes after PARRY_WINDOW_MS
  parryState.timerInterval = setTimeout(() => {
    if (!parryState.succeeded) {
      closeParryWindow();
      applyBossAttackDamage(attack, false);
      if (afterCb) afterCb();
    }
  }, PARRY_WINDOW_MS);
}

function closeParryWindow() {
  parryState.windowOpen = false;
  document.getElementById('parry-btn').classList.remove('visible');
  clearTimeout(parryState.timerInterval);
}

function attemptParry() {
  if (!parryState.windowOpen) return;
  parryState.succeeded = true;
  closeParryWindow();

  const attack = parryState.currentAttack;
  const reflectDmg = Math.floor(attack.baseDmg * 0.6);

  // 1. Negate damage
  // 2. Deal it back
  bossState.hp = Math.max(0, bossState.hp - reflectDmg);
  updateBossHPBar();

  // 3. Restore HP
  const healAmt = 18;
  window.player.hp = Math.min(window.player.maxHp, window.player.hp + healAmt);

  // Parry result flash
  showBattleResult(`⚔ PARRY! Damage negated. ${reflectDmg} reflected. +${healAmt} HP restored.`, '#ffaa00');

  // 4. Free crit question next turn
  window.nextQuestionForceCrit = true;

  // Check if boss died from reflect
  if (bossState.hp <= 0) {
    setTimeout(() => endBossFight(true), 1400);
    return;
  }

  setTimeout(() => loadQuestion(), 2000);
}

function applyBossAttackDamage(attack, parried) {
  if (parried) return;

  const isCrit = Math.random() < attack.critChance;
  let dmg = attack.baseDmg;
  if (isCrit) dmg += attack.critDmg;

  window.player.hp = Math.max(0, window.player.hp - dmg);

  const msg = isCrit
    ? `💀 ${attack.name} — CRITICAL! ${dmg} damage!`
    : `${attack.name} hits for ${dmg} damage.`;

  showBattleResult(msg, isCrit ? '#ff2200' : '#ff6600');

  if (window.player.hp <= 0) {
    setTimeout(() => {
      window.player.hp = 50;
      endBossFight(false);
    }, 2000);
  }
}

function showBattleResult(msg, color = '#ff6600') {
  const el = document.getElementById('q-result');
  el.style.color = color;
  el.textContent = msg;
}

// ── Player attacks boss via question ────────────────────────────
// Hook into existing loadQuestion / handleAnswer in api.js
// Override handleAnswer for boss context:
const _origHandleAnswer = window.handleAnswer;

window.handleBossAnswer = function(choiceIndex, correct, isCrit) {
  if (bossState.turnLocked) return;
  bossState.turnLocked = true;

  const btns = document.querySelectorAll('.choice-btn');
  const weapon = window.equippedWeapon;
  const dmgBonus = weapon ? weapon.dmgBonus : 0;
  const forceCrit = window.nextQuestionForceCrit;
  window.nextQuestionForceCrit = false;

  if (correct) {
    btns[choiceIndex].classList.add('correct');

    let dmg;
    if (forceCrit || isCrit) {
      dmg = Math.floor(35 + Math.random() * 25 + dmgBonus * 2);
      showBattleResult(`⚡ CRITICAL STRIKE! ${dmg} damage dealt!`, '#ffff00');
      triggerGeniusSpray();
    } else {
      dmg = Math.floor(15 + Math.random() * 20 + dmgBonus);
      showBattleResult(`✓ Correct! ${dmg} damage dealt.`, '#00cc66');
    }

    bossState.hp = Math.max(0, bossState.hp - dmg);
    updateBossHPBar();

    // Phase 2 at 50% HP
    if (bossState.hp <= ENTITY_BOSS.maxHp * 0.5 && bossState.phase === 1) {
      bossState.phase = 2;
      flashLore('"...you actually hurt me. Interesting."', () => {
        ENTITY_BOSS.attacks[0].critChance = 0.42;
        ENTITY_BOSS.attacks[1].critChance = 0.45;
        document.getElementById('boss-name-top').style.color = '#ff2200';
        document.getElementById('boss-name-top').style.textShadow = '2px 2px 0 #000, 0 0 30px #ff2200';
      });
    }

    if (bossState.hp <= 0) {
      setTimeout(() => endBossFight(true), 1400);
      return;
    }

    // Boss attacks back
    setTimeout(() => {
      bossAttackSequence(() => {
        bossState.turnLocked = false;
        setTimeout(() => loadQuestion(), 400);
      });
    }, 1200);

  } else {
    btns[choiceIndex].classList.add('wrong');
    bossState.turnLocked = false;
    // Boss attacks immediately on wrong answer
    bossAttackSequence(() => {
      setTimeout(() => loadQuestion(), 400);
    });
  }
};

// ── End boss fight ───────────────────────────────────────────────
function endBossFight(won) {
  bossState.active = false;
  inBattle = false;
  window.inBattle = false;

  document.getElementById('battle-overlay').classList.add('hidden');
  document.getElementById('boss-hud').classList.remove('visible');

  if (won) {
    showVictoryScreen();
  } else {
    flashLore('"Run. While you still can."', null);
  }
}

function showVictoryScreen() {
  const v = document.createElement('div');
  v.style.cssText = `
    position:fixed; inset:0; z-index:100;
    background: rgba(0,0,0,0.95);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:20px; text-align:center;
    font-family:'Press Start 2P','Share Tech Mono',monospace;
  `;
  v.innerHTML = `
    <div style="font-size:0.5rem;letter-spacing:0.5em;color:#555;">E1 — EXPLORATION 1 COMPLETE</div>
    <div style="font-size:clamp(1rem,4vw,2rem);color:#c9a84c;text-shadow:3px 3px 0 #000,0 0 40px rgba(201,168,76,0.6);letter-spacing:0.2em;">THE ENTITY<br/>DESTROYED</div>
    <div style="font-size:0.55rem;color:#666;max-width:400px;line-height:2;letter-spacing:0.15em;">Its shadow unravels. Its white eyes dim.<br/>The void is quieter now.<br/>But something deeper stirs.</div>
    <div style="font-size:0.5rem;color:#3a3a3a;letter-spacing:0.3em;margin-top:20px;">E2 — COMING SOON</div>
  `;
  document.body.appendChild(v);
}

// ── Draw The Entity on battle canvas ────────────────────────────
function drawEntityBoss(canvas) {
  const c   = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;

  function frame() {
    c.clearRect(0, 0, W, H);
    const t = Date.now() * 0.001;

    // Background void
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2 + 10;

    // Ambient dark glow — phase 2 turns red
    const glowColor = bossState.phase === 2 ? '80,0,0' : '20,20,40';
    const grad = c.createRadialGradient(cx, cy - 20, 10, cx, cy, 90);
    grad.addColorStop(0, `rgba(${glowColor},0.5)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(cx, cy - 20, 90, 0, Math.PI * 2);
    c.fill();

    // Orb shadow tendrils (phase 2: more tendrils)
    const tendrilCount = bossState.phase === 2 ? 10 : 6;
    for (let i = 0; i < tendrilCount; i++) {
      const angle  = (i / tendrilCount) * Math.PI * 2 + t * 0.4;
      const len    = 48 + Math.sin(t * 1.2 + i) * 14;
      const tx2    = cx + Math.cos(angle) * len;
      const ty2    = cy + Math.sin(angle) * len * 0.55;
      c.save();
      c.strokeStyle = bossState.phase === 2 ? 'rgba(180,0,0,0.35)' : 'rgba(80,80,120,0.3)';
      c.lineWidth = 2 + Math.sin(t + i) * 1.2;
      c.beginPath();
      c.moveTo(cx, cy - 10);
      c.quadraticCurveTo(
        cx + Math.cos(angle + 0.4) * 25,
        cy + Math.sin(angle + 0.4) * 18,
        tx2, ty2
      );
      c.stroke();
      c.restore();
    }

    // Body — tall dark shadow figure
    // Legs merge into darkness at bottom
    const bodyGrad = c.createLinearGradient(cx - 22, cy - 60, cx + 22, cy + 50);
    bodyGrad.addColorStop(0, bossState.phase === 2 ? '#1a0000' : '#0d0d14');
    bodyGrad.addColorStop(0.4, bossState.phase === 2 ? '#0a0000' : '#060610');
    bodyGrad.addColorStop(1, 'rgba(0,0,0,0)');

    c.save();
    c.shadowBlur = 30;
    c.shadowColor = bossState.phase === 2 ? '#440000' : '#000020';

    // Body shape — elongated humanoid
    c.fillStyle = bodyGrad;
    c.beginPath();
    c.moveTo(cx - 20, cy - 55);  // shoulder left
    c.bezierCurveTo(
      cx - 28, cy - 20,
      cx - 24, cy + 20,
      cx - 8,  cy + 55
    );
    c.lineTo(cx + 8, cy + 55);
    c.bezierCurveTo(
      cx + 24, cy + 20,
      cx + 28, cy - 20,
      cx + 20, cy - 55
    );
    // Head bulge
    c.bezierCurveTo(cx + 14, cy - 80, cx - 14, cy - 80, cx - 20, cy - 55);
    c.closePath();
    c.fill();
    c.restore();

    // Texture — cross-hatch scribble feel like the concept art
    c.save();
    c.globalAlpha = 0.08;
    c.strokeStyle = '#fff';
    c.lineWidth = 0.5;
    for (let i = 0; i < 18; i++) {
      const sy = cy - 70 + i * 8;
      c.beginPath();
      c.moveTo(cx - 22 + Math.sin(t + i * 0.3) * 3, sy);
      c.lineTo(cx + 22 + Math.sin(t + i * 0.3 + 1) * 3, sy + 4);
      c.stroke();
    }
    c.restore();

    // Eyes — two small white dots (exactly like the concept art)
    const eyeBob = Math.sin(t * 1.8) * 1.5;
    const eyeGlow = 0.7 + 0.3 * Math.sin(t * 3);

    // Left eye
    c.save();
    c.shadowBlur = bossState.phase === 2 ? 18 : 10;
    c.shadowColor = bossState.phase === 2 ? '#ff2200' : '#ffffff';
    c.fillStyle = bossState.phase === 2 ? '#ff4444' : '#ffffff';
    c.globalAlpha = eyeGlow;
    c.beginPath();
    c.arc(cx - 8, cy - 54 + eyeBob, 3.5, 0, Math.PI * 2);
    c.fill();

    // Right eye
    c.beginPath();
    c.arc(cx + 8, cy - 54 + eyeBob, 3.5, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Phase 2: Orb spray visual effect
    if (bossState.phase === 2) {
      for (let i = 0; i < 5; i++) {
        const oa = t * 2 + (i / 5) * Math.PI * 2;
        const or = 55 + Math.sin(t * 3 + i) * 10;
        const ox = cx + Math.cos(oa) * or;
        const oy = cy + Math.sin(oa) * or * 0.5;
        c.save();
        c.fillStyle = '#1a0000';
        c.shadowBlur = 14;
        c.shadowColor = '#cc0000';
        c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + i);
        c.beginPath();
        c.arc(ox, oy, 5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    requestAnimationFrame(frame);
  }

  frame();
}

// ── Boss trigger zone in world ───────────────────────────────────
// Add to worldEnemies check in game.js — boss at end of E1
const BOSS_TRIGGER_X = 1900;

function checkBossTrigger(player) {
  if (bossState.active || window._bossDefeated) return;
  if (player.x >= BOSS_TRIGGER_X) {
    window._bossDefeated = false;
    triggerBossFight();
  }
}

// Override loadQuestion during boss fight to route to boss handler
const _origLoadQuestion = window.loadQuestion;
window.loadQuestion = async function() {
  if (!bossState.active) {
    return _origLoadQuestion();
  }
  // Same AI question fetch but wire to boss answer handler
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
      const correct  = i === currentQuestion.correctIndex;
      const isCrit   = correct && currentQuestion.isCritWord;
      window.handleBossAnswer(i, correct, isCrit);
    };
    choicesEl.appendChild(btn);
  });
};

// Export
window.triggerBossFight  = triggerBossFight;
window.checkBossTrigger  = checkBossTrigger;
window.drawEntityBoss    = drawEntityBoss;
window.bossState         = bossState;
