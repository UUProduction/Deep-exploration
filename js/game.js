// ═══════════════════════════════════════════════════════════════════════
//  DEEP EXPLORATION — game.js (v3, self-contained)
// ═══════════════════════════════════════════════════════════════════════

const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Profile ────────────────────────────────────────────────────────────
const profile = JSON.parse(localStorage.getItem('de_profile') || '{}');

// ── Camera shake ───────────────────────────────────────────────────────
const shake = { x:0, y:0, intensity:0, duration:0 };
function triggerShake(intensity, duration) { shake.intensity = intensity; shake.duration = duration; }
function updateShake() {
  if (shake.duration > 0) {
    shake.x = (Math.random()-0.5)*shake.intensity;
    shake.y = (Math.random()-0.5)*shake.intensity;
    shake.duration -= 16;
  } else { shake.x = shake.y = shake.intensity = 0; }
}
window.triggerShake = triggerShake;

// ── Damage flash ───────────────────────────────────────────────────────
let damageFlashAlpha = 0;
function triggerDamageFlash() { damageFlashAlpha = 0.55; }
function drawDamageFlash() {
  if (damageFlashAlpha <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(180,0,0,${damageFlashAlpha})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  damageFlashAlpha = Math.max(0, damageFlashAlpha - 0.035);
}
window.triggerDamageFlash = triggerDamageFlash;

// ── Genius particles ───────────────────────────────────────────────────
const geniusParticles = [];
function spawnGeniusParticles(count = 28) {
  for (let i = 0; i < count; i++) {
    geniusParticles.push({
      x: W/2 + (Math.random()-0.5)*200,
      y: H/2 + (Math.random()-0.5)*100,
      vx: (Math.random()-0.5)*5,
      vy: (Math.random()-0.5)*5 - 2,
      size: Math.random()*5+2,
      alpha: 1,
      color: Math.random()>0.5 ? '#00e5ff' : '#0088cc',
    });
  }
}
function updateDrawGeniusParticles() {
  for (let i = geniusParticles.length-1; i >= 0; i--) {
    const p = geniusParticles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.12;
    p.alpha -= 0.022; p.size *= 0.97;
    if (p.alpha <= 0) { geniusParticles.splice(i,1); continue; }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.color;
    ctx.shadowBlur  = 10; ctx.shadowColor = '#00ccff';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}
window.spawnGeniusParticles = spawnGeniusParticles;

// ── Genius puddles ─────────────────────────────────────────────────────
const geniusPuddles = [];
window.geniusPuddles = geniusPuddles;

// ── Player ─────────────────────────────────────────────────────────────
const GROUND_Y = 520;
const player = {
  x: 180, y: GROUND_Y - 34,
  w: 24,  h: 34,
  vx: 0, vy: 0,
  speed: 3.6,
  jumpForce: -12,
  onGround: false,
  facing: 1,
  state: 'idle',
  animTick: 0,
  legCycle: 0,
  landTimer: 0,
  hp: 100, maxHp: 100,
  genius: 0,
  invincible: false,
};
window.player = player;

// ── Run stats ──────────────────────────────────────────────────────────
const run = {
  startTime: null, elapsedMs: 0, running: false,
  kills: 0, stylePoints: 0, secrets: 0, totalSecrets: 3,
  noRestarts: true, parries: 0, crits: 0,
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
  return run.running ? performance.now() - run.startTime : run.elapsedMs;
}
function formatTime(ms) {
  const m  = Math.floor(ms/60000);
  const s  = Math.floor((ms%60000)/1000);
  const cs = Math.floor(ms%1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(3,'0')}`;
}

// ── Rank system ────────────────────────────────────────────────────────
const RANK_ORDER = ['D','C','B','A','S','P'];
function rankValue(r)  { return RANK_ORDER.indexOf(r); }
function killsRank(k)  { return k>=6?'P':k>=5?'S':k>=4?'A':k>=3?'B':k>=2?'C':'D'; }
function styleRank(sp) { return sp>=3000?'P':sp>=2000?'S':sp>=1200?'A':sp>=600?'B':sp>=200?'C':'D'; }
function timeRank(ms)  { return ms<=90000?'P':ms<=150000?'S':ms<=240000?'A':ms<=360000?'B':ms<=540000?'C':'D'; }
function finalRank(kr,sr,tr) {
  const vals = [rankValue(kr),rankValue(sr),rankValue(tr)];
  if (vals.every(v=>v>=5)) return 'P';
  return RANK_ORDER[Math.min(...vals)];
}
function rankColor(r) {
  return {D:'#555',C:'#aaa',B:'#4488ff',A:'#ff8800',S:'#ff2200',P:'#ffd700'}[r]||'#fff';
}
function rankShadow(r) {
  return {D:'none',C:'none',B:'0 0 10px #4488ff',A:'0 0 12px #ff8800',
          S:'0 0 18px #ff4400',P:'0 0 30px #ffd700, 0 0 60px #ffaa00'}[r]||'none';
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
    el.style.cssText = `position:fixed;bottom:140px;right:20px;z-index:25;
      font-family:'Press Start 2P',monospace;font-size:0.5rem;color:#ff8800;
      pointer-events:none;letter-spacing:0.1em;transition:opacity 0.4s ease;`;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.style.opacity='0'; }, 1200);
}

function updateLiveStats() {
  const kr = killsRank(run.kills);
  const sr = styleRank(run.stylePoints);
  const tr = timeRank(getElapsedMs());
  document.getElementById('stat-kills').textContent = run.kills;
  document.getElementById('stat-style').textContent = run.stylePoints;
  document.getElementById('stat-time').textContent  = formatTime(getElapsedMs());
  document.getElementById('hud-timer').textContent  = formatTime(getElapsedMs());
  ['kills','style','time'].forEach((key,i) => {
    const r  = [kr,sr,tr][i];
    const el = document.getElementById(`rank-${key}`);
    el.textContent = r;
    el.className   = `stat-rank rank-${r}`;
  });
}

// ── World ──────────────────────────────────────────────────────────────
const platforms = [
  { x:0,    y:520, w:2400, h:40 },
  { x:280,  y:430, w:150,  h:14 },
  { x:520,  y:360, w:120,  h:14 },
  { x:730,  y:290, w:180,  h:14 },
  { x:1000, y:380, w:140,  h:14 },
  { x:1240, y:460, w:170,  h:14 },
  { x:1480, y:330, w:190,  h:14 },
  { x:1750, y:420, w:140,  h:14 },
  { x:600,  y:200, w:80,   h:14, secret:true },
  { x:1350, y:180, w:80,   h:14, secret:true },
];

const secrets = [
  { x:630,  y:170, collected:false, label:'VOID SHARD'  },
  { x:1380, y:155, collected:false, label:"ANGEL'S EYE" },
  { x:950,  y:100, collected:false, label:'BROKEN HALO' },
];

const worldEnemies = [
  { name:'SEEKER', id:1, wx:440,  wy:395, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'SEEKER', id:2, wx:870,  wy:260, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'DEPTH',  id:3, wx:640,  wy:490, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
  { name:'SEEKER', id:4, wx:1120, wy:350, type:'flying', hp:80,  maxHp:80,  dmgMin:8,  dmgMax:14, defeated:false },
  { name:'DEPTH',  id:5, wx:1380, wy:430, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
  { name:'DEPTH',  id:6, wx:1650, wy:300, type:'melee',  hp:120, maxHp:120, dmgMin:5,  dmgMax:15, defeated:false },
];
window.worldEnemies = worldEnemies;

let cameraX  = 0;
const keys   = {};
let inBattle = false;
window.inBattle = false;

document.addEventListener('keydown', e => { keys[e.code] = true; });
document.addEventListener('keyup',   e => { keys[e.code] = false; });

// ── Animation state ────────────────────────────────────────────────────
function updatePlayerAnim() {
  const moving = Math.abs(player.vx) > 0.5;
  if (!player.onGround) {
    player.state = player.vy < 0 ? 'jump' : 'fall';
  } else if (player.landTimer > 0) {
    player.state = 'land';
    player.landTimer -= 16;
  } else if (moving) {
    player.state = 'run';
  } else {
    player.state = 'idle';
  }
  if (player.state === 'run')  player.legCycle += 0.18;
  if (player.state === 'idle') player.legCycle *= 0.85;
  player.animTick++;
}

// ── Physics ────────────────────────────────────────────────────────────
function updatePlayer() {
  if (inBattle || window.inBattle) return;

  if (!run.running && (keys['ArrowLeft']||keys['ArrowRight']||keys['KeyA']||keys['KeyD'])) {
    startTimer();
  }

  const wasOnGround = player.onGround;

  if      (keys['ArrowLeft']  || keys['KeyA']) { player.vx = -player.speed; player.facing = -1; }
  else if (keys['ArrowRight'] || keys['KeyD']) { player.vx =  player.speed; player.facing =  1; }
  else player.vx *= 0.65;

  if ((keys['Space']||keys['ArrowUp']||keys['KeyW']) && player.onGround) {
    player.vy = player.jumpForce;
    player.onGround = false;
  }

  player.vy = Math.min(player.vy + 0.58, 18);
  player.x += player.vx;
  player.y += player.vy;

  player.onGround = false;
  for (const p of platforms) {
    if (
      player.x + player.w > p.x &&
      player.x             < p.x + p.w &&
      player.y + player.h  > p.y &&
      player.y + player.h  < p.y + p.h + 22 &&
      player.vy >= 0
    ) {
      player.y        = p.y - player.h;
      player.vy       = 0;
      player.onGround = true;
    }
  }

  if (!wasOnGround && player.onGround) {
    player.landTimer = 120;
    if (Math.abs(player.vy) > 6) triggerShake(4, 160);
  }

  if (player.x < 0) player.x = 0;
  if (player.y > H + 200) {
    player.y  = GROUND_Y - player.h;
    player.vy = 0;
    player.hp = Math.max(1, player.hp - 20);
    triggerDamageFlash();
    triggerShake(8, 300);
  }

  cameraX = Math.max(0, player.x - W/3);

  // Weapon pickup (safe call)
  if (typeof checkWeaponPickup === 'function') checkWeaponPickup(player, keys);

  // Secrets
  for (const s of secrets) {
    if (s.collected) continue;
    if (Math.hypot(player.x - s.x, player.y - s.y) < 28) {
      s.collected = true;
      run.secrets++;
      addStyle(300, 'SECRET!');
      showSecretBanner(s.label);
    }
  }

  // Genius puddles
  for (let i = geniusPuddles.length-1; i >= 0; i--) {
    const pd = geniusPuddles[i];
    if (Math.hypot(player.x - pd.x, player.y - pd.y) < 32) {
      player.hp    = Math.min(player.maxHp, player.hp + pd.healAmt);
      player.genius = Math.min(100, player.genius + 15);
      spawnGeniusParticles(14);
      geniusPuddles.splice(i, 1);
      showStyleFlash(`+${pd.healAmt} HP (GENIUS)`);
    }
  }

  // Enemy proximity
  for (const e of worldEnemies) {
    if (e.defeated) continue;
    if (Math.abs(player.x - e.wx) < 48 && Math.abs(player.y - e.wy) < 60) {
      if (typeof triggerBattle === 'function') triggerBattle(e);
      return;
    }
  }

  // Boss zone
  if (player.x >= 1920 && !window._bossDefeated) {
    document.getElementById('hud-boss-warning').style.display = 'block';
  }
  if (player.x >= 2050 && !window._bossDefeated) {
    if (typeof triggerBossFight === 'function') triggerBossFight();
  }

  updatePlayerAnim();

  const wd = document.getElementById('weapon-display');
  if (wd) wd.textContent = window.equippedWeapon
    ? window.equippedWeapon.name.toUpperCase()
    : '— NO WEAPON —';
}

// ── Draw world ─────────────────────────────────────────────────────────
function drawWorld() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (window.bossPhase2Active) {
    sky.addColorStop(0, '#100003');
    sky.addColorStop(1, '#1a0005');
  } else {
    sky.addColorStop(0, '#030008');
    sky.addColorStop(1, '#0e0004');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 90; i++) {
    const sx = ((i*149+30) % 2400 - cameraX*0.12 + 2400) % W;
    const sy = (i*113) % (H*0.75);
    ctx.fillStyle = `rgba(212,197,169,${0.15+0.4*((i%3)/3)})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Background pillars
  ctx.save();
  ctx.globalAlpha = window.bossPhase2Active ? 0.04 : 0.06;
  ctx.fillStyle   = window.bossPhase2Active ? '#cc0000' : '#c9a84c';
  const bgX = 800 - cameraX*0.05;
  [[0,30,10,50],[220,20,10,60],[440,35,10,45],[660,15,10,65],[880,28,10,52]].forEach(
    ([ox,yoff,w,h]) => ctx.fillRect(bgX+ox, H*0.4+yoff-h, w, h)
  );
  ctx.restore();

  // Platforms
  for (const p of platforms) {
    const px = p.x - cameraX;
    if (px > W+100 || px+p.w < -100) continue;
    const ground = p.h > 20;
    if (ground) {
      const grd = ctx.createLinearGradient(0, p.y, 0, p.y+p.h);
      grd.addColorStop(0, '#160808'); grd.addColorStop(1, '#080303');
      ctx.fillStyle = grd;
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = '#2a1010';
      ctx.fillRect(px, p.y, p.w, 2);
    } else {
      ctx.fillStyle = p.secret ? '#1a1020' : '#1e0e0e';
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = p.secret ? '#6644aa' : '#3a1818';
      ctx.fillRect(px, p.y, p.w, 2);
      if (p.secret) {
        ctx.save();
        ctx.globalAlpha = 0.12 + 0.08*Math.sin(Date.now()*0.003);
        ctx.fillStyle = '#aa66ff';
        ctx.fillRect(px-4, p.y-4, p.w+8, p.h+8);
        ctx.restore();
      }
    }
  }

  // Secrets
  for (const s of secrets) {
    if (s.collected) continue;
    const sx  = s.x - cameraX;
    const bob = Math.sin(Date.now()*0.003 + s.x)*4;
    ctx.save();
    ctx.shadowBlur = 16; ctx.shadowColor = '#aa66ff';
    ctx.fillStyle  = '#cc88ff';
    ctx.beginPath();
    ctx.moveTo(sx, s.y-10+bob); ctx.lineTo(sx+7, s.y+bob);
    ctx.lineTo(sx, s.y+10+bob); ctx.lineTo(sx-7, s.y+bob);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Genius puddles
  for (const pd of geniusPuddles) {
    const px = pd.x - cameraX;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.2*Math.sin(Date.now()*0.004+pd.x);
    ctx.shadowBlur  = 12; ctx.shadowColor = '#00ccff';
    ctx.fillStyle   = '#0088cc';
    ctx.beginPath();
    ctx.ellipse(px, pd.y, pd.radius, pd.radius*0.4, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Draw enemies ───────────────────────────────────────────────────────
function drawEnemiesWorld() {
  for (const e of worldEnemies) {
    if (e.defeated) continue;
    const ex = e.wx - cameraX;
    if (ex < -60 || ex > W+60) continue;
    const bob = e.type==='flying' ? Math.sin(Date.now()*0.003+e.id)*5 : 0;
    ctx.save();
    ctx.translate(ex, e.wy+bob);
    if (e.name==='SEEKER') drawSeekerWorld(ctx);
    else drawDepthWorld(ctx);
    ctx.restore();
    const dist = Math.abs(player.x - e.wx);
    if (dist < 130) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5*Math.sin(Date.now()*0.012);
      ctx.fillStyle   = '#ff2200';
      ctx.font        = '9px "Press Start 2P", monospace';
      ctx.textAlign   = 'center';
      ctx.fillText('!', ex, e.wy-16+bob);
      ctx.restore();
    }
  }
}

function drawSeekerWorld(c) {
  c.scale(1.3,1.3);
  c.fillStyle='#ccc8c0'; c.beginPath(); c.ellipse(0,0,11,8,0,0,Math.PI*2); c.fill();
  c.fillStyle='#aa0000'; c.beginPath(); c.arc(0,0,5,0,Math.PI*2); c.fill();
  c.shadowBlur=12; c.shadowColor='#ff0000';
  c.fillStyle='#ff4444'; c.beginPath(); c.arc(0,0,2.5,0,Math.PI*2); c.fill();
  c.shadowBlur=0;
}

function drawDepthWorld(c) {
  c.fillStyle='#222232'; c.fillRect(-7,-13,14,17);
  c.fillStyle='#181828'; c.fillRect(-6,-19,12,8);
  c.fillStyle='#7a0000'; c.fillRect(-4,-17,8,4);
  c.fillStyle='#333344'; c.fillRect(-11,-11,4,8); c.fillRect(7,-11,4,8);
  c.fillStyle='#181828'; c.fillRect(-6,4,5,8); c.fillRect(1,4,5,8);
}

// ── Draw player ────────────────────────────────────────────────────────
function drawPlayer() {
  const px = player.x - cameraX + shake.x;
  const py = player.y + shake.y;
  const f  = player.facing;
  const t  = Date.now();
  const lc = player.legCycle;
  const st = player.state;

  ctx.save();
  ctx.translate(px + player.w/2, py + player.h/2);
  ctx.scale(f, 1);

  let scaleX=1, scaleY=1;
  if (st==='jump') { scaleX=0.82; scaleY=1.22; }
  if (st==='fall') { scaleX=1.12; scaleY=0.88; }
  if (st==='land') {
    const squash = Math.min(player.landTimer/120, 1);
    scaleX = 1 + squash*0.25; scaleY = 1 - squash*0.22;
  }
  ctx.scale(scaleX, scaleY);

  const h2 = player.h/2;
  const leg1Angle = st==='run' ? Math.sin(lc)*0.55 : 0;
  const leg2Angle = st==='run' ? Math.sin(lc+Math.PI)*0.55 : 0;

  ctx.fillStyle = '#4a5a6f';
  ctx.save();
  ctx.translate(-5, h2-14); ctx.rotate(leg1Angle);
  ctx.fillRect(-3,0,6,10);
  ctx.translate(0,10); ctx.rotate(Math.abs(leg1Angle)*0.5);
  ctx.fillStyle='#3a4a5e'; ctx.fillRect(-2.5,0,5,9);
  ctx.fillStyle='#2a3a4e'; ctx.fillRect(-3,8,7,3);
  ctx.restore();

  ctx.fillStyle='#4a5a6f';
  ctx.save();
  ctx.translate(5, h2-14); ctx.rotate(leg2Angle);
  ctx.fillRect(-3,0,6,10);
  ctx.translate(0,10); ctx.rotate(-Math.abs(leg2Angle)*0.5);
  ctx.fillStyle='#3a4a5e'; ctx.fillRect(-2.5,0,5,9);
  ctx.fillStyle='#2a3a4e'; ctx.fillRect(-4,8,7,3);
  ctx.restore();

  ctx.fillStyle='#7a8ba0'; ctx.fillRect(-10,-h2+6,20,18);
  ctx.fillStyle='#b0bcc8'; ctx.fillRect(-7,-h2+8,14,10);

  const pulse = 0.5 + 0.5*Math.sin(t*(st==='run'?0.012:0.005));
  ctx.fillStyle = `rgba(255,${100+pulse*80},0,${0.6+pulse*0.4})`;
  ctx.shadowBlur=14; ctx.shadowColor='#ff6600';
  ctx.beginPath(); ctx.arc(0,-h2+14,3.5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;

  ctx.fillStyle='#5a6a7f';
  ctx.fillRect(-10,-h2+8,3,18); ctx.fillRect(7,-h2+8,3,18);

  const armSwing = st==='run' ? Math.sin(lc+Math.PI)*0.4 : 0;
  ctx.save();
  ctx.translate(10,-h2+10); ctx.rotate(armSwing);
  ctx.fillStyle='#6a7a8f'; ctx.fillRect(0,-2,10,7);
  if (window.equippedWeapon) {
    ctx.fillStyle='#00e5ff'; ctx.shadowBlur=8; ctx.shadowColor='#00e5ff';
    ctx.fillRect(8,0,8,4); ctx.shadowBlur=0;
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-10,-h2+10); ctx.rotate(-armSwing);
  ctx.fillStyle='#6a7a8f'; ctx.fillRect(-10,-2,10,7);
  ctx.restore();

  const headBob = st==='run' ? Math.sin(lc*2)*1.5 : 0;
  ctx.save();
  ctx.translate(0, headBob);
  ctx.fillStyle='#5a6a7f'; ctx.fillRect(-7,-h2-8,14,13);
  const visorColor = window.inBattle ? '#ff4400' : '#00e5ff';
  ctx.fillStyle=visorColor; ctx.shadowBlur=10; ctx.shadowColor=visorColor;
  ctx.fillRect(-6,-h2-5,12,4); ctx.shadowBlur=0;
  ctx.fillStyle='#3a4a5f'; ctx.fillRect(-7,-h2-8,14,2);
  ctx.fillRect(-8,-h2-4,2,4); ctx.fillRect(6,-h2-4,2,4);
  if (st!=='jump' && st!=='fall') {
    ctx.fillStyle='#8a9ab0'; ctx.fillRect(-1,-h2-14,2,8);
    ctx.fillStyle='#00e5ff'; ctx.shadowBlur=6; ctx.shadowColor='#00e5ff';
    ctx.beginPath(); ctx.arc(0,-h2-15,2.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }
  ctx.restore();

  if (st==='jump' || st==='fall') {
    ctx.save();
    ctx.globalAlpha = st==='jump' ? 0.8 : 0.3;
    ctx.shadowBlur=16; ctx.shadowColor='#ff6600';
    ctx.fillStyle='#ff4400';
    ctx.beginPath(); ctx.moveTo(-6,h2-4); ctx.lineTo(-8,h2+10+Math.random()*6); ctx.lineTo(-2,h2-4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6,h2-4);  ctx.lineTo(8,h2+10+Math.random()*6);  ctx.lineTo(2,h2-4);  ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ── HUD ────────────────────────────────────────────────────────────────
function updateHUD() {
  const pct = (player.hp/player.maxHp)*100;
  document.getElementById('hp-bar').style.width  = pct+'%';
  document.getElementById('hp-text').textContent = `${player.hp} / ${player.maxHp}`;
  document.getElementById('genius-bar').style.width = player.genius+'%';
  updateLiveStats();
}

// ── Secret banner ──────────────────────────────────────────────────────
function showSecretBanner(label) {
  let el = document.getElementById('secret-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'secret-banner';
    el.style.cssText = `position:fixed;top:50%;left:50%;
      transform:translate(-50%,-50%);z-index:50;text-align:center;
      pointer-events:none;font-family:'Press Start 2P',monospace;
      transition:opacity 0.6s ease;`;
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div style="font-size:0.42rem;letter-spacing:0.4em;color:#666;margin-bottom:6px;">SECRET FOUND</div>
    <div style="font-size:clamp(0.8rem,3vw,1.2rem);color:#cc88ff;
      text-shadow:0 0 20px #aa66ff;letter-spacing:0.2em;">${label}</div>`;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.style.opacity='0'; }, 2500);
}

// ── End screen ─────────────────────────────────────────────────────────
async function showEndScreen() {
  stopTimer();
  const ms = run.elapsedMs;
  const kr = killsRank(run.kills);
  const sr = styleRank(run.stylePoints);
  const tr = timeRank(ms);
  const fr = finalRank(kr,sr,tr);

  document.getElementById('end-time').textContent    = formatTime(ms);
  document.getElementById('end-kills').textContent   = run.kills;
  document.getElementById('end-style').textContent   = run.stylePoints;
  document.getElementById('end-secrets').textContent = `${run.secrets} / ${run.totalSecrets}`;

  ['time','kills','style'].forEach((k,i) => {
    const r  = [tr,kr,sr][i];
    const el = document.getElementById(`end-${k}-rank`);
    el.textContent      = r;
    el.style.color      = rankColor(r);
    el.style.textShadow = rankShadow(r);
  });

  const frEl = document.getElementById('end-final-rank');
  frEl.textContent      = fr;
  frEl.style.color      = rankColor(fr);
  frEl.style.textShadow = rankShadow(fr);

  const bonuses = [];
  if (run.noRestarts)  bonuses.push('+ NO RESTARTS (+500 STYLE)');
  if (run.parries > 0) bonuses.push(`+ ${run.parries} PARRIES (+${run.parries*150} STYLE)`);
  if (run.crits > 0)   bonuses.push(`+ ${run.crits} CRITS (+${run.crits*80} STYLE)`);
  if (run.secrets > 0) bonuses.push(`+ ${run.secrets} SECRETS`);
  document.getElementById('end-bonuses').textContent = bonuses.join('\n');

  document.getElementById('end-screen').classList.remove('hidden');

  // Save best run locally
  const existing  = JSON.parse(localStorage.getItem('de_run_e1_1')||'null');
  const isNewBest = !existing
    || RANK_ORDER.indexOf(fr) > RANK_ORDER.indexOf(existing.rank)
    || ms < existing.timeMs;
  if (isNewBest) {
    localStorage.setItem('de_run_e1_1', JSON.stringify({
      rank:fr, timeMs:ms, timeStr:formatTime(ms),
      kills:run.kills, style:run.stylePoints
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
      name:      (profile.displayname||profile.nickname||'UNKNOWN').substring(0,16),
      rank, timeMs:ms, timeStr:formatTime(ms),
      kills:run.kills, style:run.stylePoints,
      secrets:run.secrets, timestamp:Date.now(),
    });
  } catch(err) { console.warn('Firebase save:', err); }
}

async function loadLeaderboard() {
  const el = document.getElementById('lb-entries');
  if (!window._firebaseReady) { el.textContent='OFFLINE MODE'; return; }
  try {
    const col  = window._fsCollection(window._db, 'runs_e1');
    const q    = window._fsQuery(col, window._fsOrderBy('timeMs','asc'), window._fsLimit(5));
    const snap = await window._fsGetDocs(q);
    if (snap.empty) { el.textContent='NO RUNS YET'; return; }
    el.innerHTML = '';
    let i = 1;
    snap.forEach(doc => {
      const d   = doc.data();
      const row = document.createElement('div');
      row.className = 'lb-row';
      row.innerHTML = `
        <span class="lb-pos">#${i++}</span>
        <span class="lb-name">${(d.name||'???').toUpperCase()}</span>
        <span class="lb-rtime">${d.timeStr}</span>
        <span class="lb-rrank" style="color:${rankColor(d.rank)};text-shadow:${rankShadow(d.rank)}">${d.rank}</span>`;
      el.appendChild(row);
    });
  } catch(err) { el.textContent='COULD NOT LOAD'; }
}

function continueAfterEnd() {
  document.getElementById('end-screen').classList.add('hidden');
}

// ── Exposed globals ────────────────────────────────────────────────────
window.registerKill  = function(name) { run.kills++; addStyle(name==='DEPTH'?280:200, name+' DOWN'); };
window.registerCrit  = function()     { run.crits++;   addStyle(120, 'CRITICAL!'); };
window.registerParry = function()     { run.parries++;  addStyle(350, 'PARRY!'); };
window.showEndScreen     = showEndScreen;
window.continueAfterEnd  = continueAfterEnd;

// ── Main loop ──────────────────────────────────────────────────────────
function gameLoop() {
  updateShake();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  updatePlayer();
  drawWorld();
  drawEnemiesWorld();
  if (typeof drawWorldWeapons === 'function') drawWorldWeapons(ctx, cameraX);
  drawPlayer();
  updateDrawGeniusParticles();
  drawDamageFlash();

  ctx.restore();
  updateHUD();
  requestAnimationFrame(gameLoop);
}

gameLoop();
