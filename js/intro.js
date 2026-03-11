// ── Scene Manager ──────────────────────────────────────────────
const sceneUUP   = document.getElementById('scene-uup');
const sceneTitle = document.getElementById('scene-title');
const pressStart = document.getElementById('press-start');

// Show UUP first, then transition to title after 4s
sceneUUP.classList.add('active');

setTimeout(() => {
  sceneUUP.classList.remove('active');
  setTimeout(() => {
    sceneTitle.classList.add('active');
    startBgCanvas();
  }, 800);
}, 4000);

// ── Proceed to auth on Enter / tap ─────────────────────────────
let canProceed = false;
setTimeout(() => { canProceed = true; }, 5500);

function proceed() {
  if (!canProceed) return;
  sceneTitle.style.transition = 'opacity 1.2s ease';
  sceneTitle.style.opacity = '0';
  setTimeout(() => {
    window.location.href = 'auth.html';
  }, 1200);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') proceed();
});
document.addEventListener('click', proceed);
document.addEventListener('touchstart', proceed);

// ── Background Canvas: falling ember particles ─────────────────
function startBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.5 + 0.5,
    speed: Math.random() * 0.6 + 0.2,
    opacity: Math.random(),
    drift: (Math.random() - 0.5) * 0.4,
    color: Math.random() > 0.5 ? '#ff4500' : '#8b0000',
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep void radial gradient background
    const grad = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 0,
      canvas.width/2, canvas.height/2, canvas.width * 0.8
    );
    grad.addColorStop(0, '#0d0005');
    grad.addColorStop(1, '#050508');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Embers
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.7;
      ctx.fillStyle   = p.color;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.y -= p.speed;
      p.x += p.drift;
      p.opacity += (Math.random() - 0.5) * 0.04;
      p.opacity  = Math.max(0.1, Math.min(1, p.opacity));

      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}
