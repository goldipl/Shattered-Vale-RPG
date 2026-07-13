// game.js — orchestrates world state, input, update/draw loop, HUD

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const VIEW_W = canvas.width, VIEW_H = canvas.height;

  const hpBar = document.getElementById('hpBarInner');
  const hpText = document.getElementById('hpText');
  const xpBar = document.getElementById('xpBarInner');
  const lvlText = document.getElementById('lvlText');
  const goldText = document.getElementById('goldText');

  // --- HUD VISIBILITY (hide HP/XP/Gold bars until Play is pressed) ---
  function nearestCommonAncestor(a, b) {
    if (!a && !b) return null;
    if (!a) return b;
    if (!b) return a;
    const chainA = [];
    for (let el = a; el; el = el.parentElement) chainA.push(el);
    for (let el = b; el; el = el.parentElement) {
      if (chainA.includes(el)) return el;
    }
    return document.body;
  }
  function hudGroup(el1, el2) {
    const anc = nearestCommonAncestor(el1, el2);
    if (!anc || anc === document.body || anc === document.documentElement) {
      return [el1, el2].filter(Boolean);
    }
    return [anc];
  }
  const hudTargets = [
    ...hudGroup(hpBar, hpText),
    ...hudGroup(xpBar, lvlText),
    ...(goldText && goldText.parentElement && goldText.parentElement !== document.body
      ? [goldText.parentElement] : [goldText])
  ].filter(Boolean);
  const uniqueHudTargets = [...new Set(hudTargets)];
  const hudOriginalDisplay = new Map();
  uniqueHudTargets.forEach(el => hudOriginalDisplay.set(el, el.style.display));
  function setHudVisible(visible) {
    uniqueHudTargets.forEach(el => {
      el.style.display = visible ? (hudOriginalDisplay.get(el) || '') : 'none';
    });
  }
  setHudVisible(false);

  // --- MOBILE / DESKTOP-ONLY GATE ---
  function isMobileDevice() {
    const uaMobile = /Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const touchOnly = ('maxTouchPoints' in navigator) && navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
    const narrowViewport = Math.min(window.innerWidth, window.innerHeight) < 700;
    return uaMobile || (touchOnly && narrowViewport);
  }

  let isMobileBlocked = isMobileDevice();

  window.addEventListener('resize', () => {
    isMobileBlocked = isMobileDevice();
  });

  function drawMobileBlockScreen() {
    ctx.save();
    ctx.fillStyle = '#14160f';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = 'center';
    ctx.strokeStyle = '#e8c93c';
    ctx.lineWidth = 3;
    const iw = 70, ih = 46;
    const ix = VIEW_W / 2 - iw / 2, iy = VIEW_H / 2 - 160;
    roundRect(ctx, ix, iy, iw, ih, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(VIEW_W / 2, iy + ih);
    ctx.lineTo(VIEW_W / 2, iy + ih + 14);
    ctx.moveTo(VIEW_W / 2 - 18, iy + ih + 14);
    ctx.lineTo(VIEW_W / 2 + 18, iy + ih + 14);
    ctx.stroke();

    ctx.fillStyle = '#e8c93c';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('Desktop Only', VIEW_W / 2, VIEW_H / 2 - 50);

    ctx.fillStyle = '#c9c5b8';
    ctx.font = '32px sans-serif';
    const msg = wrapPlain(ctx, 'This game requires a keyboard and is not playable on mobile devices. Please open it on a desktop or laptop computer.', VIEW_W - 60);
    msg.forEach((line, i) => {
      ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 + 8 + i * 32);
    });

    ctx.textAlign = 'left';
    ctx.restore();
  }

  initSprites();

  // Map expanded to 56 columns to fit the second world on the right
  const map = new TileMap(56, 48);
  const camera = new Camera(VIEW_W, VIEW_H);
  const particles = new ParticleSystem();
  const dialogue = new DialogueSystem();
  const inventory = new Inventory();

  const player = new Player(13 * TILE, 44 * TILE + 20);

  const elder = new NPC(10 * TILE, 37 * TILE, 'Elder Rowan', Sprites.elder, [
    "Traveler, thank the stars you've come.",
    "A goblin chief has made camp in the forest clearing to the southeast, terrorizing our village.",
    "Legend says an iron sword is hidden in the forest west of the castle — you'll need it to stand a chance.",
    "Find the sword, then seek out the goblin chief. May fortune guide your blade.",
    "The castle gate will open only after you've defeated all the Blue and Green Slimes."
  ], { questGiver: true, hasQuest: true, dir: 'down' });

  const merchant = new NPC(16 * TILE, 33 * TILE, 'Wandering Merchant', Sprites.merchant, [
    "Ah, a new face! I don't have much to sell today, I'm afraid.",
    "But take this health potion, on the house. Safe travels out there."
  ], { dir: 'down' });
  let merchantGaveGift = false;

  const npcs = [elder, merchant];

  const worldItems = [
    new WorldItem(3 * TILE, 16 * TILE, 'sword'),
    new WorldItem(25 * TILE + 6, 1 * TILE + 2, 'potionRed'),
    new WorldItem(3 * TILE, 19 * TILE, 'coin', { value: 5 }),
    new WorldItem(19 * TILE, 3 * TILE, 'coin', { value: 3 }),
    new WorldItem(24 * TILE, 2 * TILE, 'coin', { value: 3 }),
  ];

  let enemies = [
    new Enemy(15 * TILE, 3 * TILE, 'slimeGreen'),
    new Enemy(18 * TILE, 7 * TILE, 'slimeGreen'),
    new Enemy(8 * TILE, 15 * TILE, 'slimeBlue'),
    new Enemy(10 * TILE, 17 * TILE, 'slimeBlue'),
    new Enemy(12 * TILE, 17 * TILE, 'slimeBlue'),
    new Enemy(23 * TILE, 4 * TILE, 'slimeGreen'),
    new Enemy(25 * TILE, 4 * TILE, 'slimeGreen'),
    new Enemy(21 * TILE, 17 * TILE, 'goblinBoss', { aggroRange: 170 }),
    
    // World 2 Beach Monsters
    new Enemy(34 * TILE, 6 * TILE, 'slimeRed'),
    new Enemy(38 * TILE, 12 * TILE, 'slimeRed'),
    new Enemy(44 * TILE, 5 * TILE, 'slimeRed'),
    new Enemy(38 * TILE, 15 * TILE, 'slimeRed'),
    new Enemy(36 * TILE, 35 * TILE, 'slimeRed'),
    new Enemy(35 * TILE, 22 * TILE, 'slimeRed'),
    new Enemy(42 * TILE, 36 * TILE, 'slimeRed'),

    // World 2 — Devil Boss of the Sand Oasis
    new Enemy(50 * TILE, 40 * TILE, 'devilBoss', { aggroRange: 190 }),
  ];

  let gameState = 'start'; // 'start' | 'howtoplay' | 'playing' | 'gameover' | 'victory'
  let questStage = 0; // 0 = not talked, 1 = quest given, 2 = sword found, 3 = boss defeated
  let restartButton = null;
  let screenFlash = null; // {color, alpha}
  let toastMsg = null, toastTimer = 0;

  // --- START SCREEN STATE ---
  let startButtons = {}; 
  let howToBackButton = null;
  const AUTHOR_URL = 'https://mgodlewskidev.pl/';

  function toast(msg) { toastMsg = msg; toastTimer = 150; }

  const keys = {};
  const justPressed = {};
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (!keys[k]) justPressed[k] = true;
    keys[k] = true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  function checkInteract() {
    const reach = { x: player.x - 10, y: player.y - 10, w: player.w + 20, h: player.h + 20 };
    for (const npc of npcs) {
      if (rectsOverlap(reach, npc)) {
        dialogue.open(npc, () => {
          if (npc === elder && questStage === 0) { questStage = 1; elder.hasQuest = false; }
          if (npc === merchant && !merchantGaveGift) {
            merchantGaveGift = true;
            inventory.add('potionRed', 1);
            toast('Received: Health Potion');
          }
        });
        return;
      }
    }
  }

  function handleAttack() {
    if (!player.startAttack()) return;
    const hb = player.attackHitbox();
    enemies.forEach(en => {
      if (en.alive && rectsOverlap(hb, en)) {
        const dmg = player.hasSword ? player.atk + 2 : player.atk;
        en.takeDamage(dmg, particles);
        camera.shake(2, 4);
        
        if (!en.alive) {
          const xpGain = en.isDevil ? 250 : en.isBoss ? 50 : (en.type === 'slimeRed' ? 15 : 6);
          const goldGain = en.isDevil ? 200 : en.isBoss ? 40 : (en.type === 'slimeRed' ? 8 : randRange(1, 3) | 0);
          player.gold += goldGain;
          
          const leveled = player.gainXP(xpGain, particles);
          if (leveled) {
            toast('Level up! Now level ' + player.lvl);
            screenFlash = { color: '255,255,255', alpha: 0.3 };
          }
          
          if (en.type === 'goblinBoss') {
            questStage = 3;
            map.openWorldTwoGate();
            toast('Victory! A new world opened to the East!');
            screenFlash = { color: '232,201,60', alpha: 0.5 };
            
            // Optional: Auto-trigger a system message about the new world
            const systemNPC = new NPC(player.x, player.y, 'System', null, [
              "The Goblin Boss has been vanquished!",
              "The Gate to the East has opened. Welcome to the Sand Oasis!"
            ]);
            dialogue.open(systemNPC, () => {});
          }

          if (en.type === 'devilBoss') {
            toast('The Devil of the Oasis has fallen!');
            screenFlash = { color: '244,212,60', alpha: 0.55 };

            const systemNPC = new NPC(player.x, player.y, 'System', null, [
              "The Devil of the Sand Oasis has been vanquished!",
              "Its dark hold over the dunes is broken at last."
            ]);
            dialogue.open(systemNPC, () => {});
          }
        }
      }
    });
  }

  function update() {
    if (isMobileBlocked) return;

    if (gameState === 'start' || gameState === 'howtoplay') {
      for (const k in justPressed) delete justPressed[k];
      return;
    }

    dialogue.update();
    inventory.open && inventory.open;

    if (gameState !== 'playing') return;

    if (dialogue.isOpen()) {
      if (justPressed[' '] || justPressed['e']) dialogue.advance();
    } else if (inventory.open) {
      if (justPressed['i'] || justPressed['escape']) inventory.toggle();
    } else {
      player.update(keys, map, particles);
      if (justPressed['e']) checkInteract();
      if (keys[' ']) handleAttack();
      if (justPressed['i']) inventory.toggle();

      npcs.forEach(n => n.update());
      enemies.forEach(en => en.update(player, map, particles));

      // --- BOSS GATE LOGIC ---
      const slimesAlive = enemies.some(e => 
        (e.type === 'slimeGreen' || e.type === 'slimeBlue') && e.alive
      );

      // If all slimes in the first area are dead and the gate is closed, open it!
      if (!slimesAlive && !map.isGateOpen) {
        map.openGate();
        toast('The gate to the goblin boss has opened!');
        screenFlash = { color: '200,200,200', alpha: 0.3 };
      }
      // -----------------------

      worldItems.forEach(item => {
        item.update();
        if (!item.taken && rectsOverlap(player, item)) {
          item.taken = true;
          if (item.kind === 'sword') {
            player.hasSword = true;
            player.atk += 2;
            questStage = Math.max(questStage, 2);
            toast('Found the Iron Sword! Attack increased.');
            screenFlash = { color: '232,201,60', alpha: 0.35 };
          } else if (item.kind === 'coin') {
            player.gold += item.value;
            particles.floatText(item.x, item.y - 6, '+' + item.value + 'g', '#e8c93c');
          } else {
            inventory.add(item.kind, 1);
            toast('Picked up an item');
          }
        }
      });

      if (player.hp <= 0) {
        gameState = 'gameover';
      }
    }

    particles.update();
    camera.follow(player.centerX, player.centerY, map.cols * TILE, map.rows * TILE);

    if (screenFlash) {
      screenFlash.alpha -= 0.02;
      if (screenFlash.alpha <= 0) screenFlash = null;
    }
    if (toastTimer > 0) toastTimer--; else toastMsg = null;

    for (const k in justPressed) delete justPressed[k];
  }

  function drawVignette() {
    const grad = ctx.createRadialGradient(VIEW_W/2, VIEW_H/2, VIEW_H*0.35, VIEW_W/2, VIEW_H/2, VIEW_H*0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const BOSS_NAMES = {
    goblinBoss: 'Goblin King Grimtooth',
    devilBoss: 'Devil of the Oasis'
  };

  function getActiveBoss() {
    // Prefer a boss the player is actively engaged with (in its aggro range),
    // falling back to the nearest living boss if simply nearby on screen.
    let engaged = null, engagedDist = Infinity;
    let nearest = null, nearestDist = Infinity;
    enemies.forEach(en => {
      if (!en.isBoss || !en.alive) return;
      const d = dist(player.centerX, player.centerY, en.centerX, en.centerY);
      if (d < en.aggroRange && d < engagedDist) { engaged = en; engagedDist = d; }
      if (d < nearestDist) { nearest = en; nearestDist = d; }
    });
    if (engaged) return engaged;
    // show the banner briefly even just walking up to a boss
    if (nearest && nearestDist < Math.max(VIEW_W, VIEW_H) * 0.2) return nearest;
    return null;
  }

  function drawBossBanner() {
    const boss = getActiveBoss();
    if (!boss) return;

    const name = BOSS_NAMES[boss.type] || 'Boss';
    const pct = clamp(boss.hp / boss.maxHp, 0, 1);
    const low = pct <= 0.25;

    const barW = Math.min(340, VIEW_W - 80);
    const barH = 16;
    const x = (VIEW_W - barW) / 2;
    const nameY = 22;
    const barY = nameY + 10;

    ctx.save();
    ctx.textAlign = 'center';

    // name, with a soft drop-shadow so it reads over any background
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(name, VIEW_W / 2 + 2, nameY + 2);
    ctx.fillStyle = boss.isDevil ? '#f4a13c' : '#e8975a';
    ctx.fillText(name, VIEW_W / 2, nameY);

    // HP bar frame
    ctx.fillStyle = 'rgba(10,12,8,0.75)';
    roundRect(ctx, x - 3, barY - 3, barW + 6, barH + 6, 6);
    ctx.fill();
    ctx.strokeStyle = low && Math.floor(Date.now() / 250) % 2 === 0 ? '#da1f1f' : 'rgba(232,228,216,0.4)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - 3, barY - 3, barW + 6, barH + 6, 6);
    ctx.stroke();

    // HP bar background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, x, barY, barW, barH, 4);
    ctx.fill();

    // HP bar fill
    const fillColor = low ? '#da1f1f' : (boss.isDevil ? '#f4a13c' : '#e8975a');
    ctx.fillStyle = fillColor;
    roundRect(ctx, x, barY, Math.max(0, barW * pct), barH, 4);
    ctx.fill();

    // HP text, centered on the bar
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#f1efe8';
    ctx.fillText(`${Math.max(0, boss.hp)} / ${boss.maxHp}`, VIEW_W / 2, barY + barH - 4);

    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawHUDcanvas() {
    drawBossBanner();

    if (toastMsg) {
      ctx.save();
      const w = ctx.measureText(toastMsg).width + 40;
      const x = (VIEW_W - w) / 2;
      ctx.globalAlpha = clamp(toastTimer / 30, 0, 1);
      ctx.fillStyle = 'rgba(10,12,8,0.85)';
      roundRect(ctx, x, 16, w, 32, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,201,60,0.5)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, 16, w, 32, 8);
      ctx.stroke();
      ctx.fillStyle = '#f1efe8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(toastMsg, VIEW_W / 2, 37);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // quest tracker
    if (questStage > 0 && questStage < 3) {
      const label = questStage === 1 ? 'Quest: Find the iron sword near the pond'
                   : 'Quest: Defeat the goblin chief in the forest clearing';
      ctx.save();
      ctx.fillStyle = 'rgba(10,12,8,0.7)';
      const w = ctx.measureText(label).width + 24;
      roundRect(ctx, 12, VIEW_H - 40, w, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#e8c93c';
      ctx.font = '12px sans-serif';
      ctx.fillText(label, 24, VIEW_H - 22);
      ctx.restore();
    }
  }

  function restartGame() {
    player.x = 13 * TILE;
    player.y = 44 * TILE + 20;
    
    player.hp = player.maxHp;
    player.xp = 0;
    player.xpNext = 10;
    player.lvl = 1;
    player.gold = 0;
    player.atk = 3;
    player.hasSword = false;
    player.attacking = 0;
    player.attackCooldown = 0;
    player.invuln = 0;

    questStage = 0;
    gameState = 'playing';

    merchantGaveGift = false;

    worldItems.forEach(item => {
      item.taken = false;
    });

    enemies = [
      new Enemy(15 * TILE, 3 * TILE, 'slimeGreen'),
      new Enemy(18 * TILE, 7 * TILE, 'slimeGreen'),
      new Enemy(8 * TILE, 15 * TILE, 'slimeBlue'),
      new Enemy(10 * TILE, 17 * TILE, 'slimeBlue'),
      new Enemy(23 * TILE, 4 * TILE, 'slimeGreen'),
      new Enemy(21 * TILE, 17 * TILE, 'goblinBoss', { aggroRange: 170 }),
      new Enemy(34 * TILE, 6 * TILE, 'slimeRed'),
      new Enemy(38 * TILE, 12 * TILE, 'slimeRed'),
      new Enemy(44 * TILE, 5 * TILE, 'slimeRed'),
      new Enemy(45 * TILE, 3 * TILE, 'slimeRed')
    ];

    toastMsg = null;
    toastTimer = 0;
    restartButton = null;
  }

  function drawEndScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    
    if (gameState === 'gameover') {
      ctx.fillStyle = '#f09595';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('You were defeated', VIEW_W / 2, VIEW_H / 2 - 10);
      ctx.fillStyle = '#c9c5b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Try again and save the village!', VIEW_W / 2, VIEW_H / 2 + 20);
    } 

    const bw = 150;
    const bh = 38;
    const bx = VIEW_W / 2 - bw / 2;
    const by = VIEW_H / 2 + 55;

    ctx.fillStyle = '#3a6b3d';
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();

    ctx.strokeStyle = '#3a6b3d';
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.stroke();

    ctx.fillStyle = '#f1efe8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Play Again', VIEW_W / 2, by + 25);

    restartButton = { x: bx, y: by, w: bw, h: bh };
      
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawButton(bx, by, bw, bh, label, fill, textColor) {
    ctx.fillStyle = fill;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.stroke();
    ctx.fillStyle = textColor || '#f1efe8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 5);
    ctx.textAlign = 'left';
    return { x: bx, y: by, w: bw, h: bh };
  }

  function drawStartScreen() {
    ctx.save();
    const off = camera.getOffset();
    const camX = Math.round(off.x), camY = Math.round(off.y);
    map.drawGround(ctx, camX, camY, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(8,10,7,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('Shattered Vale RPG Game', VIEW_W / 2 + 2, VIEW_H / 2 - 88 + 2);
    ctx.fillStyle = '#e8c93c';
    ctx.fillText('Shattered Vale RPG Game', VIEW_W / 2, VIEW_H / 2 - 88);

    ctx.fillStyle = '#c9c5b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('A tiny village-defense adventure', VIEW_W / 2, VIEW_H / 2 - 58);

    const bw = 190, bh = 42, gap = 14;
    const bx = VIEW_W / 2 - bw / 2;
    let by = VIEW_H / 2 - 10;

    const playBtn = drawButton(bx, by, bw, bh, 'Play', '#3a6b3d');
    by += bh + gap;
    const howToBtn = drawButton(bx, by, bw, bh, 'How to Play', '#3a5a7a');
    by += bh + gap;
    const authorBtn = drawButton(bx, by, bw, bh, 'Author', '#5a4a3a');

    ctx.restore();

    startButtons = { play: playBtn, howto: howToBtn, author: authorBtn };
  }

  function drawHowToPlayScreen() {
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,5,0.92)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const panelW = Math.min(420, VIEW_W - 40);
    const panelH = 400;
    const px = (VIEW_W - panelW) / 2;
    const py = (VIEW_H - panelH) / 2;

    ctx.fillStyle = 'rgba(20,22,16,0.95)';
    roundRect(ctx, px, py, panelW, panelH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,228,216,0.3)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, px, py, panelW, panelH, 10);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8c93c';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('How to Play', VIEW_W / 2, py + 34);

    ctx.textAlign = 'left';
    ctx.font = '14px sans-serif';
    const lines = [
      ['Move', 'WASD or Arrow Keys'],
      ['Attack', 'Space'],
      ['Interact / Talk', 'E'],
      ['Inventory', 'I'],
      ['Advance dialogue', 'Space or E'],
    ];
    let ly = py + 68;
    lines.forEach(([label, val]) => {
      ctx.fillStyle = '#e8c93c';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(label, px + 24, ly);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '13px sans-serif';
      const wrapped = wrapPlain(ctx, val, panelW - 48);
      wrapped.forEach((wline, i) => {
        ctx.fillText(wline, px + 24, ly + 18 + i * 17);
      });
      ly += 18 + wrapped.length * 17 + 6;
    });

    const bw = 140, bh = 36;
    const bx = VIEW_W / 2 - bw / 2;
    const by = py + panelH - bh - 18;
    howToBackButton = drawButton(bx, by, bw, bh, 'Back', '#3a6b3d');

    ctx.restore();
  }

  function wrapPlain(ctx, text, maxWidth) {
    const words = text.split(' ');
    const out = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    return out;
  }

  function draw() {
    if (isMobileBlocked) { drawMobileBlockScreen(); return; }

    if (gameState === 'start') { drawStartScreen(); return; }
    if (gameState === 'howtoplay') { drawStartScreen(); drawHowToPlayScreen(); return; }

    const t = Date.now();
    const off = camera.getOffset();
    const camX = Math.round(off.x), camY = Math.round(off.y);

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    map.drawGround(ctx, camX, camY, VIEW_W, VIEW_H);
    map.drawAnimated(ctx, camX, camY, VIEW_W, VIEW_H, t);

    // depth-sorted draw: items, npcs, enemies, player all sorted by y (feet position)
    const drawables = [];
    worldItems.forEach(it => { if (!it.taken) drawables.push({ y: it.y + it.h, draw: () => it.draw(ctx, camX, camY) }); });
    npcs.forEach(n => drawables.push({ y: n.y + n.h, draw: () => n.draw(ctx, camX, camY) }));
    enemies.forEach(en => drawables.push({ y: en.y + en.h, draw: () => en.draw(ctx, camX, camY) }));
    drawables.push({ y: player.y + player.h, draw: () => player.draw(ctx, camX, camY) });
    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(d => d.draw());

    particles.draw(ctx, camX, camY);
    drawVignette();

    if (screenFlash) {
      ctx.fillStyle = `rgba(${screenFlash.color},${Math.max(0, screenFlash.alpha)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    drawHUDcanvas();
    dialogue.draw(ctx, VIEW_W, VIEW_H);
    inventory.draw(ctx, VIEW_W, VIEW_H);

    if (gameState === 'gameover') drawEndScreen();
  }

  function updateDOM() {
    hpBar.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp}/${player.maxHp}`;
    xpBar.style.width = (player.xp / player.xpNext * 100) + '%';
    xpText.textContent = `${player.xp} / ${player.xpNext} Exp`;
    lvlText.textContent = player.lvl;
    goldText.textContent = player.gold;
  }

  let domTick = 0;
  function loop() {
    update();
    draw();
    domTick++;
    if (domTick % 4 === 0 && !isMobileBlocked) updateDOM();
    requestAnimationFrame(loop);
  }

  function pointInBtn(mx, my, btn) {
    return btn && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
  }

  canvas.tabIndex = 0;
  canvas.addEventListener('mousemove', e => {
    if (isMobileBlocked) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (gameState === 'playing' && inventory.open) {
      inventory.updateHover(mx, my, VIEW_W, VIEW_H);
      canvas.style.cursor = 'default';
      return;
    }

    if (gameState !== 'start' && gameState !== 'howtoplay' && gameState !== 'gameover' && gameState !== 'victory') {
      canvas.style.cursor = 'default';
      return;
    }
    let over = false;
    if (gameState === 'start') {
      over = pointInBtn(mx, my, startButtons.play) || pointInBtn(mx, my, startButtons.howto) || pointInBtn(mx, my, startButtons.author);
    } else if (gameState === 'howtoplay') {
      over = pointInBtn(mx, my, howToBackButton);
    } else {
      over = pointInBtn(mx, my, restartButton);
    }
    canvas.style.cursor = over ? 'pointer' : 'default';
  });
  canvas.addEventListener('click', e => {
    canvas.focus();

    if (isMobileBlocked) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (gameState === 'playing' && inventory.open) {
      const clickedKind = inventory.clickAt(mx, my, VIEW_W, VIEW_H);
      if (clickedKind === 'potionRed') {
        const used = inventory.usePotionRed(player);
        if (used) {
          particles.floatText(player.centerX, player.y - 10, 'Healed!', '#f09595');
          toast('Drank a Health Potion — HP restored!');
        }
      }
      return;
    }

    if (gameState === 'start') {
      if (pointInBtn(mx, my, startButtons.play)) {
        gameState = 'playing';
        setHudVisible(true);
      } else if (pointInBtn(mx, my, startButtons.howto)) {
        gameState = 'howtoplay';
      } else if (pointInBtn(mx, my, startButtons.author)) {
        window.open(AUTHOR_URL, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (gameState === 'howtoplay') {
      if (pointInBtn(mx, my, howToBackButton)) {
        gameState = 'start';
      }
      return;
    }

    if ((gameState !== 'gameover' && gameState !== 'victory') || !restartButton) return;

    if (
      mx >= restartButton.x &&
      mx <= restartButton.x + restartButton.w &&
      my >= restartButton.y &&
      my <= restartButton.y + restartButton.h
    ) {
      restartGame();
    }
  });
  canvas.focus();
  loop();
})();