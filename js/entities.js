// entities.js — Player, NPC, Enemy classes

class AnimatedSprite {
  constructor(sheet, frameW, frameH, dirRows = true) {
    this.sheet = sheet;
    this.fw = frameW; this.fh = frameH;
    this.dirRows = dirRows;
    this.frame = 0;
    this.frameTimer = 0;
    this.frameSpeed = 8;
  }
  update(moving) {
    if (!moving) { this.frame = 0; return; }
    this.frameTimer++;
    if (this.frameTimer >= this.frameSpeed) {
      this.frameTimer = 0;
      this.frame = (this.frame + 1) % 4;
    }
  }
  draw(ctx, x, y, dir, flashWhite = false) {
    const dirIndex = { down: 0, left: 1, right: 2, up: 3 };
    const row = this.dirRows ? dirIndex[dir] : 0;
    ctx.drawImage(this.sheet, this.frame * this.fw, row * this.fh, this.fw, this.fh, x, y, this.fw, this.fh);
    if (flashWhite) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(x, y, this.fw, this.fh);
      ctx.restore();
    }
  }
}

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 22; this.h = 26;
    this.drawW = 32; this.drawH = 34;
    this.speed = 2.6;
    this.dir = 'down';
    this.moving = false;
    this.hp = 12; this.maxHp = 12;
    this.atk = 3;
    this.lvl = 1; this.xp = 0; this.xpNext = 10;
    this.gold = 0;
    this.hasSword = false;
    this.attacking = 0;
    this.attackCooldown = 0;
    this.invuln = 0;
    this.anim = new AnimatedSprite(Sprites.player, 32, 34);
    this.animSword = new AnimatedSprite(Sprites.playerSword, 32, 34);
    this.footstepTimer = 0;
    this.bob = 0;
    this.hitFlash = 0;
    this.mana = 100;
    this.maxMana = 100;
    this.manaRegen = 0.01;
    this.fireballCooldown = 0;
    this.fireballs = [];
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  tryMove(dx, dy, map) {
    if (dx !== 0) {
      const nx = this.x + dx;
      const corners = [[nx + 4, this.y + 10], [nx + this.w - 4, this.y + 10],
                        [nx + 4, this.y + this.h], [nx + this.w - 4, this.y + this.h]];
      if (!corners.some(([cx, cy]) => map.isSolid(Math.floor(cx / TILE), Math.floor(cy / TILE)))) {
        this.x = nx;
      }
    }
    if (dy !== 0) {
      const ny = this.y + dy;
      const corners = [[this.x + 4, ny + 10], [this.x + this.w - 4, ny + 10],
                        [this.x + 4, ny + this.h], [this.x + this.w - 4, ny + this.h]];
      if (!corners.some(([cx, cy]) => map.isSolid(Math.floor(cx / TILE), Math.floor(cy / TILE)))) {
        this.y = ny;
      }
    }
  }

  update(keys, map, particles) {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) { dy = -this.speed; this.dir = 'up'; }
    else if (keys['s'] || keys['arrowdown']) { dy = this.speed; this.dir = 'down'; }
    if (keys['a'] || keys['arrowleft']) { dx = -this.speed; this.dir = 'left'; }
    else if (keys['d'] || keys['arrowright']) { dx = this.speed; this.dir = 'right'; }

    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      // normalize diagonal speed
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
      this.tryMove(dx, dy, map);
      this.footstepTimer++;
      if (this.footstepTimer > 14) {
        this.footstepTimer = 0;
        const tile = map.get(Math.floor(this.centerX / TILE), Math.floor((this.y + this.h) / TILE));
        if (tile === TileType.GRASS) particles.sparkle(this.centerX, this.y + this.h, 'rgba(255,255,255,0.5)');
      }
    }

    this.anim.update(this.moving);
    this.animSword.update(this.moving);
if (this.attacking > 0) this.attacking--;
if (this.attackCooldown > 0) this.attackCooldown--;
if (this.invuln > 0) this.invuln--;
if (this.hitFlash > 0) this.hitFlash--;

// Fireball cooldown
if (this.fireballCooldown > 0) {
  this.fireballCooldown--;
}

