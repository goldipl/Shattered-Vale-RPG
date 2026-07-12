// tilemap.js — textured world renderer with World 1 + World 2 beach expansion
// High quality version:
// - baked static rendering
// - detailed terrain textures
// - decorations
// - castle
// - second world beach biome

const TileType = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  TREE: 3,
  WALL: 4,
  FLOWER: 5,
  TALLGRASS: 6,
  BRIDGE: 7,
  SAND: 8,
  GATE: 9,
  WORLD_TWO_GATE: 10,
};

const SOLID_TILES = new Set([
  TileType.WATER,
  TileType.TREE,
  TileType.WALL,
  TileType.GATE,
  TileType.WORLD_TWO_GATE,
]);

class TileMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;

    this.tiles = [];
    this.decor = [];

    this.isGateOpen = false;
    this.isWorldTwoGateOpen = false;

    this.trollSpawn = {
      x: 21,
      y: 17,
    };

    // World 1 = grass
    // World 2 = beach
    for (let y = 0; y < rows; y++) {
      const row = [];

      for (let x = 0; x < cols; x++) {
        if (x >= 28) row.push(TileType.SAND);
        else row.push(TileType.GRASS);
      }

      this.tiles.push(row);
    }

    this._buildWorld();

    this._offscreen = null;
    this._bakeStatic();
  }

  set(x, y, t) {
    if (this.inBounds(x, y)) this.tiles[y][x] = t;
  }

  get(x, y) {
    return this.inBounds(x, y) ? this.tiles[y][x] : TileType.WALL;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  isSolid(x, y) {
    return !this.inBounds(x, y) || SOLID_TILES.has(this.get(x, y));
  }

  _buildWorld() {
    // =========================
    // MAP BORDERS
    // =========================

    for (let x = 0; x < this.cols; x++) {
      this.set(x, 0, x >= 28 ? TileType.WATER : TileType.GRASS);

      this.set(x, this.rows - 1, x >= 28 ? TileType.WATER : TileType.GRASS);
    }

    for (let y = 0; y < this.rows; y++) {
      this.set(0, y, TileType.GRASS);

      this.set(this.cols - 1, y, TileType.WATER);
    }

    // =========================
    // WORLD 1 PATH SYSTEM
    // =========================

    for (let x = 14; x < 28; x++) this.set(x, 9, TileType.PATH);

    for (let y = 9; y < this.rows - 2; y++) this.set(13, y, TileType.PATH);

    for (let x = 14; x < 17; x++) this.set(x, 33, TileType.PATH);

    for (let x = 10; x < 14; x++) this.set(x, 37, TileType.PATH);

    // =========================
    // FOREST CLUSTERS
    // =========================

    const clusters = [
      [3, 3, 4],
      [20, 3, 3],
      [3, 17, 4],
      [20, 16, 4],
      [2, 11, 3],
    ];

    clusters.forEach(([cx, cy, r]) => {
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (hashTile(x, y) > 0.35 && dist(x, y, cx, cy) <= r) {
            this.set(x, y, TileType.TREE);
          }
        }
      }
    });

    // =========================
    // WORLD TWO BORDER GATE
    // =========================

    for (let y = 0; y < this.rows; y++) {
      if (y === 9 ) {
        this.set(27, y, TileType.WORLD_TWO_GATE);
      } else {
        this.set(27, y, TileType.TREE);
      }
    }

    // =========================
    // BEACH WORLD
    // =========================

    for (let x = 28; x < this.cols - 1; x++) {
      for (let y = 1; y < this.rows - 1; y++) {
        // road from gate
        if (y === 9) {
          this.set(x, y, TileType.PATH);
        }
      }
    }

    // =========================
    // TROLL CASTLE
    // =========================

    const castle = {
      left: 17,
      right: 25,
      top: 13,
      bottom: 21,
    };

    // clear inside

    for (let y = castle.top + 1; y < castle.bottom; y++) {
      for (let x = castle.left + 1; x < castle.right; x++) {
        this.set(x, y, TileType.GRASS);
      }
    }

    // horizontal walls

    for (let x = castle.left; x <= castle.right; x++) {
      this.set(x, castle.top, TileType.WALL);

      this.set(x, castle.bottom, TileType.WALL);
    }

    // vertical walls

    for (let y = castle.top; y <= castle.bottom; y++) {
      this.set(castle.left, y, TileType.WALL);

      this.set(castle.right, y, TileType.WALL);
    }

    // boss gate

    this.set(castle.left, 17, TileType.GATE);

    // road to castle

    for (let x = 3; x < castle.left; x++) {
      this.set(x, 17, TileType.PATH);
    }

    // =========================
    // WATER MOAT
    // =========================

    for (let y = castle.top - 2; y <= castle.bottom + 2; y++) {
      for (let x = castle.left - 2; x <= castle.right + 2; x++) {
        const inside =
          x >= castle.left &&
          x <= castle.right &&
          y >= castle.top &&
          y <= castle.bottom;

        if (!inside) {
          this.set(x, y, TileType.WATER);
        }
      }
    }

    // wooden bridge

    this.set(castle.left - 1, 17, TileType.BRIDGE);
    this.set(castle.left - 2, 17, TileType.BRIDGE);

    this.set(castle.left, 17, TileType.GATE);

    // =========================
    // DECORATIONS
    // =========================

    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const tile = this.get(x, y);

        const h = hashTile(x * 3 + 7, y * 5 + 1);

        // grass decorations

        if (tile === TileType.GRASS) {
          if (h > 0.93) {
            this.decor.push({
              x,
              y,
              type: "flower",
              variant: Math.floor(h * 10) % 3,
            });
          } else if (h > 0.85) {
            this.decor.push({
              x,
              y,
              type: "grasstuft",
            });
          } else if (h > 0.8) {
            this.decor.push({
              x,
              y,
              type: "rock",
            });
          }
        }

        // beach decorations
        else if (tile === TileType.SAND) {
          if (h > 0.94) {
            this.decor.push({
              x,
              y,
              type: "shells",
            });
          } else if (h > 0.88) {
            this.decor.push({
              x,
              y,
              type: "starfish",
            });
          } else if (h > 0.82) {
            this.decor.push({
              x,
              y,
              type: "palm",
            });
          }
        }
      }
    }
  }

  // =========================
  // OPEN BOSS GATE
  // =========================

  openGate() {
    let opened = false;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.get(x, y) === TileType.GATE) {
          this.set(x, y, TileType.PATH);

          opened = true;
        }
      }
    }

    if (opened) {
      this.isGateOpen = true;

      this._bakeStatic();
    }
  }

  // =========================
  // OPEN WORLD 2 GATE
  // =========================

  openWorldTwoGate() {
    let opened = false;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.get(x, y) === TileType.WORLD_TWO_GATE) {
          this.set(x, y, TileType.PATH);

          opened = true;
        }
      }
    }

    if (opened) {
      this.isWorldTwoGateOpen = true;

      this._bakeStatic();
    }
  }

  // =========================
  // BAKE STATIC LAYER
  // =========================

  _bakeStatic() {
    const off = makeCanvas(this.cols * TILE, this.rows * TILE);

    const ctx = off.getContext("2d");

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this._drawGroundTile(ctx, x, y);
      }
    }

    this.decor.forEach((d) => {
      this._drawDecor(ctx, d);
    });

    this._offscreen = off;
  }

  // =========================
  // TILE RENDERER
  // =========================

  _drawGroundTile(ctx, x, y) {
    const px = x * TILE;
    const py = y * TILE;

    const t = this.get(x, y);

    const h = hashTile(x, y);

    // =========================
    // GRASS
    // =========================

    if (
      t === TileType.GRASS ||
      t === TileType.FLOWER ||
      t === TileType.TALLGRASS
    ) {
      ctx.fillStyle = h > 0.5 ? "#3a6b3d" : "#356339";

      ctx.fillRect(px, py, TILE, TILE);

      // small grass texture

      ctx.fillStyle = "rgba(255,255,255,0.03)";

      for (let i = 0; i < 3; i++) {
        const bx = px + ((hashTile(x * 7 + i, y * 3) * TILE) | 0);

        const by = py + ((hashTile(x * 2, y * 9 + i) * TILE) | 0);

        ctx.fillRect(bx, by, 2, 5);
      }
    }

    // =========================
    // PATH
    // =========================
    else if (t === TileType.PATH) {
      ctx.fillStyle = "#8a7050";

      ctx.fillRect(px, py, TILE, TILE);

      ctx.fillStyle = h > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)";

      ctx.fillRect(
        px + ((h * 20) | 0),
        py + ((hashTile(x, y + 1) * 20) | 0),
        6,
        4,
      );

      this._edgeBlend(ctx, x, y, px, py, TileType.PATH, "#3a6b3d");
    }

    // =========================
    // SAND
    // =========================
    else if (t === TileType.SAND) {
      ctx.fillStyle = "#eadeb6";

      ctx.fillRect(px, py, TILE, TILE);

      ctx.fillStyle = "rgba(150,120,70,0.12)";

      ctx.fillRect(px + 5, py + 7, 5, 3);

      if (h > 0.6) {
        ctx.fillRect(px + ((h * 20) | 0), py + ((h * 15) | 0), 3, 3);
      }

      this._edgeBlend(ctx, x, y, px, py, TileType.SAND, "#3a6b3d");
    }

    // =========================
    // WATER
    // =========================
    else if (t === TileType.WATER) {
      ctx.fillStyle = "#2a5578";

      ctx.fillRect(px, py, TILE, TILE);

      ctx.fillStyle = "#336490";

      ctx.fillRect(px, py + ((h * 10) | 0), TILE, 4);

      ctx.fillStyle = "rgba(255,255,255,0.08)";

      ctx.fillRect(px + 4, py + 10, 10, 2);

      this._edgeBlend(ctx, x, y, px, py, TileType.WATER, "#eadeb6");
    }

    // =========================
    // BRIDGE
    // =========================
    else if (t === TileType.BRIDGE) {
      ctx.fillStyle = "#2a5578";

      ctx.fillRect(px, py, TILE, TILE);

      ctx.fillStyle = "#8a6438";

      for (let i = 0; i < 4; i++) {
        ctx.fillRect(px, py + i * 8, TILE, 5);
      }

      ctx.fillStyle = "#5a4020";

      for (let i = 0; i < 4; i++) {
        ctx.fillRect(px, py + i * 8 + 5, TILE, 1);
      }
    }

    // =========================
    // NORMAL GATE
    // =========================
    else if (t === TileType.GATE || t === TileType.WORLD_TWO_GATE) {
      ctx.fillStyle = "#4a3626";

      ctx.fillRect(px, py, TILE, TILE);

      ctx.fillStyle = "#2a1e15";

      for (let i = 0; i < 4; i++) {
        ctx.fillRect(px + i * 8, py, 4, TILE);
      }

      ctx.fillStyle = "rgba(255,210,80,0.35)";

      ctx.fillRect(px + 12, py + 12, 8, 8);
    }

    // =========================
    // TREE BASE
    // =========================
    else if (t === TileType.TREE) {
      ctx.fillStyle = h > 0.5 ? "#3a6b3d" : "#356339";

      ctx.fillRect(px, py, TILE, TILE);
    }

    // =========================
    // CASTLE WALL
    // =========================
    else if (t === TileType.WALL) {
      const stone = h > 0.66 ? "#8d8b82" : h > 0.33 ? "#7d7c73" : "#72736b";

      ctx.fillStyle = stone;

      ctx.fillRect(px, py, TILE, TILE);

      ctx.strokeStyle = "rgba(40,40,35,0.35)";

      ctx.lineWidth = 1;

      ctx.beginPath();

      ctx.moveTo(px, py + 10);

      ctx.lineTo(px + TILE, py + 10);

      ctx.moveTo(px, py + 22);

      ctx.lineTo(px + TILE, py + 22);

      const offset = (y % 2) * 8;

      ctx.moveTo(px + 8 + offset, py);

      ctx.lineTo(px + 8 + offset, py + 10);

      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.08)";

      ctx.fillRect(px + 3, py + 3, TILE - 6, 2);
    }

    // =========================
    // TREE CANOPY OVERLAY
    // =========================

    if (t === TileType.TREE) {
      ctx.save();

      ctx.translate(px + 16, py + 16);

      // shadow

      ctx.fillStyle = "rgba(0,0,0,0.25)";

      ctx.beginPath();

      ctx.ellipse(2, 14, 13, 5, 0, 0, Math.PI * 2);

      ctx.fill();

      // trunk

      ctx.fillStyle = "#4a3626";

      ctx.fillRect(-3, 2, 6, 14);

      // main crown

      ctx.fillStyle = h > 0.5 ? "#2d5a2a" : "#255022";

      ctx.beginPath();

      ctx.arc(0, -4, 15, 0, Math.PI * 2);

      ctx.fill();

      // extra leaves

      ctx.fillStyle = h > 0.5 ? "#3a6e34" : "#316232";

      ctx.beginPath();

      ctx.arc(-5, -9, 9, 0, Math.PI * 2);

      ctx.fill();

      ctx.beginPath();

      ctx.arc(6, -6, 8, 0, Math.PI * 2);

      ctx.fill();

      ctx.restore();
    }
  }

  // =========================
  // TERRAIN EDGE BLENDING
  // =========================

  _edgeBlend(ctx, x, y, px, py, selfType, grassColor) {
    const n = this.get(x, y - 1);
    const s = this.get(x, y + 1);
    const w = this.get(x - 1, y);
    const e = this.get(x + 1, y);

    ctx.fillStyle = "rgba(0,0,0,0.06)";

    if (n === TileType.GRASS) ctx.fillRect(px, py, TILE, 3);

    if (s === TileType.GRASS) ctx.fillRect(px, py + TILE - 3, TILE, 3);

    if (w === TileType.GRASS) ctx.fillRect(px, py, 3, TILE);

    if (e === TileType.GRASS) ctx.fillRect(px + TILE - 3, py, 3, TILE);
  }

  // =========================
  // DECORATION DRAWING
  // =========================

  _drawDecor(ctx, d) {
    const px = d.x * TILE;
    const py = d.y * TILE;

    if (d.type === "flower") {
      const colors = ["#e8c93c", "#e85a5a", "#c85ae8"];

      ctx.fillStyle = "#2d5a2a";

      ctx.fillRect(px + 15, py + 18, 2, 8);

      ctx.fillStyle = colors[d.variant];

      [
        [13, 14],
        [19, 14],
        [16, 11],
        [16, 17],
      ].forEach(([ox, oy]) => {
        ctx.beginPath();

        ctx.arc(px + ox, py + oy, 2.2, 0, Math.PI * 2);

        ctx.fill();
      });

      ctx.fillStyle = "#e8c93c";

      ctx.beginPath();

      ctx.arc(px + 16, py + 14, 1.5, 0, Math.PI * 2);

      ctx.fill();
    } else if (d.type === "grasstuft") {
      ctx.fillStyle = "#2d5a2a";

      for (let i = 0; i < 4; i++) {
        ctx.beginPath();

        ctx.moveTo(px + 10 + i * 4, py + 26);

        ctx.quadraticCurveTo(
          px + 10 + i * 4 + (i % 2 ? 3 : -3),
          py + 16,
          px + 12 + i * 4,
          py + 14,
        );

        ctx.quadraticCurveTo(
          px + 10 + i * 4,
          py + 20,
          px + 10 + i * 4,
          py + 26,
        );

        ctx.fill();
      }
    } else if (d.type === "rock") {
      ctx.fillStyle = "rgba(0,0,0,0.2)";

      ctx.beginPath();

      ctx.ellipse(px + 16, py + 24, 8, 3, 0, 0, Math.PI * 2);

      ctx.fill();

      ctx.fillStyle = "#6b6558";

      ctx.beginPath();

      ctx.ellipse(px + 16, py + 20, 7, 5, 0, 0, Math.PI * 2);

      ctx.fill();

      ctx.fillStyle = "#8a8578";

      ctx.beginPath();

      ctx.ellipse(px + 14, py + 18, 3, 2, 0, 0, Math.PI * 2);

      ctx.fill();
    }

    // BEACH DECORATIONS
    else if (d.type === "shells") {
      ctx.fillStyle = "#f5ebd0";

      ctx.beginPath();

      ctx.arc(px + 14, py + 18, 3, 0, Math.PI, true);

      ctx.fill();
    } else if (d.type === "starfish") {
      ctx.fillStyle = "#f28d53";

      ctx.fillRect(px + 14, py + 14, 5, 5);
    } else if (d.type === "palm") {
      // trunk

      ctx.fillStyle = "#8c613c";

      ctx.fillRect(px + 14, py + 10, 4, 16);

      // leaves

      ctx.fillStyle = "#448c3c";

      ctx.beginPath();

      ctx.arc(px + 16, py + 10, 10, 0, Math.PI * 2);

      ctx.fill();
    }
  }

  // =========================
  // DRAW STATIC WORLD
  // =========================

  drawGround(ctx, camX, camY, viewW, viewH) {
    ctx.drawImage(
      this._offscreen,
      camX,
      camY,
      viewW,
      viewH,
      0,
      0,
      viewW,
      viewH,
    );
  }

  // =========================
  // ANIMATED EFFECTS
  // =========================

  drawAnimated(ctx, camX, camY, viewW, viewH, t) {
    const startX = Math.max(0, Math.floor(camX / TILE));

    const endX = Math.min(this.cols, Math.ceil((camX + viewW) / TILE));

    const startY = Math.max(0, Math.floor(camY / TILE));

    const endY = Math.min(this.rows, Math.ceil((camY + viewH) / TILE));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (this.get(x, y) === TileType.WATER) {
          const shimmer = Math.sin(t / 500 + x * 0.5 + y * 0.5) * 0.5 + 0.5;

          ctx.fillStyle = `rgba(255,255,255,${0.05 + shimmer * 0.06})`;

          ctx.fillRect(x * TILE - camX + 6, y * TILE - camY + 8, 14, 2);
        }
      }
    }
  }
}
