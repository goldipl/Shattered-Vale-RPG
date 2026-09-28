// sprites/frost-sprites.js — creatures of the Frostspire (World 6, unlocked
// after the Pit Devil). Kept separate from monster-sprites.js/
// molten-sprites.js so none of those files balloon past a comfortable
// size — same builder pattern throughout (4 directional rows x 4 walk
// frames, ctx.translate per cell; non-directional creatures use a single
// row of 4 frames instead).

// ---------- Frost Wolf (grunt, fast, non-directional) ----------
function buildFrostWolfSheet() {
  const FW = 38, FH = 32;
  const sheet = makeCanvas(FW * 4, FH * 1);
  const ctx = sheet.getContext('2d');
  for (let f = 0; f < 4; f++) {
    ctx.save();
    ctx.translate(f * FW, 0);
    const legPhase = [0, 2, 0, -2][f];
    const cx = 19, cy = 18;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 8, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a9ab0';
    ctx.fillRect(cx - 9, cy + 2 + Math.max(0, legPhase), 3, 8 - Math.max(0, legPhase));
    ctx.fillRect(cx + 6, cy + 2 + Math.max(0, -legPhase), 3, 8 - Math.max(0, -legPhase));
    ctx.fillStyle = '#cfe0ec';
    ctx.beginPath(); ctx.ellipse(cx, cy, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8f4fa';
    ctx.beginPath(); ctx.ellipse(cx - 2, cy - 2, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a8c4d8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy);
    ctx.quadraticCurveTo(cx + 18, cy - 4, cx + 16, cy - 10);
    ctx.stroke();
    ctx.fillStyle = '#dcecf6';
    ctx.beginPath(); ctx.ellipse(cx - 13, cy - 3, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8d4e4';
    ctx.beginPath(); ctx.moveTo(cx - 17, cy - 7); ctx.lineTo(cx - 19, cy - 13); ctx.lineTo(cx - 14, cy - 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 11, cy - 7); ctx.lineTo(cx - 9, cy - 13); ctx.lineTo(cx - 14, cy - 8); ctx.fill();
    ctx.fillStyle = '#7fe0ff';
    ctx.beginPath(); ctx.arc(cx - 15, cy - 3, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(cx - 19, cy, 2, 3);
    ctx.restore();
  }
  return sheet;
}

// ---------- Crystal Spider (grunt, fast, non-directional) ----------
function buildCrystalSpiderSheet() {
  const FW = 34, FH = 30;
  const sheet = makeCanvas(FW * 4, FH * 1);
  const ctx = sheet.getContext('2d');
  for (let f = 0; f < 4; f++) {
    ctx.save();
    ctx.translate(f * FW, 0);
    const legSpread = [0, 2, 0, -2][f];
    const cx = 17, cy = 17;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, 26, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8fd0e8';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const ly = cy - 5 + i * 3.5;
      ctx.beginPath(); ctx.moveTo(cx - 6, ly); ctx.lineTo(cx - 14 - legSpread, ly - 3 + i); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 6, ly); ctx.lineTo(cx + 14 + legSpread, ly - 3 + i); ctx.stroke();
    }
    ctx.fillStyle = '#a8dcf0';
    ctx.beginPath(); ctx.ellipse(cx + 3, cy + 3, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(cx + 1, cy + 1, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7cc0dc';
    ctx.beginPath(); ctx.ellipse(cx - 5, cy, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eafaff';
    ctx.beginPath(); ctx.arc(cx - 8, cy - 1, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 8, cy + 2, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 6, cy - 3, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  return sheet;
}

// ---------- Wraith (grunt, directional, ghostly) ----------
function buildWraithSheet() {
  const FW = 34, FH = 38;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const drift = Math.sin(frame * 1.2) * 1.5;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(17, 34, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,175,220,0.55)';
      ctx.beginPath();
      ctx.moveTo(11, 14 + drift);
      ctx.lineTo(23, 14 + drift);
      ctx.lineTo(27, 30);
      ctx.lineTo(22, 26);
      ctx.lineTo(18, 32);
      ctx.lineTo(14, 25);
      ctx.lineTo(9, 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(200,215,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(13, 17 + drift); ctx.lineTo(21, 17 + drift); ctx.lineTo(20, 27); ctx.lineTo(14, 27);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(180,200,240,0.5)';
      ctx.lineWidth = 3;
      if (dir !== 'left') { ctx.beginPath(); ctx.moveTo(22, 16 + drift); ctx.lineTo(27, 22); ctx.stroke(); }
      if (dir !== 'right') { ctx.beginPath(); ctx.moveTo(12, 16 + drift); ctx.lineTo(7, 22); ctx.stroke(); }
      ctx.fillStyle = 'rgba(130,150,200,0.7)';
      ctx.beginPath(); ctx.ellipse(17, 8 + drift, 8, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(10,15,25,0.7)';
      ctx.beginPath(); ctx.ellipse(17, 9 + drift, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#bfe8ff';
      if (dir !== 'up') {
        ctx.fillRect(14.5, 8 + drift, 2, 2);
        ctx.fillRect(18.5, 8 + drift, 2, 2);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Yeti (grunt, tanky brute) ----------
function buildYetiSheet() {
  const FW = 48, FH = 50;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const bob = (frame === 1 || frame === 3) ? 1 : 0;
      ctx.translate(0, -bob);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(24, 44, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8dce8';
      ctx.fillRect(15, 32, 9, 12);
      ctx.fillRect(25, 32, 9, 12);
      ctx.fillStyle = '#eef6fb';
      roundRect(ctx, 10, 14, 29, 22, 6); ctx.fill();
      ctx.fillStyle = '#d4e6f0';
      ctx.fillRect(10, 24, 29, 4);
      ctx.fillStyle = '#dceaf3';
      ctx.fillRect(2, 15, 9, 17);
      ctx.fillRect(38, 15, 9, 17);
      ctx.fillStyle = '#f4f9fc';
      roundRect(ctx, 15, 1, 20, 16, 6); ctx.fill();
      ctx.fillStyle = '#7fe0ff';
      if (dir !== 'up') {
        ctx.fillRect(18, 8, 3.5, 3);
        ctx.fillRect(27, 8, 3.5, 3);
      }
      ctx.fillStyle = '#e8e4d8';
      if (dir === 'down') {
        ctx.fillRect(18, 14, 2, 5);
        ctx.fillRect(29, 14, 2, 5);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Ice Golem (grunt, tankiest, slowest) ----------
function buildIceGolemSheet() {
  const FW = 54, FH = 56;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const bob = (frame === 1 || frame === 3) ? 1 : 0;
      ctx.translate(0, -bob);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(27, 49, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a6478';
      ctx.fillRect(16, 36, 11, 14);
      ctx.fillRect(27, 36, 11, 14);
      ctx.fillStyle = '#6f92a8';
      roundRect(ctx, 9, 14, 36, 26, 6); ctx.fill();
      ctx.fillStyle = 'rgba(200,235,255,0.5)';
      ctx.fillRect(14, 20, 4, 16);
      ctx.fillRect(24, 18, 4, 20);
      ctx.fillRect(34, 22, 4, 14);
      ctx.fillStyle = '#3a4e5e';
      ctx.fillRect(0, 16, 10, 20);
      ctx.fillRect(44, 16, 10, 20);
      ctx.fillStyle = '#5a7a90';
      roundRect(ctx, 16, 0, 22, 17, 6); ctx.fill();
      ctx.fillStyle = '#bff0ff';
      if (dir !== 'up') {
        ctx.fillRect(20, 7, 4, 4);
        ctx.fillRect(30, 7, 4, 4);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Frost Sentinel (boss, guardian) ----------
function buildFrostSentinelSheet() {
  const FW = 60, FH = 62;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const bob = (frame === 1 || frame === 3) ? 1.5 : 0;
      ctx.translate(0, -bob);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(30, 57, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3e5468';
      ctx.fillRect(18, 42, 10, 14);
      ctx.fillRect(32, 42, 10, 14);
      ctx.fillStyle = '#5a7a94';
      roundRect(ctx, 12, 18, 36, 27, 6); ctx.fill();
      ctx.fillStyle = 'rgba(190,230,255,0.55)';
      ctx.fillRect(18, 24, 4, 20);
      ctx.fillRect(30, 22, 4, 22);
      ctx.fillRect(38, 26, 4, 16);
      ctx.fillStyle = '#2e4050';
      ctx.fillRect(12, 30, 36, 5);
      ctx.fillStyle = '#4a647a';
      ctx.fillRect(4, 20, 10, 22);
      ctx.fillRect(46, 20, 10, 22);
      ctx.fillStyle = '#cdeeff';
      ctx.beginPath();
      ctx.moveTo(50, 2); ctx.lineTo(56, 6); ctx.lineTo(50, 34); ctx.lineTo(46, 30);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.moveTo(49, 6); ctx.lineTo(52, 8); ctx.lineTo(49, 28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a8ca4';
      roundRect(ctx, 18, 2, 24, 19, 7); ctx.fill();
      ctx.fillStyle = 'rgba(220,245,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(18, 4); ctx.lineTo(16, -6); ctx.lineTo(22, 3);
      ctx.lineTo(30, -9); ctx.lineTo(33, 3);
      ctx.lineTo(40, -6); ctx.lineTo(42, 5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9fe8ff';
      if (dir !== 'up') {
        ctx.fillRect(22, 10, 4, 3.5);
        ctx.fillRect(33, 10, 4, 3.5);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Wraith Queen (boss) ----------
function buildWraithQueenSheet() {
  const FW = 56, FH = 62;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const drift = Math.sin(frame * 1.1) * 2;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(28, 56, 17, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(140,160,220,0.6)';
      ctx.beginPath();
      ctx.moveTo(16, 22 + drift);
      ctx.lineTo(40, 22 + drift);
      ctx.lineTo(48, 52);
      ctx.lineTo(38, 44);
      ctx.lineTo(30, 54);
      ctx.lineTo(22, 44);
      ctx.lineTo(12, 52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(210,220,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(20, 26 + drift); ctx.lineTo(36, 26 + drift); ctx.lineTo(32, 46); ctx.lineTo(24, 46);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(190,205,250,0.55)';
      ctx.lineWidth = 4;
      if (dir !== 'left') { ctx.beginPath(); ctx.moveTo(38, 24 + drift); ctx.lineTo(46, 34); ctx.stroke(); }
      if (dir !== 'right') { ctx.beginPath(); ctx.moveTo(18, 24 + drift); ctx.lineTo(10, 34); ctx.stroke(); }
      ctx.fillStyle = 'rgba(220,235,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(18, 10 + drift); ctx.lineTo(16, 0); ctx.lineTo(21, 9);
      ctx.lineTo(28, -4); ctx.lineTo(35, 9);
      ctx.lineTo(40, 0); ctx.lineTo(38, 10 + drift);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,175,225,0.8)';
      ctx.beginPath(); ctx.ellipse(28, 15 + drift, 10, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(15,20,35,0.75)';
      ctx.beginPath(); ctx.ellipse(28, 16 + drift, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8f0ff';
      if (dir !== 'up') {
        ctx.fillRect(24, 14 + drift, 2.6, 2.6);
        ctx.fillRect(30, 14 + drift, 2.6, 2.6);
      }
      ctx.restore();
    }
  });
  return sheet;
}

// ---------- Glacius, the Everfrost Wyrm (final boss) ----------
function buildGlaciusSheet() {
  const FW = 84, FH = 82;
  const sheet = makeCanvas(FW * 4, FH * 4);
  const ctx = sheet.getContext('2d');
  const dirs = ['down', 'left', 'right', 'up'];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.translate(frame * FW, row * FH);
      const bob = (frame === 1 || frame === 3) ? 2 : 0;
      ctx.translate(0, -bob);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(42, 76, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,235,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(18, 28); ctx.quadraticCurveTo(-14, 22, -8, 54); ctx.quadraticCurveTo(6, 42, 20, 40);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(66, 28); ctx.quadraticCurveTo(98, 22, 92, 54); ctx.quadraticCurveTo(78, 42, 64, 40);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#33505f';
      ctx.fillRect(28, 56, 12, 18);
      ctx.fillRect(44, 56, 12, 18);
      ctx.strokeStyle = '#4a7080';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(42, 58); ctx.quadraticCurveTo(60, 68, 54, 80);
      ctx.stroke();
      ctx.fillStyle = '#3e6272';
      roundRect(ctx, 18, 24, 48, 36, 8); ctx.fill();
      ctx.fillStyle = 'rgba(210,240,255,0.6)';
      ctx.fillRect(26, 32, 4, 22);
      ctx.fillRect(40, 28, 4, 26);
      ctx.fillRect(54, 34, 4, 20);
      ctx.fillStyle = '#264452';
      ctx.fillRect(18, 42, 48, 6);
      ctx.fillStyle = '#2e4c5a';
      ctx.fillRect(6, 26, 13, 26);
      ctx.fillRect(65, 26, 13, 26);
      ctx.fillStyle = '#eef8ff';
      [[8, 52], [13, 55], [18, 52]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 3, cy + 6); ctx.lineTo(cx - 1, cy + 6); ctx.closePath(); ctx.fill();
      });
      [[66, 52], [71, 55], [76, 52]].forEach(([cx, cy]) => {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 3, cy + 6); ctx.lineTo(cx - 1, cy + 6); ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = '#4a7284';
      roundRect(ctx, 26, 4, 32, 24, 8); ctx.fill();
      ctx.fillStyle = '#dceeff';
      ctx.beginPath(); ctx.moveTo(26, 6); ctx.lineTo(12, -12); ctx.lineTo(30, 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(58, 6); ctx.lineTo(72, -12); ctx.lineTo(54, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8fe8ff';
      if (dir !== 'up') {
        ctx.fillRect(32, 16, 5, 4);
        ctx.fillRect(47, 16, 5, 4);
      }
      ctx.fillStyle = 'rgba(143,232,255,0.4)';
      if (dir !== 'up') {
        ctx.beginPath(); ctx.arc(34.5, 18, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(49.5, 18, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#eef8ff';
      if (dir === 'down') {
        ctx.fillRect(30, 26, 3, 7);
        ctx.fillRect(51, 26, 3, 7);
      }
      ctx.restore();
    }
  });
  return sheet;
}
