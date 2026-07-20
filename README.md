# Shattered Vale

A top-down action RPG built with vanilla JavaScript and HTML5 Canvas — no engine, no build step, no dependencies. Explore a village, talk to NPCs, find a hidden sword, battle slimes, and defeat the goblin chief to save the village.

## Playing

No installation or server required — just open `index.html` in a browser.

## Architecture

```
├── index.html                      entry page: game canvas + DOM HUD (hp/xp/mana bars, level, gold), loads all 27 JS files in dependency order
├── css/
│   └── style.css                   canvas and HUD panel styling
└── js/
    ├── utils.js                    shared math/canvas helpers (clamp, lerp, dist, rectsOverlap, roundRect, hashTile) + makeCanvas (offscreen canvas creation, shared by sprites/tilemap) + wrapPlainText (text wrapping, shared by the UI screens)
    │
    ├── config/                     ← pure data, no rendering, no class instantiation
    │   ├── balance.js               every balance number: player stats (hp/atk/speed/mana), level-up progression, weapon bonuses (incl. Molten Blade's top tier), per-enemy-type stats (ENEMY_DEFS, now 16 types incl. Molten Depths), XP/gold kill rewards (COMBAT_REWARDS), lava damage-per-tick
    │   ├── level-layout.js          world content: NPC dialogue (Elder, Merchant), world item placements, the full 99-entry enemy list (86 original + 13 Molten Depths — previously duplicated between initial setup and restartGame, now defined once), boss display names, player spawn point
    │   ├── item-stats.js            what to SHOW the player about each item: its attack/defense/speed bonus and a one-line description
    │   └── item-effects.js          pickup/equip/unequip effect tables (toast text, player-state changes, screen-flash colors — incl. Obsidian Armor, Molten Blade, Fireproof Boots), boss-defeat drop/cutscene scripts (Skeleton King now opens the Lava Gate instead of ending the game; Troll Chieftain opens the Pit Gate; Pit Devil triggers victory), gate-unlock conditions (which enemies must be dead before a gate opens), sword pickup guarded so only the first one auto-equips
    │
    ├── sprites/                    ← procedural pixel-art generation
    │   ├── humanoid-sprites.js      palette-swappable humanoid sprite-sheet builder (used for player/elder/merchant) + sword weapon overlay
    │   ├── monster-sprites.js       sprite-sheet builders for the original 8 enemies: slimes, goblin/devil/orc/witch bosses, spider, skeleton, Skeleton King
    │   ├── molten-sprites.js        sprite-sheet builders for the 5 Molten Depths creatures: devilLesser, orcRaider, troll (grunts), Troll Chieftain and Pit Devil (bosses) — kept in its own file so monster-sprites.js didn't balloon past a comfortable size
    │   ├── icon-sprites.js          24x24 procedural item icons (sword, potions, armor, coin, key, shield, boots, etc., incl. Obsidian Armor/Molten Blade/Fireproof Boots) used in world pickups and the inventory panel
    │   └── sprites.js               the Sprites registry object + initSprites(), which calls the builders above once at boot and stores every sheet/icon
    │
    ├── world/                      ← the tile map
    │   ├── tilemap-builder.js       tile type definitions (TileType enum, SOLID_TILES) + world/jungle/crypt/Molten Depths terrain generation (buildMoltenDepths), gate tile definitions (GATE_DEFS, now incl. Lava/Pit gates)
    │   ├── tilemap-renderer.js      per-tile ground rendering, terrain edge blending, decoration drawing (flowers, rocks, ferns, bones, obsidian shards/embers/skulls, etc.)
    │   └── tilemap.js               TileMap class: owns the tile grid (now 109x236 — grew south to fit Molten Depths, with the Skeleton Dungeon's own size pinned to a fixed constant so it didn't grow too) and gate state, composes the builder + renderer functions above, bakes the static layer to an offscreen canvas, animates water shimmer and lava glow
    │
    ├── entities/
    │   ├── animated-sprite.js       shared sprite-sheet frame-walker, used by Player/NPC/Enemy to animate their 4-directional walk cycles
    │   ├── player.js                Player class: movement, melee/fireball combat, leveling — reads starting stats from config/balance.js; tracks weapon tier (incl. Molten Blade) and fireproof status for the lava hazard
    │   ├── npc.js                   NPC class: talkable characters, also draws its own "Talk with me" speech bubble (moved out of the main draw loop since it's the NPC's own visual state)
    │   ├── enemy.js                 Enemy class: wander/aggro AI, telegraphed attacks, taking damage — driven entirely by the ENEMY_DEFS table in config/balance.js instead of a 130-line if/else chain; hit/death/HP-bar colors extended for the two new bosses
    │   └── fireball.js              Fireball projectile class — reads speed/damage/life from config/balance.js's FIREBALL_STATS
    │
    ├── systems/
    │   ├── camera.js                smooth player-follow camera with screen-shake, clamped to map bounds
    │   ├── particles.js             lightweight particle burst + floating damage/XP text system
    │   ├── dialogue.js              typewriter-style dialogue box UI (renders whatever npc.dialogue array it's given)
    │   └── inventory.js             world item pickups + toggleable inventory panel (equip slots, backpack grid); Inventory.reset() used by both the constructor and restart; equip slots now also accept Obsidian Armor/Molten Blade/Fireproof Boots
    │
    ├── ui/
    │   ├── hud.js                   binds/syncs the DOM hp/xp/mana bars, plus the canvas-drawn boss health banner (colors extended for the two new bosses without changing the original 5), toast messages, and quest tracker
    │   └── screens.js               full-screen canvas UI states: desktop-only block screen; start menu (Play/Continue toggle based on whether a run has started, plus a Restart Game button once it has); how-to-play panel; game-over/victory screen (victory is a new branch, reached for the first time now that Pit Devil sets it)
    │
    └── core/
        ├── input.js                 keyboard state tracking (keys/justPressed) + mobile-device detection
        ├── world-factory.js         turns the plain data in config/level-layout.js into live NPC/WorldItem/Enemy instances (now 99 enemies); used both at boot and on restart
        ├── combat.js                 resolves player interaction: talking to NPCs, melee hit resolution, XP/gold/loot rewards, world-item pickups, inventory-panel clicks, gate-unlock checks, and the lava hazard tick (reuses the player's existing hit-invulnerability window as its damage cooldown)
        └── game.js                   bootstrap + main update/draw loop + restart logic; map grown to 109x236; Escape returns to the start menu mid-run; tracks whether a run has started (for the Continue/Restart buttons); draws the end screen for both gameover and victory
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
| `F`                           | Use Fire Ball Attack    |

## How to play

1. Explore the village and find **Elder Rowan** — talk to him (`E`) to start the quest.
2. Visit the **Wandering Merchant** for a free health potion.
3. Head west to the castle and pick up the **Iron Sword** lying in the grass.
4. Fight **slimes** scattered around the map for gold and XP; leveling up increases your max HP and attack.
5. Head to the castle and defeat the **Goblin King Grimtooth** to open a New Worlds.

Your HP, level/XP, and gold are tracked in the HUD above the game canvas. If your HP reaches 0, refresh the page to try again.

## Features

- **Procedurally drawn sprites** — layered, directional character sheets (no external image assets) for the player, elder, merchant, all slime variants, the spider, the skeleton, and all five bosses (Goblin King, Devil, Orc Warlord, Jungle Witch, Skeleton King), each with walk-cycle animation
- **Textured world spanning four zones** — starting village/forest, beach oasis, jungle, and a skeleton dungeon — with autotile edge-blending between grass/path/sand/water/jungle/crypt floor, a bridge, animated water shimmer, and scattered zone-specific decoration (flowers, rocks, tall grass, shells, ferns, vines, bones, braziers)
- **Depth-sorted rendering** so characters and items visually overlap correctly based on their position
- **Combat system** with melee hitboxes, ranged fireball projectiles, telegraphed enemy attacks, hit-flash feedback, and per-enemy HP bars
- **Boss encounters** with a dedicated health banner, low-HP warning pulse, and unique defeat drops/cutscenes for each of the five bosses
- **Gated progression** — defeating guardian enemies or specific bosses opens new gates (village → oasis → jungle → dungeon), tracked by a simple quest stage
- **Leveling system** — gaining XP raises level, max HP, and attack; mana regenerates over time to fuel fireballs
- **Particle effects** — hit bursts, floating damage/XP/gold numbers, footstep sparkles, camera shake, and full-screen flash on level-up, boss kills, and gate openings
- **Typewriter-style dialogue box** with one-time quest/gift conversations (Elder Rowan, the Wandering Merchant) and short "System" narration cutscenes after boss fights
- **Full inventory system** — an equip-slot panel (helmet/weapon/armor/shield/boots) alongside a backpack grid, with click-to-equip/unequip and consumable potions (health/mana)
- **Smooth camera** that follows the player and clamps to the map bounds
- **Start menu, how-to-play panel, and game-over/restart screen**, plus a desktop-only block screen for mobile visitors (this game requires a keyboard)

## Customizing

A few starting points if you want to extend it:

- **Add an enemy type** — add a new palette/sprite builder in `sprites.js`, then instantiate it via `new Enemy(x, y, 'yourType')` in `game.js`. Enemy stats (HP, speed, damage) are set in the `Enemy` constructor in `entities.js`.
- **Expand the map** — edit `TileMap` in `tilemap.js`; increase the `cols`/`rows` passed into `new TileMap(...)` in `game.js` and add new features inside `_buildWorld()`.
- **Add dialogue/NPCs** — create a new `NPC(...)` in `game.js` with a `dialogue` array of strings; push it into the `npcs` array.
- **Add items** — draw a new icon function in `sprites.js`, register it in `Sprites.icons`, then place a `new WorldItem(x, y, 'yourKind')` in `game.js`.

## Browser support

Any modern browser with Canvas2D support (Chrome, Firefox, Safari, Edge). No mobile touch controls are implemented — keyboard required.

## Screenshots

![screenshot](./screenshots/screenshot01.jpg)
![screenshot](./screenshots/screenshot02.jpg)
![screenshot](./screenshots/screenshot04.jpg)
![screenshot](./screenshots/screenshot05.jpg)
![screenshot](./screenshots/screenshot03.jpg)
![screenshot](./screenshots/screenshot06.jpg)
![screenshot](./screenshots/screenshot07.jpg)

## License

Free to use, modify, and build on for any purpose.
