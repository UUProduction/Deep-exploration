// ═══════════════════════════════════════════════════════════════
//  DEEP EXPLORATION — boss.js (full rewrite)
//  The Entity | Phase system | Parry | ULTRAKILL HP bar
// ═══════════════════════════════════════════════════════════════

// ── Boss data ────────────────────────────────────────────────────
const ENTITY = {
  name:    'THE ENTITY',
  title:   'First Warden of the Abandoned Dark',
  maxHp:   420,
  attacks: [
    {
      id:          'ORB_SPRAY',
      name:        'Orb Spray of Darkness',
      flavor:      'Tendrils of void erupt outward.',
      baseDmg:     38,
      critDmg:     48,
      critChance:  0.28,
      parryable:   true,
    },
    {
      id:          'SHADOW_ENCLOSURE',
      name:        'Shadow Enclosure',
      flavor:      'The darkness folds around you completely.',
      baseDmg:     28,
      critDmg:     27,
      critChance:  0.32,
      parryable:   true,
    },
  ],
  phase2Threshold: 0.5,
  taunts: [
    '"You answer questions like a dead god — poorly."',
    '"Heaven fell for less than this."',
    '"Your machine body is an insult to engineering."',
    '"I have waited in the dark for eons. You bore me."',
    '"The void will swallow your score and your pride."',
  ],
  phase2Taunts: [
    '"NOW you have my attention."',
    '"Interesting. Let me show you what I was hiding."',
    '"You scratched the surface. The dark goes deeper."',
    '"Phase two. Try to survive the lesson."',
  ],
};

// ── Boss state ───────────────────────────────────────────────────
const bossState = {
  active:       false,
  hp:           ENTITY.maxHp,
  phase:        1,
  turnLocked:   false,
  pendingAttack: null,
  ghostHp:      ENTITY.maxHp,
  ghostTimeout: null,
};
window.bossState         = bossState;
window.bossPhase2Active  = false;

// ── Parry config ─────────────────────────────────────────────────
const PARRY_WINDOW = 480; // ms — blink and miss it

const parryState = {
  windowOpen:   false,
  succeeded:    false,
  currentAttack: null,
  timerRef:     null,
};

// ── Inject all boss UI into DOM ──────────────────────────────────
function injectBossUI() {
  // Prevent double inject
  if (document.getElementById('boss-hud')) return;

  // ── Boss HP bar (ULTRAKILL top-center style) ──
  const hud = document.createElement('div');
  hud.id    = 'boss-hud';
  hud.innerHTML = `
    <div id="boss-hud-inner">
      <div id="boss-name-top">THE ENTITY</div>
      <div id="boss-title-top">First Warden of the Abandoned Dark</div>
      <div id="boss-hp-track">
        <div id="boss-hp-ghost"></div>
        <div id="boss-hp-fill"></div>
      </div>
      <div id="boss-hp-num">420 / 420</div>
    </div>
  `;
  document.body.appendChild(hud);

  // ── Attack announcement banner ──
  const announce = document.createElement('div');
  announce.id    = 'boss-announce';
  announce.innerHTML = `
    <div id="ba-name"></div>
    <div id="ba-flavor"></div>
  `;
  document.body.appendChild(announce);

  // ── Parry button ──
  const parryBtn = document.createElement('div');
  parryBtn.id    = 'parry-btn';
  parryBtn.innerHTML = `
    <div id="parry-label">PARRY</div>
    <div id="parry-bar-wrap"><div id="parry-bar-fill"></div></div>
  `;
  parryBtn.addEventListener('click', attemptParry);
  document.body.appendChild(parryBtn);

  // ── Phase 2 warning ──
  const p2warn = document.createElement('div');
  p2warn.id    = 'phase2-warning';
  p2warn.textContent = 'PHASE 2';
  document.body.appendChild(p2warn);

  injectBossStyles();
}

