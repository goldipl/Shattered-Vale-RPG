// entities/enemy.js — every monster in the game (grunts and bosses alike)
// is one class parameterized by `type`. Per-type stats (hp, speed, damage,
// sprite, hitbox size) come from ENEMY_DEFS in config/balance.js; this file
// is only the shared behavior: wander/aggro AI, telegraphed attacks, and
// taking damage.

// Hit/death particle-burst color, by enemy category. Both effects used the
// same lookup in the original code (it was just written out twice) — pulled
// into one table here.
const ENEMY_FX_COLOR = {
  skeletonKing: '#e8e2d0',
  devilBoss: '#f4d43c',
  slimeRed: '#e24b4a',
  slimeJungle: '#2fae4a',
  spider: '#8a5ec9',
  skeleton: '#d8d2c0',
  trollChieftain: '#8fae5a',
  pitDevil: '#ff6a1e',
};
const DEFAULT_ENEMY_FX_COLOR = '#a8e07a';
const BOSS_FX_COLOR = '#e8975a'; // any boss not covered by a more specific entry above

function getEnemyFxColor(enemy) {
  if (ENEMY_FX_COLOR[enemy.type]) return ENEMY_FX_COLOR[enemy.type];
  if (enemy.isBoss) return BOSS_FX_COLOR;
  return DEFAULT_ENEMY_FX_COLOR;
}

// The HP bar uses a related but slightly different palette (e.g. bosses in
// general read as red here, not the amber used for hit/death sparks).
function getEnemyHpBarColor(enemy) {
  if (enemy.isSkeletonKing) return '#e8e2d0';
  if (enemy.type === 'pitDevil') return '#ff6a1e';
  if (enemy.type === 'trollChieftain') return '#8fae5a';
  if (enemy.isDevil) return '#f4a13c';
  if (enemy.isBoss) return '#e24b4a';
  if (enemy.type === 'slimeRed') return '#e24b4a';
  if (enemy.type === 'slimeJungle') return '#2fae4a';
  if (enemy.type === 'spider') return '#8a5ec9';
  return '#97c459';
}

class Enemy {
  constructor(x, y, type, opts = {}) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.isDevil = type === 'devilBoss';
    this.isSkeletonKing = type === 'skeletonKing';
    this.isBoss = BOSS_TYPES.has(type);

    const def = ENEMY_DEFS[type];
    this.w = def.w;
    this.h = def.h;
    this.drawW = def.drawW;
    this.drawH = def.drawH;
    this.hp = opts.hp || def.hp;
    this.maxHp = this.hp;
    this.speed = def.speed;
    this.contactDmg = def.contactDmg;
    this.atkRange = def.atkRange;
    this.anim = new AnimatedSprite(Sprites[def.spriteKey], def.frameW, def.frameH, def.dirRows);
    this.dir = 'down';

    this.alive = true;
    this.hitFlash = 0;
    this.atkCd = 0;
    this.aggroRange = opts.aggroRange || DEFAULT_AGGRO_RANGE;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.homeX = x;
    this.homeY = y;
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
    if (!this.alive) {
      this.deathTimer++;
      return;
    }
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
      if (this.wanderTimer > 90) {
        this.wanderTimer = 0;
        this.wanderAngle = Math.random() * Math.PI * 2;
      }
      if (dist(this.x, this.y, this.homeX, this.homeY) > 50) {
        const ddx = this.homeX - this.x, ddy = this.homeY - this.y;
        const len = Math.hypot(ddx, ddy) || 1;
        mx = (ddx / len) * this.speed * 0.4;
        my = (ddy / len) * this.speed * 0.4;
      } else {
        mx = Math.cos(this.wanderAngle) * this.speed * 0.3;
        my = Math.sin(this.wanderAngle) * this.speed * 0.3;
      }
    }

    if (mx !== 0 || my !== 0) {
      const nx = this.x + mx, ny = this.y + my;
      if (!map.isSolid(Math.floor((nx + this.w / 2) / TILE), Math.floor((ny + this.h / 2) / TILE))) {
        this.x = nx;
        this.y = ny;
      }
    }

    this.anim.update((mx !== 0 || my !== 0) && this.telegraphing === 0);

    // contact damage is fully handled by the telegraph/attackHitbox flow
    // above; enemies stop at range and attack rather than dealing damage on
    // body overlap.
  }

  takeDamage(amount, particles) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlash = 8;

    const fxColor = getEnemyFxColor(this);
    particles.burst(this.centerX, this.centerY, fxColor, 7);
    particles.floatText(this.centerX, this.y - 2, '-' + amount, '#f1efe8', this.isBoss ? 15 : 12);

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      particles.burst(this.centerX, this.centerY, fxColor, this.isBoss ? 24 : 12, { gravity: 0.15 });
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
      ctx.fillStyle = getEnemyHpBarColor(this);
      ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), 4);
    }
  }
}
