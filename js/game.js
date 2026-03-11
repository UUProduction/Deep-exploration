// ═══════════════════════════════════════════════════════════════
//  DEEP EXPLORATION — game.js  (full rewrite)
//  Firebase + Speedrun stats + P-Rank system
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Profile ──────────────────────────────────────────────────────
const profile = JSON.parse(localStorage.getItem('de_profile') || '{}');

// ── Player ───────────────────────────────────────────────────────
const player = {
  x: 180, y: 0,
  w: 22,  h: 32,
  vx: 0,  vy: 0,
  speed: 3.4,
  jumpForce: -11.5,
  onGround: false,
  facing: 1,
  animFrame: 0,
  animTick: 0,
  hp: 100, maxHp: 100,
  genius: 0,
};
window.player = player;

// ── Speedrun / Stats ─────────────────────────────────────────────
const run = {
  startTime: null,
  elapsedMs: 0,
  running: false,
  kills: 0,
  stylePoints: 0,
  secrets: 0,
  totalSecrets: 3,
  noRestarts: true,
  parries: 0,
  crits: 0,
};

function startTimer() {
  if (run.running) return;
  run.startTime = performance.now() - run.elapsedMs;
  run.running   = true;
}

function stopTimer() {
  if (!run.running) return;
  run.elapsedMs = performance.now() - run.startTime;
  run.running   = false;
}

function getElapsedMs() {
  if (run.running) return performance.now() - run.startTime;
  return run.elapsedMs;
}

function formatTime(ms) {
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000));
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(3,'0')}`;
}

// ── Rank calculators ─────────────────────────────────────────────
// Returns D/C/B/A/S/P
function killsRank(k) {
  if (k >= 6)  return 'P';
  if (k >= 5)  return 'S';
  if (k >= 4)  return 'A';
  if (k >= 3)  return 'B';
  if (k >= 2)  return 'C';
  return 'D';
}

function styleRank(sp) {
  if (sp >= 3000) return 'P';
  if (sp >= 2000) return 'S';
  if (sp >= 1200) return 'A';
  if (sp >= 600)  return 'B';
  if (sp >= 200)  return 'C';
  return 'D';
}

function timeRank(ms) {
  if (ms <= 90000)  return 'P'; // under 1:30
  if (ms <= 150000) return 'S';
  if (ms <= 240000) return 'A';
  if (ms <= 360000) return 'B';
  if (ms <= 540000) return 'C';
  return 'D';
}

const RANK_ORDER = ['D','C','B','A','S','P'];

function rankValue(r) { return RANK_ORDER.indexOf(r); }

function finalRank(kr, sr, tr) {
  const vals = [rankValue(kr), rankValue(sr), rankValue(tr)];
  const min  = Math.min(...vals);
  // All S+ and at least one action = P rank
  if (vals.every(v => v >= 5)) return 'P';
  return RANK_ORDER[min];
}

function rankColor(r) {
  const map = {
    D: '#555555',
    C: '#aaaaaa',
    B: '#4488ff',
    A: '#ff8800',
    S: '#ff2200',
    P: '#ffd700',
  };
  return map[r] || '#fff';
}

function rankShadow(r) {
  const map = {
    D: 'none',
    C: 'none',
    B: '0 0 10px #4488ff',
    A: '0 0 12px #ff8800',
    S: '0 0 18px #ff4400',
    P: '0 0 30px #ffd700, 0 0 60px #ffaa00',
  };
  return map[r] || 'none';
}

// ── Add style points ─────────────────────────────────────────────
function addStyle(pts, reason) {
  run.stylePoints += pts;
  // Flash style gain
  showStyleFlash(`+${pts} ${reason}`);
}

function showStyleFlash(msg) {
  let el = document.getElementById('style-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'style-flash';
    el.style.cssText = `
      position:fixed; bottom:140px; right:20px; z-index:25;
      font-family:'Press Start 2P',monospace; font-size:0.5rem;
      color:#ff8800; pointer-events:none; letter-spacing:0.1em;
      transition: opacity 0.4s ease;
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 1200);
}

