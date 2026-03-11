// ── Auth gate ────────────────────────────────────────────────────
const profile = JSON.parse(localStorage.getItem('de_profile') || 'null');
if (!profile) window.location.href = 'auth.html';

document.getElementById('ls-unit').textContent =
  'UNIT: ' + (profile?.displayname || profile?.nickname || '???').toUpperCase();

// ── BG canvas ────────────────────────────────────────────────────
const bg  = document.getElementById('bg-canvas');
const bgc = bg.getContext('2d');
bg.width  = window.innerWidth;
bg.height = window.innerHeight;
window.addEventListener('resize', () => {
  bg.width  = window.innerWidth;
  bg.height = window.innerHeight;
});

(function drawBg() {
  bgc.fillStyle = '#080808';
  bgc.fillRect(0, 0, bg.width, bg.height);
  for (let y = 0; y < bg.height; y += 4) {
    bgc.fillStyle = 'rgba(0,0,0,0.22)';
    bgc.fillRect(0, y, bg.width, 1);
  }
  requestAnimationFrame(drawBg);
})();

// ── Load saved run data from localStorage ────────────────────────
const savedRun = JSON.parse(localStorage.getItem('de_run_e1_1') || 'null');

function rankColor(r) {
  const map = { D:'#555', C:'#aaa', B:'#4488ff', A:'#ff8800', S:'#ff2200', P:'#ffd700' };
  return map[r] || '#fff';
}

if (savedRun) {
  const rankEl   = document.getElementById('cfr-e1-1');
  const statusEl = document.getElementById('cstatus-e1-1');
  const pbEl     = document.getElementById('cpb-e1-1');

  rankEl.textContent    = savedRun.rank || '-';
  rankEl.style.color    = rankColor(savedRun.rank);
  statusEl.textContent  = savedRun.rank === 'P' ? '— P RANK —' : '— COMPLETE —';
  statusEl.style.color  = savedRun.rank === 'P' ? '#ffd700' : '#00cc66';
  pbEl.textContent      = savedRun.timeStr || '--:--:---';

  // Fill rank boxes based on rank value
  const rankOrder = ['D','C','B','A','S','P'];
  const rv  = rankOrder.indexOf(savedRun.rank);
  const boxes = document.querySelectorAll('#chapter-grid .chapter-card.active .rank-box');
  boxes.forEach((b, i) => {
    if (i <= rv) {
      b.style.background   = rankColor(savedRun.rank);
      b.style.borderColor  = rankColor(savedRun.rank);
      b.style.boxShadow    = `0 0 6px ${rankColor(savedRun.rank)}`;
    }
  });
}

// ── Preview canvas — draw E1-1 scene ────────────────────────────
const pc = document.getElementById('pc-e1-1');
const pctx = pc.getContext('2d');
const PW = pc.width, PH = pc.height;

function drawPreview() {
  // Void sky
  const sky = pctx.createLinearGradient(0, 0, 0, PH);
  sky.addColorStop(0, '#030008');
  sky.addColorStop(1, '#100005');
  pctx.fillStyle = sky;
  pctx.fillRect(0, 0, PW, PH);

  // Stars
  for (let i = 0; i < 30; i++) {
    pctx.fillStyle = `rgba(212,197,169,${0.3 + (i%3)*0.2})`;
    pctx.fillRect((i*73)%PW, (i*47)%(PH*0.6), 1, 1);
  }

  // Background pillars (ruined heaven)
  pctx.fillStyle = 'rgba(201,168,76,0.08)';
  [[30,30,10,50],[80,20,10,60],[130,35,10,45],[160,15,10,65],[190,28,10,52]].forEach(
    ([x,yoff,w,h]) => pctx.fillRect(x, PH*0.3+yoff-h, w, h)
  );

  // Ground
  pctx.fillStyle = '#120606';
  pctx.fillRect(0, PH*0.72, PW, PH*0.28);
  pctx.fillStyle = '#2a1010';
  pctx.fillRect(0, PH*0.72, PW, 2);

  // Platforms
  [[20, PH*0.58, 40, 4],
   [80, PH*0.50, 34, 4],
   [135, PH*0.44, 40, 4]].forEach(([x,y,w,h]) => {
    pctx.fillStyle = '#1e0e0e';
    pctx.fillRect(x, y, w, h);
    pctx.fillStyle = '#3a1818';
    pctx.fillRect(x, y, w, 1);
  });

  // Small player robot silhouette
  pctx.fillStyle = '#8a9bb0';
  pctx.fillRect(22, PH*0.58-12, 6, 10);
  pctx.fillStyle = '#00e5ff';
  pctx.fillRect(22, PH*0.58-10, 6, 2);

  // Enemy (seeker) floating
  pctx.save();
  pctx.fillStyle = '#ccc';
  const bob = Math.sin(Date.now()*0.003)*2;
  pctx.beginPath();
  pctx.ellipse(120, PH*0.45+bob, 8, 6, 0, 0, Math.PI*2);
  pctx.fill();
  pctx.fillStyle = '#cc0000';
  pctx.shadowBlur = 6;
  pctx.shadowColor = '#ff0000';
  pctx.beginPath();
  pctx.arc(120, PH*0.45+bob, 3, 0, Math.PI*2);
  pctx.fill();
  pctx.restore();

  requestAnimationFrame(drawPreview);
}
drawPreview();

// ── Start level ──────────────────────────────────────────────────
function startLevel(href) {
  document.getElementById('ls-wrap').style.opacity = '0';
  document.getElementById('ls-wrap').style.transition = 'opacity 0.5s ease';
  setTimeout(() => { window.location.href = href; }, 500);
}
window.startLevel = startLevel;
