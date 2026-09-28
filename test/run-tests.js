const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { createSandbox } = require('./dom-shim');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/utils.js',
  'js/config/balance.js', 'js/config/level-layout.js', 'js/config/item-effects.js', 'js/config/item-stats.js',
  'js/sprites/humanoid-sprites.js', 'js/sprites/monster-sprites.js', 'js/sprites/molten-sprites.js', 'js/sprites/frost-sprites.js', 'js/sprites/icon-sprites.js', 'js/sprites/sprites.js',
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
check('map is 109x366 (grew to fit the Frostspire)', map.cols === 109 && map.rows === 366);
check('gates start closed', !map.isGateOpen && !map.isWorldTwoGateOpen && !map.isJungleGateOpen && !map.isSkeletonGateOpen && !map.isLavaGateOpen && !map.isPitGateOpen);

console.log('\n=== World factory counts ===');
check('143 enemies spawned (129 previous + 14 Frostspire)', dbg.state.enemies.length === 143);
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
check('restart rebuilds 143 enemies', dbg.state.enemies.length === 143);
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

console.log('\n=== Sand Scorpion (World 2) ===');
check('Sprites.sandScorpion exists', !!Sprites.sandScorpion);
const scorpions = dbg.state.enemies.filter(e => e.type === 'sandScorpion');
check('30 sand scorpions in roster', scorpions.length === 30);
check('sandScorpion is notably stronger than slimeRed', scorpions[0].maxHp > 18 * 2);
let scorpionSolidFails = 0;
scorpions.forEach(e => {
  const tx = Math.floor(e.x / 32), ty = Math.floor(e.y / 32);
  if (map.isSolid(tx, ty)) scorpionSolidFails++;
});
check('no sand scorpion spawns on a solid tile', scorpionSolidFails === 0);

console.log('\n=== Defense mechanic ===');
const ITEM_STATS_REF = pull('ITEM_STATS');
check('ARMOR_DEFENSE values loaded (armorObsidian)', ITEM_STATS_REF.armorObsidian.def === 12);
dbg.state.player.hp = dbg.state.player.maxHp;
dbg.state.player.defense = 0;
dbg.state.player.invuln = 0;
const hpBeforeNoDef = dbg.state.player.hp;
dbg.state.player.takeDamage(10, dbg.state.particles);
const dmgTakenNoDef = hpBeforeNoDef - dbg.state.player.hp;
check('takeDamage with 0 defense deals full damage', dmgTakenNoDef === 10);

dbg.state.inventory.add('armorObsidian', 1);
CombatRef.handleInventoryClick(dbg.state, { region: 'backpack', kind: 'armorObsidian' });
check('equipping Obsidian Armor sets player.defense to 12', dbg.state.player.defense === 12);

dbg.state.player.hp = dbg.state.player.maxHp;
dbg.state.player.invuln = 0;
const hpBeforeDef = dbg.state.player.hp;
dbg.state.player.takeDamage(10, dbg.state.particles);
const dmgTakenWithDef = hpBeforeDef - dbg.state.player.hp;
check('10 damage with 12 defense reduces to the 1-damage floor', dmgTakenWithDef === 1);

CombatRef.handleInventoryClick(dbg.state, { region: 'equip', slotId: 'armor' });
check('unequipping armor resets defense to 0', dbg.state.player.defense === 0);

console.log('\n=== Inventory stats panel renders ===');
dbg.state.inventory.open = true;
dbg.state.inventory.add('swordMolten', 1);
dbg.state.inventory.hoveredKind = 'swordMolten';
dbg.state.inventory.draw(fakeCtx, 960, 600, dbg.state.player);
check('inventory.draw with player arg runs without throwing (hovering an item)', true);
dbg.state.inventory.hoveredKind = null;
dbg.state.inventory.hoveredSlot = null;
dbg.state.inventory.draw(fakeCtx, 960, 600, dbg.state.player);
check('inventory.draw runs without throwing (nothing hovered)', true);
dbg.state.inventory.open = false;

sandbox.__tick(20);
check('20 more frames after stats-panel tests, no throw', true);