// ── All boss CSS injected at runtime ────────────────────────────
function injectBossStyles() {
  const s = document.createElement('style');
  s.textContent = `
    /* ── Load 8-bit font ── */
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

    /* ── Boss HUD ── */
    #boss-hud {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 40;
      display: none;
      justify-content: center;
      padding: 8px 20px 0;
      pointer-events: none;
    }
    #boss-hud.visible { display: flex; }

    #boss-hud-inner {
      width: min(680px, 92vw);
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    #boss-name-top {
      font-family: 'Press Start 2P', monospace;
      font-size: clamp(0.5rem, 1.8vw, 0.8rem);
      color: #fff;
      letter-spacing: 0.25em;
      text-shadow: 2px 2px 0 #000, 0 0 20px rgba(255,255,255,0.2);
      transition: color 0.6s, text-shadow 0.6s;
    }

    #boss-name-top.phase2 {
      color: #ff2200;
      text-shadow: 2px 2px 0 #000, 0 0 30px #ff2200, 0 0 60px #aa0000;
    }

    #boss-title-top {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.38rem;
      color: #444;
      letter-spacing: 0.25em;
    }

    #boss-hp-track {
      position: relative;
      width: 100%;
      height: 14px;
      background: #050505;
      border: 2px solid #111;
      border-top-color: #222;
      overflow: hidden;
      margin-top: 2px;
    }

    /* Ghost bar — lags behind, orange */
    #boss-hp-ghost {
      position: absolute;
      top: 0; left: 0;
      height: 100%;
      width: 100%;
      background: rgba(255, 120, 0, 0.35);
      transition: width 1.4s ease;
    }

    /* Main fill — red gradient */
    #boss-hp-fill {
      position: absolute;
      top: 0; left: 0;
      height: 100%;
      width: 100%;
      background: linear-gradient(to right, #8b0000, #cc2200, #ff4400);
      transition: width 0.45s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
    }

    /* Phase 2 HP bar turns darker red/black */
    #boss-hp-fill.phase2 {
      background: linear-gradient(to right, #300000, #8b0000, #cc0000);
    }

    #boss-hp-num {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.42rem;
      color: #444;
      letter-spacing: 0.2em;
    }

    /* ── Attack announcement ── */
    #boss-announce {
      position: fixed;
      top: 36%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 44;
      text-align: center;
      pointer-events: none;
      display: none;
    }
    #boss-announce.visible { display: block; }

    #ba-name {
      font-family: 'Press Start 2P', monospace;
      font-size: clamp(0.7rem, 2.5vw, 1.2rem);
      color: #ff2200;
      text-shadow: 3px 3px 0 #000, 0 0 30px rgba(255,34,0,0.7);
      letter-spacing: 0.18em;
      animation: ba-slam 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
      line-height: 1.4;
    }

    #ba-flavor {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.42rem;
      color: #555;
      letter-spacing: 0.2em;
      margin-top: 8px;
    }

    @keyframes ba-slam {
      from { transform: scale(1.5); opacity: 0; filter: blur(8px); }
      to   { transform: scale(1);   opacity: 1; filter: blur(0); }
    }

    /* ── Parry button ── */
    #parry-btn {
      position: fixed;
      bottom: 110px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 48;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      animation: parry-pop 0.2s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    #parry-btn.visible { display: flex; }

    #parry-label {
      font-family: 'Press Start 2P', monospace;
      font-size: clamp(0.75rem, 2.5vw, 1.05rem);
      color: #fff;
      letter-spacing: 0.3em;
      padding: 12px 32px;
      border: 2px solid #ff4500;
      background: rgba(139,0,0,0.45);
      box-shadow: 0 0 28px rgba(255,69,0,0.55),
                  inset 0 1px 0 rgba(255,255,255,0.1);
      text-shadow: 2px 2px 0 #000;
      transition: background 0.1s;
    }
    #parry-btn:hover #parry-label {
      background: rgba(200,0,0,0.55);
    }

    #parry-bar-wrap {
      width: 180px;
      height: 5px;
      background: #1a0000;
      border: 1px solid #4a0000;
    }

    #parry-bar-fill {
      height: 100%;
      width: 100%;
      background: linear-gradient(to right, #ff4500, #ffcc00);
    }

    @keyframes parry-pop {
      from { transform: translateX(-50%) scale(0.6); opacity: 0; }
      to   { transform: translateX(-50%) scale(1);   opacity: 1; }
    }

    /* ── Phase 2 warning ── */
    #phase2-warning {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 60;
      font-family: 'Press Start 2P', monospace;
      font-size: clamp(1.5rem, 6vw, 3.5rem);
      color: #ff0000;
      text-shadow: 4px 4px 0 #000,
                   0 0 40px #ff0000,
                   0 0 80px #aa0000;
      pointer-events: none;
      display: none;
      letter-spacing: 0.2em;
      animation: p2-slam 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    #phase2-warning.show { display: block; }

    @keyframes p2-slam {
      from { transform: translate(-50%,-50%) scale(2); opacity:0; filter:blur(20px); }
      to   { transform: translate(-50%,-50%) scale(1); opacity:1; filter:blur(0); }
    }

    /* ── Boss victory screen ── */
    #boss-victory {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0,0,0,0.97);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 22px;
      text-align: center;
      animation: panel-rise 0.7s cubic-bezier(0.16,1,0.3,1) forwards;
    }

    .bv-eyebrow {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.42rem;
      color: #333;
      letter-spacing: 0.5em;
    }

    .bv-title {
      font-family: 'Press Start 2P', monospace;
      font-size: clamp(0.9rem, 3.5vw, 1.8rem);
      color: #c9a84c;
      text-shadow: 3px 3px 0 #000, 0 0 40px rgba(201,168,76,0.5);
      letter-spacing: 0.18em;
      line-height: 1.5;
    }

    .bv-lore {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.45rem;
      color: #444;
      max-width: 460px;
      line-height: 2.4;
      letter-spacing: 0.1em;
    }

    .bv-next {
      font-family: 'Press Start 2P', monospace;
      font-size: 0.42rem;
      color: #222;
      letter-spacing: 0.3em;
      margin-top: 10px;
    }

    @keyframes panel-rise {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
  `;
  document.head.appendChild(s);
}

