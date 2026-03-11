// ═══════════════════════════════════════════════════════════════
//  DEEP EXPLORATION — game.js (full rewrite v3)
//  Mobile + PC/Chromebook support | Full animation | Firebase
// ═══════════════════════════════════════════════════════════════

// ── Canvas setup ─────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let W = 0, H = 0;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));

// ── Profile ───────────────────────────────────────────────────────
const profile = JSON.parse(localStorage.getItem('de_profile') || '{}');

// ═══════════════════════════════════════════════════════════════
//  INPUT — keyboard + touch + mouse all unified into one keys{}
// ═══════════════════════════════════════════════════════════════

const keys = {};

// Keyboard
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  // Prevent space from scrolling page
  if (e.code === 'Space') e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// Mobile button injection — called from HTML ontouchstart/end
window.mobileKey = function(code, pressed) {
  keys[code] = pressed;
  const map = {
    ArrowLeft:  'mob-left',
    ArrowRight: 'mob-right',
    Space:      'mob-jump',
    KeyE:       'mob-pickup',
  };
  const btn = document.getElementById(map[code]);
  if (btn) btn.classList.toggle('pressed', pressed);
};

// Touch swipe detection for jump (swipe up = jump)
let touchStartY = 0;
let touchStartX = 0;

canvas.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

canvas.addEventListener('touchend', e => {
  const dy = touchStartY - e.changedTouches[0].clientY;
  const dx = e.changedTouches[0].clientX - touchStartX;
  // Swipe up = jump
  if (dy > 40 && Math.abs(dx) < 60) {
    keys['Space'] = true;
    setTimeout(() => { keys['Space'] = false; }, 120);
  }
}, { passive: true });

// ═══════════════════════════════════════════════════════════════
//  CAMERA SHAKE
// ═══════════════════════════════════════════════════════════════

const shake = { x: 0, y: 0, intensity: 0, duration: 0 };

function triggerShake(intensity, duration) {
  shake.intensity = intensity;
  shake.duration  = duration;
}
window.triggerShake = triggerShake;