// ── Update live stat display ─────────────────────────────────────
function updateLiveStats() {
  const kr = killsRank(run.kills);
  const sr = styleRank(run.stylePoints);
  const tr = timeRank(getElapsedMs());

  document.getElementById('stat-kills').textContent = run.kills;
  document.getElementById('stat-style').textContent = run.stylePoints;
  document.getElementById('stat-time').textContent  = formatTime(getElapsedMs());

  const kEl = document.getElementById('rank-kills');
  const sEl = document.getElementById('rank-style');
  const tEl = document.getElementById('rank-time');

  kEl.textContent = kr; kEl.className = `stat-rank rank-${kr}`;
  sEl.textContent = sr; sEl.className = `stat-rank rank-${sr}`;
  tEl.textContent = tr; tEl.className = `stat-rank rank-${tr}`;

  document.getElementById('hud-timer').textContent = formatTime(getElapsedMs());
}

// ── World platforms ──────────────────────────────────────────────
const platforms = [
  { x: 0,    y: 520, w: 2200, h: 40 },  // ground
  { x: 280,  y: 430, w: 150,  h: 14 },
  { x: 520,  y: 360, w: 120,  h: 14 },
  { x: 730,  y: 290, w: 180,  h: 14 },
  { x: 1000, y: 380, w: 140,  h: 14 },
  { x: 1240, y: 460, w: 170,  h: 14 },
  { x: 1480, y: 330, w: 190,  h: 14 },
  { x: 1750, y: 420, w: 140,  h: 14 },
  // Secret platform (secret 1)
  { x: 600,  y: 200, w: 80,   h: 14, secret: true },
  // Secret platform (secret 2)
  { x: 1350, y: 180, w: 80,   h: 14, secret: true },
];

// Secret collectibles
const secrets = [
  { x: 630, y: 170, collected: false, label: 'VOID SHARD' },
  { x: 1380, y: 155, collected: false, label: 'ANGEL\'S EYE' },
  { x: 950, y: 100, collected: false, label: 'BROKEN HALO' },
];

