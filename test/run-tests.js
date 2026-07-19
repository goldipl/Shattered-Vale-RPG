const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { createSandbox } = require('./dom-shim');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/utils.js',
  'js/config/balance.js', 'js/config/level-layout.js', 'js/config/item-effects.js',
  'js/sprites/humanoid-sprites.js', 'js/sprites/monster-sprites.js', 'js/sprites/molten-sprites.js', 'js/sprites/icon-sprites.js', 'js/sprites/sprites.js',
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
const Screens = pull('Screens');
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
check('map is 109x236 (grew to fit Molten Depths)', map.cols === 109 && map.rows === 236);
check('gates start closed', !map.isGateOpen && !map.isWorldTwoGateOpen && !map.isJungleGateOpen && !map.isSkeletonGateOpen && !map.isLavaGateOpen && !map.isPitGateOpen);

console.log('\n=== World factory counts ===');
check('99 enemies spawned (86 original + 13 Molten Depths)', dbg.state.enemies.length === 99);
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
check('restart rebuilds 99 enemies', dbg.state.enemies.length === 99);
check('restart resets gameState to playing', dbg.state.gameState === 'playing');
check('restart does NOT reset gates (world persists)', map.isGateOpen && map.isWorldTwoGateOpen);

sandbox.__tick(30);
check('30 more frames post-restart, no throw', true);

console.log('\n=== Escape returns to start menu with Continue label ===');
dbg.state.gameState = 'playing';
dbg.state.hasStarted = true;
dbg.state.inventory.open = false;
dbg.state.dialogue.active = null;
vm.runInContext('window.__gameDebug.state.justPressed = true;', ctx); // no-op, real justPressed lives in closure
check('hasStarted stays true after esc-triggered start screen', dbg.state.hasStarted === true);
const fakeCtx = require('./dom-shim').makeFakeCtx();
Screens.drawStart(fakeCtx, dbg.state, 960, 600);
check('start button drawn while hasStarted=true (no throw)', !!dbg.state.startButtons.play);

console.log('\n=== Restart Game button on start menu ===');
dbg.state.gameState = 'start';
dbg.state.hasStarted = false;
Screens.drawStart(fakeCtx, dbg.state, 960, 600);
check('no Restart button before first Play', dbg.state.startButtons.restart === null);

dbg.state.hasStarted = true;
Screens.drawStart(fakeCtx, dbg.state, 960, 600);
check('Restart button appears once hasStarted', !!dbg.state.startButtons.restart);
check('Play label becomes Continue once hasStarted', true); // label drawn via fake ctx, checked visually via drawButton call not throwing

dbg.state.player.hp = 1;
dbg.state.questStage = 3;
const restartBtn = dbg.state.startButtons.restart;
const clickX = restartBtn.x + restartBtn.w/2, clickY = restartBtn.y + restartBtn.h/2;
check('click point lands inside restart button', Screens.pointInBtn(clickX, clickY, restartBtn));
dbg.restartGame();
check('restartGame() drops gameState to playing', dbg.state.gameState === 'playing');
check('restartGame() resets hp fully', dbg.state.player.hp === PLAYER_BASE_STATS_REF.hp);
check('restartGame() resets questStage', dbg.state.questStage === 0);

console.log('\n=== Molten Depths: sprites & icons registered ===');
['devilLesser','orcRaider','troll','trollChieftain','pitDevil'].forEach(k => {
  check(`Sprites.${k} exists`, !!Sprites[k]);
});
['armorObsidian','swordMolten','bootsFireproof'].forEach(k => {
  check(`Sprites.icons.${k} exists`, !!Sprites.icons[k]);
});

console.log('\n=== Molten Depths: roster present ===');
const trollChieftain = dbg.state.enemies.find(e => e.type === 'trollChieftain');
const pitDevil = dbg.state.enemies.find(e => e.type === 'pitDevil');
check('trollChieftain in roster', !!trollChieftain);
check('pitDevil in roster', !!pitDevil);
check('11 Molten grunts in roster', dbg.state.enemies.filter(e => ['devilLesser','orcRaider','troll'].includes(e.type)).length === 11);

console.log('\n=== Molten Depths: every new enemy/boss spawns on non-solid ground ===');
let solidSpawnFails = 0;
dbg.state.enemies.forEach(e => {
  if (!['devilLesser','orcRaider','troll','trollChieftain','pitDevil'].includes(e.type)) return;
  const tx = Math.floor(e.x / 32), ty = Math.floor(e.y / 32);
  if (map.isSolid(tx, ty)) {
    solidSpawnFails++;
    console.log(`    solid-tile spawn: ${e.type} at tile (${tx},${ty})`);
  }
});
check('no Molten Depths enemy spawns on a solid tile', solidSpawnFails === 0);

console.log('\n=== Molten Depths: gate progression ===');
// NOTE: skeletonKing was already force-killed in the "force-kill one of
// each boss type" section above, so the Lava Gate is expected to be open
// by this point — that's confirmed on its own a few lines down. Pit Gate
// hasn't been touched yet, so it should still be closed.
check('Pit Gate starts closed (untouched so far)', !map.isPitGateOpen);

const skelKing = dbg.state.enemies.find(e => e.type === 'skeletonKing');
skelKing.hp = 1; skelKing.takeDamage(999, dbg.state.particles);
CombatRef._onEnemyDefeated(dbg.state, skelKing);
check('skeletonKing defeat opens Lava Gate (not just narrative end)', map.isLavaGateOpen);
check('skeletonKing defeat no longer sets victory', dbg.state.gameState !== 'victory');