function updateShake() {
  if (shake.duration > 0) {
    shake.x        = (Math.random() - 0.5) * shake.intensity;
    shake.y        = (Math.random() - 0.5) * shake.intensity;
    shake.duration -= 16;
  } else {
    shake.x = shake.y = shake.intensity = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
//  DAMAGE FLASH
// ═══════════════════════════════════════════════════════════════

let damageFlashAlpha = 0;

function triggerDamageFlash() {
  damageFlashAlpha = 0.6;
}
window.triggerDamageFlash = triggerDamageFlash;

function drawDamageFlash() {
  if (damageFlashAlpha <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(180,0,0,${damageFlashAlpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  damageFlashAlpha = Math.max(0, damageFlashAlpha - 0.032);
}

// ═══════════════════════════════════════════════════════════════
//  GENIUS PARTICLES
// ═══════════════════════════════════════════════════════════════

const geniusParticles = [];

function spawnGeniusParticles(count = 28) {
  for (let i = 0; i < count; i++) {
    geniusParticles.push({
      x:     W / 2 + (Math.random() - 0.5) * 220,
      y:     H / 2 + (Math.random() - 0.5) * 110,
      vx:    (Math.random() - 0.5) * 5.5,
      vy:    (Math.random() - 0.5) * 5.5 - 2.5,
      size:  Math.random() * 5 + 2,
      alpha: 1,
      color: Math.random() > 0.5 ? '#00e5ff' : '#0088cc',
    });
  }
}
window.spawnGeniusParticles = spawnGeniusParticles;

function updateDrawGeniusParticles() {
  for (let i = geniusParticles.length - 1; i >= 0; i--) {
    const p  = geniusParticles[i];
    p.x     += p.vx;
    p.y     += p.vy;
    p.vy    += 0.14;
    p.alpha -= 0.022;
    p.size  *= 0.975;
    if (p.alpha <= 0) { geniusParticles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.color;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#00ccff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════════════════════

const player = {
  x: 180, y: 400,
  w: 24,  h: 34,
  vx: 0,  vy: 0,
  speed: 3.6,
  jumpForce: -12,
  onGround: false,
  facing: 1,
  // Animation
  state: 'idle',
  legCycle: 0,
  animTick: 0,
  landTimer: 0,
  // Stats
  hp: 100, maxHp: 100,
  genius: 0,
  // Flags
  invincible: false,
};
window.player = player;

// ═══════════════════════════════════════════════════════════════
//  SPEEDRUN / STATS
// ═══════════════════════════════════════════════════════════════

const run = {
  startTime:   null,
  elapsedMs:   0,
  running:     false,
  kills:       0,
  stylePoints: 0,
  secrets:     0,
  totalSecrets: 3,
  noRestarts:  true,
  parries:     0,
  crits:       0,
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
  return run.running
    ? performance.now() - run.startTime
    : run.elapsedMs;
}

function formatTime(ms) {
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(3,'0')}`;
}

// ── Rank system ───────────────────────────────────────────────────
const RANK_ORDER = ['D','C','B','A','S','P'];

function rankValue(r)  { return RANK_ORDER.indexOf(r); }
function killsRank(k)  { return k>=6?'P':k>=5?'S':k>=4?'A':k>=3?'B':k>=2?'C':'D'; }
function styleRank(sp) { return sp>=3000?'P':sp>=2000?'S':sp>=1200?'A':sp>=600?'B':sp>=200?'C':'D'; }
function timeRank(ms)  { return ms<=90000?'P':ms<=150000?'S':ms<=240000?'A':ms<=360000?'B':ms<=540000?'C':'D'; }

function finalRank(kr, sr, tr) {
  const vals = [rankValue(kr), rankValue(sr), rankValue(tr)];
  if (vals.every(v => v >= 5)) return 'P';
  return RANK_ORDER[Math.min(...vals)];
}

function rankColor(r) {
  return { D:'#555', C:'#aaa', B:'#4488ff', A:'#ff8800', S:'#ff2200', P:'#ffd700' }[r] || '#fff';
}

function rankShadow(r) {
  return {
    D: 'none', C: 'none',
    B: '0 0 10px #4488ff',
    A: '0 0 12px #ff8800',
    S: '0 0 18px #ff4400',
    P: '0 0 30px #ffd700, 0 0 60px #ffaa00',
  }[r] || 'none';
}

function addStyle(pts, reason) {
  run.stylePoints += pts;
  showStyleFlash(`+${pts} ${reason}`);
}

function showStyleFlash(msg) {
  let el = document.getElementById('style-flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'style-flash';
    el.style.cssText = `
      position:fixed; bottom:160px; right:20px; z-index:25;
      font-family:'Press Start 2P',monospace;
      font-size:clamp(0.38rem,1.2vw,0.5rem);
      color:#ff8800; pointer-events:none;
      letter-spacing:0.1em;
      transition:opacity 0.4s ease;
      text-shadow: 1px 1px 0 #000;
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 1300);
}

function updateLiveStats() {
  const kr = killsRank(run.kills);
  const sr = styleRank(run.stylePoints);
  const tr = timeRank(getElapsedMs());

  const kills  = document.getElementById('stat-kills');
  const style  = document.getElementById('stat-style');
  const time   = document.getElementById('stat-time');
  const timer  = document.getElementById('hud-timer');
  const rkKill = document.getElementById('rank-kills');
  const rkStyle= document.getElementById('rank-style');
  const rkTime = document.getElementById('rank-time');

  if (kills)   kills.textContent  = run.kills;
  if (style)   style.textContent  = run.stylePoints;
  if (time)    time.textContent   = formatTime(getElapsedMs());
  if (timer)   timer.textContent  = formatTime(getElapsedMs());

  if (rkKill) { rkKill.textContent  = kr; rkKill.className  = `stat-rank rank-${kr}`; }
  if (rkStyle){ rkStyle.textContent = sr; rkStyle.className = `stat-rank rank-${sr}`; }
  if (rkTime) { rkTime.textContent  = tr; rkTime.className  = `stat-rank rank-${tr}`; }
}

// ═══════════════════════════════════════════════════════════════
//  WORLD DATA
// ═══════════════════════════════════════════════════════════════

const platforms = [
  // Ground
  { x:0,    y:520, w:2600, h:60 },
  // Platforms
  { x:280,  y:430, w:150,  h:14 },
  { x:520,  y:360, w:120,  h:14 },
  { x:730,  y:290, w:180,  h:14 },
  { x:1000, y:380, w:140,  h:14 },
  { x:1240, y:460, w:170,  h:14 },
  { x:1480, y:330, w:190,  h:14 },
  { x:1750, y:420, w:140,  h:14 },
  { x:1980, y:350, w:160,  h:14 },
  // Secret platforms
  { x:600,  y:200, w:80,   h:14, secret:true },
  { x:1350, y:180, w:80,   h:14, secret:true },
];

const secrets = [
  { x:635,  y:168, collected:false, label:'VOID SHARD'   },
  { x:1385, y:152, collected:false, label:"ANGEL'S EYE"  },
  { x:950,  y:100, collected:false, label:'BROKEN HALO'  },
];

const worldEnemies = [
  { name:'SEEKER', id:1, wx:440,  wy:490, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'SEEKER', id:2, wx:870,  wy:355, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'DEPTH',  id:3, wx:640,  wy:485, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
  { name:'SEEKER', id:4, wx:1120, wy:445, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'DEPTH',  id:5, wx:1380, wy:425, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
  { name:'DEPTH',  id:6, wx:1650, wy:395, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
];
window.worldEnemies = worldEnemies;

// Genius puddles dropped by defeated enemies
const geniusPuddles = [];
window.geniusPuddles = geniusPuddles;

let cameraX  = 0;
let inBattle = false;
window.inBattle = false;

// ═══════════════════════════════════════════════════════════════
//  PLAYER PHYSICS + ANIMATION STATE MACHINE
// ═══════════════════════════════════════════════════════════════

function updatePlayerAnim() {
  const moving = Math.abs(player.vx) > 0.4;

  if (!player.onGround) {
    player.state = player.vy < 0 ? 'jump' : 'fall';
  } else if (player.landTimer > 0) {
    player.state = 'land';
    player.landTimer = Math.max(0, player.landTimer - 16);
  } else if (moving) {
    player.state = 'run';
  } else {
    player.state = 'idle';
  }

  if (player.state === 'run') {
    player.legCycle += 0.18;
  } else {
    player.legCycle *= 0.82;
  }
}

function updatePlayer() {
  if (inBattle || window.inBattle) return;

  // Start timer on first movement
  const anyMove = keys['ArrowLeft']  || keys['ArrowRight'] ||
                  keys['KeyA']       || keys['KeyD'];
  if (!run.running && anyMove) startTimer();

  const wasOnGround = player.onGround;

  // Horizontal
  if      (keys['ArrowLeft']  || keys['KeyA']) { player.vx = -player.speed; player.facing = -1; }
  else if (keys['ArrowRight'] || keys['KeyD']) { player.vx =  player.speed; player.facing =  1; }
  else    player.vx *= 0.65;

  // Jump
  const jumpKey = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
  if (jumpKey && player.onGround) {
    player.vy       = player.jumpForce;
    player.onGround = false;
    if (typeof Audio !== 'undefined') Audio.init();
  }

  // Gravity
  player.vy = Math.min(player.vy + 0.58, 20);
  player.x += player.vx;
  player.y += player.vy;

  // Platform collision
  player.onGround = false;
  for (const p of platforms) {
    const inX = player.x + player.w > p.x && player.x < p.x + p.w;
    const feet = player.y + player.h;
    const wasAbove = feet - player.vy <= p.y + 4;
    if (inX && wasAbove && feet >= p.y && feet <= p.y + p.h + 18 && player.vy >= 0) {
      player.y        = p.y - player.h;
      player.vy       = 0;
      player.onGround = true;
    }
  }

  // Land impact
  if (!wasOnGround && player.onGround) {
    player.landTimer = 130;
    const impact = Math.abs(player.vy);
    if (impact > 5) triggerShake(Math.min(impact * 0.6, 8), 180);
  }

  // World bounds
  if (player.x < 0) player.x = 0;

  // Fell off world
  if (player.y > H + 300) {
    player.y  = 300;
    player.hp = Math.max(1, player.hp - 20);
    triggerDamageFlash();
    triggerShake(10, 350);
    run.noRestarts = false;
  }

  // Smooth camera
  const targetCamX = player.x - W / 3;
  cameraX += (Math.max(0, targetCamX) - cameraX) * 0.1;

  // Pickup weapon (E key)
  if (typeof checkWeaponPickup === 'function') checkWeaponPickup(player, keys);

  // Collect secrets
  for (const s of secrets) {
    if (s.collected) continue;
    if (Math.hypot(player.x + player.w/2 - s.x, player.y + player.h/2 - s.y) < 30) {
      s.collected = true;
      run.secrets++;
      addStyle(300, 'SECRET!');
      showSecretBanner(s.label);
    }
  }

  // Genius puddle pickup
  for (let i = geniusPuddles.length - 1; i >= 0; i--) {
    const pd = geniusPuddles[i];
    if (Math.hypot(player.x + player.w/2 - pd.x, player.y + player.h - pd.y) < 36) {
      player.hp     = Math.min(player.maxHp, player.hp + pd.healAmt);
      player.genius = Math.min(100, player.genius + 15);
      spawnGeniusParticles(14);
      geniusPuddles.splice(i, 1);
      showStyleFlash(`+${pd.healAmt} HP (GENIUS PUDDLE)`);
    }
  }

  // Enemy proximity → trigger battle
  for (const e of worldEnemies) {
    if (e.defeated) continue;
    const dist = Math.hypot(player.x + player.w/2 - e.wx, player.y + player.h/2 - e.wy);
    if (dist < 55) {
      if (typeof triggerBattle === 'function') triggerBattle(e);
      return;
    }
  }

  // Boss zone warning
  if (player.x >= 1900 && !window._bossDefeated) {
    const bw = document.getElementById('hud-boss-warning');
    if (bw) bw.style.display = 'block';
  }

  // Boss trigger
  if (player.x >= 2100 && !window._bossDefeated) {
    if (typeof triggerBossFight === 'function') triggerBossFight();
  }

  updatePlayerAnim();

  // Weapon display
  const wd = document.getElementById('weapon-display');
  if (wd) wd.textContent = window.equippedWeapon
    ? window.equippedWeapon.name.toUpperCase()
    : '— NO WEAPON —';
}

// ═══════════════════════════════════════════════════════════════
//  DRAW WORLD
// ═══════════════════════════════════════════════════════════════

function drawWorld() {
  // Sky — red tint in boss phase 2
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (window.bossPhase2Active) {
    sky.addColorStop(0, '#120003');
    sky.addColorStop(1, '#1e0005');
  } else {
    sky.addColorStop(0, '#030008');
    sky.addColorStop(1, '#0e0004');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Parallax stars (2 layers)
  for (let layer = 0; layer < 2; layer++) {
    const parallax = layer === 0 ? 0.08 : 0.18;
    const count    = layer === 0 ? 60   : 40;
    for (let i = 0; i < count; i++) {
      const sx    = ((i * (layer===0?149:211) + 30) % 2600 - cameraX * parallax + 2600) % W;
      const sy    = (i * (layer===0?113:97))  % (H * 0.75);
      const alpha = layer === 0 ? 0.15 + 0.2*(i%3)/3 : 0.3 + 0.3*(i%2);
      ctx.fillStyle = `rgba(212,197,169,${alpha})`;
      ctx.fillRect(sx, sy, layer===0?1:1.5, layer===0?1:1.5);
    }
  }

  // Distant broken heaven silhouette
  ctx.save();
  ctx.globalAlpha = window.bossPhase2Active ? 0.04 : 0.055;
  ctx.fillStyle   = window.bossPhase2Active ? '#cc0000' : '#c9a84c';
  const bgX = 600 - cameraX * 0.04;
  for (let i = 0; i < 7; i++) {
    const bx  = bgX + i * 240;
    const bh  = 100 + (i % 3) * 70;
    const bw2 = 18 + (i % 2) * 8;
    ctx.fillRect(bx, H * 0.35 - bh, bw2, bh);
    ctx.fillRect(bx - 6, H * 0.35 - bh - 16, bw2 + 12, 16);
  }
  ctx.restore();

  // Platforms + ground
  for (const p of platforms) {
    const px = p.x - cameraX;
    if (px > W + 120 || px + p.w < -120) continue;

    if (p.h > 20) {
      // Ground
      const grd = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      grd.addColorStop(0, '#160808');
      grd.addColorStop(1, '#080303');
      ctx.fillStyle = grd;
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = '#2a1010';
      ctx.fillRect(px, p.y, p.w, 2);
      // Ground cracks
      ctx.save();
      ctx.strokeStyle = 'rgba(50,20,20,0.6)';
      ctx.lineWidth   = 1;
      for (let i = 0; i < Math.floor(p.w / 80); i++) {
        const cx2 = px + 40 + i * 80;
        ctx.beginPath();
        ctx.moveTo(cx2, p.y + 4);
        ctx.lineTo(cx2 + 10, p.y + 12);
        ctx.lineTo(cx2 + 6, p.y + 18);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Floating platform
      ctx.fillStyle = p.secret ? '#1a1020' : '#1e0e0e';
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = p.secret ? '#6644aa' : '#3a1818';
      ctx.fillRect(px, p.y, p.w, 2);
      // Secret glow
      if (p.secret) {
        ctx.save();
        ctx.globalAlpha = 0.1 + 0.07 * Math.sin(Date.now() * 0.003);
        ctx.fillStyle   = '#aa66ff';
        ctx.shadowBlur  = 12;
        ctx.shadowColor = '#aa66ff';
        ctx.fillRect(px - 4, p.y - 4, p.w + 8, p.h + 8);
        ctx.restore();
      }
    }
  }

  // Secret collectibles
  for (const s of secrets) {
    if (s.collected) continue;
    const sx  = s.x - cameraX;
    const bob = Math.sin(Date.now() * 0.003 + s.x) * 4;
    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = '#aa66ff';
    ctx.fillStyle   = '#cc88ff';
    ctx.beginPath();
    ctx.moveTo(sx,      s.y - 10 + bob);
    ctx.lineTo(sx + 7,  s.y      + bob);
    ctx.lineTo(sx,      s.y + 10 + bob);
    ctx.lineTo(sx - 7,  s.y      + bob);
    ctx.closePath();
    ctx.fill();
    // Inner gleam
    ctx.fillStyle  = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(sx - 2, s.y - 3 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Genius puddles
  for (const pd of geniusPuddles) {
    const px    = pd.x - cameraX;
    const pulse = 0.45 + 0.2 * Math.sin(Date.now() * 0.004 + pd.x);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#00ccff';
    ctx.fillStyle   = '#0077aa';
    ctx.beginPath();
    ctx.ellipse(px, pd.y, pd.radius, pd.radius * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.globalAlpha = pulse * 0.5;
    ctx.fillStyle   = '#00e5ff';
    ctx.beginPath();
    ctx.ellipse(px - pd.radius * 0.2, pd.y - 2, pd.radius * 0.3, pd.radius * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
//  DRAW ENEMIES IN WORLD
// ═══════════════════════════════════════════════════════════════

function drawEnemiesWorld() {
  for (const e of worldEnemies) {
    if (e.defeated) continue;
    const ex = e.wx - cameraX;
    if (ex < -80 || ex > W + 80) continue;

    const bob = e.type === 'flying'
      ? Math.sin(Date.now() * 0.003 + e.id) * 6
      : 0;

    ctx.save();
    ctx.translate(ex, e.wy + bob);
    if (e.name === 'SEEKER') drawSeekerWorld(ctx);
    else                      drawDepthWorld(ctx);
    ctx.restore();

    // Proximity exclamation
    const dist = Math.hypot(
      player.x + player.w/2 - e.wx,
      player.y + player.h/2 - e.wy
    );
    if (dist < 150) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.014);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle   = dist < 70 ? '#ff2200' : '#ff8800';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = ctx.fillStyle;
      ctx.font        = `${Math.max(8, Math.floor(W * 0.012))}px "Press Start 2P", monospace`;
      ctx.textAlign   = 'center';
      ctx.fillText('!', ex, e.wy - 20 + bob);
      ctx.restore();
    }
  }
}

function drawSeekerWorld(c) {
  c.scale(1.3, 1.3);
  // Body
  c.fillStyle = '#ccc8c0';
  c.beginPath(); c.ellipse(0, 0, 11, 8, 0, 0, Math.PI*2); c.fill();
  // Eye
  c.fillStyle   = '#aa0000';
  c.shadowBlur  = 10;
  c.shadowColor = '#ff0000';
  c.beginPath(); c.arc(0, 0, 5, 0, Math.PI*2); c.fill();
  c.fillStyle = '#ff4444';
  c.beginPath(); c.arc(0, 0, 2.5, 0, Math.PI*2); c.fill();
  c.shadowBlur = 0;
}

function drawDepthWorld(c) {
  // Body
  c.fillStyle = '#222232'; c.fillRect(-7,-13,14,17);
  // Helmet
  c.fillStyle = '#181828'; c.fillRect(-6,-19,12,8);
  // Visor
  c.fillStyle   = '#7a0000';
  c.shadowBlur  = 6;
  c.shadowColor = '#cc0000';
  c.fillRect(-4,-17,8,4);
  c.shadowBlur = 0;
  // Shoulders
  c.fillStyle = '#333344';
  c.fillRect(-11,-11,4,8);
  c.fillRect(7,  -11,4,8);
  // Legs
  c.fillStyle = '#181828';
  c.fillRect(-6,4,5,8);
  c.fillRect(1, 4,5,8);
}

// ═══════════════════════════════════════════════════════════════
//  DRAW PLAYER — full animation
// ═══════════════════════════════════════════════════════════════

function drawPlayer() {
  const px  = player.x - cameraX + shake.x;
  const py  = player.y           + shake.y;
  const f   = player.facing;
  const t   = Date.now();
  const lc  = player.legCycle;
  const st  = player.state;
  const h2  = player.h / 2;

  ctx.save();
  ctx.translate(px + player.w / 2, py + player.h / 2);
  ctx.scale(f, 1);

  // ── Squash/stretch ──
  let sx = 1, sy = 1;
  if (st === 'jump') { sx = 0.82; sy = 1.22; }
  if (st === 'fall') { sx = 1.14; sy = 0.86; }
  if (st === 'land') {
    const q = Math.min(player.landTimer / 130, 1);
    sx = 1 + q * 0.28;
    sy = 1 - q * 0.24;
  }
  ctx.scale(sx, sy);

  // ── Ground shadow ──
  if (st !== 'jump' && st !== 'fall') {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle   = '#000';
    ctx.beginPath();
    ctx.ellipse(0, h2 + 2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Legs ──
  const l1 = st === 'run' ? Math.sin(lc) * 0.58 : 0;
  const l2 = st === 'run' ? Math.sin(lc + Math.PI) * 0.58 : 0;

  // Left leg
  ctx.save();
  ctx.translate(-5, h2 - 15);
  ctx.rotate(l1);
  ctx.fillStyle = '#4a5a6f';
  ctx.fillRect(-3, 0, 6, 10);
  ctx.translate(0, 10);
  ctx.rotate(Math.abs(l1) * 0.45);
  ctx.fillStyle = '#3a4a5e';
  ctx.fillRect(-2.5, 0, 5, 9);
  ctx.fillStyle = '#2a3a4f';
  ctx.fillRect(-3.5, 8, 7, 3);
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.translate(5, h2 - 15);
  ctx.rotate(l2);
  ctx.fillStyle = '#4a5a6f';
  ctx.fillRect(-3, 0, 6, 10);
  ctx.translate(0, 10);
  ctx.rotate(-Math.abs(l2) * 0.45);
  ctx.fillStyle = '#3a4a5e';
  ctx.fillRect(-2.5, 0, 5, 9);
  ctx.fillStyle = '#2a3a4f';
  ctx.fillRect(-3.5, 8, 7, 3);
  ctx.restore();

  // ── Body ──
  ctx.fillStyle = '#7a8ba0';
  ctx.fillRect(-10, -h2 + 5, 20, 18);
  // Chest panel
  ctx.fillStyle = '#b0bcc8';
  ctx.fillRect(-7, -h2 + 7, 14, 10);
  // Side panels
  ctx.fillStyle = '#5a6a7f';
  ctx.fillRect(-10, -h2 + 7, 3, 18);
  ctx.fillRect(7,   -h2 + 7, 3, 18);

  // Core glow — pulses faster when running
  const coreSpeed = st === 'run' ? 0.012 : 0.005;
  const corePulse = 0.5 + 0.5 * Math.sin(t * coreSpeed);
  ctx.fillStyle   = `rgba(255,${Math.floor(80 + corePulse*120)},0,${0.6 + corePulse*0.4})`;
  ctx.shadowBlur  = 14;
  ctx.shadowColor = '#ff6600';
  ctx.beginPath();
  ctx.arc(0, -h2 + 13, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Arms ──
  const armSwing = st === 'run' ? Math.sin(lc + Math.PI) * 0.42 : 0;

  // Right arm (weapon side)
  ctx.save();
  ctx.translate(10, -h2 + 9);
  ctx.rotate(armSwing);
  ctx.fillStyle = '#6a7a8f';
  ctx.fillRect(0, -2, 10, 7);
  if (window.equippedWeapon) {
    ctx.fillStyle   = '#00e5ff';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#00e5ff';
    ctx.fillRect(8, 0, 9, 4);
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // Left arm
  ctx.save();
  ctx.translate(-10, -h2 + 9);
  ctx.rotate(-armSwing);
  ctx.fillStyle = '#6a7a8f';
  ctx.fillRect(-10, -2, 10, 7);
  ctx.restore();

  // ── Head ──
  const headBob = st === 'run' ? Math.sin(lc * 2) * 1.5 : 0;
  ctx.save();
  ctx.translate(0, headBob);

  // Helmet
  ctx.fillStyle = '#5a6a7f';
  ctx.fillRect(-7, -h2 - 9, 14, 13);
  // Visor — orange in combat
  const visorCol = window.inBattle ? '#ff4400' : '#00e5ff';
  ctx.fillStyle   = visorCol;
  ctx.shadowBlur  = 10;
  ctx.shadowColor = visorCol;
  ctx.fillRect(-6, -h2 - 6, 12, 4);
  ctx.shadowBlur = 0;
  // Helmet details
  ctx.fillStyle = '#3a4a5f';
  ctx.fillRect(-7, -h2 - 9, 14, 2);
  ctx.fillRect(-8, -h2 - 5, 2, 5);
  ctx.fillRect(6,  -h2 - 5, 2, 5);

  // Antenna (hidden during jump/fall)
  if (st !== 'jump' && st !== 'fall') {
    ctx.fillStyle   = '#8a9ab0';
    ctx.fillRect(-1, -h2 - 16, 2, 8);
    const antPulse  = 0.5 + 0.5 * Math.sin(t * 0.007);
    ctx.fillStyle   = `rgba(0,229,255,${antPulse})`;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, -h2 - 17, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // ── Jump thrusters ──
  if (st === 'jump' || st === 'fall') {
    const thrA = st === 'jump' ? 0.85 : 0.3;
    ctx.save();
    ctx.globalAlpha   = thrA;
    ctx.shadowBlur    = 18;
    ctx.shadowColor   = '#ff6600';
    ctx.fillStyle     = '#ff4400';
    // Left thruster flame
    ctx.beginPath();
    ctx.moveTo(-6, h2 - 4);
    ctx.lineTo(-9, h2 + 10 + Math.random() * 7);
    ctx.lineTo(-2, h2 - 4);
    ctx.closePath();
    ctx.fill();
    // Right thruster flame
    ctx.beginPath();
    ctx.moveTo(6,  h2 - 4);
    ctx.lineTo(9,  h2 + 10 + Math.random() * 7);
    ctx.lineTo(2,  h2 - 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════════════════

function updateHUD() {
  const pct = (player.hp / player.maxHp) * 100;
  const hpBar  = document.getElementById('hp-bar');
  const hpText = document.getElementById('hp-text');
  const genBar = document.getElementById('genius-bar');
  if (hpBar)  hpBar.style.width    = pct + '%';
  if (hpText) hpText.textContent   = `${Math.max(0,player.hp)} / ${player.maxHp}`;
  if (genBar) genBar.style.width   = player.genius + '%';
  updateLiveStats();
}

// ═══════════════════════════════════════════════════════════════
//  BANNERS + NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

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
      transition:opacity 0.6s ease;
    `;
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div style="font-size:clamp(0.3rem,1vw,0.42rem);
      letter-spacing:0.4em;color:#555;margin-bottom:6px;">
      SECRET FOUND
    </div>
    <div style="font-size:clamp(0.7rem,2.5vw,1.2rem);
      color:#cc88ff;text-shadow:0 0 20px #aa66ff;
      letter-spacing:0.18em;">${label}</div>
  `;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}

// ═══════════════════════════════════════════════════════════════
//  END SCREEN + FIREBASE LEADERBOARD
// ═══════════════════════════════════════════════════════════════

async function showEndScreen() {
  stopTimer();
  const ms = run.elapsedMs;
  const kr = killsRank(run.kills);
  const sr = styleRank(run.stylePoints);
  const tr = timeRank(ms);
  const fr = finalRank(kr, sr, tr);

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  const setStyle = (id, prop, val) => {
    const el = document.getElementById(id);
    if (el) el.style[prop] = val;
  };

  setEl('end-time',    formatTime(ms));
  setEl('end-kills',   run.kills);
  setEl('end-style',   run.stylePoints);
  setEl('end-secrets', `${run.secrets} / ${run.totalSecrets}`);

  // Rank letters
  [['end-time-rank',   tr],
   ['end-kills-rank',  kr],
   ['end-style-rank',  sr]].forEach(([id, r]) => {
    setEl(id, r);
    setStyle(id, 'color', rankColor(r));
    setStyle(id, 'textShadow', rankShadow(r));
  });

  setEl('end-final-rank', fr);
  setStyle('end-final-rank', 'color', rankColor(fr));
  setStyle('end-final-rank', 'textShadow', rankShadow(fr));

  // Bonuses
  const bonuses = [];
  if (run.noRestarts)  bonuses.push('+ NO RESTARTS (+500 STYLE)');
  if (run.parries > 0) bonuses.push(`+ ${run.parries} PARRIES (+${run.parries*150} STYLE)`);
  if (run.crits > 0)   bonuses.push(`+ ${run.crits} CRITS (+${run.crits*80} STYLE)`);
  if (run.secrets > 0) bonuses.push(`+ ${run.secrets} SECRETS FOUND`);
  setEl('end-bonuses', bonuses.join('\n'));

  document.getElementById('end-screen')?.classList.remove('hidden');

  // Save best run locally for level select
  const existing  = JSON.parse(localStorage.getItem('de_run_e1_1') || 'null');
  const isNewBest = !existing
    || rankValue(fr) > rankValue(existing.rank)
    || ms < existing.timeMs;
  if (isNewBest) {
    localStorage.setItem('de_run_e1_1', JSON.stringify({
      rank: fr, timeMs: ms, timeStr: formatTime(ms),
      kills: run.kills, style: run.stylePoints,
    }));
  }

  await saveRunToFirebase(fr, ms);
  await loadLeaderboard();
}

async function saveRunToFirebase(rank, ms) {
  if (!window._firebaseReady) return;
  try {
    const col = window._fsCollection(window._db, 'runs_e1');
    await window._fsAddDoc(col, {
      name:      ((profile.displayname || profile.nickname || 'UNKNOWN')
                   .substring(0, 14)).toUpperCase(),
      rank,
      timeMs:    ms,
      timeStr:   formatTime(ms),
      kills:     run.kills,
      style:     run.stylePoints,
      secrets:   run.secrets,
      timestamp: Date.now(),
    });
  } catch(err) { console.warn('Firebase save:', err); }
}

async function loadLeaderboard() {
  const el = document.getElementById('lb-entries');
  if (!el) return;
  if (!window._firebaseReady) { el.textContent = 'OFFLINE MODE'; return; }
  try {
    const col  = window._fsCollection(window._db, 'runs_e1');
    const q    = window._fsQuery(
      col,
      window._fsOrderBy('timeMs', 'asc'),
      window._fsLimit(5)
    );
    const snap = await window._fsGetDocs(q);
    if (snap.empty) { el.textContent = 'NO RUNS YET'; return; }
    el.innerHTML = '';
    let i = 1;
    snap.forEach(doc => {
      const d   = doc.data();
      const row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML = `
        <span class="lb-pos">#${i++}</span>
        <span class="lb-name">${(d.name||'???').substring(0,12)}</span>
        <span class="lb-rtime">${d.timeStr}</span>
        <span class="lb-rrank" style="color:${rankColor(d.rank)};
          text-shadow:${rankShadow(d.rank)}">${d.rank}</span>
      `;
      el.appendChild(row);
    });
  } catch(err) {
    console.warn('Leaderboard load:', err);
    const el2 = document.getElementById('lb-entries');
    if (el2) el2.textContent = 'COULD NOT LOAD';
  }
}

function continueAfterEnd() {
  document.getElementById('end-screen')?.classList.add('hidden');
}
window.continueAfterEnd = continueAfterEnd;

// ═══════════════════════════════════════════════════════════════
//  EXPOSE TO OTHER MODULES
// ═══════════════════════════════════════════════════════════════

window.registerKill  = (name)  => { run.kills++;   addStyle(name==='DEPTH'?280:200, name+' DOWN'); };
window.registerCrit  = ()      => { run.crits++;   addStyle(120, 'CRITICAL!'); };
window.registerParry = ()      => { run.parries++; addStyle(350, 'PARRY!'); };
window.showEndScreen = showEndScreen;

// ═══════════════════════════════════════════════════════════════
//  MAIN GAME LOOP
// ═══════════════════════════════════════════════════════════════

function gameLoop() {
  // Clear
  ctx.clearRect(0, 0, W, H);

  // Camera shake transform
  updateShake();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  // Draw everything
  updatePlayer();
  drawWorld();
  drawEnemiesWorld();

  // Weapons in world
  if (typeof drawWorldWeapons === 'function') drawWorldWeapons(ctx, cameraX);

  drawPlayer();

  // Particles on top
  updateDrawGeniusParticles();

  ctx.restore();

  // Screen overlays (outside shake transform)
  drawDamageFlash();

  // HUD
  updateHUD();

  requestAnimationFrame(gameLoop);
}

// Start
gameLoop();
