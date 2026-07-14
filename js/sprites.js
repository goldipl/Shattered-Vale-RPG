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

// Jungle slime palette (used with buildSlimeSheet below, same builder as other slimes)

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

// ---------- Orc Warlord Boss (Jungle) ----------
function buildOrcSheet() {
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
      ctx.fillStyle = '#241a10';
      ctx.fillRect(12, 28, 7, 9);
      ctx.fillRect(21, 28, 7, 9);
      // body (mossy hide armor)
      ctx.fillStyle = '#3a5a2a';
      roundRect(ctx, 8, 12, 24, 18, 4); ctx.fill();
      ctx.fillStyle = '#5a4a2e';
      ctx.fillRect(8, 20, 24, 4); // strap
      // vine wraps
      ctx.strokeStyle = '#2e6b2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(9, 14); ctx.quadraticCurveTo(20, 18, 31, 14);
      ctx.stroke();
      // arms + club
      ctx.fillStyle = '#33502a';
      ctx.fillRect(4, 14, 6, 12);
      ctx.fillRect(30, 14, 6, 12);
      ctx.fillStyle = '#5a4020';
      ctx.fillRect(33, 8, 4, 15);
      ctx.fillStyle = '#4a3818';
      ctx.beginPath();
      ctx.ellipse(35, 6, 6, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a8578';
      ctx.beginPath(); ctx.arc(32, 4, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(37, 8, 1.6, 0, Math.PI * 2); ctx.fill();
      // head
      ctx.fillStyle = '#4a6b38';
      roundRect(ctx, 10, 0, 20, 16, 5); ctx.fill();
      // ears
      ctx.fillStyle = '#3a5a2a';
      ctx.beginPath(); ctx.moveTo(10, 6); ctx.lineTo(2, 3); ctx.lineTo(9, 12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, 6); ctx.lineTo(38, 3); ctx.lineTo(31, 12); ctx.fill();
      // eyes
      ctx.fillStyle = '#e8d43c';
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
      // war paint stripe
      ctx.fillStyle = '#c94040';
      if (dir === 'down') ctx.fillRect(15, 4, 10, 2);
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Jungle Witch Boss ----------
function buildWitchSheet() {
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
      ctx.beginPath(); ctx.ellipse(20, 38, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      // robe (flares at bottom, no separate legs)
      ctx.fillStyle = '#3a2a4a';
      ctx.beginPath();
      ctx.moveTo(14, 14);
      ctx.lineTo(26, 14);
      ctx.lineTo(32, 38);
      ctx.lineTo(8, 38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a3560';
      ctx.beginPath();
      ctx.moveTo(16, 20);
      ctx.lineTo(24, 20);
      ctx.lineTo(27, 34);
      ctx.lineTo(13, 34);
      ctx.closePath();
      ctx.fill();
      // trim glow
      ctx.strokeStyle = '#8a5ec9';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(9, 37); ctx.lineTo(31, 37); ctx.stroke();
      // arms + staff
      ctx.fillStyle = '#332246';
      ctx.fillRect(4, 15, 6, 11);
      ctx.fillRect(30, 15, 6, 11);
      ctx.fillStyle = '#4a3018';
      ctx.fillRect(33, 4, 3, 20);
      ctx.fillStyle = '#3fd4a8';
      ctx.beginPath(); ctx.arc(34, 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(63,212,168,0.4)';
      ctx.beginPath(); ctx.arc(34, 3, 7, 0, Math.PI * 2); ctx.fill();
      // head
      ctx.fillStyle = '#c9a882';
      roundRect(ctx, 11, 1, 18, 14, 5); ctx.fill();
      // hood
      ctx.fillStyle = '#2e2040';
      ctx.beginPath();
      ctx.moveTo(9, 6);
      ctx.quadraticCurveTo(20, -6, 31, 6);
      ctx.quadraticCurveTo(31, 14, 26, 15);
      ctx.lineTo(14, 15);
      ctx.quadraticCurveTo(9, 14, 9, 6);
      ctx.closePath();
      ctx.fill();
      // eyes (glowing)
      ctx.fillStyle = '#3fd4a8';
      if (dir !== 'up') {
        ctx.fillRect(15, 8, 3, 3);
        ctx.fillRect(22, 8, 3, 3);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Spider (crypt crawler) ----------
function buildSpiderSheet() {
  const FW = 32, FH = 28;
  const sheet = makeCanvas(FW * 4, FH * 1); // no directions, just leg-scuttle frames
  const ctx = sheet.getContext('2d');
  for (let f = 0; f < 4; f++) {
    ctx.save();
    ctx.translate(f * FW, 0);
    const legSpread = [0, 2, 0, -2][f];
    const cx = 16, cy = 16;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, 25, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    // legs (4 per side, scuttle animated)
    ctx.strokeStyle = '#1a1410';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const ly = cy - 5 + i * 3.5;
      ctx.beginPath();
      ctx.moveTo(cx - 6, ly);
      ctx.lineTo(cx - 14 - legSpread, ly - 3 + i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 6, ly);
      ctx.lineTo(cx + 14 + legSpread, ly - 3 + i);
      ctx.stroke();
    }
    // abdomen
    ctx.fillStyle = '#2a1f18';
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 3, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a2e1e';
    ctx.beginPath(); ctx.ellipse(cx + 2, cy + 1, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    // head/thorax
    ctx.fillStyle = '#241a14';
    ctx.beginPath(); ctx.ellipse(cx - 5, cy, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    // eyes (glowing cluster)
    ctx.fillStyle = '#c9403c';
    ctx.beginPath(); ctx.arc(cx - 8, cy - 1, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 8, cy + 2, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 6, cy - 3, 1, 0, Math.PI * 2); ctx.fill();
    // fangs
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(cx - 10, cy + 2, 1.5, 3);
    ctx.fillRect(cx - 9, cy + 3, 1.5, 3);
    ctx.restore();
  }
  return sheet;
}

// ---------- Skeleton (crypt warrior) ----------
function buildSkeletonSheet() {
  const FW = 32, FH = 34;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const legOffset = frame % 2 === 0 ? 0 : (frame === 1 ? 2 : -2);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(16, 30, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      // leg bones
      ctx.strokeStyle = '#d8d2c0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, 22 + Math.max(0, legOffset)); ctx.lineTo(12, 29);
      ctx.moveTo(20, 22 + Math.max(0, -legOffset)); ctx.lineTo(20, 29);
      ctx.stroke();
      // ribcage / torso
      ctx.fillStyle = '#e8e2d0';
      roundRect(ctx, 9, 11, 14, 11, 3); ctx.fill();
      ctx.strokeStyle = '#a8a290';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(9, 14 + i * 3); ctx.lineTo(23, 14 + i * 3);
        ctx.stroke();
      }
      // arm bones (swing)
      const armSwing = frame === 1 ? -2 : frame === 3 ? 2 : 0;
      ctx.strokeStyle = '#d8d2c0';
      ctx.lineWidth = 2.5;
      if (dir !== 'left') { ctx.beginPath(); ctx.moveTo(23, 13 + armSwing); ctx.lineTo(26, 21 + armSwing); ctx.stroke(); }
      if (dir !== 'right') { ctx.beginPath(); ctx.moveTo(9, 13 - armSwing); ctx.lineTo(6, 21 - armSwing); ctx.stroke(); }
      // rusty short-sword prop (down/right facing)
      if (dir === 'down' || dir === 'right') {
        ctx.fillStyle = '#8a8072';
        ctx.fillRect(25, 8 + armSwing, 2, 12);
      }
      // skull
      ctx.fillStyle = '#eee8d8';
      roundRect(ctx, 9, 1, 14, 11, 4); ctx.fill();
      // eye sockets (glowing embers)
      ctx.fillStyle = '#1a1410';
      if (dir !== 'up') {
        ctx.fillRect(11, 6, 3, 3);
        ctx.fillRect(18, 6, 3, 3);
      }
      ctx.fillStyle = '#e8975a';
      if (dir !== 'up') {
        ctx.fillRect(11.5, 6.5, 2, 2);
        ctx.fillRect(18.5, 6.5, 2, 2);
      }
      // jaw
      if (dir === 'down') {
        ctx.strokeStyle = '#a8a290';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(11, 11); ctx.lineTo(21, 11); ctx.stroke();
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Skeleton King Boss (2x size, crypt throne room) ----------
function buildSkeletonKingSheet() {
  // Double the standard boss frame size (goblin/orc/witch/devil are 40x42)
  const FW = 80, FH = 84;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      ctx.scale(2, 2); // reuse the 40x42 layout logic, doubled on canvas
      const bob = (frame === 1 || frame === 3) ? 1 : 0;
      ctx.translate(0, -bob);
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(20, 38, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
      // leg bones (thick)
      ctx.strokeStyle = '#e8e2d0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(14, 26); ctx.lineTo(14, 37);
      ctx.moveTo(26, 26); ctx.lineTo(26, 37);
      ctx.stroke();
      // tattered royal cloak
      ctx.fillStyle = '#3a1830';
      ctx.beginPath();
      ctx.moveTo(9, 13); ctx.lineTo(31, 13);
      ctx.lineTo(34, 36); ctx.lineTo(28, 30);
      ctx.lineTo(24, 37); ctx.lineTo(20, 29);
      ctx.lineTo(16, 37); ctx.lineTo(12, 30);
      ctx.lineTo(6, 36);
      ctx.closePath();
      ctx.fill();
      // ribcage / torso armor
      ctx.fillStyle = '#eee8d8';
      roundRect(ctx, 9, 11, 22, 17, 4); ctx.fill();
      ctx.strokeStyle = '#a8a290';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(9, 14 + i * 3.4); ctx.lineTo(31, 14 + i * 3.4);
        ctx.stroke();
      }
      // arm bones + massive bone greatsword
      const armSwing = frame === 1 ? -2 : frame === 3 ? 2 : 0;
      ctx.strokeStyle = '#e8e2d0';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(31, 14 + armSwing); ctx.lineTo(36, 26 + armSwing); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, 14 - armSwing); ctx.lineTo(4, 26 - armSwing); ctx.stroke();
      ctx.fillStyle = '#cfc8b4';
      ctx.fillRect(35, 2, 4, 26);
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(32, 25, 10, 3);
      // skull
      ctx.fillStyle = '#f2ecd8';
      roundRect(ctx, 11, -1, 18, 15, 5); ctx.fill();
      // crown
      ctx.fillStyle = '#c8a83c';
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(13, -6); ctx.lineTo(16, 0);
      ctx.lineTo(18, -7); ctx.lineTo(20, 0);
      ctx.lineTo(22, -7); ctx.lineTo(24, 0);
      ctx.lineTo(27, -6); ctx.lineTo(29, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a5ec9';
      ctx.beginPath(); ctx.arc(20, -5, 1.6, 0, Math.PI * 2); ctx.fill();
      // eye sockets (burning)
      ctx.fillStyle = '#1a1410';
      if (dir !== 'up') {
        ctx.fillRect(13.5, 5, 4, 4);
        ctx.fillRect(22.5, 5, 4, 4);
      }
      ctx.fillStyle = '#f4d43c';
      if (dir !== 'up') {
        ctx.fillRect(14.2, 5.7, 2.6, 2.6);
        ctx.fillRect(23.2, 5.7, 2.6, 2.6);
      }
      // jaw
      if (dir === 'down') {
        ctx.strokeStyle = '#a8a290';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(13, 11); ctx.lineTo(27, 11); ctx.stroke();
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

function buildHelmetIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  // dome
  ctx.fillStyle = '#8a7a5a';
  ctx.beginPath();
  ctx.moveTo(4, 15);
  ctx.quadraticCurveTo(4, 4, 12, 4);
  ctx.quadraticCurveTo(20, 4, 20, 15);
  ctx.closePath();
  ctx.fill();
  // inner shading
  ctx.fillStyle = '#a89a72';
  ctx.beginPath();
  ctx.moveTo(7, 13);
  ctx.quadraticCurveTo(7, 6, 12, 6);
  ctx.quadraticCurveTo(17, 6, 17, 13);
  ctx.closePath();
  ctx.fill();
  // eye slit
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(6, 14, 12, 2.5);
  // brim
  ctx.fillStyle = '#5a4e38';
  ctx.fillRect(3, 15, 18, 3);
  // small plume
  ctx.fillStyle = '#4a8a5a';
  ctx.beginPath();
  ctx.moveTo(12, 4); ctx.lineTo(9, -3); ctx.lineTo(15, -3); ctx.closePath();
  ctx.fill();
  return c;
}
function buildLegendarySwordIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.translate(12, 12);
  ctx.rotate(-0.78);
  // glow
  ctx.fillStyle = 'rgba(63,212,168,0.35)';
  ctx.beginPath(); ctx.ellipse(0, -2, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
  // blade
  ctx.fillStyle = '#e8e4d8';
  ctx.fillRect(-2, -11, 4, 17);
  ctx.fillStyle = '#3fd4a8';
  ctx.fillRect(-0.7, -11, 1.4, 17);
  ctx.fillStyle = '#8a8578';
  ctx.fillRect(-2, -11, 4, 3);
  // crossguard
  ctx.fillStyle = '#c8a83c';
  ctx.fillRect(-6, 5, 12, 3);
  // hilt
  ctx.fillStyle = '#4a2e18';
  ctx.fillRect(-1.5, 8, 3, 7);
  ctx.fillStyle = '#3fd4a8';
  ctx.beginPath(); ctx.arc(0, 16, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  return c;
}

function buildJungleArmorIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2e5a30';
  ctx.beginPath();
  ctx.moveTo(8, 3); ctx.lineTo(10, 5); ctx.lineTo(14, 5); ctx.lineTo(16, 3);
  ctx.lineTo(20, 7); ctx.lineTo(18, 20); ctx.lineTo(6, 20); ctx.lineTo(4, 7);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#48824a';
  ctx.beginPath();
  ctx.moveTo(9, 6); ctx.lineTo(11, 7); ctx.lineTo(13, 7); ctx.lineTo(15, 6);
  ctx.lineTo(17, 8); ctx.lineTo(16, 17); ctx.lineTo(8, 17); ctx.lineTo(7, 8);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1e3a1e';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(12, 7); ctx.lineTo(12, 17); ctx.stroke();
  ctx.fillStyle = '#3fd4a8';
  ctx.fillRect(11, 9, 2, 2);
  return c;
}
function buildBootsIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a3626';
  ctx.fillRect(6, 3, 5, 11);
  ctx.fillRect(13, 3, 5, 11);
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath();
  ctx.moveTo(6, 14); ctx.lineTo(11, 14); ctx.lineTo(11, 17); ctx.lineTo(3, 17);
  ctx.quadraticCurveTo(3, 15, 6, 14); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(13, 14); ctx.lineTo(18, 14); ctx.lineTo(18, 17); ctx.lineTo(21, 17);
  ctx.quadraticCurveTo(21, 15, 18, 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a6438';
  ctx.fillRect(6, 6, 5, 1.5);
  ctx.fillRect(13, 6, 5, 1.5);
  return c;
}

function buildBoneShieldIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#dcd6c4';
  ctx.beginPath();
  ctx.moveTo(12, 3); ctx.lineTo(20, 6); ctx.lineTo(20, 13);
  ctx.quadraticCurveTo(20, 19, 12, 22);
  ctx.quadraticCurveTo(4, 19, 4, 13);
  ctx.lineTo(4, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a8a290';
  ctx.beginPath();
  ctx.moveTo(12, 6); ctx.lineTo(17, 8); ctx.lineTo(17, 13);
  ctx.quadraticCurveTo(17, 16, 12, 18);
  ctx.quadraticCurveTo(7, 16, 7, 13);
  ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
  // crossed bones motif
  ctx.strokeStyle = '#e8e2d0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(9, 9); ctx.lineTo(15, 16);
  ctx.moveTo(15, 9); ctx.lineTo(9, 16);
  ctx.stroke();
  return c;
}
function buildSkeletonCrownIcon() {
  const c = makeCanvas(24, 24);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c8a83c';
  ctx.beginPath();
  ctx.moveTo(4, 18); ctx.lineTo(4, 10);
  ctx.lineTo(8, 15); ctx.lineTo(12, 6);
  ctx.lineTo(16, 15); ctx.lineTo(20, 10);
  ctx.lineTo(20, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8d478';
  ctx.fillRect(4, 16, 16, 3);
  ctx.fillStyle = '#8a5ec9';
  ctx.beginPath(); ctx.arc(12, 10, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, 13, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(18, 13, 1.2, 0, Math.PI * 2); ctx.fill();
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
  Sprites.slimeJungle = buildSlimeSheet('#6ec95e', '#2a8a3a');
  Sprites.goblin = buildGoblinSheet();
  Sprites.devil = buildDevilSheet();
  Sprites.orcWarlord = buildOrcSheet();
  Sprites.jungleWitch = buildWitchSheet();
  Sprites.spider = buildSpiderSheet();
  Sprites.skeleton = buildSkeletonSheet();
  Sprites.skeletonKing = buildSkeletonKingSheet();
  Sprites.icons = {
    sword: buildSwordIcon(),
    armor: buildArmorIcon(),
    helmet: buildHelmetIcon(),
    swordLegendary: buildLegendarySwordIcon(),
    armorJungle: buildJungleArmorIcon(),
    boots: buildBootsIcon(),
    potionRed: buildPotionIcon('#c94040'),
    potionBlue: buildPotionIcon('#4070c9'),
    coin: buildCoinIcon(),
    key: buildKeyIcon(),
    shield: buildShieldIcon(),
    shieldBone: buildBoneShieldIcon(),
    crownSkeleton: buildSkeletonCrownIcon(),
  };
}