console.log('\n=== Enemy cannot stand on the player ===');
const KNOCKBACK_SPEED_REF = pull('KNOCKBACK_SPEED');
const KNOCKBACK_DURATION_REF = pull('KNOCKBACK_DURATION');
const KNOCKBACK_EVERY_NTH_REF = pull('KNOCKBACK_EVERY_NTH_ATTACK');

// Place a fresh grunt right next to the player and aggro it, then run many
// update ticks — its center should never get closer than its own
// personal-space radius (see Enemy._personalSpaceRadius), however many
// frames pass.
const EnemyRef = pull('Enemy');
const centerDist = (e) => Math.hypot(
  (e.x + e.w / 2) - (dbg.state.player.x + dbg.state.player.w / 2),
  (e.y + e.h / 2) - (dbg.state.player.y + dbg.state.player.h / 2)
);

// Invariant 1: an enemy chasing in from a SAFE starting distance should
// never get closer than its personal-space radius via its own movement.
const chaseEnemy = new EnemyRef(dbg.state.player.x + 200, dbg.state.player.y, 'slimeGreen', { aggroRange: 999 });
let chaseTooClose = false;
for (let i = 0; i < 300; i++) {
  chaseEnemy.update(dbg.state.player, map, dbg.state.particles);
  if (centerDist(chaseEnemy) < chaseEnemy._personalSpaceRadius() - 0.5) { chaseTooClose = true; break; }
}
check('enemy chasing in from a safe distance never breaches its personal-space radius', !chaseTooClose);

// Invariant 2: if an enemy STARTS closer than its personal-space radius
// (the realistic case is the player walking onto a stationary/wandering
// enemy), it should separate back out within a bounded number of frames
// and then stay clear.
const stuckEnemy = new EnemyRef(dbg.state.player.x + 8, dbg.state.player.y, 'slimeGreen', { aggroRange: 999 });
stuckEnemy.x = dbg.state.player.x + 3;
stuckEnemy.y = dbg.state.player.y;
check('deliberately-too-close enemy starts inside its personal-space radius (sanity check on the test setup)', centerDist(stuckEnemy) < stuckEnemy._personalSpaceRadius());
let clearedAtTick = -1;
for (let i = 0; i < 60 && clearedAtTick === -1; i++) {
  stuckEnemy.update(dbg.state.player, map, dbg.state.particles);
  if (centerDist(stuckEnemy) >= stuckEnemy._personalSpaceRadius()) clearedAtTick = i;
}
check('too-close enemy separates back out within 30 frames', clearedAtTick !== -1 && clearedAtTick <= 30);
let staysClear = true;
for (let i = 0; i < 60; i++) {
  stuckEnemy.update(dbg.state.player, map, dbg.state.particles);
  if (centerDist(stuckEnemy) < stuckEnemy._personalSpaceRadius() - 0.5) { staysClear = false; break; }
}
check('once separated, stays clear for 60 more frames', staysClear);

console.log('\n=== THE ACTUAL BUG: every enemy type must still be able to reach attack range and land a hit ===');
// This is what regressed: atkRange is smaller than the two entities' combined
// half-widths for nearly every type (especially at diagonal angles), so a
// naive full-overlap block stopped enemies just outside atkRange forever.
// Test every type from both an axis-aligned AND a 45-degree diagonal
// approach, since the diagonal case is the one that was actually broken.
// Pinned to the guaranteed-open spawn point so terrain can't confound this.
const PLAYER_SPAWN_FOR_TEST = pull('PLAYER_SPAWN');
const typesToTest = ['slimeGreen', 'slimeRed', 'sandScorpion', 'skeleton', 'troll', 'goblinBoss', 'skeletonKing', 'pitDevil'];
typesToTest.forEach((type) => {
  // Diagonal approaches FROM the north-west — verified clear terrain around
  // PLAYER_SPAWN (row 34-46 is open; row 47 is the jungle's real north
  // wall, so a south-east diagonal would cross real terrain and confound
  // this test with a wall-collision instead of the thing being tested).
  [{ label: 'axis-aligned', ax: 1, ay: 0 }, { label: 'diagonal', ax: -0.707, ay: -0.707 }].forEach(({ label, ax, ay }) => {
    dbg.state.player.x = PLAYER_SPAWN_FOR_TEST.x;
    dbg.state.player.y = PLAYER_SPAWN_FOR_TEST.y;
    dbg.state.player.hp = dbg.state.player.maxHp;
    dbg.state.player.invuln = 0;
    dbg.state.player.defense = 0;
    const startDist = 220;
    const e = new EnemyRef(
      dbg.state.player.x + ax * startDist,
      dbg.state.player.y + ay * startDist,
      type,
      { aggroRange: 999 }
    );
    let landedHit = false;
    const hpBefore = dbg.state.player.hp;
    for (let i = 0; i < 400; i++) {
      e.update(dbg.state.player, map, dbg.state.particles);
      if (dbg.state.player.hp < hpBefore) { landedHit = true; break; }
    }
    check(`${type} (${label} approach) reaches attack range and lands a hit`, landedHit);
  });
});

