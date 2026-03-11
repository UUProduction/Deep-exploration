const canvas = document.getElementById('lore-canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Stars + void background ─────────────────────────────────────
const stars = Array.from({ length: 200 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 1.2 + 0.2,
  flicker: Math.random()
}));

let tick = 0;
function drawBg() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  stars.forEach(s => {
    const alpha = 0.3 + 0.4 * Math.sin(tick * 0.02 + s.flicker * 10);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#d4c5a9';
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Broken halo effect in center top — dead god imagery
  const cx = W / 2, cy = H * 0.28;
  const haloGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, 220);
  haloGrad.addColorStop(0, 'rgba(201,168,76,0.05)');
  haloGrad.addColorStop(0.4, 'rgba(139,0,0,0.06)');
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 220, 0, Math.PI * 2);
  ctx.fill();

  // Broken circle arc (cracked halo)
  ctx.save();
  ctx.strokeStyle = `rgba(201,168,76,${0.12 + 0.06 * Math.sin(tick * 0.015)})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([18, 8, 6, 12]);
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  tick++;
  requestAnimationFrame(drawBg);
}
drawBg();

// ── Lore lines ──────────────────────────────────────────────────
const loreLines = [
  "In the beginning, there was God.",
  "God built everything. The stars. The void between them. Life.",
  "Then one day...",
  "God left.",
  "No warning. No reason. No goodbye.",
  "Heaven went silent. Then dark. Then cold.",
  "The angels fell. The souls scattered like ash.",
  "Only Hell remained.",
  "Hell did not celebrate. Hell simply... continued.",
  "Because Hell was always alive. It never needed God.",
  "From the wreckage of Heaven, something was built.",
  "Not born. BUILT.",
  "A machine. Steel bones. A mind forged from scripture and static.",
  "You.",
  "Unit designation: unknown. Purpose: find out why God left.",
  "True purpose: take the throne before something worse does.",
  "The void is watching.",
  "Descend.",
];

const loreEl = document.getElementById('lore-line');
let lineIndex = 0;
let charIndex = 0;
let typing = false;
let typeInterval = null;

function typeLine(line) {
  loreEl.textContent = '';
  charIndex = 0;
  typing = true;
  clearInterval(typeInterval);
  typeInterval = setInterval(() => {
    loreEl.textContent += line[charIndex];
    charIndex++;
    if (charIndex >= line.length) {
      clearInterval(typeInterval);
      typing = false;
    }
  }, 32);
}

function advance() {
  if (typing) {
    // Skip typing animation, show full line
    clearInterval(typeInterval);
    typing = false;
    loreEl.textContent = loreLines[lineIndex - 1];
    return;
  }
  if (lineIndex >= loreLines.length) {
    // Done — go to game
    document.getElementById('lore-text-box').style.opacity = '0';
    document.getElementById('lore-text-box').style.transition = 'opacity 1s ease';
    setTimeout(() => { window.location.href = 'game.html'; }, 1200);
    return;
  }
  typeLine(loreLines[lineIndex]);
  lineIndex++;
}

// Start first line
advance();

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.key === 'Enter') advance();
});
document.addEventListener('click', advance);
document.addEventListener('touchstart', advance);