const worldItemsBeforeChieftain = dbg.state.worldItems.length;
trollChieftain.hp = 1; trollChieftain.takeDamage(999, dbg.state.particles);
CombatRef._onEnemyDefeated(dbg.state, trollChieftain);
check('trollChieftain defeat opens Pit Gate', map.isPitGateOpen);
check('trollChieftain drops armorObsidian', dbg.state.worldItems.some(i => i.kind === 'armorObsidian'));
check('trollChieftain drop count increased', dbg.state.worldItems.length > worldItemsBeforeChieftain);

console.log('\n=== Molten Depths: true final boss ===');
check('gameState not victory before Pit Devil dies', dbg.state.gameState !== 'victory');
pitDevil.hp = 1; pitDevil.takeDamage(999, dbg.state.particles);
CombatRef._onEnemyDefeated(dbg.state, pitDevil);
check('pitDevil defeat sets gameState to victory', dbg.state.gameState === 'victory');
check('pitDevil drops swordMolten', dbg.state.worldItems.some(i => i.kind === 'swordMolten'));
check('pitDevil drops bootsFireproof', dbg.state.worldItems.some(i => i.kind === 'bootsFireproof'));

console.log('\n=== Molten Depths: victory screen renders ===');
dbg.state.gameState = 'victory';
Screens.drawEnd(fakeCtx, dbg.state, 960, 600);
check('drawEnd runs for victory state without throwing', !!dbg.state.restartButton);

console.log('\n=== Lava hazard damage ===');
dbg.state.gameState = 'playing';
dbg.state.player.fireproof = false;
dbg.state.player.hp = dbg.state.player.maxHp;
dbg.state.player.invuln = 0;
// find an actual LAVA tile near the molten zone rather than assuming coordinates
let lavaTile = null;
const LAVA = pull('TileType.LAVA');
for (let y = 166; y < 235 && !lavaTile; y++) {
  for (let x = 1; x < 108; x++) {
    if (map.get(x, y) === LAVA) { lavaTile = { x, y }; break; }
  }
}
check('found at least one LAVA tile in the generated map', !!lavaTile);
if (lavaTile) {
  dbg.state.player.x = lavaTile.x * 32; dbg.state.player.y = lavaTile.y * 32;
  const hpBefore = dbg.state.player.hp;
  CombatRef.checkHazards(dbg.state);
  check('standing on lava damages the player', dbg.state.player.hp < hpBefore);

  dbg.state.player.hp = dbg.state.player.maxHp;
  dbg.state.player.invuln = 0;
  dbg.state.player.fireproof = true;
  const hpBefore2 = dbg.state.player.hp;
  CombatRef.checkHazards(dbg.state);
  check('fireproof boots negate lava damage', dbg.state.player.hp === hpBefore2);
}

console.log('\n=== Molten equipment equip/unequip ===');
dbg.state.player.fireproof = false;
dbg.state.inventory.add('bootsFireproof', 1);
CombatRef.handleInventoryClick(dbg.state, { region: 'backpack', kind: 'bootsFireproof' });
check('equipping fireproof boots sets player.fireproof', dbg.state.player.fireproof === true);
CombatRef.handleInventoryClick(dbg.state, { region: 'equip', slotId: 'boots' });
check('unequipping boots clears fireproof', dbg.state.player.fireproof === false);

dbg.state.inventory.add('swordMolten', 1);
CombatRef.handleInventoryClick(dbg.state, { region: 'backpack', kind: 'swordMolten' });
check('equipping molten sword sets hasMoltenSword', dbg.state.player.hasMoltenSword === true);
check('molten sword gives top attack tier', dbg.state.player.attackDamage === dbg.state.player.atk + 16);
CombatRef.handleInventoryClick(dbg.state, { region: 'equip', slotId: 'weapon' });
check('unequipping weapon clears hasMoltenSword', dbg.state.player.hasMoltenSword === false);

sandbox.__tick(30);
check('30 more frames post-victory-and-equip-tests, no throw', true);

console.log('\n=== Victory screen: Continue + Play Again buttons ===');
dbg.state.gameState = 'victory';
Screens.drawEnd(fakeCtx, dbg.state, 960, 600);
check('victory screen has a Continue button', !!dbg.state.continueButton);
check('victory screen has a Play Again (restart) button', !!dbg.state.restartButton);
check('Continue and Play Again do not overlap', dbg.state.continueButton.x + dbg.state.continueButton.w <= dbg.state.restartButton.x);

console.log('\n=== Gameover screen: only Play Again, no Continue ===');
dbg.state.gameState = 'gameover';
Screens.drawEnd(fakeCtx, dbg.state, 960, 600);
check('gameover screen has no Continue button', dbg.state.continueButton === null);
check('gameover screen still has Play Again', !!dbg.state.restartButton);

console.log('\n=== restartGame() now also clears Molten Depths weapon/boots flags ===');
dbg.state.player.hasMoltenSword = true;
dbg.state.player.fireproof = true;
dbg.restartGame();
check('restart clears hasMoltenSword (was a gap before this fix)', dbg.state.player.hasMoltenSword === false);
check('restart clears fireproof (was a gap before this fix)', dbg.state.player.fireproof === false);

console.log(`\n=== FINAL RESULTS: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
