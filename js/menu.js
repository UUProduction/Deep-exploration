// ── Auth gate ────────────────────────────────────────────────────
const profile = JSON.parse(localStorage.getItem('de_profile') || 'null');
if (!profile || !localStorage.getItem('de_loggedin')) {
  window.location.href = 'auth.html';
}

// Show username
document.getElementById('footer-user').textContent =
  'UNIT: ' + (profile?.displayname || profile?.nickname || 'UNKNOWN').toUpperCase();

// ── Scanline / grain canvas ──────────────────────────────────────
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');

function resizeBg() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener('resize', resizeBg);

function drawScanlines() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgCtx.fillStyle = 'rgba(0,0,0,0.92)';
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

  // Scanlines
  for (let y = 0; y < bgCanvas.height; y += 3) {
    bgCtx.fillStyle = 'rgba(0,0,0,0.18)';
    bgCtx.fillRect(0, y, bgCanvas.width, 1);
  }

  // Subtle vignette
  const vig = bgCtx.createRadialGradient(
    bgCanvas.width/2, bgCanvas.height/2, bgCanvas.height * 0.2,
    bgCanvas.width/2, bgCanvas.height/2, bgCanvas.width * 0.8
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.7)');
  bgCtx.fillStyle = vig;
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  requestAnimationFrame(drawScanlines);
}
drawScanlines();

// ── Scrolling code background ────────────────────────────────────
const codeLines = [
  '#INCLUDE { above, so } FROM "dHJpc21Z2|zdHVz";',
  '#INCLUDE { permutation, transmutation } FROM "cHJpbmNpCGxI"',
  'void* below = allocate(above);',
  'void* ready = DE_INIT(system, calibration);',
  'void* destiny = PRO_INST(x, fire);',
  'typedef matter(form) UNDER(soul);',
  'struct branch { leaf = matter(blood); };',
  'SYSTEM UNIT_01 INITIALIZED',
  'DIAGNOSTICS...OK',
  'STANDBY — WAIT FOR WAKE',
  '#INCLUDE { void, silence } FROM "aGVhdmVu"',
  'typedef god = NULL;',
  'struct heaven { state: ABANDONED; souls: 0; };',
  'while (hell.alive) { continue; }',
  'UNIT_01.purpose = ASCEND_TO_THRONE;',
  'WEAPONS_SYSTEM...OK',
  'LOCOMOTION_SYSTEM...OK',
  'COGNITION_SYSTEM...PARTIAL',
  'void* god = findGod(); // returns NULL',
  'if (god == NULL) { claimThrone(); }',
  '#INCLUDE { darkness, genius } FROM "deep"',
  'GENIUS_ABSORPTION_SYSTEM...OK',
  'PARRY_REFLEX_SYSTEM...OK',
  'BATTLE_PROTOCOL...LOADED',
  'struct enemy { type: SEEKER; hp: 80; drops: GENIUS; };',
  'struct enemy { type: DEPTH; hp: 120; attack: DASH; };',
  'boss.phase = 1; // will increase',
  'ENTITY_BOSS.status = ACTIVE;',
  'run.timer = START_ON_MOVE;',
  'rank.threshold.P = { kills:6, style:3000, time:90000 };',
];

let codeScrollY = 0;
const codeEl = document.getElementById('code-scroll');
let codeContent = '';

// Build a long repeating block
for (let i = 0; i < 6; i++) {
  codeContent += codeLines.map(l => l + '\n').join('');
}
codeEl.textContent = codeContent;

setInterval(() => {
  codeScrollY += 1;
  codeEl.style.transform = `translateY(-${codeScrollY % 800}px)`;
}, 40);

// ── Boot status lines ────────────────────────────────────────────
const bootSequence = [
  { el: 'sl1', text: 'SYSTEM UNIT_01 INITIALIZED',   cls: 'status-boot', delay: 400  },
  { el: 'sl2', text: 'DIAGNOSTICS...OK',              cls: 'status-ok',   delay: 900  },
  { el: 'sl3', text: 'WEAPONS SYSTEM...OK',           cls: 'status-ok',   delay: 1400 },
  { el: 'sl4', text: 'STANDBY — AWAITING COMMAND',   cls: 'status-warn', delay: 2000 },
];

