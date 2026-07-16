const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { createSandbox } = require('./dom-shim');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/utils.js',
  'js/config/balance.js', 'js/config/level-layout.js', 'js/config/item-effects.js',
  'js/sprites/humanoid-sprites.js', 'js/sprites/monster-sprites.js', 'js/sprites/icon-sprites.js', 'js/sprites/sprites.js',
  'js/world/tilemap-builder.js', 'js/world/tilemap-renderer.js', 'js/world/tilemap.js',
  'js/entities/animated-sprite.js', 'js/entities/player.js', 'js/entities/npc.js', 'js/entities/enemy.js', 'js/entities/fireball.js',
  'js/systems/camera.js', 'js/systems/particles.js', 'js/systems/dialogue.js', 'js/systems/inventory.js',
  'js/ui/hud.js', 'js/ui/screens.js',
  'js/core/input.js', 'js/core/world-factory.js', 'js/core/combat.js', 'js/core/game.js',
];

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS:', name); }
  else { fail++; console.log('  FAIL:', name); }
}

console.log('=== Loading all 26 files in dependency order ===');
const sandbox = createSandbox();
const ctx = vm.createContext(sandbox);
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  vm.runInContext(src, ctx, { filename: f });
  console.log('  loaded', f);
}
console.log('All files loaded and executed without throwing.\n');

// Pull references out of the vm context explicitly (top-level `const`/class
// declarations inside vm.runInContext don't always mirror onto the sandbox
// object as plain JS properties, so fetch everything we need via a small
// runInContext expression instead).
const pull = (expr) => vm.runInContext(expr, ctx);
const Sprites = pull('Sprites');
const dbgGlobal = pull('window.__gameDebug');
const CombatRef = pull('Combat');
const PLAYER_SPAWN_REF = pull('PLAYER_SPAWN');
const BOOTS_SPEED_REF = pull('BOOTS_SPEED');
const PLAYER_BASE_STATS_REF = pull('PLAYER_BASE_STATS');

console.log('=== Sprite registry ===');
const expectedSpriteKeys = ['player','playerSword','elder','merchant','slimeGreen','slimeBlue','slimeRed','slimeJungle','goblin','devil','orcWarlord','jungleWitch','spider','skeleton','skeletonKing'];
expectedSpriteKeys.forEach(k => check(`Sprites.${k} exists`, !!Sprites[k]));
const expectedIcons = ['sword','armor','helmet','swordLegendary','armorJungle','boots','potionRed','potionBlue','coin','key','shield','shieldBone','crownSkeleton'];
expectedIcons.forEach(k => check(`Sprites.icons.${k} exists`, !!Sprites.icons[k]));

console.log('\n=== TileMap ===');
const dbg = dbgGlobal;
check('__gameDebug exposed', !!dbg);
const map = dbg.state.map;
check('map is 109x166', map.cols === 109 && map.rows === 166);
check('gates start closed', !map.isGateOpen && !map.isWorldTwoGateOpen && !map.isJungleGateOpen && !map.isSkeletonGateOpen);

console.log('\n=== World factory counts ===');
check('86 enemies spawned', dbg.state.enemies.length === 86);
check('2 npcs spawned', dbg.state.npcs.length === 2);
check('elder resolved', dbg.state.elder && dbg.state.elder.name === 'Elder Rowan');
check('merchant resolved', dbg.state.merchant && dbg.state.merchant.name === 'Wandering Merchant');
check('5 world items spawned', dbg.state.worldItems.length === 5);

console.log('\n=== Boot state ===');
check('gameState starts at start', dbg.state.gameState === 'start');
check('player at spawn', dbg.state.player.x === PLAYER_SPAWN_REF.x && dbg.state.player.y === PLAYER_SPAWN_REF.y);

console.log('\n=== Simulate: click Play, run frames ===');
dbg.state.gameState = 'playing';
sandbox.__tick(30);
check('30 frames ran with no throw', true);

console.log('\n=== Simulate combat: force-kill one of each boss type ===');
['goblinBoss','orcBoss','witchBoss','devilBoss','skeletonKing'].forEach(type => {
  const before = dbg.state.worldItems.length;
  const en = dbg.state.enemies.find(e => e.type === type);
  check(`${type} exists in roster`, !!en);
  en.hp = 1;
  en.takeDamage(999, dbg.state.particles);
  check(`${type} died`, !en.alive);
  CombatRef._onEnemyDefeated(dbg.state, en);
  const after = dbg.state.worldItems.length;
  check(`${type} defeat dropped item(s)`, after > before);
});
check('goblinBoss opened world-two gate', map.isWorldTwoGateOpen);
check('devilBoss opened jungle gate', map.isJungleGateOpen);
check('questStage advanced to 3 via goblinBoss', dbg.state.questStage === 3);

console.log('\n=== Simulate gate-unlock-by-attrition (slime gate) ===');
dbg.state.enemies.filter(e => e.type === 'slimeGreen' || e.type === 'slimeBlue').forEach(e => { e.alive = false; });
CombatRef.checkGateConditions(dbg.state);
check('slime gate opened once all slimes dead', map.isGateOpen);

console.log('\n=== Simulate item pickup ===');
const swordItem = dbg.state.worldItems.find(i => i.kind === 'sword');
dbg.state.player.x = swordItem.x; dbg.state.player.y = swordItem.y;
CombatRef.processWorldItemPickups(dbg.state);
check('sword picked up', swordItem.taken === true);
check('player.hasSword set', dbg.state.player.hasSword === true);
check('questStage stayed >= 2 (advanceQuestTo uses Math.max)', dbg.state.questStage === 3);

console.log('\n=== Simulate inventory equip/unequip ===');
dbg.state.inventory.add('boots', 1);
CombatRef.handleInventoryClick(dbg.state, { region: 'backpack', kind: 'boots' });
check('boots equipped sets speed to BOOTS_SPEED', dbg.state.player.speed === BOOTS_SPEED_REF);
CombatRef.handleInventoryClick(dbg.state, { region: 'equip', slotId: 'boots' });
check('unequip boots resets speed to base', dbg.state.player.speed === PLAYER_BASE_STATS_REF.speed);

console.log('\n=== Simulate restart ===');
dbg.restartGame();
check('restart resets hp', dbg.state.player.hp === PLAYER_BASE_STATS_REF.hp);
check('restart resets gold', dbg.state.player.gold === 0);
check('restart rebuilds 86 enemies', dbg.state.enemies.length === 86);
check('restart resets gameState to playing', dbg.state.gameState === 'playing');
check('restart does NOT reset gates (world persists)', map.isGateOpen && map.isWorldTwoGateOpen);

sandbox.__tick(30);
check('30 more frames post-restart, no throw', true);

console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