// ── Update boss HP bar ───────────────────────────────────────────
function updateBossHPBar() {
  const pct = (bossState.hp / ENTITY.maxHp) * 100;
  document.getElementById('boss-hp-fill').style.width = pct + '%';
  document.getElementById('boss-hp-num').textContent  =
    `${Math.max(0, bossState.hp)} / ${ENTITY.maxHp}`;

  // Ghost bar lags 1.4s behind
  clearTimeout(bossState.ghostTimeout);
  bossState.ghostTimeout = setTimeout(() => {
    document.getElementById('boss-hp-ghost').style.width = pct + '%';
  }, 600);
}

// ── Trigger boss fight ───────────────────────────────────────────
function triggerBossFight() {
  if (bossState.active || window._bossDefeated) return;
  bossState.active = true;
  bossState.hp     = ENTITY.maxHp;
  bossState.phase  = 1;
  window.inBattle  = true;

  injectBossUI();
  document.getElementById('boss-hud').classList.add('visible');
  document.getElementById('battle-overlay').classList.remove('hidden');

  // Wire enemy canvas
  document.getElementById('enemy-name').textContent = ENTITY.name;
  const eCanvas     = document.getElementById('enemy-canvas');
  eCanvas._active   = false;
  setTimeout(() => {
    eCanvas._active = true;
    drawEntityCanvas(eCanvas);
  }, 60);

  updateBossHPBar();

  // Opening lore line before first question
  showBossLore(
    '"You carry the stench of Heaven. How disgusting."',
    () => {
      bossState.turnLocked = false;
      loadQuestion();
    }
  );
}
window.triggerBossFight = triggerBossFight;

// ── Show boss lore line in question box ──────────────────────────
function showBossLore(text, cb) {
  const qEl = document.getElementById('q-text');
  const cEl = document.getElementById('q-choices');
  const rEl = document.getElementById('q-result');
  qEl.style.color      = '#8b0000';
  qEl.style.fontStyle  = 'italic';
  qEl.textContent      = text;
  cEl.innerHTML        = '';
  rEl.textContent      = '';
  setTimeout(() => {
    qEl.style.color     = '';
    qEl.style.fontStyle = '';
    if (cb) cb();
  }, 2400);
}

