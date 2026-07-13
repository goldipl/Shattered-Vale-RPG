// sprites.js — procedurally draws detailed layered sprites onto offscreen
// canvases so the main render loop can just blit images (fast + crisp).
// Each sprite sheet has 4 directional rows (down, left, right, up) x 4 walk frames.

const Sprites = {};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---------- Palette-swappable humanoid sprite builder ----------
function drawHumanoid(ctx, ox, oy, frame, dir, palette) {
  const bob = (frame === 1 || frame === 3) ? 1 : 0; // walk bounce
  const legOffset = frame % 2 === 0 ? 0 : (frame === 1 ? 2 : -2);
  const y = oy - bob;

  ctx.save();
  ctx.translate(ox, y);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(16, 30, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs (two small rectangles, offset for walk cycle)
  ctx.fillStyle = palette.pants;
  ctx.fillRect(10, 22 + Math.max(0, legOffset), 5, 7 - Math.max(0, legOffset));
  ctx.fillRect(17, 22 + Math.max(0, -legOffset), 5, 7 - Math.max(0, -legOffset));

  // boots
  ctx.fillStyle = palette.boots;
  ctx.fillRect(10, 27 + Math.max(0, legOffset), 5, 3);
  ctx.fillRect(17, 27 + Math.max(0, -legOffset), 5, 3);

  // torso
  ctx.fillStyle = palette.shirt;
  roundRect(ctx, 8, 12, 16, 12, 3);
  ctx.fill();

  // belt
  ctx.fillStyle = palette.belt;
  ctx.fillRect(8, 21, 16, 2);

  // arms (swing based on frame)
  const armSwing = frame === 1 ? -2 : frame === 3 ? 2 : 0;
  ctx.fillStyle = palette.shirt;
  if (dir !== 'left') ctx.fillRect(22, 13 + armSwing, 4, 9);
  if (dir !== 'right') ctx.fillRect(6, 13 - armSwing, 4, 9);
  ctx.fillStyle = palette.skin;
  if (dir !== 'left') ctx.fillRect(22, 20 + armSwing, 4, 3);
  if (dir !== 'right') ctx.fillRect(6, 20 - armSwing, 4, 3);

  // head
  ctx.fillStyle = palette.skin;
  roundRect(ctx, 9, 2, 14, 12, 4);
  ctx.fill();

  // hair
  ctx.fillStyle = palette.hair;
  if (dir === 'up') {
    roundRect(ctx, 9, 1, 14, 8, 4);
    ctx.fill();
  } else {
    roundRect(ctx, 8, 1, 16, 6, 4);
    ctx.fill();
    ctx.fillRect(8, 4, 3, 6);
    ctx.fillRect(21, 4, 3, 6);
  }

  // face (eyes) — only when facing down/left/right
  if (dir === 'down') {
    ctx.fillStyle = palette.eyes;
    ctx.fillRect(12, 8, 2, 2);
    ctx.fillRect(18, 8, 2, 2);
  } else if (dir === 'left') {
    ctx.fillStyle = palette.eyes;
    ctx.fillRect(11, 8, 2, 2);
  } else if (dir === 'right') {
    ctx.fillStyle = palette.eyes;
    ctx.fillRect(19, 8, 2, 2);
  }

  ctx.restore();
}

function buildHumanoidSheet(palette, weapon) {
  const FW = 32, FH = 34;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      drawHumanoid(ctx, 0, 0, frame, dir, palette);
      if (weapon) weapon(ctx, dir, frame);
      ctx.restore();
    }
  });
  return sheet;
}

function drawSword(ctx, dir, frame) {
  ctx.fillStyle = '#d8d4c8';
  ctx.strokeStyle = '#3c3428';
  ctx.lineWidth = 0.5;
  const swing = frame === 2 ? 4 : 0;
  ctx.save();
  if (dir === 'right' || dir === 'down') {
    ctx.translate(24 + swing, 14);
    ctx.rotate(0.5);
  } else if (dir === 'left') {
    ctx.translate(4 - swing, 14);
    ctx.rotate(-0.5);
  } else {
    ctx.translate(20, 6);
    ctx.rotate(-2.4);
  }
  ctx.fillRect(-1, -10, 2, 12);
  ctx.fillStyle = '#a8843c';
  ctx.fillRect(-2, 1, 4, 2);
  ctx.restore();
}

// ---------- Palettes ----------
const PAL_PLAYER = { skin:'#e8c39e', hair:'#5a3a22', shirt:'#3a6ea5', pants:'#2d4a3a', boots:'#4a3626', belt:'#6b4423', eyes:'#2c2c2a' };
const PAL_ELDER  = { skin:'#d9b48f', hair:'#c8c4b8', shirt:'#7a4a8a', pants:'#4a3a52', boots:'#3a2e28', belt:'#5a4438', eyes:'#2c2c2a' };
const PAL_MERCH  = { skin:'#c99a72', hair:'#2a2420', shirt:'#a5622d', pants:'#3a3226', boots:'#2a2420', belt:'#6b4423', eyes:'#2c2c2a' };

