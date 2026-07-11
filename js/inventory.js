// inventory.js — item pickups in the world + toggleable inventory panel

class WorldItem {
  constructor(x, y, kind, opts = {}) {
    this.x = x; this.y = y;
    this.w = 20; this.h = 20;
    this.kind = kind; // 'sword' | 'potionRed' | 'coin' | 'key' | 'shield'
    this.taken = false;
    this.bobT = Math.random() * 10;
    this.value = opts.value || 1;
    this.pickupText = opts.pickupText || null;
  }
  update() { this.bobT += 0.06; }
  draw(ctx, camX, camY) {
    if (this.taken) return;
    const icon = Sprites.icons[this.kind];
    const bob = Math.sin(this.bobT) * 3;
    const px = this.x - camX, py = this.y - camY + bob;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#e8c93c';
    ctx.beginPath();
    ctx.ellipse(px + this.w/2, py + this.h/2, 12, 12, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowColor = 'rgba(232,201,60,0.6)';
    ctx.shadowBlur = 8;
    ctx.drawImage(icon, px - 2, py - 2, this.w + 4, this.h + 4);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

class Inventory {
  constructor() {
    this.items = {}; // kind -> count
    this.open = false;
  }
  add(kind, count = 1) {
    this.items[kind] = (this.items[kind] || 0) + count;
  }
  toggle() { this.open = !this.open; }

  draw(ctx, canvasW, canvasH) {
    if (!this.open) return;
    const w = 260, h = 220;
    const x = (canvasW - w) / 2, y = (canvasH - h) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = 'rgba(20,22,16,0.95)';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,228,216,0.3)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();

    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Inventory', x + 18, y + 28);
    ctx.strokeStyle = 'rgba(232,228,216,0.2)';
    ctx.beginPath(); ctx.moveTo(x+18, y+38); ctx.lineTo(x+w-18, y+38); ctx.stroke();

    const kinds = Object.keys(this.items);
    if (kinds.length === 0) {
      ctx.fillStyle = 'rgba(232,228,216,0.5)';
      ctx.font = '13px sans-serif';
      ctx.fillText('No items yet — explore to find some.', x + 18, y + 70);
    } else {
      kinds.forEach((kind, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const ix = x + 18 + col * 56, iy = y + 52 + row * 56;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundRect(ctx, ix, iy, 44, 44, 6);
        ctx.fill();
        const icon = Sprites.icons[kind];
        if (icon) ctx.drawImage(icon, ix + 10, iy + 10, 24, 24);
        ctx.fillStyle = '#e8e4d8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('x' + this.items[kind], ix + 40, iy + 40);
        ctx.textAlign = 'left';
      });
    }

    ctx.fillStyle = 'rgba(232,228,216,0.4)';
    ctx.font = '11px sans-serif';
    ctx.fillText('[I to close]', x + 18, y + h - 14);
    ctx.restore();
  }
}