// ── Boss attacks player ──────────────────────────────────────────
function bossDoAttack(afterCb) {
  if (!bossState.active) return;

  // Pick attack — phase 2 slightly weights shadow enclosure
  let attack;
  if (bossState.phase === 2 && Math.random() > 0.4) {
    attack = ENTITY.attacks[1];
  } else {
    attack = ENTITY.attacks[Math.floor(Math.random() * ENTITY.attacks.length)];
  }
  bossState.pendingAttack    = attack;
  parryState.currentAttack   = attack;

  // Show attack name
  const ann   = document.getElementById('boss-announce');
  document.getElementById('ba-name').textContent   = attack.name;
  document.getElementById('ba-flavor').textContent = attack.flavor;
  ann.classList.add('visible');

  setTimeout(() => {
    ann.classList.remove('visible');
    openParryWindow(attack, afterCb);
  }, 1100);
}

// ── Parry window ─────────────────────────────────────────────────
function openParryWindow(attack, afterCb) {
  parryState.windowOpen  = true;
  parryState.succeeded   = false;

  const btn  = document.getElementById('parry-btn');
  const fill = document.getElementById('parry-bar-fill');

  btn.classList.add('visible');

  // Drain animation
  fill.style.transition = 'none';
  fill.style.width      = '100%';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.transition = `width ${PARRY_WINDOW}ms linear`;
      fill.style.width      = '0%';
    });
  });

  // Auto-close window after time expires
  parryState.timerRef = setTimeout(() => {
    if (!parryState.succeeded) {
      closeParryWindow();
      applyAttackDamage(attack);
      if (afterCb) afterCb();
    }
  }, PARRY_WINDOW);
}

function closeParryWindow() {
  parryState.windowOpen = false;
  document.getElementById('parry-btn').classList.remove('visible');
  clearTimeout(parryState.timerRef);
}

// ── Attempt parry (called on button click) ───────────────────────
function attemptParry() {
  if (!parryState.windowOpen) return;
  parryState.succeeded = true;
  closeParryWindow();

  const attack     = parryState.currentAttack;
  const reflectDmg = Math.floor(attack.baseDmg * 0.65);
  const healAmt    = 18;

  // 1. Damage negated (no applyAttackDamage call)
  // 2. Reflect damage back at boss
  bossState.hp = Math.max(0, bossState.hp - reflectDmg);
  updateBossHPBar();

  // 3. Restore player HP
  window.player.hp = Math.min(window.player.maxHp, window.player.hp + healAmt);

  // 4. Slow-mo flash
  if (typeof window.triggerParrySlowMo === 'function') window.triggerParrySlowMo();

  // 5. Register parry for style/stats
  if (typeof window.registerParry === 'function') window.registerParry();

  // 6. Genius particles
  if (typeof spawnGeniusParticles === 'function') spawnGeniusParticles(20);

  // 7. Force crit next question
  window.nextQuestionForceCrit = true;

  // Show result
  showQResult(
    `⚔ PARRY! ${reflectDmg} reflected. +${healAmt} HP. FREE CRIT READY.`,
    '#ffaa00'
  );

  // Check if boss died from reflect
  if (bossState.hp <= 0) {
    setTimeout(() => endBossFight(true), 1500);
    return;
  }

  setTimeout(() => {
    bossState.turnLocked = false;
    loadQuestion();
  }, 2000);
}

// ── Apply attack damage to player ────────────────────────────────
function applyAttackDamage(attack) {
  const isCrit = Math.random() < attack.critChance;
  let dmg      = attack.baseDmg + (isCrit ? attack.critDmg : 0);

  window.player.hp = Math.max(0, window.player.hp - dmg);

  if (typeof triggerDamageFlash === 'function') triggerDamageFlash();
  if (typeof triggerShake === 'function')       triggerShake(7, 280);

  const msg = isCrit
    ? `💀 ${attack.name} — CRITICAL! ${dmg} total damage!`
    : `${attack.name} connects. ${dmg} damage.`;

  showQResult(msg, isCrit ? '#ff2200' : '#ff6600');

  if (window.player.hp <= 0) {
    showQResult('☠ UNIT DESTROYED. REBOOTING...', '#ff0000');
    setTimeout(() => {
      window.player.hp = 45;
      if (typeof triggerDamageFlash === 'function') triggerDamageFlash();
      endBossFight(false);
    }, 2200);
  }
}

