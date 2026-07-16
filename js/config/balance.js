// config/balance.js — every tunable number that defines game balance.
//
// This is the one file to open if you want to change how strong the player
// or a monster is, how much XP/gold a kill is worth, or how the fireball
// spell behaves. Nothing in here draws pixels or holds flavor text — for
// world content (dialogue, spawn placement) see config/level-layout.js, and
// for what happens when an item is picked up/equipped see
// config/item-effects.js.

// --- Player ---
const PLAYER_BASE_STATS = {
  hp: 150,
  maxHp: 150,
  atk: 3,
  speed: 2.6,
  mana: 100,
  maxMana: 100,
  manaRegen: 0.04,
  xp: 0,
  xpNext: 10,
  lvl: 1,
  gold: 0,
};

// Applied every time the player crosses an XP threshold (gainXP loop).
const PLAYER_LEVEL_UP = {
  xpNextMultiplier: 1.4,
  xpNextFlatBonus: 4,
  hpGain: 15,
  atkGain: 2,
};

// Melee damage bonus layered on top of player.atk depending on equipped weapon.
const WEAPON_ATTACK_BONUS = {
  none: 0,
  sword: 2,
  swordLegendary: 8,
};

const FIREBALL_STATS = {
  manaCost: 30,
  cooldown: 25,
  speed: 8,
  damage: 25,
  life: 90,
};

// Swift Boots (see config/item-effects.js) set the player's speed directly
// rather than adding a bonus, so both values live here for symmetry.
const BOOTS_SPEED = 3.2;

// --- Enemies ---
// One row per enemy `type`. `spriteKey` indexes into the Sprites registry
// (see sprites/sprites.js), frameW/frameH is the sprite sheet's per-frame
// size, and dirRows tells AnimatedSprite whether the sheet has 4 directional
// rows (humanoids/skeletons) or just a single animation row (slimes/spider).
const ENEMY_DEFS = {
  slimeGreen:   { w: 20, h: 18, drawW: 32, drawH: 28, hp: 10, speed: 0.95, contactDmg: 2, atkRange: 20, spriteKey: 'slimeGreen', frameW: 32, frameH: 28, dirRows: false },
  slimeBlue:    { w: 20, h: 18, drawW: 32, drawH: 28, hp: 10, speed: 0.95, contactDmg: 2, atkRange: 20, spriteKey: 'slimeBlue', frameW: 32, frameH: 28, dirRows: false },
  slimeRed:     { w: 20, h: 18, drawW: 32, drawH: 28, hp: 18, speed: 1.1, contactDmg: 3, atkRange: 22, spriteKey: 'slimeRed', frameW: 32, frameH: 28, dirRows: false },
  slimeJungle:  { w: 20, h: 18, drawW: 32, drawH: 28, hp: 20, speed: 1.15, contactDmg: 3, atkRange: 22, spriteKey: 'slimeJungle', frameW: 32, frameH: 28, dirRows: false },
  spider:       { w: 20, h: 18, drawW: 32, drawH: 28, hp: 16, speed: 1.6, contactDmg: 4, atkRange: 20, spriteKey: 'spider', frameW: 32, frameH: 28, dirRows: false },
  skeleton:     { w: 22, h: 26, drawW: 32, drawH: 34, hp: 32, speed: 1.0, contactDmg: 5, atkRange: 24, spriteKey: 'skeleton', frameW: 32, frameH: 34, dirRows: true },

  goblinBoss:   { w: 30, h: 32, drawW: 40, drawH: 42, hp: 240, speed: 1.15, contactDmg: 5, atkRange: 30, spriteKey: 'goblin', frameW: 40, frameH: 42, dirRows: true },
  devilBoss:    { w: 30, h: 32, drawW: 40, drawH: 42, hp: 350, speed: 1.25, contactDmg: 6, atkRange: 34, spriteKey: 'devil', frameW: 40, frameH: 42, dirRows: true },
  orcBoss:      { w: 30, h: 32, drawW: 40, drawH: 42, hp: 280, speed: 1.2, contactDmg: 6, atkRange: 32, spriteKey: 'orcWarlord', frameW: 40, frameH: 42, dirRows: true },
  witchBoss:    { w: 30, h: 32, drawW: 40, drawH: 42, hp: 260, speed: 1.1, contactDmg: 5, atkRange: 40, spriteKey: 'jungleWitch', frameW: 40, frameH: 42, dirRows: true },
  skeletonKing: { w: 60, h: 64, drawW: 80, drawH: 84, hp: 1750, speed: 1.05, contactDmg: 16, atkRange: 46, spriteKey: 'skeletonKing', frameW: 80, frameH: 84, dirRows: true },
};

const BOSS_TYPES = new Set(['goblinBoss', 'devilBoss', 'orcBoss', 'witchBoss', 'skeletonKing']);
const DEFAULT_AGGRO_RANGE = 150;

// --- Combat rewards ---
// XP/gold granted for defeating each enemy type. `gold` may be a fixed
// number or a `[min, max]` range rolled with randRange(...)|0.
const COMBAT_REWARDS = {
  skeletonKing: { xp: 600, gold: 500 },
  devilBoss:    { xp: 250, gold: 200 },
  goblinBoss:   { xp: 50, gold: 40 },
  orcBoss:      { xp: 50, gold: 40 },
  witchBoss:    { xp: 50, gold: 40 },
  slimeRed:     { xp: 25, gold: 8 },
  skeleton:     { xp: 14, gold: [2, 4] },
  spider:       { xp: 9, gold: [2, 4] },
};
// Anything not listed above (slimeGreen, slimeBlue, slimeJungle) uses this.
const DEFAULT_COMBAT_REWARD = { xp: 10, gold: [1, 3] };

function getCombatReward(enemyType) {
  const r = COMBAT_REWARDS[enemyType] || DEFAULT_COMBAT_REWARD;
  const gold = Array.isArray(r.gold) ? (randRange(r.gold[0], r.gold[1]) | 0) : r.gold;
  return { xp: r.xp, gold };
}
