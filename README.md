# Shattered Vale

A top-down action RPG built with vanilla JavaScript and HTML5 Canvas — no engine, no build step, no dependencies. Explore a village, talk to NPCs, find a hidden sword, battle slimes, and defeat the goblin chief to save the village.

![screenshot](./screenshots/screenshot01.jpg)
![screenshot](./screenshots/screenshot02.jpg)

## Playing

No installation or server required — just open `index.html` in a browser.

```
shattered-vale-rpg/
├── css/
├── js/
└── index.html
```

Double-click `index.html`, or serve the folder locally if your browser restricts local file access:

```bash
# from inside the shattered-vale-rpg folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls

| Key                           | Action                  |
| ----------------------------- | ----------------------- |
| `W` `A` `S` `D` or Arrow Keys | Move                    |
| `Space`                       | Attack                  |
| `E`                           | Talk to NPCs / interact |
| `I`                           | Toggle inventory        |

## How to play

1. Explore the village and find **Elder Rowan** — talk to him (`E`) to start the quest.
2. Head east to the pond and pick up the **Iron Sword** lying in the grass.
3. Fight **slimes** scattered around the map for gold and XP; leveling up increases your max HP and attack.
4. Visit the **Wandering Merchant** for a free health potion.
5. Head to the forest clearing in the southeast and defeat the **Goblin Chief** to win.

Your HP, level/XP, and gold are tracked in the HUD above the game canvas. If your HP reaches 0, refresh the page to try again.

## Features

- **Procedurally drawn sprites** — layered, directional character sheets (no external image assets) for the player, NPCs, slimes, and the goblin boss, each with walk-cycle animation
- **Textured world** with autotile edge-blending between grass/path/sand/water, a bridge, animated water shimmer, and scattered decoration (flowers, rocks, tall grass)
- **Depth-sorted rendering** so characters visually overlap correctly based on their position
- **Combat system** with hitboxes, knockback-free contact damage, hit-flash feedback, and a telegraphed boss attack
- **Particle effects** — hit bursts, floating damage/XP numbers, footstep sparkles, screen shake and flash on level-up
- **Typewriter-style dialogue box** with a simple branching-free quest conversation
- **Inventory panel** for collected items (potions, keys, etc.)
- **Smooth camera** that follows the player and clamps to the map bounds

## Project structure

| File              | Responsibility                                                                       |
| ----------------- | ------------------------------------------------------------------------------------ |
| `index.html`      | Page shell, HUD markup, canvas element, script loading order                         |
| `css/style.css`   | Game styles                                                                          |
| `js/utils.js`     | Shared math/helper functions (clamp, lerp, collision, rounded rects)                 |
| `js/sprites.js`   | Procedural sprite sheet generation for every character and item icon                 |
| `js/tilemap.js`   | World generation, tile textures, collision, static-layer baking                      |
| `js/particles.js` | Particle bursts and floating combat text                                             |
| `js/entities.js`  | `Player`, `NPC`, and `Enemy` classes, animation, and AI                              |
| `js/dialogue.js`  | Dialogue box UI and typewriter text reveal                                           |
| `js/inventory.js` | World item pickups and the inventory panel UI                                        |
| `js/camera.js`    | Camera follow/shake logic                                                            |
| `js/game.js`      | Game loop, input handling, state management, HUD updates — wires everything together |

Scripts are loaded in dependency order via plain `<script>` tags (no bundler needed): `utils` → `sprites` → `tilemap` → `particles` → `entities` → `dialogue` → `inventory` → `camera` → `game`.

## Customizing

A few starting points if you want to extend it:

- **Add an enemy type** — add a new palette/sprite builder in `sprites.js`, then instantiate it via `new Enemy(x, y, 'yourType')` in `game.js`. Enemy stats (HP, speed, damage) are set in the `Enemy` constructor in `entities.js`.
- **Expand the map** — edit `TileMap` in `tilemap.js`; increase the `cols`/`rows` passed into `new TileMap(...)` in `game.js` and add new features inside `_buildWorld()`.
- **Add dialogue/NPCs** — create a new `NPC(...)` in `game.js` with a `dialogue` array of strings; push it into the `npcs` array.
- **Add items** — draw a new icon function in `sprites.js`, register it in `Sprites.icons`, then place a `new WorldItem(x, y, 'yourKind')` in `game.js`.

## Browser support

Any modern browser with Canvas2D support (Chrome, Firefox, Safari, Edge). No mobile touch controls are implemented — keyboard required.

## License

Free to use, modify, and build on for any purpose.
