// ── Weapon definitions ───────────────────────────────────────────
const WEAPONS = {
  VOID_PISTOL: {
    id: 'VOID_PISTOL',
    name: 'Void Pistol',
    description: 'Fast. Reliable. Born from the dark.',
    dmgBonus: 5,       // added to base question dmg
    critBonus: 0.10,   // +10% crit chance
    speedBonus: 1,     // extra question attempt per battle
    color: '#00e5ff',
    drawFn: drawVoidPistol,
  }
};

// Active weapon (null = fists)
let equippedWeapon = null;

// Weapons laying in the world — { wx, wy, weaponId, picked: false }
const worldWeapons = [
  { wx: 380,  wy: 490, weaponId: 'VOID_PISTOL', picked: false },
  { wx: 1100, wy: 340, weaponId: 'VOID_PISTOL', picked: false },
];

function drawVoidPistol(c, x, y, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Barrel
  c.fillStyle = '#00e5ff';
  c.shadowBlur = 10;
  c.shadowColor = '#00e5ff';
  c.fillRect(-14, -3, 22, 5);

  // Body
  c.fillStyle = '#0088aa';
  c.fillRect(-6, -6, 12, 10);

  // Handle
  c.fillStyle = '#005566';
  c.fillRect(-4, 4, 7, 8);

  // Void core glow
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
  c.fillStyle = `rgba(0,229,255,${pulse})`;
  c.beginPath();
  c.arc(-2, -1, 3, 0, Math.PI * 2);
  c.fill();

  c.shadowBlur = 0;
  c.restore();
}

// Draw weapons in world
function drawWorldWeapons(ctx, cameraX) {
  for (const w of worldWeapons) {
    if (w.picked) continue;
    const wx = w.wx - cameraX;
    const wy = w.wy;

    // Float bob
    const bob = Math.sin(Date.now() * 0.003 + w.wx) * 4;

    // Glow halo
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(Date.now() * 0.004);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00e5ff';
    ctx.beginPath();
    ctx.arc(wx, wy + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    WEAPONS[w.weaponId].drawFn(ctx, wx, wy + bob, 1.4);

    // Label
    ctx.save();
    ctx.fillStyle = '#00e5ff';
    ctx.font = '8px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VOID PISTOL', wx, wy + bob - 22);
    ctx.fillText('[E] PICK UP', wx, wy + bob - 12);
    ctx.restore();
  }
}

// Check pickup proximity
function checkWeaponPickup(player, keys) {
  for (const w of worldWeapons) {
    if (w.picked) continue;
    const dist = Math.hypot(player.x - w.wx, player.y - w.wy);
    if (dist < 55 && keys['KeyE']) {
      w.picked = true;
      equippedWeapon = WEAPONS[w.weaponId];
      showWeaponPickupBanner(equippedWeapon);
    }
  }
}

function showWeaponPickupBanner(weapon) {
  // Create banner DOM element
  let banner = document.getElementById('weapon-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'weapon-banner';
    banner.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      z-index:50; text-align:center; pointer-events:none;
      font-family:'Share Tech Mono',monospace;
      animation: weapon-slam 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
    `;
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div style="font-size:0.55rem;letter-spacing:0.5em;color:#555;margin-bottom:6px;">WEAPON ACQUIRED</div>
    <div style="font-size:clamp(1.2rem,4vw,2rem);color:#00e5ff;text-shadow:0 0 30px #00e5ff;letter-spacing:0.2em;">${weapon.name.toUpperCase()}</div>
    <div style="font-size:0.6rem;color:#666;margin-top:6px;letter-spacing:0.2em;">${weapon.description}</div>
  `;
  banner.style.display = 'block';
  setTimeout(() => { banner.style.display = 'none'; }, 2800);
}

window.equippedWeapon  = equippedWeapon;
window.drawWorldWeapons = drawWorldWeapons;
window.checkWeaponPickup = checkWeaponPickup;
window.WEAPONS = WEAPONS;