// ── Enemies ──────────────────────────────────────────────────────
const worldEnemies = [
  { name:'SEEKER', id:1, wx:440,  wy:395, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'SEEKER', id:2, wx:870,  wy:260, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'DEPTH',  id:3, wx:640,  wy:490, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
  { name:'SEEKER', id:4, wx:1120, wy:350, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'DEPTH',  id:5, wx:1380, wy:430, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
  { name:'DEPTH',  id:6, wx:1650, wy:300, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
];
window.worldEnemies = worldEnemies;

let cameraX = 0;
const keys  = {};
let inBattle = false;
window.inBattle = false;

document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup',   e => { keys[e.code] = false; });

// ── Physics + input ──────────────────────────────────────────────
function updatePlayer() {
  if (inBattle || window.inBattle) return;

  // Start timer on first move
  if (!run.running && (keys['ArrowLeft'] || keys['ArrowRight'] || keys['KeyA'] || keys['KeyD'])) {
    startTimer();
  }

  if (keys['ArrowLeft']  || keys['KeyA']) { player.vx = -player.speed; player.facing = -1; }
  else if (keys['ArrowRight'] || keys['KeyD']) { player.vx = player.speed; player.facing = 1; }
  else player.vx *= 0.68;

  if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.onGround) {
    player.vy = player.jumpForce;
    player.onGround = false;
  }

  player.vy = Math.min(player.vy + 0.56, 18);
  player.x += player.vx;
  player.y += player.vy;

  // Platform collision
  player.onGround = false;
  for (const p of platforms) {
    if (
      player.x + player.w > p.x &&
      player.x             < p.x + p.w &&
      player.y + player.h  > p.y &&
      player.y + player.h  < p.y + p.h + 22 &&
      player.vy >= 0
    ) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.x < 0) player.x = 0;
  if (player.y > H + 200) { player.y = 0; player.hp = Math.max(1, player.hp - 20); }

  // Camera
  cameraX = Math.max(0, player.x - W / 3);

  // Weapon pickup
  if (typeof checkWeaponPickup === 'function') checkWeaponPickup(player, keys);

  // Secret collection
  for (const s of secrets) {
    if (s.collected) continue;
    if (Math.hypot(player.x - s.x, player.y - s.y) < 28) {
      s.collected = true;
      run.secrets++;
      addStyle(300, 'SECRET!');
      showSecretBanner(s.label);
    }
  }

  // Enemy proximity — trigger battle
  for (const e of worldEnemies) {
    if (e.defeated) continue;
    if (Math.abs(player.x - e.wx) < 48 && Math.abs(player.y - e.wy) < 60) {
      if (typeof triggerBattle === 'function') triggerBattle(e);
      return;
    }
  }

  // Boss trigger zone
  if (player.x >= 1920 && !window._bossDefeated) {
    document.getElementById('hud-boss-warning').style.display = 'block';
  }
  if (player.x >= 2000 && !window._bossDefeated) {
    if (typeof triggerBossFight === 'function') triggerBossFight();
  }

  // Animate
  player.animTick++;
  if (player.animTick % 9 === 0) player.animFrame = (player.animFrame + 1) % 4;

  // Update weapon display
  const wd = document.getElementById('weapon-display');
  wd.textContent = window.equippedWeapon ? window.equippedWeapon.name.toUpperCase() : '— NO WEAPON —';
}

// ── Draw world ───────────────────────────────────────────────────
function drawWorld() {
  // Void sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#030008');
  sky.addColorStop(1, '#0e0004');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Parallax stars
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 149 + 30) % 2100 - cameraX * 0.12 + 2100) % W;
    const sy = (i * 113) % (H * 0.75);
    const alpha = 0.2 + 0.4 * ((i % 3) / 3);
    ctx.fillStyle = `rgba(212,197,169,${alpha})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Dead heaven silhouette (far background)
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#c9a84c';
  const bgX = 800 - cameraX * 0.05;
  // Broken pillar shapes
  for (let i = 0; i < 5; i++) {
    const bx = bgX + i * 220;
    const bh = 120 + (i % 3) * 60;
    ctx.fillRect(bx, H * 0.4 - bh, 28, bh);
    ctx.fillRect(bx - 8, H * 0.4 - bh - 20, 44, 20);
  }
  ctx.restore();

  // Ground + platforms
  for (const p of platforms) {
    const px = p.x - cameraX;
    if (px > W + 100 || px + p.w < -100) continue;
    const isGround = p.h > 20;

    if (isGround) {
      const grd = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      grd.addColorStop(0, '#160808');
      grd.addColorStop(1, '#080303');
      ctx.fillStyle = grd;
      ctx.fillRect(px, p.y, p.w, p.h);
      // Ground top edge glow
      ctx.fillStyle = '#2a1010';
      ctx.fillRect(px, p.y, p.w, 2);
    } else {
      // Floating platform
      ctx.fillStyle = p.secret ? '#1a1020' : '#1e0e0e';
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = p.secret ? '#6644aa' : '#3a1818';
      ctx.fillRect(px, p.y, p.w, 2);
      // Secret platform glow
      if (p.secret) {
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(Date.now() * 0.003);
        ctx.fillStyle = '#aa66ff';
        ctx.fillRect(px - 4, p.y - 4, p.w + 8, p.h + 8);
        ctx.restore();
      }
    }
  }

  // Secrets
  for (const s of secrets) {
    if (s.collected) continue;
    const sx = s.x - cameraX;
    const bob = Math.sin(Date.now() * 0.003 + s.x) * 4;
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#aa66ff';
    ctx.fillStyle = '#cc88ff';
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(sx, s.y - 10 + bob);
    ctx.lineTo(sx + 7, s.y + bob);
    ctx.lineTo(sx, s.y + 10 + bob);
    ctx.lineTo(sx - 7, s.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ── Draw enemies in world ────────────────────────────────────────
function drawEnemiesWorld() {
  for (const e of worldEnemies) {
    if (e.defeated) continue;
    const ex = e.wx - cameraX;
    const ey = e.wy;
    if (ex < -60 || ex > W + 60) continue;

    const bob = e.type === 'flying' ? Math.sin(Date.now() * 0.003 + e.id) * 5 : 0;

    ctx.save();
    ctx.translate(ex, ey + bob);
    if (e.name === 'SEEKER') drawSeekerWorld(ctx);
    else drawDepthWorld(ctx);
    ctx.restore();

    // Proximity warning pulse
    const dist = Math.abs(player.x - e.wx);
    if (dist < 130) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.012);
      ctx.fillStyle = '#ff2200';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', ex, ey - 16 + bob);
      ctx.restore();
    }
  }
}

function drawSeekerWorld(c) {
  c.scale(1.3, 1.3);
  c.fillStyle = '#ccc8c0';
  c.beginPath(); c.ellipse(0, 0, 11, 8, 0, 0, Math.PI*2); c.fill();
  c.fillStyle = '#aa0000';
  c.beginPath(); c.arc(0, 0, 5, 0, Math.PI*2); c.fill();
  c.shadowBlur = 12; c.shadowColor = '#ff0000';
  c.fillStyle = '#ff4444';
  c.beginPath(); c.arc(0, 0, 2.5, 0, Math.PI*2); c.fill();
  c.shadowBlur = 0;
}

function drawDepthWorld(c) {
  c.fillStyle = '#222232'; c.fillRect(-7,-13,14,17);
  c.fillStyle = '#181828'; c.fillRect(-6,-19,12,8);
  c.fillStyle = '#7a0000'; c.fillRect(-4,-17,8,4);
  c.fillStyle = '#333344'; c.fillRect(-11,-11,4,8); c.fillRect(7,-11,4,8);
  c.fillStyle = '#181828'; c.fillRect(-6,4,5,8); c.fillRect(1,4,5,8);
}

// ── Draw player robot ────────────────────────────────────────────
function drawPlayer() {
  const px = player.x - cameraX;
  const py = player.y;

  ctx.save();
  ctx.translate(px + player.w / 2, py + player.h / 2);
  ctx.scale(player.facing, 1);

  // Shadow
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, player.h / 2 - 2, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Legs
  const legOff = player.vx !== 0 && player.onGround ? Math.sin(player.animFrame * 1.6) * 4 : 0;
  ctx.fillStyle = '#4a5a6f';
  ctx.fillRect(-6, 7, 5, 9 + legOff);
  ctx.fillRect(1,  7, 5, 9 - legOff);
  // Boots
  ctx.fillStyle = '#2a3a4f';
  ctx.fillRect(-7, 15 + legOff, 6, 3);
  ctx.fillRect(1, 15 - legOff, 6, 3);

  // Body
  ctx.fillStyle = '#7a8ba0';
  ctx.fillRect(-9, -7, 18, 15);
  // Chest panel
  ctx.fillStyle = '#b0bcc8';
  ctx.fillRect(-6, -5, 12, 8);
  // Core glow
  const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.005);
  ctx.fillStyle = `rgba(255,100,0,${pulse})`;
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ff6600';
  ctx.beginPath();
  ctx.arc(0, -1, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Arms
  ctx.fillStyle = '#6a7a8f';
  ctx.fillRect(9,  -5, 4, 11);
  ctx.fillRect(-13, -5, 4, 11);

  // Weapon arm glow if equipped
  if (window.equippedWeapon) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00e5ff';
    ctx.fillRect(9, 0, 10, 4);
    ctx.restore();
  }

  // Head
  ctx.fillStyle = '#5a6a7f';
  ctx.fillRect(-6, -18, 12, 11);
  // Visor
  ctx.fillStyle = '#00e5ff';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00e5ff';
  ctx.fillRect(-5, -16, 10, 4);
  ctx.shadowBlur = 0;
  // Head details
  ctx.fillStyle = '#3a4a5f';
  ctx.fillRect(-6, -18, 12, 2);
  ctx.fillRect(-7, -10, 2, 3);
  ctx.fillRect(5,  -10, 2, 3);

  ctx.restore();
}

// ── HUD updates ──────────────────────────────────────────────────
function updateHUD() {
  const pct = (player.hp / player.maxHp) * 100;
  document.getElementById('hp-bar').style.width  = pct + '%';
  document.getElementById('hp-text').textContent = `${player.hp} / ${player.maxHp}`;
  document.getElementById('genius-bar').style.width = player.genius + '%';
  updateLiveStats();
}

// ── Secret banner ────────────────────────────────────────────────
function showSecretBanner(label) {
  let el = document.getElementById('secret-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'secret-banner';
    el.style.cssText = `
      position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      z-index:50; text-align:center; pointer-events:none;
      font-family:'Press Start 2P',monospace;
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div style="font-size:0.45rem;letter-spacing:0.4em;color:#666;margin-bottom:6px;">SECRET FOUND</div>
    <div style="font-size:clamp(0.8rem,3vw,1.2rem);color:#cc88ff;text-shadow:0 0 20px #aa66ff;letter-spacing:0.2em;">${label}</div>
  `;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

// ── End screen + Firebase leaderboard ───────────────────────────
async function showEndScreen() {
  stopTimer();
  const ms = run.elapsedMs;

  const kr = killsRank(run.kills);
  const sr = styleRank(run.stylePoints);
  const tr = timeRank(ms);
  const fr = finalRank(kr, sr, tr);

  document.getElementById('end-time').textContent  = formatTime(ms);
  document.getElementById('end-kills').textContent = run.kills;
  document.getElementById('end-style').textContent = run.stylePoints;
  document.getElementById('end-secrets').textContent = `${run.secrets} / ${run.totalSecrets}`;

  const tkEl = document.getElementById('end-time-rank');
  const kkEl = document.getElementById('end-kills-rank');
  const skEl = document.getElementById('end-style-rank');
  const frEl = document.getElementById('end-final-rank');

  tkEl.textContent  = tr; tkEl.style.color = rankColor(tr); tkEl.style.textShadow = rankShadow(tr);
  kkEl.textContent  = kr; kkEl.style.color = rankColor(kr); kkEl.style.textShadow = rankShadow(kr);
  skEl.textContent  = sr; skEl.style.color = rankColor(sr); skEl.style.textShadow = rankShadow(sr);
  frEl.textContent  = fr; frEl.style.color = rankColor(fr); frEl.style.textShadow = rankShadow(fr);

  // Bonuses
  const bonuses = [];
  if (run.noRestarts)  bonuses.push('+ NO RESTARTS (+500 STYLE)');
  if (run.parries > 0) bonuses.push(`+ ${run.parries} PARRIES (+${run.parries * 150} STYLE)`);
  if (run.crits > 0)   bonuses.push(`+ ${run.crits} CRITS (+${run.crits * 80} STYLE)`);
  if (run.secrets > 0) bonuses.push(`+ ${run.secrets} SECRETS FOUND`);
  document.getElementById('end-bonuses').textContent = bonuses.join('\n');

  document.getElementById('end-screen').classList.remove('hidden');

  // Save to Firebase
  await saveRunToFirebase(fr, ms);
  await loadLeaderboard();
}

async function saveRunToFirebase(rank, ms) {
  if (!window._firebaseReady) return;
  try {
    const col = window._fsCollection(window._db, 'runs_e1');
    await window._fsAddDoc(col, {
      name:       profile.displayname || profile.nickname || 'UNKNOWN',
      rank:       rank,
      timeMs:     ms,
      timeStr:    formatTime(ms),
      kills:      run.kills,
      style:      run.stylePoints,
      secrets:    run.secrets,
      timestamp:  Date.now(),
    });
  } catch (err) {
    console.warn('Firebase save failed:', err);
  }
}

async function loadLeaderboard() {
  const el = document.getElementById('lb-entries');
  if (!window._firebaseReady) {
    el.textContent = 'OFFLINE MODE';
    return;
  }
  try {
    const col = window._fsCollection(window._db, 'runs_e1');
    const q   = window._fsQuery(col,
      window._fsOrderBy('timeMs', 'asc'),
      window._fsLimit(5)
    );
    const snap = await window._fsGetDocs(q);
    if (snap.empty) { el.textContent = 'NO RUNS YET'; return; }

    el.innerHTML = '';
    snap.forEach((doc, i) => {
      const d   = doc.data();
      const row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML = `
        <span class="lb-pos">#${i+1}</span>
        <span class="lb-name">${(d.name || 'UNKNOWN').substring(0,12).toUpperCase()}</span>
        <span class="lb-rtime">${d.timeStr}</span>
        <span class="lb-rrank" style="color:${rankColor(d.rank)};text-shadow:${rankShadow(d.rank)}">${d.rank}</span>
      `;
      el.appendChild(row);
    });
  } catch (err) {
    el.textContent = 'COULD NOT LOAD';
    console.warn('Leaderboard load failed:', err);
  }
}

function continueAfterEnd() {
  document.getElementById('end-screen').classList.add('hidden');
  // Future: go to E2
}

// ── Kill registered (called from battle.js) ──────────────────────
window.registerKill = function(enemyName) {
  run.kills++;
  let styleGain = 200;
  if (enemyName === 'DEPTH') styleGain = 280;
  addStyle(styleGain, enemyName + ' DOWN');
};

window.registerCrit = function() {
  run.crits++;
  addStyle(120, 'CRITICAL!');
};

window.registerParry = function() {
  run.parries++;
  addStyle(350, 'PARRY!');
};

// Expose end screen trigger
window.showEndScreen = showEndScreen;

// ── Main loop ────────────────────────────────────────────────────
function gameLoop() {
  updatePlayer();
  drawWorld();
  drawEnemiesWorld();
  drawPlayer();
  if (typeof drawWorldWeapons === 'function') drawWorldWeapons(ctx, cameraX);
  updateHUD();
  requestAnimationFrame(gameLoop);
}

gameLoop();