bootSequence.forEach(({ el, text, cls, delay }) => {
  setTimeout(() => {
    const node = document.getElementById(el);
    node.textContent = text;
    node.classList.add(cls);
  }, delay);
});

// ── Robot canvas draw ─────────────────────────────────────────────
const rc  = document.getElementById('robot-canvas');
const rctx = rc.getContext('2d');
const RW  = rc.width;
const RH  = rc.height;

// All drawing in white on black — schematic style
rctx.fillStyle = '#000';
rctx.fillRect(0, 0, RW, RH);

function line(x1, y1, x2, y2, alpha = 1, w = 1) {
  rctx.save();
  rctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  rctx.lineWidth   = w;
  rctx.beginPath();
  rctx.moveTo(x1, y1);
  rctx.lineTo(x2, y2);
  rctx.stroke();
  rctx.restore();
}

function box(x, y, w, h, alpha = 1, lw = 1) {
  rctx.save();
  rctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  rctx.lineWidth   = lw;
  rctx.strokeRect(x, y, w, h);
  rctx.restore();
}

function fillBox(x, y, w, h, alpha = 0.06) {
  rctx.save();
  rctx.fillStyle = `rgba(255,255,255,${alpha})`;
  rctx.fillRect(x, y, w, h);
  rctx.restore();
}

function circle(x, y, r, alpha = 1, lw = 1) {
  rctx.save();
  rctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  rctx.lineWidth   = lw;
  rctx.beginPath();
  rctx.arc(x, y, r, 0, Math.PI * 2);
  rctx.stroke();
  rctx.restore();
}

function dot(x, y, r = 2, alpha = 1) {
  rctx.save();
  rctx.fillStyle = `rgba(255,255,255,${alpha})`;
  rctx.beginPath();
  rctx.arc(x, y, r, 0, Math.PI * 2);
  rctx.fill();
  rctx.restore();
}

