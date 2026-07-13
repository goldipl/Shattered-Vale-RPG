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

// Equipment slot definitions: slotId -> { label, accepts(kind) }
// accepts() decides which backpack item kinds are droppable into that slot.
const EQUIP_SLOTS = [
  { id: 'helmet', label: 'Helmet', accepts: k => k === 'helmet' },
  { id: 'weapon', label: 'Weapon', accepts: k => k === 'sword' || k === 'weapon' },
  { id: 'armor',  label: 'Armor',  accepts: k => k === 'armor' },
  { id: 'shield', label: 'Shield', accepts: k => k === 'shield' },
  { id: 'boots',  label: 'Boots',  accepts: k => k === 'boots' },
];

class Inventory {
  constructor() {
    this.items = {}; // kind -> count (backpack, non-equipped items)
    this.equipped = {}; // slotId -> kind | null
    EQUIP_SLOTS.forEach(s => { this.equipped[s.id] = null; });
    this.open = false;
    this.hoveredKind = null;   // backpack kind currently hovered
    this.hoveredSlot = null;   // equip slotId currently hovered
  }
  add(kind, count = 1) {
    this.items[kind] = (this.items[kind] || 0) + count;
  }
  toggle() { this.open = !this.open; }

  // Equip one unit of `kind` from the backpack into the first accepting empty
  // slot (or the matching occupied slot, swapping the old item back to the
  // backpack). Returns true if equip happened.
  equip(kind) {
    if (!this.items[kind] || this.items[kind] <= 0) return false;
    const slot = EQUIP_SLOTS.find(s => s.accepts(kind));
    if (!slot) return false;

    const prev = this.equipped[slot.id];
    this.equipped[slot.id] = kind;
    this.items[kind] -= 1;
    if (this.items[kind] <= 0) delete this.items[kind];
    if (prev) this.add(prev, 1);
    return true;
  }

  // Move whatever is in a slot back into the backpack.
  unequip(slotId) {
    const kind = this.equipped[slotId];
    if (!kind) return false;
    this.equipped[slotId] = null;
    this.add(kind, 1);
    return true;
  }

  // Attempt to use/drink a red potion. Returns true if one was consumed.
  usePotionRed(player) {
    if (!this.items.potionRed || this.items.potionRed <= 0) return false;
    this.items.potionRed -= 1;
    if (this.items.potionRed <= 0) delete this.items.potionRed;
    if (player) player.hp = player.maxHp;
    return true;
  }

  // Call from mousemove with canvas-space coordinates to drive the hover effect.
  updateHover(mx, my, canvasW, canvasH) {
    this.hoveredKind = null;
    this.hoveredSlot = null;
    if (!this.open) return;
    const layout = this._layout(canvasW, canvasH);

    for (const slot of layout.equipSlots) {
      if (mx >= slot.ix && mx <= slot.ix + 44 && my >= slot.iy && my <= slot.iy + 44) {
        this.hoveredSlot = slot.id;
        return;
      }
    }
    for (const item of layout.backpackItems) {
      if (mx >= item.ix && mx <= item.ix + 44 && my >= item.iy && my <= item.iy + 44) {
        this.hoveredKind = item.kind;
        return;
      }
    }
  }

  // Attempt to click at canvas-space coordinates.
  // Returns { region: 'equip', slotId } or { region: 'backpack', kind }, or null.
  clickAt(mx, my, canvasW, canvasH) {
    if (!this.open) return null;
    const layout = this._layout(canvasW, canvasH);

    for (const slot of layout.equipSlots) {
      if (mx >= slot.ix && mx <= slot.ix + 44 && my >= slot.iy && my <= slot.iy + 44) {
        return { region: 'equip', slotId: slot.id };
      }
    }
    for (const item of layout.backpackItems) {
      if (mx >= item.ix && mx <= item.ix + 44 && my >= item.iy && my <= item.iy + 44) {
        return { region: 'backpack', kind: item.kind };
      }
    }
    return null;
  }