// Mana regeneration
if (this.mana < this.maxMana) {
  this.mana = Math.min(
    this.maxMana,
    this.mana + this.manaRegen
  );
}
    this.bob = this.moving ? Math.sin(Date.now() / 90) * 1.5 : 0;
  }

  attackHitbox() {
    const range = 24;
    let ax = this.x, ay = this.y;
    if (this.dir === 'up') ay -= range;
    if (this.dir === 'down') ay += range;
    if (this.dir === 'left') ax -= range;
    if (this.dir === 'right') ax += range;
    return { x: ax, y: ay, w: this.w, h: this.h };
  }

  startAttack() {
    if (this.attackCooldown > 0) return false;
    this.attacking = 14;
    this.attackCooldown = 20;
    return true;
  }

  takeDamage(amount, particles) {
    if (this.invuln > 0) return;
    this.hp = clamp(this.hp - amount, 0, this.maxHp);
    this.invuln = 45;
    this.hitFlash = 12;
    particles.burst(this.centerX, this.centerY, '#e24b4a', 8);
    particles.floatText(this.centerX, this.y - 4, '-' + amount, '#f09595');
  }

  gainXP(amount, particles) {
    this.xp += amount;
    particles.floatText(this.centerX, this.y - 10, '+' + amount + ' XP', '#85b7eb');
    let leveled = false;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.lvl++;
      this.xpNext = Math.floor(this.xpNext * 1.4) + 4;
      this.maxHp += 3;
      this.hp = this.maxHp;
      this.atk += 1;
      leveled = true;
    }
    return leveled;
  }

  draw(ctx, camX, camY) {
    const sprite = this.hasSword ? this.animSword : this.anim;
    const drawX = this.x - camX - (this.drawW - this.w) / 2;
    const drawY = this.y - camY - (this.drawH - this.h) + 4 + this.bob;
    const flash = this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0;
    ctx.save();
    if (this.invuln > 0) ctx.globalAlpha = 0.55;
    sprite.draw(ctx, drawX, drawY, this.dir, flash);
    ctx.restore();

    if (this.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = (this.hitFlash / 12) * 0.55;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#e24b4a';
      ctx.fillRect(drawX, drawY, this.drawW, this.drawH);
      ctx.restore();
    }

    if (this.attacking > 0) {
      const hb = this.attackHitbox();
      ctx.save();
      ctx.globalAlpha = this.attacking / 14 * 0.5;
      ctx.fillStyle = '#f1efe8';
      ctx.beginPath();
      ctx.ellipse(hb.x - camX + hb.w / 2, hb.y - camY + hb.h / 2, 20, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  castFireball() {

    if (this.mana < 30) {
      return false;
    }

    if (this.fireballCooldown > 0) {
      return false;
    }

    this.mana -= 30;
    this.fireballCooldown = 25;


    let dx = 0;
    let dy = 1;

    if (this.dir === "up") dy = -1;
    if (this.dir === "down") dy = 1;
    if (this.dir === "left") {
      dx = -1;
      dy = 0;
    }
    if (this.dir === "right") {
      dx = 1;
      dy = 0;
    }


    this.fireballs.push(
      new Fireball(
        this.centerX,
        this.centerY,
        dx,
        dy
      )
    );

    return true;
  }
}

class NPC {
  constructor(x, y, name, sheet, dialogue, opts = {}) {
    this.x = x; this.y = y;
    this.w = 24; this.h = 28;
    this.name = name;
    this.dialogue = dialogue;
    this.anim = new AnimatedSprite(sheet, 32, 34);
    this.dir = opts.dir || 'down';
    this.questGiver = opts.questGiver || false;
    this.hasQuest = opts.hasQuest || false;
    this.bob = 0;
    this.t = Math.random() * 100;
  }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
  update() { this.t += 0.02; this.bob = Math.sin(this.t) * 1.2; }
  draw(ctx, camX, camY) {
    const drawX = this.x - camX - 4;
    const drawY = this.y - camY - 8 + this.bob;
    this.anim.draw(ctx, drawX, drawY, this.dir, false);
  }
}

class Enemy {
  constructor(x, y, type, opts = {}) {
    this.x = x; this.y = y;
    this.type = type; // 'slimeGreen' | 'slimeBlue' | 'slimeRed' | 'goblinBoss' | 'devilBoss'
    this.isDevil = type === 'devilBoss';
    this.isBoss = type === 'goblinBoss' || this.isDevil;
    if (this.isDevil) {
      this.w = 30; this.h = 32; this.drawW = 40; this.drawH = 42;
      this.hp = 200; this.maxHp = 200; this.speed = 1.3; this.contactDmg = 4; this.atkRange = 34;
      this.anim = new AnimatedSprite(Sprites.devil, 40, 42);
      this.dir = 'down';
    } else if (this.isBoss) {
      this.w = 30; this.h = 32; this.drawW = 40; this.drawH = 42;
      this.hp = 130; this.maxHp = 130; this.speed = 1.15; this.contactDmg = 3; this.atkRange = 30;
      this.anim = new AnimatedSprite(Sprites.goblin, 40, 42);
      this.dir = 'down';
    } else {
      this.w = 20; this.h = 18; this.drawW = 32; this.drawH = 28;
      
      if (type === 'slimeRed') {
        this.hp = 8;
        this.maxHp = 8;
        this.speed = 1.05;
        this.contactDmg = 2;
        this.atkRange = 22;
        this.anim = new AnimatedSprite(Sprites.slimeRed, 32, 28, false);
      } else {
        this.hp = 5;
        this.maxHp = 5;
        this.speed = 0.9;
        this.contactDmg = 1;
        this.atkRange = 20;
        this.anim = new AnimatedSprite(
          type === 'slimeBlue' ? Sprites.slimeBlue : Sprites.slimeGreen,
          32,
          28,
          false
        );
      }
    }
    this.alive = true;
    this.hitFlash = 0;
    this.atkCd = 0;
    this.aggroRange = opts.aggroRange || 150;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.homeX = x; this.homeY = y;
    this.deathTimer = 0;
    this.telegraphing = 0;
  }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  attackHitbox() {
    const range = this.atkRange;
    let ax = this.x, ay = this.y;
    if (this.dir === 'up') ay -= range;
    if (this.dir === 'down') ay += range;
    if (this.dir === 'left') ax -= range;
    if (this.dir === 'right') ax += range;
    return { x: ax, y: ay, w: this.w, h: this.h };
  }

  update(player, map, particles) {
    if (!this.alive) { this.deathTimer++; return; }
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.atkCd > 0) this.atkCd--;
    if (this.telegraphing > 0) {
      this.telegraphing--;
      if (this.telegraphing === 0 && rectsOverlap(player, this.attackHitbox())) {
        player.takeDamage(this.contactDmg, particles);
        this.atkCd = this.isBoss ? 55 : 40;
      }
    }

    const d = dist(this.centerX, this.centerY, player.centerX, player.centerY);
    let mx = 0, my = 0;

    if (d < this.aggroRange) {
      const ddx = player.centerX - this.centerX, ddy = player.centerY - this.centerY;
      const len = Math.hypot(ddx, ddy) || 1;
      if (d < this.atkRange) {
        // stand beside the player and telegraph an attack instead of overlap-walking into them
        if (this.telegraphing === 0 && this.atkCd === 0) this.telegraphing = this.isBoss ? 30 : 22;
      } else {
        mx = (ddx / len) * this.speed;
        my = (ddy / len) * this.speed;
      }
      this.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up');
    } else {
      // gentle wander near home
      this.wanderTimer++;
      if (this.wanderTimer > 90) { this.wanderTimer = 0; this.wanderAngle = Math.random() * Math.PI * 2; }
      if (dist(this.x, this.y, this.homeX, this.homeY) > 50) {
        const ddx = this.homeX - this.x, ddy = this.homeY - this.y;
        const len = Math.hypot(ddx, ddy) || 1;
        mx = (ddx / len) * this.speed * 0.4; my = (ddy / len) * this.speed * 0.4;
      } else {
        mx = Math.cos(this.wanderAngle) * this.speed * 0.3;
        my = Math.sin(this.wanderAngle) * this.speed * 0.3;
      }
    }

    if (mx !== 0 || my !== 0) {
      const nx = this.x + mx, ny = this.y + my;
      if (!map.isSolid(Math.floor((nx + this.w/2) / TILE), Math.floor((ny + this.h/2) / TILE))) {
        this.x = nx; this.y = ny;
      }
    }

    this.anim.update((mx !== 0 || my !== 0) && this.telegraphing === 0);

    // contact damage is now fully handled by the telegraph/attackHitbox flow above;
    // enemies stop at range and attack rather than dealing damage on body overlap.
  }

  takeDamage(amount, particles) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlash = 8;
    let hitColor = '#a8e07a';
    if (this.isDevil) hitColor = '#f4d43c';
    else if (this.isBoss) hitColor = '#e8975a';
    else if (this.type === 'slimeRed') hitColor = '#e24b4a';

    particles.burst(this.centerX, this.centerY, hitColor, 7);
    particles.floatText(this.centerX, this.y - 2, '-' + amount, '#f1efe8', this.isBoss ? 15 : 12);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      let deathColor = '#a8e07a';
      if (this.isDevil) deathColor = '#f4d43c';
      else if (this.isBoss) deathColor = '#e8975a';
      else if (this.type === 'slimeRed') deathColor = '#e24b4a';

      particles.burst(
        this.centerX,
        this.centerY,
        deathColor,
        this.isBoss ? 24 : 12,
        { gravity: 0.15 }
      );
    }
  }

  draw(ctx, camX, camY) {
    if (!this.alive) {
      if (this.deathTimer > 14) return;
      ctx.save();
      ctx.globalAlpha = 1 - this.deathTimer / 14;
      const drawX = this.x - camX - (this.drawW - this.w) / 2;
      const drawY = this.y - camY - (this.drawH - this.h) + (this.isBoss ? 0 : 4) - this.deathTimer;
      this.anim.draw(ctx, drawX, drawY, this.dir, false);
      ctx.restore();
      return;
    }
    const drawX = this.x - camX - (this.drawW - this.w) / 2;
    const drawY = this.y - camY - (this.drawH - this.h) + (this.isBoss ? 0 : 4);
    const flash = this.hitFlash > 0;
    if (this.telegraphing > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.telegraphing / 3) * 0.15;
      ctx.fillStyle = '#e24b4a';
      ctx.beginPath();
      ctx.ellipse(this.centerX - camX, this.centerY - camY, this.atkRange * 0.6, this.atkRange * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.anim.draw(ctx, drawX, drawY, this.dir, flash);

    // HP bar
    if (this.hp < this.maxHp) {
      const barW = this.w + 4;
      const bx = this.centerX - camX - barW / 2, by = drawY - 7;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, 4);
      ctx.fillStyle =
        this.isDevil ? '#f4a13c' :
        this.isBoss ? '#e24b4a' :
        this.type === 'slimeRed' ? '#e24b4a' :
        '#97c459';
      ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), 4);
    }
  }
}

class Fireball {
  constructor(x, y, dirX, dirY) {
    this.x = x;
    this.y = y;
    this.w = 18;
    this.h = 18;

    this.speed = 8;
    this.damage = 12;

    this.dirX = dirX;
    this.dirY = dirY;

    this.life = 90;
  }

  update(enemies, particles) {
    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;

    this.life--;

    enemies.forEach(en => {
      if (en.alive && rectsOverlap(this, en)) {
        en.takeDamage(this.damage, particles);

        particles.floatText(
          en.x,
          en.y - 10,
          "-" + this.damage,
          "#ff6b2c"
        );

        this.life = 0;
      }
    });
  }

  draw(ctx, camX, camY) {
    ctx.save();

    ctx.fillStyle = "#ff7b22";
    ctx.beginPath();
    ctx.arc(
      this.x - camX + this.w / 2,
      this.y - camY + this.h / 2,
      9,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#ffd35a";
    ctx.beginPath();
    ctx.arc(
      this.x - camX + this.w / 2,
      this.y - camY + this.h / 2,
      4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }
}