function drawRobot() {
  const cx = RW / 2;

  // ── HEAD ─────────────────────────────────────────────────────
  // Outer helmet box
  box(cx-38, 60, 76, 58, 1, 1.5);
  fillBox(cx-38, 60, 76, 58, 0.04);
  // Visor slit
  box(cx-28, 76, 56, 14, 0.9, 1);
  fillBox(cx-28, 76, 56, 14, 0.12);
  // Visor inner lines
  line(cx-28, 83, cx+28, 83, 0.3);
  // Eye dots
  dot(cx-14, 83, 3, 1);
  dot(cx+14, 83, 3, 1);
  // Head top detail
  line(cx-20, 60, cx-20, 50, 0.5);
  line(cx+20, 60, cx+20, 50, 0.5);
  line(cx-20, 50, cx+20, 50, 0.5);
  dot(cx-20, 50, 2, 0.8);
  dot(cx+20, 50, 2, 0.8);
  dot(cx, 50, 2, 0.4);
  // Antenna
  line(cx, 60, cx, 36, 0.6);
  dot(cx, 34, 4, 0.9);
  circle(cx, 34, 7, 0.3);
  // Chin detail
  line(cx-38, 104, cx-28, 118, 0.5);
  line(cx+38, 104, cx+28, 118, 0.5);
  // Ear plates
  box(cx-52, 68, 14, 28, 0.7);
  fillBox(cx-52, 68, 14, 28, 0.05);
  box(cx+38, 68, 14, 28, 0.7);
  fillBox(cx+38, 68, 14, 28, 0.05);
  // Ear detail lines
  line(cx-52, 76, cx-38, 76, 0.4);
  line(cx-52, 84, cx-38, 84, 0.4);
  line(cx+38, 76, cx+52, 76, 0.4);
  line(cx+38, 84, cx+52, 84, 0.4);

  // ── NECK ────────────────────────────────────────────────────
  box(cx-14, 118, 28, 18, 0.7);
  line(cx-8, 118, cx-8, 136, 0.3);
  line(cx+8, 118, cx+8, 136, 0.3);
  line(cx, 118, cx, 136, 0.15);

  // ── TORSO ───────────────────────────────────────────────────
  // Main chest
  box(cx-58, 136, 116, 100, 1, 1.5);
  fillBox(cx-58, 136, 116, 100, 0.04);
  // Chest center panel
  box(cx-32, 148, 64, 56, 0.8);
  fillBox(cx-32, 148, 64, 56, 0.06);
  // Core circle
  circle(cx, 176, 18, 1, 1.5);
  circle(cx, 176, 12, 0.6);
  circle(cx, 176, 6,  0.4);
  dot(cx, 176, 3, 1);
  // Core cross lines
  line(cx-18, 176, cx+18, 176, 0.35);
  line(cx, 158, cx, 194, 0.35);
  // Chest panel details
  line(cx-32, 165, cx+32, 165, 0.3);
  line(cx-32, 192, cx+32, 192, 0.3);
  // Side chest vents
  for (let i = 0; i < 4; i++) {
    line(cx-58, 150 + i*10, cx-45, 150 + i*10, 0.5);
    line(cx+45, 150 + i*10, cx+58, 150 + i*10, 0.5);
  }
  // Abdominal segments
  box(cx-40, 236, 80, 18, 0.7);
  box(cx-38, 254, 76, 16, 0.6);
  // Segment lines
  for (let i = 0; i < 5; i++) {
    line(cx-40 + i*16, 236, cx-40 + i*16, 270, 0.2);
  }
  // Collar
  box(cx-58, 136, 116, 14, 0.8);
  fillBox(cx-58, 136, 116, 14, 0.08);
  // Collar bolts
  dot(cx-48, 143, 3, 0.9);
  dot(cx+48, 143, 3, 0.9);
  dot(cx, 143, 3, 0.5);

  // ── LEFT SHOULDER + ARM ─────────────────────────────────────
  // Shoulder pauldron
  box(cx-102, 138, 44, 36, 0.9);
  fillBox(cx-102, 138, 44, 36, 0.06);
  line(cx-102, 148, cx-58, 148, 0.4);
  line(cx-102, 158, cx-58, 158, 0.4);
  dot(cx-82, 138, 3, 0.8);
  dot(cx-82, 174, 3, 0.8);
  // Upper arm
  box(cx-96, 174, 32, 52, 0.8);
  fillBox(cx-96, 174, 32, 52, 0.04);
  line(cx-80, 174, cx-80, 226, 0.25);
  // Elbow joint
  circle(cx-80, 228, 10, 0.9);
  dot(cx-80, 228, 3, 1);
  line(cx-90, 228, cx-70, 228, 0.3);
  // Forearm
  box(cx-94, 238, 28, 56, 0.75);
  fillBox(cx-94, 238, 28, 56, 0.04);
  // Forearm vent lines
  for (let i = 0; i < 4; i++) {
    line(cx-94, 248 + i*10, cx-82, 248 + i*10, 0.35);
  }
  // Wrist
  box(cx-92, 294, 24, 12, 0.7);
  // Hand / weapon mount
  box(cx-98, 306, 36, 28, 0.8);
  fillBox(cx-98, 306, 36, 28, 0.05);
  // Barrel extending left
  line(cx-98, 314, cx-128, 314, 0.9, 2);
  line(cx-98, 322, cx-128, 322, 0.9, 2);
  line(cx-128, 310, cx-128, 326, 0.9);
  line(cx-138, 318, cx-128, 314, 0.6);
  line(cx-138, 318, cx-128, 322, 0.6);
  dot(cx-138, 318, 4, 1);
  // Scope detail
  box(cx-118, 306, 16, 8, 0.5);

  // ── RIGHT SHOULDER + ARM ─────────────────────────────────────
  // Shoulder pauldron
  box(cx+58, 138, 44, 36, 0.9);
  fillBox(cx+58, 138, 44, 36, 0.06);
  line(cx+58, 148, cx+102, 148, 0.4);
  line(cx+58, 158, cx+102, 158, 0.4);
  dot(cx+82, 138, 3, 0.8);
  dot(cx+82, 174, 3, 0.8);
  // Upper arm
  box(cx+64, 174, 32, 52, 0.8);
  fillBox(cx+64, 174, 32, 52, 0.04);
  line(cx+80, 174, cx+80, 226, 0.25);
  // Elbow joint
  circle(cx+80, 228, 10, 0.9);
  dot(cx+80, 228, 3, 1);
  line(cx+70, 228, cx+90, 228, 0.3);
  // Forearm
  box(cx+66, 238, 28, 56, 0.75);
  // Forearm vent lines
  for (let i = 0; i < 4; i++) {
    line(cx+82, 248 + i*10, cx+94, 248 + i*10, 0.35);
  }
  // Wrist
  box(cx+68, 294, 24, 12, 0.7);
  // Hand — claw / open
  box(cx+62, 306, 36, 28, 0.8);
  fillBox(cx+62, 306, 36, 28, 0.05);
  // Fingers
  for (let i = 0; i < 4; i++) {
    line(cx+66 + i*8, 334, cx+64 + i*8, 354, 0.7);
    dot(cx+64 + i*8, 356, 2, 0.8);
  }

  // ── WAIST ────────────────────────────────────────────────────
  box(cx-36, 270, 72, 22, 0.7);
  fillBox(cx-36, 270, 72, 22, 0.05);
  line(cx-36, 281, cx+36, 281, 0.3);
  // Hip bolts
  dot(cx-30, 276, 3, 0.8);
  dot(cx+30, 276, 3, 0.8);
  dot(cx-30, 286, 3, 0.8);
  dot(cx+30, 286, 3, 0.8);

  // ── LEFT LEG ─────────────────────────────────────────────────
  // Hip socket
  circle(cx-28, 296, 12, 0.9);
  dot(cx-28, 296, 4, 1);
  // Thigh
  box(cx-48, 308, 36, 72, 0.85);
  fillBox(cx-48, 308, 36, 72, 0.04);
  line(cx-30, 308, cx-30, 380, 0.2);
  // Thigh armor ridge
  line(cx-48, 330, cx-12, 330, 0.4);
  line(cx-48, 350, cx-12, 350, 0.4);
  // Knee joint
  box(cx-50, 380, 40, 22, 0.8);
  fillBox(cx-50, 380, 40, 22, 0.07);
  circle(cx-30, 391, 8, 0.7);
  dot(cx-30, 391, 3, 0.9);
  // Shin
  box(cx-46, 402, 32, 80, 0.8);
  fillBox(cx-46, 402, 32, 80, 0.04);
  // Shin detail lines
  for (let i = 0; i < 5; i++) {
    line(cx-46, 414 + i*12, cx-34, 414 + i*12, 0.3);
  }
  // Ankle
  box(cx-44, 482, 28, 14, 0.7);
  // Boot
  box(cx-50, 496, 44, 22, 0.85);
  fillBox(cx-50, 496, 44, 22, 0.06);
  line(cx-50, 504, cx-6, 504, 0.4);
  // Toe
  box(cx-54, 518, 20, 10, 0.7);

  // ── RIGHT LEG ────────────────────────────────────────────────
  circle(cx+28, 296, 12, 0.9);
  dot(cx+28, 296, 4, 1);
  box(cx+12, 308, 36, 72, 0.85);
  fillBox(cx+12, 308, 36, 72, 0.04);
  line(cx+30, 308, cx+30, 380, 0.2);
  line(cx+12, 330, cx+48, 330, 0.4);
  line(cx+12, 350, cx+48, 350, 0.4);
  box(cx+10, 380, 40, 22, 0.8);
  fillBox(cx+10, 380, 40, 22, 0.07);
  circle(cx+30, 391, 8, 0.7);
  dot(cx+30, 391, 3, 0.9);
  box(cx+14, 402, 32, 80, 0.8);
  fillBox(cx+14, 402, 32, 80, 0.04);
  for (let i = 0; i < 5; i++) {
    line(cx+34, 414 + i*12, cx+46, 414 + i*12, 0.3);
  }
  box(cx+16, 482, 28, 14, 0.7);
  box(cx+6,  496, 44, 22, 0.85);
  fillBox(cx+6, 496, 44, 22, 0.06);
  line(cx+6, 504, cx+50, 504, 0.4);
  box(cx+34, 518, 20, 10, 0.7);

  // ── ANNOTATION LINES (schematic style) ──────────────────────
  rctx.save();
  rctx.strokeStyle = 'rgba(255,255,255,0.12)';
  rctx.lineWidth   = 0.5;
  rctx.setLineDash([4, 6]);

  // Head annotation
  rctx.beginPath(); rctx.moveTo(cx+38, 75); rctx.lineTo(cx+110, 55); rctx.stroke();
  // Core annotation
  rctx.beginPath(); rctx.moveTo(cx+18, 176); rctx.lineTo(cx+110, 176); rctx.stroke();
  // Left weapon annotation
  rctx.beginPath(); rctx.moveTo(cx-98, 300); rctx.lineTo(cx-160, 275); rctx.stroke();
  // Knee annotation
  rctx.beginPath(); rctx.moveTo(cx-50, 391); rctx.lineTo(cx-120, 400); rctx.stroke();
  rctx.beginPath(); rctx.moveTo(cx+50, 391); rctx.lineTo(cx+120, 400); rctx.stroke();
  rctx.restore();

  // ── CROSS markers (like ULTRAKILL schematic X marks) ─────────
  function cross(x, y, s = 6, a = 0.4) {
    line(x-s, y-s, x+s, y+s, a);
    line(x+s, y-s, x-s, y+s, a);
  }
  cross(cx-128, 318, 8, 0.8);  // weapon tip
  cross(cx+80,  228, 6, 0.6);  // right elbow
  cross(cx-80,  228, 6, 0.6);  // left elbow
  cross(cx,     34,  5, 0.5);  // antenna tip
}