// ── Player attacks boss via question ────────────────────────────
window.handleBossAnswer = function(choiceIndex, correct, isCrit) {
  if (bossState.turnLocked) return;
  bossState.turnLocked = true;

  const btns      = document.querySelectorAll('.choice-btn');
  const weapon    = window.equippedWeapon;
  const dmgBonus  = weapon ? weapon.dmgBonus : 0;
  const forceCrit = window.nextQuestionForceCrit;
  window.nextQuestionForceCrit = false;

  if (correct) {
    btns[choiceIndex].classList.add('correct');

    let dmg;
    if (forceCrit || isCrit) {
      dmg = Math.floor(38 + Math.random() * 28 + dmgBonus * 2);
      showQResult(`⚡ CRITICAL STRIKE! ${dmg} damage!`, '#ffff00');
      if (typeof window.triggerGeniusSpray === 'function') window.triggerGeniusSpray();
      if (typeof window.registerCrit === 'function') window.registerCrit();
    } else {
      dmg = Math.floor(16 + Math.random() * 22 + dmgBonus);
      showQResult(`✓ Correct. ${dmg} damage dealt.`, '#00cc66');
    }

    bossState.hp = Math.max(0, bossState.hp - dmg);
    updateBossHPBar();

    // ── Phase 2 trigger ──
    if (bossState.phase === 1 && bossState.hp <= ENTITY.maxHp * ENTITY.phase2Threshold) {
      triggerPhase2();
      return;
    }

    if (bossState.hp <= 0) {
      setTimeout(() => endBossFight(true), 1500);
      return;
    }

    // Boss attacks back after player's correct answer
    setTimeout(() => {
      bossDoAttack(() => {
        bossState.turnLocked = false;
        setTimeout(() => loadQuestion(), 400);
      });
    }, 1300);

  } else {
    // Wrong — boss taunts + immediately attacks
    btns[choiceIndex].classList.add('wrong');

    const taunt = ENTITY.taunts[Math.floor(Math.random() * ENTITY.taunts.length)];
    showQResult(`✗ Wrong. ${taunt}`, '#ff4444');

    if (typeof triggerDamageFlash === 'function') triggerDamageFlash();

    setTimeout(() => {
      bossDoAttack(() => {
        bossState.turnLocked = false;
        setTimeout(() => loadQuestion(), 400);
      });
    }, 1800);
  }
};

// ── Phase 2 transition ───────────────────────────────────────────
function triggerPhase2() {
  bossState.phase         = 2;
  window.bossPhase2Active = true;

  // Buff attack chances
  ENTITY.attacks[0].critChance = 0.44;
  ENTITY.attacks[1].critChance = 0.48;

  // Visual updates
  document.getElementById('boss-name-top').classList.add('phase2');
  document.getElementById('boss-hp-fill').classList.add('phase2');

  // Big screen shake
  if (typeof triggerShake === 'function') triggerShake(14, 600);
  if (typeof triggerDamageFlash === 'function') triggerDamageFlash();

  // Phase 2 warning text
  const p2w = document.getElementById('phase2-warning');
  p2w.classList.add('show');
  setTimeout(() => p2w.classList.remove('show'), 1800);

  // Phase 2 lore taunt
  const taunt = ENTITY.phase2Taunts[Math.floor(Math.random() * ENTITY.phase2Taunts.length)];
  setTimeout(() => {
    showBossLore(taunt, () => {
      bossState.turnLocked = false;
      loadQuestion();
    });
  }, 2000);
}

