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

  initSprites();

  const map = new TileMap(28, 22);
  const camera = new Camera(VIEW_W, VIEW_H);
  const particles = new ParticleSystem();
  const dialogue = new DialogueSystem();
  const inventory = new Inventory();

  const player = new Player(13 * TILE, 9 * TILE + 20);

  const elder = new NPC(9 * TILE, 9 * TILE, 'Elder Rowan', Sprites.elder, [
    "Traveler, thank the stars you've come.",
    "A goblin chief has made camp in the forest clearing to the southeast, terrorizing our village.",
    "Legend says an iron sword lies hidden near the pond to the east — you'll need it to stand a chance.",
    "Find the sword, then seek out the goblin chief. May fortune guide your blade."
  ], { questGiver: true, hasQuest: true, dir: 'down' });

  const merchant = new NPC(15 * TILE, 4 * TILE, 'Wandering Merchant', Sprites.merchant, [
    "Ah, a new face! I don't have much to sell today, I'm afraid.",
    "But take this health potion, on the house. Safe travels out there."
  ], { dir: 'down' });
  let merchantGaveGift = false;

  const npcs = [elder, merchant];

  const worldItems = [
    new WorldItem(21 * TILE + 6, 12 * TILE + 6, 'sword'),
    new WorldItem(6 * TILE, 16 * TILE, 'coin', { value: 5 }),
    new WorldItem(19 * TILE, 4 * TILE, 'coin', { value: 3 }),
    new WorldItem(24 * TILE, 6 * TILE, 'coin', { value: 3 }),
  ];

  let enemies = [
    new Enemy(15 * TILE, 3 * TILE, 'slimeGreen'),
    new Enemy(18 * TILE, 7 * TILE, 'slimeGreen'),
    new Enemy(8 * TILE, 15 * TILE, 'slimeBlue'),
    new Enemy(10 * TILE, 17 * TILE, 'slimeBlue'),
    new Enemy(23 * TILE, 4 * TILE, 'slimeGreen'),
    new Enemy(21 * TILE, 17 * TILE, 'goblinBoss', { aggroRange: 170 }),
  ];

  let gameState = 'playing'; // 'playing' | 'gameover' | 'victory'
  let questStage = 0; // 0 = not talked, 1 = quest given, 2 = sword found, 3 = boss defeated
  let restartButton = null;
  let screenFlash = null; // {color, alpha}
  let toastMsg = null, toastTimer = 0;

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
    let hitSomething = false;
    enemies.forEach(en => {
      if (en.alive && rectsOverlap(hb, en)) {
        const dmg = player.hasSword ? player.atk + 2 : player.atk;
        en.takeDamage(dmg, particles);
        hitSomething = true;
        camera.shake(2, 4);
        if (!en.alive) {
          const xpGain = en.isBoss ? 30 : 6;
          const goldGain = en.isBoss ? 20 : randRange(1, 3) | 0;
          player.gold += goldGain;
          const leveled = player.gainXP(xpGain, particles);
          if (leveled) {
            toast('Level up! Now level ' + player.lvl);
            screenFlash = { color: '255,255,255', alpha: 0.3 };
          }
          if (en.isBoss) {
            questStage = 3;
            gameState = 'victory';
          }
        }
      }
    });
  }

  function update() {
    dialogue.update();
    inventory.open && inventory.open; // no-op, panel is static while open

    if (gameState !== 'playing') return;

    if (dialogue.isOpen()) {
      if (justPressed[' '] || justPressed['e']) dialogue.advance();
    } else if (inventory.open) {
      if (justPressed['i']) inventory.toggle();
    } else {
      player.update(keys, map, particles);
      if (justPressed['e']) checkInteract();
      if (keys[' ']) handleAttack();
      if (justPressed['i']) inventory.toggle();

      npcs.forEach(n => n.update());
      enemies.forEach(en => en.update(player, map, particles));
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

  function drawHUDcanvas() {
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
  player.y = 9 * TILE + 20;

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
      ctx.fillText(
        'Try again and save the village!',
        VIEW_W / 2,
        VIEW_H / 2 + 20
      );

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
      ctx.fillText(
        'Play Again',
        VIEW_W / 2,
        by + 25
      );

      restartButton = {
        x: bx,
        y: by,
        w: bw,
        h: bh
      };
    } else {
      ctx.fillStyle = '#a8e07a';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('Victory! The village is saved', VIEW_W / 2, VIEW_H / 2 - 16);
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '15px sans-serif';
      ctx.fillText(`Level ${player.lvl} · ${player.gold} gold collected`, VIEW_W / 2, VIEW_H / 2 + 14);
      ctx.fillStyle = '#8a8578';
      ctx.font = '12px sans-serif';
      ctx.fillText('Refresh the page to play again', VIEW_W / 2, VIEW_H / 2 + 40);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function draw() {
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

    if (gameState !== 'playing') drawEndScreen();
  }

  function updateDOM() {
    hpBar.style.width = (player.hp / player.maxHp * 100) + '%';
    hpText.textContent = `${player.hp}/${player.maxHp}`;
    xpBar.style.width = (player.xp / player.xpNext * 100) + '%';
    lvlText.textContent = player.lvl;
    goldText.textContent = player.gold;
  }

  let domTick = 0;
  function loop() {
    update();
    draw();
    domTick++;
    if (domTick % 4 === 0) updateDOM();
    requestAnimationFrame(loop);
  }

  canvas.tabIndex = 0;
  canvas.addEventListener('click', e => {
    canvas.focus();

    if (gameState !== 'gameover' || !restartButton) return;

    const rect = canvas.getBoundingClientRect();

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

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