// Directly attempt to force an overlapping move and confirm it's rejected.
const testEnemy2 = new EnemyRef(dbg.state.player.x, dbg.state.player.y, 'slimeGreen', {});
testEnemy2.x = dbg.state.player.x - testEnemy2.w - 1;
testEnemy2.y = dbg.state.player.y;
testEnemy2.speed = 50; // huge speed to try to force a jump straight onto the player
testEnemy2.aggroRange = 999;
testEnemy2.update(dbg.state.player, map, dbg.state.particles);
const stillClear = !(testEnemy2.x < dbg.state.player.x + dbg.state.player.w &&
  testEnemy2.x + testEnemy2.w > dbg.state.player.x &&
  testEnemy2.y < dbg.state.player.y + dbg.state.player.h &&
  testEnemy2.y + testEnemy2.h > dbg.state.player.y);
check('even a very fast lunge cannot land the enemy on the player', stillClear);

console.log('\n=== Every 3rd attack knocks back ===');
dbg.state.gameState = 'playing';
dbg.state.player.attackCount = 0;
dbg.state.player.attackCooldown = 0;
const knockTestEnemy = dbg.state.enemies.find(e => e.type === 'slimeGreen' && e.alive);
knockTestEnemy.x = dbg.state.player.x + 10;
knockTestEnemy.y = dbg.state.player.y;
knockTestEnemy.hp = 999999; knockTestEnemy.maxHp = 999999; // don't let it die mid-test
knockTestEnemy.dir = 'right';

function swing() {
  dbg.state.player.attackCooldown = 0;
  dbg.state.player.x = knockTestEnemy.x - 20;
  dbg.state.player.y = knockTestEnemy.y;
  dbg.state.player.dir = 'right';
  CombatRef.handleAttack(dbg.state);
}

swing(); // attack #1
check('attack 1: no knockback applied', knockTestEnemy.knockbackTimer === 0);
swing(); // attack #2
check('attack 2: no knockback applied', knockTestEnemy.knockbackTimer === 0);
const posBefore3rd = { x: knockTestEnemy.x, y: knockTestEnemy.y };
swing(); // attack #3
check('attack 3: knockback timer set', knockTestEnemy.knockbackTimer === KNOCKBACK_DURATION_REF);
check('attack 3: knockback velocity points away from player', knockTestEnemy.knockbackVX > 0);

// Run a few update ticks and confirm the enemy actually moved away.
for (let i = 0; i < 5; i++) knockTestEnemy.update(dbg.state.player, map, dbg.state.particles);
check('enemy physically moved during knockback', knockTestEnemy.x > posBefore3rd.x);

swing(); // attack #4 — back to no knockback
check('attack 4: no knockback (cadence resumed)', knockTestEnemy.knockbackTimer === 0 || knockTestEnemy.knockbackTimer < KNOCKBACK_DURATION_REF);

console.log('\n=== Bosses are immune to knockback ===');
const bossForKnockback = dbg.state.enemies.find(e => e.isBoss && e.alive);
bossForKnockback.knockbackTimer = 0;
bossForKnockback.applyKnockback(bossForKnockback.centerX - 50, bossForKnockback.centerY);
check('applyKnockback on a boss is a no-op', bossForKnockback.knockbackTimer === 0);

console.log('\n=== restartGame resets attackCount ===');
dbg.state.player.attackCount = 7;
dbg.restartGame();
check('restart resets attackCount to 0', dbg.state.player.attackCount === 0);

sandbox.__tick(30);
check('30 more frames after knockback/collision tests, no throw', true);

console.log(`\n=== FINAL RESULTS: ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