// ---------- Slime (blob monster) ----------
function buildSlimeSheet(baseColor, darkColor) {
  const FW = 32, FH = 28;
  const sheet = makeCanvas(FW * 4, FH * 1); // slimes don't need directions, just squash frames
  const ctx = sheet.getContext('2d');
  for (let f = 0; f < 4; f++) {
    ctx.save();
    ctx.translate(f * FW, 0);
    const squash = [0, 0.15, 0.3, 0.15][f];
    const w = 20 + squash * 10, h = 16 - squash * 8;
    const cx = 16, cy = 24 - h / 2;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(16, 25, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    // body gradient-ish (two-tone flat, no actual gradient per style rules -> use two shapes)
    ctx.fillStyle = darkColor;
    ctx.beginPath(); ctx.ellipse(cx, cy + 1, w / 2, h / 2 + 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = baseColor;
    ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(cx - w / 5, cy - h / 4, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = '#1a1a18';
    ctx.fillRect(cx - 5, cy - 1, 3, 3);
    ctx.fillRect(cx + 2, cy - 1, 3, 3);
    ctx.restore();
  }
  return sheet;
}

// ---------- Goblin Boss ----------
function buildGoblinSheet() {
  const FW = 40, FH = 42;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const bob = (frame === 1 || frame === 3) ? 1 : 0;
      ctx.translate(0, -bob);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(20, 38, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      // legs
      ctx.fillStyle = '#3a2e1a';
      ctx.fillRect(12, 28, 7, 9);
      ctx.fillRect(21, 28, 7, 9);
      // body (armored)
      ctx.fillStyle = '#4a6b2f';
      roundRect(ctx, 8, 12, 24, 18, 4); ctx.fill();
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(8, 20, 24, 4); // armor strap
      // arms + crude axe
      ctx.fillStyle = '#3d5a26';
      ctx.fillRect(4, 14, 6, 12);
      ctx.fillRect(30, 14, 6, 12);
      ctx.fillStyle = '#8a8578';
      ctx.fillRect(33, 6, 3, 16);
      ctx.fillStyle = '#5a5648';
      ctx.beginPath();
      ctx.moveTo(36, 4); ctx.lineTo(44, 10); ctx.lineTo(36, 16); ctx.closePath();
      ctx.fill();
      // head
      ctx.fillStyle = '#5a7a3a';
      roundRect(ctx, 10, 0, 20, 16, 5); ctx.fill();
      // ears
      ctx.fillStyle = '#4a6b2f';
      ctx.beginPath(); ctx.moveTo(10, 6); ctx.lineTo(3, 4); ctx.lineTo(9, 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, 6); ctx.lineTo(37, 4); ctx.lineTo(31, 12); ctx.fill();
      // eyes
      ctx.fillStyle = '#e24b4a';
      if (dir !== 'up') {
        ctx.fillRect(14, 6, 3, 3);
        ctx.fillRect(23, 6, 3, 3);
      }
      // tusks
      ctx.fillStyle = '#e8e4d8';
      if (dir === 'down') {
        ctx.fillRect(13, 12, 2, 4);
        ctx.fillRect(25, 12, 2, 4);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Devil Boss ----------
function buildDevilSheet() {
  const FW = 40, FH = 42;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const bob = (frame === 1 || frame === 3) ? 1 : 0;
      ctx.translate(0, -bob);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(20, 38, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      // legs (dark hooved)
      ctx.fillStyle = '#1a1210';
      ctx.fillRect(12, 28, 7, 9);
      ctx.fillRect(21, 28, 7, 9);
      // tail
      ctx.strokeStyle = '#6b1414';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 30);
      ctx.quadraticCurveTo(28, 34, 26, 40);
      ctx.stroke();
      ctx.fillStyle = '#6b1414';
      ctx.beginPath();
      ctx.moveTo(26, 40); ctx.lineTo(30, 38); ctx.lineTo(27, 43); ctx.closePath();
      ctx.fill();
      // body (dark red hide)
      ctx.fillStyle = '#7a1c1c';
      roundRect(ctx, 8, 12, 24, 18, 4); ctx.fill();
      ctx.fillStyle = '#2a1414';
      ctx.fillRect(8, 20, 24, 4); // chest strap
      // arms + trident
      ctx.fillStyle = '#671717';
      ctx.fillRect(4, 14, 6, 12);
      ctx.fillRect(30, 14, 6, 12);
      ctx.fillStyle = '#8a8578';
      ctx.fillRect(33, 2, 3, 20);
      ctx.beginPath();
      ctx.moveTo(31, 2); ctx.lineTo(33, -4); ctx.lineTo(35, 2); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(34.5, 2); ctx.lineTo(36.5, -5); ctx.lineTo(38.5, 2); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(38, 2); ctx.lineTo(40, -4); ctx.lineTo(42, 2); ctx.closePath(); ctx.fill();
      // head
      ctx.fillStyle = '#8a1f1f';
      roundRect(ctx, 10, 0, 20, 16, 5); ctx.fill();
      // horns
      ctx.fillStyle = '#2a2420';
      ctx.beginPath(); ctx.moveTo(11, 3); ctx.lineTo(4, -6); ctx.lineTo(13, 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(29, 3); ctx.lineTo(36, -6); ctx.lineTo(27, 2); ctx.closePath(); ctx.fill();
      // eyes (glowing)
      ctx.fillStyle = '#f4d43c';
      if (dir !== 'up') {
        ctx.fillRect(14, 6, 3, 3);
        ctx.fillRect(23, 6, 3, 3);
      }
      // fangs
      ctx.fillStyle = '#e8e4d8';
      if (dir === 'down') {
        ctx.fillRect(13, 12, 2, 4);
        ctx.fillRect(25, 12, 2, 4);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Item icons ----------
function buildSwordIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(-0.78);
  ctx.fillStyle = '#dcd8cc';
  ctx.fillRect(-2, -10, 4, 16);
  ctx.fillStyle = '#8a8578';
  ctx.fillRect(-2, -10, 4, 3);
  ctx.fillStyle = '#a8843c';
  ctx.fillRect(-5, 5, 10, 3);
  ctx.fillStyle = '#5a4020';
  ctx.fillRect(-1.5, 8, 3, 6);
  ctx.restore();
  return c;
}
function buildPotionIcon(color) {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c8c4b8';
  ctx.fillRect(10, 3, 4, 4);
  ctx.fillStyle = color;
  roundRect(ctx, 6, 8, 12, 12, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(8, 10, 2, 6);
  ctx.strokeStyle = '#5a4020';
  ctx.lineWidth = 1;
  roundRect(ctx, 6, 8, 12, 12, 4); ctx.stroke();
  return c;
}
function buildCoinIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c8931a';
  ctx.beginPath(); ctx.arc(12, 12, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b83c';
  ctx.beginPath(); ctx.arc(11, 11, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8931a';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('$', 12, 15);
  return c;
}
function buildKeyIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#d4b83c';
  ctx.fillStyle = '#d4b83c';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(9, 9, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillRect(11, 9, 9, 2.5);
  ctx.fillRect(16, 11, 2.5, 4);
  ctx.fillRect(19, 11, 2.5, 3);
  return c;
}
function buildShieldIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a6a7a';
  ctx.beginPath();
  ctx.moveTo(12, 3); ctx.lineTo(20, 6); ctx.lineTo(20, 13);
  ctx.quadraticCurveTo(20, 19, 12, 22);
  ctx.quadraticCurveTo(4, 19, 4, 13);
  ctx.lineTo(4, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#7a8a9a';
  ctx.beginPath();
  ctx.moveTo(12, 6); ctx.lineTo(17, 8); ctx.lineTo(17, 13);
  ctx.quadraticCurveTo(17, 16, 12, 18);
  ctx.quadraticCurveTo(7, 16, 7, 13);
  ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
  return c;
}
function buildArmorIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');

  // Outer armor
  ctx.fillStyle = '#5a6a7a';
  ctx.beginPath();
  ctx.moveTo(8, 3);
  ctx.lineTo(10, 5);
  ctx.lineTo(14, 5);
  ctx.lineTo(16, 3);
  ctx.lineTo(20, 7);
  ctx.lineTo(18, 20);
  ctx.lineTo(6, 20);
  ctx.lineTo(4, 7);
  ctx.closePath();
  ctx.fill();

  // Inner plate
  ctx.fillStyle = '#7a8a9a';
  ctx.beginPath();
  ctx.moveTo(9, 6);
  ctx.lineTo(11, 7);
  ctx.lineTo(13, 7);
  ctx.lineTo(15, 6);
  ctx.lineTo(17, 8);
  ctx.lineTo(16, 17);
  ctx.lineTo(8, 17);
  ctx.lineTo(7, 8);
  ctx.closePath();
  ctx.fill();

  // Center seam
  ctx.strokeStyle = '#4a5866';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, 7);
  ctx.lineTo(12, 17);
  ctx.stroke();

  return c;
}

function initSprites() {
  Sprites.player = buildHumanoidSheet(PAL_PLAYER, null);
  Sprites.playerSword = buildHumanoidSheet(PAL_PLAYER, drawSword);
  Sprites.elder = buildHumanoidSheet(PAL_ELDER, null);
  Sprites.merchant = buildHumanoidSheet(PAL_MERCH, null);
  Sprites.slimeGreen = buildSlimeSheet('#7bbf5e', '#4a8a35');
  Sprites.slimeBlue = buildSlimeSheet('#5e9ebf', '#356e8a');
  Sprites.slimeRed = buildSlimeSheet('#b93244', '#da2121');
  Sprites.goblin = buildGoblinSheet();
  Sprites.devil = buildDevilSheet();
  Sprites.icons = {
    sword: buildSwordIcon(),
    armor: buildArmorIcon(),
    potionRed: buildPotionIcon('#c94040'),
    potionBlue: buildPotionIcon('#4070c9'),
    coin: buildCoinIcon(),
    key: buildKeyIcon(),
    shield: buildShieldIcon()
  };
}