// ── End boss fight ───────────────────────────────────────────────
function endBossFight(won) {
  bossState.active        = false;
  window.inBattle         = false;
  window._bossDefeated    = won;
  window.bossPhase2Active = false;

  const eCanvas   = document.getElementById('enemy-canvas');
  eCanvas._active = false;

  document.getElementById('battle-overlay').classList.add('hidden');
  document.getElementById('boss-hud').classList.remove('visible');

  if (won) {
    showBossVictory();
  } else {
    showBossLore('"Run. While you still can."', null);
  }
}

// ── Victory screen ───────────────────────────────────────────────
function showBossVictory() {
  // Small delay before showing victory
  setTimeout(() => {
    const v   = document.createElement('div');
    v.id      = 'boss-victory';
    v.innerHTML = `
      <div class="bv-eyebrow">E1 — EXPLORATION 1 COMPLETE</div>
      <div class="bv-title">THE ENTITY<br/>DESTROYED</div>
      <div class="bv-lore">
        Its shadow unravels. The white eyes dim.<br/>
        The void grows quieter.<br/>
        But something deeper stirs in the dark below.
      </div>
      <div class="bv-next">E2 — COMING SOON</div>
    `;
    document.body.appendChild(v);

    // Trigger end screen stats after a beat
    setTimeout(() => {
      v.style.transition = 'opacity 0.8s ease';
      v.style.opacity    = '0';
      setTimeout(() => {
        v.remove();
        if (typeof window.showEndScreen === 'function') window.showEndScreen();
      }, 800);
    }, 3500);
  }, 600);
}