  // Shared geometry for the panel: equip-slot column on the left (character
  // gear), backpack grid on the right (found items). Computed once per call
  // so hit-testing and drawing can never drift apart.
  _layout(canvasW, canvasH) {
    const w = 570, h = 260;
    const x = (canvasW - w) / 2, y = (canvasH - h) / 2;

    // Cross/plus formation on a 3-column grid: helmet top-middle, weapon +
    // armor + shield across the middle row, boots bottom-middle. Left/right
    // cells of the top and bottom rows stay empty so the shape reads as a
    // "+" rather than a dense block.
    const equipX = x + 18, equipY = y + 52;
    const CELL = 56;
    const slotGridPos = {
      helmet: { col: 1, row: 0 },
      weapon: { col: 0, row: 1 },
      armor:  { col: 1, row: 1 },
      shield: { col: 2, row: 1 },
      boots:  { col: 1, row: 2 },
    };
    const equipSlots = EQUIP_SLOTS.map(s => {
      const pos = slotGridPos[s.id];
      return {
        id: s.id,
        label: s.label,
        ix: equipX + pos.col * CELL,
        iy: equipY + pos.row * CELL,
      };
    });

    const bpX = x + 18 + 3 * CELL + 24, bpY = y + 52;
    const kinds = Object.keys(this.items);
    const backpackItems = kinds.map((kind, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      return { kind, ix: bpX + col * 56, iy: bpY + row * 56 };
    });

    return { w, h, x, y, equipX, equipY, bpX, bpY, equipSlots, backpackItems };
  }

  draw(ctx, canvasW, canvasH) {
    if (!this.open) return;
    const { w, h, x, y, equipX, equipY, bpX, bpY, equipSlots, backpackItems } =
      this._layout(canvasW, canvasH);

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
    ctx.beginPath(); ctx.moveTo(x + 18, y + 38); ctx.lineTo(x + w - 18, y + 38); ctx.stroke();

    // --- Left column: equipped gear (character slots) ---
    ctx.fillStyle = 'rgba(232,228,216,0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('EQUIPPED', equipX, equipY - 8);

    equipSlots.forEach(slot => {
      const kind = this.equipped[slot.id];
      const isHovered = this.hoveredSlot === slot.id;

      ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
      roundRect(ctx, slot.ix, slot.iy, 44, 44, 6);
      ctx.fill();

      ctx.strokeStyle = isHovered ? 'rgba(232,201,60,0.85)' : 'rgba(232,228,216,0.18)';
      ctx.lineWidth = isHovered ? 2 : 1;
      roundRect(ctx, slot.ix, slot.iy, 44, 44, 6);
      ctx.stroke();

      if (kind) {
        const icon = Sprites.icons[kind];
        if (icon) ctx.drawImage(icon, slot.ix + 10, slot.iy + 10, 24, 24);
      } else {
        // Empty slot: show a faint label so the player knows what goes here.
        ctx.fillStyle = 'rgba(232,228,216,0.28)';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(slot.label, slot.ix + 22, slot.iy + 25);
        ctx.textAlign = 'left';
      }
    });

    // --- Right side: backpack grid (found items) ---
    ctx.fillStyle = 'rgba(232,228,216,0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('BACKPACK', bpX, bpY - 8);

    if (backpackItems.length === 0) {
      ctx.fillStyle = 'rgba(232,228,216,0.5)';
      ctx.font = '13px sans-serif';
      ctx.fillText('No items yet — explore to find some.', bpX, bpY + 30);
    } else {
      backpackItems.forEach(item => {
        const isHovered = this.hoveredKind === item.kind;

        ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)';
        roundRect(ctx, item.ix, item.iy, 44, 44, 6);
        ctx.fill();

        if (isHovered) {
          ctx.strokeStyle = 'rgba(232,201,60,0.85)';
          ctx.lineWidth = 2;
          roundRect(ctx, item.ix, item.iy, 44, 44, 6);
          ctx.stroke();
        }

        const icon = Sprites.icons[item.kind];
        if (icon) ctx.drawImage(icon, item.ix + 10, item.iy + 10, 24, 24);
        ctx.fillStyle = '#e8e4d8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('x' + this.items[item.kind], item.ix + 40, item.iy + 40);
        ctx.textAlign = 'left';
      });
    }

    // Vertical divider between the two panes.
    ctx.strokeStyle = 'rgba(232,228,216,0.15)';
    ctx.beginPath();
    ctx.moveTo(bpX - 16, y + 46);
    ctx.lineTo(bpX - 16, y + h - 30);
    ctx.stroke();

    ctx.fillStyle = 'rgba(232,228,216,0.4)';
    ctx.font = '11px sans-serif';
    ctx.fillText('[Esc to close] · click a backpack item to equip it', x + 18, y + h - 14);
    ctx.restore();
  }
}