drawRobot();

// ── Robot annotation labels ──────────────────────────────────────
const labelData = [
  { text: 'VISUAL CORTEX MODULE\nSTATUS CHECK...OK',         top: '6%',  right: '6%',  delay: 2800 },
  { text: 'MATTER-ENERGY CONVERSION\nSYSTEM: OK',            top: '18%', right: '4%',  delay: 3100 },
  { text: 'WEAPONS MOUNT\nSTATUS CHECK...OK',                top: '44%', left:  '2%',  delay: 3400 },
  { text: 'CORE POWER MODULE\nOUTPUT: MAXIMUM',              top: '30%', right: '4%',  delay: 3000 },
  { text: 'LOCOMOTION SYSTEM\nFALL IMPACT: OK',              top: '70%', right: '5%',  delay: 3600 },
  { text: 'GENIUS ABSORPTION\nSYSTEM: ACTIVE',               top: '70%', left:  '2%',  delay: 3700 },
];

const labelsContainer = document.getElementById('robot-labels');
labelData.forEach(l => {
  const div = document.createElement('div');
  div.className = 'rlabel';
  div.style.top  = l.top;
  if (l.right) div.style.right = l.right;
  if (l.left)  div.style.left  = l.left;
  div.style.animationDelay = l.delay + 'ms';
  div.style.whiteSpace = 'pre-line';
  div.textContent = l.text;
  labelsContainer.appendChild(div);
});

// ── Menu navigation ──────────────────────────────────────────────
function menuClick(href) {
  document.body.classList.add('flash-out');
  setTimeout(() => { window.location.href = href; }, 500);
}
window.menuClick = menuClick;