// ── Draw Entity on battle canvas ────────────────────────────────
function drawEntityCanvas(canvas) {
  const c  = canvas.getContext('2d');
  const CW = canvas.width;
  const CH = canvas.height;

  function frame() {
    if (!canvas._active) return;
    c.clearRect(0, 0, CW, CH);
    const t  = Date.now() * 0.001;
    const cx = CW / 2;
    const cy = CH / 2 + 10;

    // Background void
    c.fillStyle = bossState.phase === 2 ? '#080000' : '#000';
    c.fillRect(0, 0, CW, CH);

    // Ambient glow
    const glowRGB = bossState.phase === 2 ? '100,0,0' : '20,20,50';
    const grd = c.createRadialGradient(cx, cy-20, 8, cx, cy, 92);
    grd.addColorStop(0, `rgba(${glowRGB},0.5)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grd;
    c.beginPath();
    c.arc(cx, cy-20, 92, 0, Math.PI*2);
    c.fill();

    // Tendrils — more in phase 2
    const tCount = bossState.phase === 2 ? 12 : 7;
    for (let i = 0; i < tCount; i++) {
      const angle = (i/tCount) * Math.PI*2 + t*0.45;
      const len   = 50 + Math.sin(t*1.3+i)*16;
      const tx2   = cx + Math.cos(angle) * len;
      const ty2   = cy + Math.sin(angle) * len * 0.55;
      c.save();
      c.strokeStyle = bossState.phase === 2
        ? `rgba(180,0,0,${0.25 + Math.sin(t+i)*0.1})`
        : `rgba(80,80,130,${0.25 + Math.sin(t+i)*0.08})`;
      c.lineWidth = 1.8 + Math.sin(t*1.5+i) * 1;
      c.beginPath();
      c.moveTo(cx, cy-10);
      c.quadraticCurveTo(
        cx + Math.cos(angle+0.5)*28,
        cy + Math.sin(angle+0.5)*18,
        tx2, ty2
      );
      c.stroke();
      c.restore();
    }

    // Body shape — tall dark elongated humanoid
    const bodyGrd = c.createLinearGradient(cx-22, cy-62, cx+22, cy+50);
    bodyGrd.addColorStop(0, bossState.phase === 2 ? '#1a0000' : '#0d0d16');
    bodyGrd.addColorStop(0.5, bossState.phase === 2 ? '#0a0000' : '#07070e');
    bodyGrd.addColorStop(1, 'rgba(0,0,0,0)');

    c.save();
    c.shadowBlur  = 28;
    c.shadowColor = bossState.phase === 2 ? '#550000' : '#000022';
    c.fillStyle   = bodyGrd;
    c.beginPath();
    c.moveTo(cx-20, cy-56);
    c.bezierCurveTo(cx-30, cy-22, cx-26, cy+18, cx-9, cy+56);
    c.lineTo(cx+9, cy+56);
    c.bezierCurveTo(cx+26, cy+18, cx+30, cy-22, cx+20, cy-56);
    c.bezierCurveTo(cx+14, cy-82, cx-14, cy-82, cx-20, cy-56);
    c.closePath();
    c.fill();
    c.restore();

    // Cross-hatch texture — like the concept art pencil sketch
    c.save();
    c.globalAlpha = 0.06;
    c.strokeStyle = '#fff';
    c.lineWidth   = 0.5;
    for (let i = 0; i < 20; i++) {
      const sy = cy - 72 + i*7;
      c.beginPath();
      c.moveTo(cx - 22 + Math.sin(t + i*0.28)*3, sy);
      c.lineTo(cx + 22 + Math.sin(t + i*0.28 + 1)*3, sy + 4);
      c.stroke();
    }
    // Diagonal hatching
    for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.moveTo(cx - 18 + i*4, cy - 70);
      c.lineTo(cx - 30 + i*5, cy + 50);
      c.stroke();
    }
    c.restore();

    // Phase 2 orbiting dark orbs
    if (bossState.phase === 2) {
      for (let i = 0; i < 5; i++) {
        const oa = t*2.2 + (i/5)*Math.PI*2;
        const or = 58 + Math.sin(t*3+i)*10;
        const ox = cx + Math.cos(oa)*or;
        const oy = cy + Math.sin(oa)*or*0.5;
        c.save();
        c.fillStyle   = '#1a0000';
        c.shadowBlur  = 16;
        c.shadowColor = '#cc0000';
        c.globalAlpha = 0.55 + 0.45*Math.sin(t*4+i);
        c.beginPath();
        c.arc(ox, oy, 5.5, 0, Math.PI*2);
        c.fill();
        c.restore();
      }
    }

    // Eyes — two small white dots, EXACTLY like your concept art
    const eyeBob  = Math.sin(t*1.9) * 1.5;
    const eyeGlow = 0.65 + 0.35*Math.sin(t*3.2);
    const eyeCol  = bossState.phase === 2 ? '#ff4444' : '#ffffff';
    const eyeShad = bossState.phase === 2 ? '#ff2200' : '#ffffff';

    c.save();
    c.fillStyle   = eyeCol;
    c.shadowBlur  = bossState.phase === 2 ? 22 : 12;
    c.shadowColor = eyeShad;
    c.globalAlpha = eyeGlow;
    // Left eye
    c.beginPath();
    c.arc(cx-8, cy-55+eyeBob, 3.5, 0, Math.PI*2);
    c.fill();
    // Right eye
    c.beginPath();
    c.arc(cx+8, cy-55+eyeBob, 3.5, 0, Math.PI*2);
    c.fill();
    c.restore();

    requestAnimationFrame(frame);
  }
  frame();
}

// ── Override loadQuestion for boss context ───────────────────────
const _origLoadQuestion = window.loadQuestion;

window.loadQuestion = async function() {
  if (!bossState.active) {
    return _origLoadQuestion ? _origLoadQuestion() : null;
  }

  document.getElementById('q-text').textContent = 'Loading...';
  document.getElementById('q-choices').innerHTML = '';
  document.getElementById('q-result').textContent = '';

  currentQuestion = await fetchQuestion();

  document.getElementById('q-subject-tag').textContent = currentQuestion.subject;
  document.getElementById('q-text').textContent        = currentQuestion.question;

  const choicesEl = document.getElementById('q-choices');
  currentQuestion.choices.forEach((choice, i) => {
    const btn     = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.onclick   = () => {
      const correct = i === currentQuestion.correctIndex;
      const isCrit  = correct && currentQuestion.isCritWord;
      window.handleBossAnswer(i, correct, isCrit);
    };
    choicesEl.appendChild(btn);
  });
};

// ── Helper ───────────────────────────────────────────────────────
function showQResult(msg, color) {
  const el = document.getElementById('q-result');
  el.style.color   = color || '#ff6600';
  el.textContent   = msg;
}
