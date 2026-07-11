// tilemap.js — builds and renders a textured world with layered tiles,
// decorations (flowers, rocks, tall grass) and collision data.

const TileType = {
  GRASS: 0, PATH: 1, WATER: 2, TREE: 3, WALL: 4, FLOWER: 5, TALLGRASS: 6, BRIDGE: 7, SAND: 8, GATE: 9
};

const SOLID_TILES = new Set([TileType.WATER, TileType.TREE, TileType.WALL, TileType.GATE]);

class TileMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.tiles = [];
    this.decor = []; // sparkle/foliage overlay, non-blocking
    this.isGateOpen = false; // Flag to track if boss gate is open
    
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) row.push(TileType.GRASS);
      this.tiles.push(row);
    }
    this._buildWorld();
    this._offscreen = null;
    this._bakeStatic();
  }

  set(x, y, t) { if (this.inBounds(x, y)) this.tiles[y][x] = t; }
  get(x, y) { return this.inBounds(x, y) ? this.tiles[y][x] : TileType.WALL; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }
  isSolid(x, y) { return !this.inBounds(x, y) || SOLID_TILES.has(this.get(x, y)); }

  _buildWorld() {
    // Map borders with grass
    for (let x = 0; x < this.cols; x++) {
      this.set(x, 0, TileType.GRASS);
      this.set(x, this.rows - 1, TileType.GRASS);
    }

    for (let y = 0; y < this.rows; y++) {
      this.set(0, y, TileType.GRASS);
      this.set(this.cols - 1, y, TileType.GRASS);
    }

    // Cross paths (village center)
    for (let x = 2; x < this.cols - 2; x++) this.set(x, 9, TileType.PATH);
    for (let y = 2; y < this.rows - 2; y++) this.set(13, y, TileType.PATH);
    for (let x = 10; x < 17; x++) this.set(x, 5, TileType.PATH);

    // Tree clusters (forest borders)
    const clusters = [
      [3,3,4],
      [20,3,3],
      [3,17,4],
      [20,16,4],
      [2,11,3]
    ];
    clusters.forEach(([cx, cy, r]) => {
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (hashTile(x, y) > 0.35 && dist(x, y, cx, cy) <= r) this.set(x, y, TileType.TREE);
        }
      }
    });


    // ================================
    // CASTLE FOR TROLL BOSS - LEFT GATE
    // ================================

    const castle = {
      left: 17,
      right: 25,
      top: 13,
      bottom: 21
    };

    // Clear the inside area of the castle
    for (let y = castle.top + 1; y < castle.bottom; y++) {
      for (let x = castle.left + 1; x < castle.right; x++) {
        this.set(x, y, TileType.GRASS);
      }
    }

    // Create horizontal castle walls
    for (let x = castle.left; x <= castle.right; x++) {
      this.set(x, castle.top, TileType.WALL);
      this.set(x, castle.bottom, TileType.WALL);
    }

    // Create vertical castle walls
    for (let y = castle.top; y <= castle.bottom; y++) {
      this.set(castle.left, y, TileType.WALL);
      this.set(castle.right, y, TileType.WALL);
    }


    // ================================
    // LEFT SIDE CASTLE GATE
    // ================================

    // Place the gate in the center of the left wall
    this.set(castle.left, 17, TileType.GATE);

    // ================================
    // PATH LEADING TO THE CASTLE FROM THE LEFT
    // ================================

    for (let x = 13; x < castle.left; x++) {
      this.set(x, 17, TileType.PATH);
    }


    // ================================
    // PATH INSIDE THE CASTLE
    // ================================

    for (let x = castle.left + 1; x < 21; x++) {
      this.set(x, 17, TileType.PATH);
    }


    // ================================
    // TROLL SPAWN POSITION
    // ================================

    this.trollSpawn = {
      x: 21,
      y: 17
    };

    // ================================
    // WATER MOAT AROUND THE CASTLE
    // ================================

    for (let y = castle.top - 1; y <= castle.bottom + 1; y++) {
      for (let x = castle.left - 1; x <= castle.right + 1; x++) {

        const isCastleArea =
          x >= castle.left &&
          x <= castle.right &&
          y >= castle.top &&
          y <= castle.bottom;

        if (!isCastleArea) {
          this.set(x, y, TileType.WATER);
        }
      }
    }

    // ================================
    // BRIDGE TO THE CASTLE GATE
    // ================================

    // Restore the path leading to the bridge
    for (let x = 5; x < castle.left - 1; x++) {
      this.set(x, 17, TileType.PATH);
    }

    // Wooden bridge crossing the moat (vertical)
    this.set(castle.left - 1, 17, TileType.BRIDGE);
    
    // Restore gate entrance
    this.set(castle.left, 17, TileType.GATE);

    // ================================
    // PATH INSIDE THE CASTLE
    // ================================

    for (let x = castle.left + 1; x < 21; x++) {
      this.set(x, 17, TileType.PATH);
    }

    // Decorative flowers / tall grass sprinkled on grass tiles
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.get(x, y) === TileType.GRASS) {
          const h = hashTile(x * 3 + 7, y * 5 + 1);
          if (h > 0.93) this.decor.push({ x, y, type: 'flower', variant: Math.floor(h * 10) % 3 });
          else if (h > 0.85) this.decor.push({ x, y, type: 'grasstuft' });
          else if (h > 0.80) this.decor.push({ x, y, type: 'rock' });
        }
      }
    }
  }

  openGate() {
    let gateOpened = false;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.get(x, y) === TileType.GATE) {
          this.set(x, y, TileType.PATH); // Convert gate to a walkable path
          gateOpened = true;
        }
      }
    }
    
    if (gateOpened) {
      this.isGateOpen = true;
      this._bakeStatic(); // Re-render the static background so the path appears
    }
  }

  // Pre-render the static ground layer to an offscreen canvas so per-frame
  // draw only blits one image instead of redrawing hundreds of tiles.
  _bakeStatic() {
    const off = makeCanvas(this.cols * TILE, this.rows * TILE);
    const ctx = off.getContext('2d');
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this._drawGroundTile(ctx, x, y);
      }
    }
    // decor drawn on top of ground (still static)
    this.decor.forEach(d => this._drawDecor(ctx, d));
    this._offscreen = off;
  }

  _drawGroundTile(ctx, x, y) {
    const px = x * TILE, py = y * TILE;
    const t = this.get(x, y);
    const h = hashTile(x, y);

    if (t === TileType.GRASS || t === TileType.FLOWER || t === TileType.TALLGRASS) {
      ctx.fillStyle = h > 0.5 ? '#3a6b3d' : '#356339';
      ctx.fillRect(px, py, TILE, TILE);
      // subtle blade texture
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 3; i++) {
        const bx = px + ((hashTile(x * 7 + i, y * 3) * TILE) | 0);
        const by = py + ((hashTile(x * 2, y * 9 + i) * TILE) | 0);
        ctx.fillRect(bx, by, 2, 5);
      }
    } else if (t === TileType.PATH) {
      ctx.fillStyle = '#8a7050';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = h > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(px + (h * 20 | 0), py + (hashTile(x,y+1) * 20 | 0), 6, 4);
      // edge blend to grass
      this._edgeBlend(ctx, x, y, px, py, TileType.PATH, '#3a6b3d');
    } else if (t === TileType.SAND) {
      ctx.fillStyle = '#c9b380';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(px + 4, py + 6, 8, 3);
      this._edgeBlend(ctx, x, y, px, py, TileType.SAND, '#3a6b3d');
    } else if (t === TileType.WATER) {
      ctx.fillStyle = '#2a5578';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#336490';
      ctx.fillRect(px, py + ((h * 10) | 0), TILE, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(px + 4, py + 10, 10, 2);
      this._edgeBlend(ctx, x, y, px, py, TileType.WATER, '#c9b380');
    } else if (t === TileType.BRIDGE) {
      ctx.fillStyle = '#2a5578';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#8a6438';
      for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 8, TILE, 5);
      ctx.fillStyle = '#5a4020';
      for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 8 + 5, TILE, 1);
    } else if (t === TileType.GATE) {
      // Draw a wooden barricade/gate
      ctx.fillStyle = '#4a3626';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#2a1e15';
      for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 8, py, 4, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px, py + 12, TILE, 6);
    } else if (t === TileType.TREE) {
      ctx.fillStyle = h > 0.5 ? '#3a6b3d' : '#356339';
      ctx.fillRect(px, py, TILE, TILE);
    } else if (t === TileType.WALL) {
      // Castle stone wall base
      const stone = h > 0.66 ? '#8d8b82' :
                    h > 0.33 ? '#7d7c73' :
                              '#72736b';

      ctx.fillStyle = stone;
      ctx.fillRect(px, py, TILE, TILE);

      // stone block mortar lines
      ctx.strokeStyle = 'rgba(40,40,35,0.35)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(px, py + 10);
      ctx.lineTo(px + TILE, py + 10);
      ctx.moveTo(px, py + 22);
      ctx.lineTo(px + TILE, py + 22);

      // alternating vertical joints
      const offset = (y % 2) * 8;
      ctx.moveTo(px + 8 + offset, py);
      ctx.lineTo(px + 8 + offset, py + 10);

      ctx.moveTo(px + 20 + offset, py + 10);
      ctx.lineTo(px + 20 + offset, py + 22);

      ctx.moveTo(px + 10 + offset, py + 22);
      ctx.lineTo(px + 10 + offset, py + TILE);

      ctx.stroke();

      // rough stone texture
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(px + 3, py + 3, TILE - 6, 2);

      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(px, py + TILE - 3, TILE, 3);

      // small cracks / imperfections
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      if (h > 0.7) {
        ctx.fillRect(px + 6, py + 15, 3, 2);
        ctx.fillRect(px + 18, py + 5, 2, 3);
      }
    }

    // Tree canopy is drawn as an overlay so it visually overlaps tiles above it
    if (t === TileType.TREE) {
      ctx.save();
      ctx.translate(px + 16, py + 16);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(2, 14, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3626';
      ctx.fillRect(-3, 2, 6, 14);
      ctx.fillStyle = h > 0.5 ? '#2d5a2a' : '#255022';
      ctx.beginPath(); ctx.arc(0, -4, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = h > 0.5 ? '#3a6e34' : '#316232';
      ctx.beginPath(); ctx.arc(-5, -9, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _edgeBlend(ctx, x, y, px, py, selfType, grassColor) {
    // soften transition to neighboring grass with small corner triangles
    const n = this.get(x, y - 1), s = this.get(x, y + 1);
    const w = this.get(x - 1, y), e = this.get(x + 1, y);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    if (n === TileType.GRASS) ctx.fillRect(px, py, TILE, 3);
    if (s === TileType.GRASS) ctx.fillRect(px, py + TILE - 3, TILE, 3);
    if (w === TileType.GRASS) ctx.fillRect(px, py, 3, TILE);
    if (e === TileType.GRASS) ctx.fillRect(px + TILE - 3, py, 3, TILE);
  }

  _drawDecor(ctx, d) {
    const px = d.x * TILE, py = d.y * TILE;
    if (d.type === 'flower') {
      const colors = ['#e8c93c', '#e85a5a', '#c85ae8'];
      ctx.fillStyle = '#2d5a2a';
      ctx.fillRect(px + 15, py + 18, 2, 8);
      ctx.fillStyle = colors[d.variant];
      [[13,14],[19,14],[16,11],[16,17]].forEach(([ox,oy]) => {
        ctx.beginPath(); ctx.arc(px+ox, py+oy, 2.2, 0, Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#e8c93c';
      ctx.beginPath(); ctx.arc(px+16, py+14, 1.5, 0, Math.PI*2); ctx.fill();
    } else if (d.type === 'grasstuft') {
      ctx.fillStyle = '#2d5a2a';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 10 + i * 4, py + 26);
        ctx.quadraticCurveTo(px + 10 + i * 4 + (i%2?3:-3), py + 16, px + 12 + i * 4, py + 14);
        ctx.quadraticCurveTo(px + 10 + i*4, py + 20, px + 10 + i * 4, py + 26);
        ctx.fill();
      }
    } else if (d.type === 'rock') {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(px+16, py+24, 8, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#6b6558';
      ctx.beginPath(); ctx.ellipse(px+16, py+20, 7, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8a8578';
      ctx.beginPath(); ctx.ellipse(px+14, py+18, 3, 2, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  drawGround(ctx, camX, camY, viewW, viewH) {
    ctx.drawImage(this._offscreen, camX, camY, viewW, viewH, 0, 0, viewW, viewH);
  }

  // Animated overlay (water shimmer, swaying grass) drawn fresh each frame,
  // but only for tiles currently visible.
  drawAnimated(ctx, camX, camY, viewW, viewH, t) {
    const startX = Math.max(0, Math.floor(camX / TILE));
    const endX = Math.min(this.cols, Math.ceil((camX + viewW) / TILE));
    const startY = Math.max(0, Math.floor(camY / TILE));
    const endY = Math.min(this.rows, Math.ceil((camY + viewH) / TILE));
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.get(x, y);
        const sx = x * TILE - camX, sy = y * TILE - camY;
        if (tile === TileType.WATER) {
          const shimmer = Math.sin(t / 500 + x * 0.5 + y * 0.5) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255,255,255,${0.05 + shimmer * 0.06})`;
          ctx.fillRect(sx + 6, sy + 8, 14, 2);
        }
      }
    }
  }
}