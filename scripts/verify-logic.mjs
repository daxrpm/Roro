/**
 * Pruebas automaticas de logica independiente de Phaser: datos del nivel,
 * navegacion, puntaje, rutas de inspeccion y maquina de estados del detective.
 *
 * Ejecutar: npm test.
 *
 */
import { ApartmentLayout } from '../src/world/ApartmentLayout.js';
import { NavigationManager } from '../src/physics/NavigationManager.js';
import { EvidenceManager } from '../src/managers/EvidenceManager.js';
import { InspectionManager } from '../src/managers/InspectionManager.js';
import { HidingSpot } from '../src/objects/HidingSpot.js';
import { DetectiveStateMachine, DETECTIVE_EVENTS, DETECTIVE_STATE } from '../src/ai/DetectiveStateMachine.js';
import { createSeededRandom } from '../src/utils/random.js';
import {
    BELONGING_SPAWN_POINTS,
    DISTRACTIONS,
    FIXED_SPAWN_POINTS,
    HIDING_CATEGORY,
    HIDING_SPOTS,
    KEY_TILES
} from '../src/data/apartmentData.js';
import { EVIDENCE_ITEMS, EVIDENCE_STATE } from '../src/data/evidenceData.js';
import { INSPECTION_ROUTES, ROOM_SWEEP_POINTS } from '../src/data/detectiveRoutes.js';
import { DETECTIVE_CONFIG, HIDING_RULES, PLAYER_CONFIG, SCORE_CONFIG } from '../src/data/gameConfig.js';

let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
    if (condition) {
        passed += 1;
        console.log(`  ok   ${name}`);
    } else {
        failed += 1;
        console.log(`  FAIL ${name}${details ? ` -> ${details}` : ''}`);
    }
}

function section(title) {
    console.log(`\n${title}`);
}

const layout = new ApartmentLayout();
const navigation = new NavigationManager(layout, { clearance: DETECTIVE_CONFIG.bodyWidth / 2 + 2 });
const insideTile = KEY_TILES.roroStart;

function createHidingSpots() {
    return HIDING_SPOTS.map((definition) => new HidingSpot(definition, {
        position: layout.tilePointToWorld(definition.point),
        inspectPosition: layout.tileCenter(definition.inspectTile)
    }, HIDING_RULES.hidingSpotCapacity));
}

/** Indica si un centro de tile transitable alcanzable desde el inicio de Roro esta dentro del rango de interaccion de point. */
function isInteractable(point, range = PLAYER_CONFIG.interactionRange) {
    const world = layout.tilePointToWorld(point);
    for (let y = 0; y < layout.height; y++) {
        for (let x = 0; x < layout.width; x++) {
            if (!layout.isWalkable(x, y)) continue;
            const centre = layout.tileCenter({ x, y });
            if (Math.hypot(centre.x - world.x, centre.y - world.y) <= range && navigation.isReachable(insideTile, { x, y })) {
                return true;
            }
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
section('Level data');

for (const room of layout.rooms) {
    const centre = { x: room.rect.x + Math.floor(room.rect.w / 2), y: room.rect.y + Math.floor(room.rect.h / 2) };
    const target = navigation.findNearestWalkable(centre);
    check(`room "${room.id}" is reachable from the apartment`, target && navigation.isReachable(insideTile, target));
}

for (const door of layout.doors) {
    const tile = { x: door.rect.x, y: door.rect.y };
    check(`door "${door.id}" tiles are walkable for navigation`, layout.isWalkable(tile.x, tile.y));
}

for (const [name, tile] of Object.entries(KEY_TILES)) {
    check(`key tile "${name}" is walkable and reachable`, layout.isWalkable(tile.x, tile.y) && navigation.isReachable(insideTile, tile));
}

for (const point of [...BELONGING_SPAWN_POINTS, ...Object.values(FIXED_SPAWN_POINTS).map((p, i) => ({ ...p, id: `fixed${i}` }))]) {
    const tile = { x: Math.floor(point.x), y: Math.floor(point.y) };
    const walkable = layout.isWalkable(tile.x, tile.y);
    const room = layout.getRoomIdAtTile(tile.x, tile.y);
    check(`spawn "${point.id}" is on a walkable tile in room ${point.room}`, walkable && room === point.room && navigation.isReachable(insideTile, tile),
        `walkable=${walkable} room=${room}`);
    check(`spawn "${point.id}" can be picked up`, isInteractable(point));
}

const spots = createHidingSpots();
for (const spot of spots) {
    const tile = spot.inspectTile;
    check(`hiding spot "${spot.id}" inspect tile is walkable & reachable`, layout.isWalkable(tile.x, tile.y) && navigation.isReachable(KEY_TILES.detectiveEntry, tile));
    check(`hiding spot "${spot.id}" is in room ${spot.room}`, layout.getRoomIdAtTile(tile.x, tile.y) === spot.room);
    check(`hiding spot "${spot.id}" can be used by Roro`, isInteractable(spot.definition.point));
}

for (const category of Object.values(HIDING_CATEGORY)) {
    check(`category "${category}" has hiding spots`, spots.some((spot) => spot.category === category));
}
check('enough hiding capacity for all six objects', spots.length * HIDING_RULES.hidingSpotCapacity >= SCORE_CONFIG.MAX_SCORE);

for (const sweep of ROOM_SWEEP_POINTS) {
    check(`sweep "${sweep.id}" is walkable & reachable`, layout.isWalkable(sweep.tile.x, sweep.tile.y) && navigation.isReachable(KEY_TILES.detectiveEntry, sweep.tile));
}
for (const distraction of DISTRACTIONS) {
    const tile = distraction.investigateTile;
    check(`distraction "${distraction.id}" can be reached and used`, layout.isWalkable(tile.x, tile.y) && isInteractable(distraction.point));
}

// ---------------------------------------------------------------------------
section('Navigation');

function pathIsClear(path, start) {
    let previous = start;
    for (const waypoint of path) {
        if (!navigation.hasClearLine(previous, waypoint)) {
            return false;
        }
        previous = waypoint;
    }
    return true;
}

const destinations = [
    ...spots.map((spot) => ({ name: spot.id, tile: spot.inspectTile })),
    ...ROOM_SWEEP_POINTS.map((sweep) => ({ name: sweep.id, tile: sweep.tile })),
    { name: 'exit', tile: KEY_TILES.detectiveExit }
];
let allClear = true;
let pathCount = 0;
for (const from of [{ name: 'outside', tile: KEY_TILES.detectiveOutside }, ...destinations]) {
    for (const to of destinations) {
        const start = layout.tileCenter(from.tile);
        const path = navigation.findWorldPath(start, layout.tileCenter(to.tile));
        pathCount += 1;
        if (!path || !pathIsClear(path, start)) {
            allClear = false;
            console.log(`    path problem ${from.name} -> ${to.name}`);
        }
    }
}
check(`all ${pathCount} detective paths exist and never cross walls or furniture`, allClear);

const wallTile = { x: 0, y: 0 };
check('a wall tile is not walkable', !layout.isWalkable(wallTile.x, wallTile.y));
check('furniture blocks navigation (bed)', !layout.isWalkable(2, 3));
navigation.setTemporarilyBlocked({ x: 4, y: 10 }, true);
navigation.setTemporarilyBlocked({ x: 5, y: 10 }, true);
check('temporarily blocked doorway makes the bedroom unreachable', !navigation.isReachable(insideTile, { x: 5, y: 6 }));
navigation.setTemporarilyBlocked({ x: 4, y: 10 }, false);
navigation.setTemporarilyBlocked({ x: 5, y: 10 }, false);
check('unblocked doorway restores the path', navigation.isReachable(insideTile, { x: 5, y: 6 }));

// ---------------------------------------------------------------------------
section('Evidence and score');

{
    const evidence = new EvidenceManager(EVIDENCE_ITEMS);
    const testSpots = createHidingSpots();
    check('initial score is 0', evidence.getScore() === 0);
    check('max score is 6', evidence.getMaxScore() === 6 && EVIDENCE_ITEMS.length === 6);

    check('pick up the bat', evidence.pickUp('bat').ok);
    check('cannot pick up a second object while carrying', evidence.pickUp('globe').reason === 'handsFull');
    check('hide the bat', evidence.hideCarried(testSpots[0]).ok && evidence.getScore() === 1);
    check('the bat cannot be picked up again from the floor', !evidence.pickUp('bat').ok);
    check('hiding with empty hands does nothing', !evidence.hideCarried(testSpots[1]).ok && evidence.getScore() === 1);

    evidence.pickUp('globe');
    check('cannot hide in an occupied spot', evidence.hideCarried(testSpots[0]).reason === 'occupied' && evidence.getScore() === 1);
    check('can hide in a free spot', evidence.hideCarried(testSpots[1]).ok && evidence.getScore() === 2);

    check('retrieve the bat (score -1)', evidence.retrieveFrom(testSpots[0]).ok && evidence.getScore() === 1);
    check('re-hide the bat (counted once)', evidence.hideCarried(testSpots[2]).ok && evidence.getScore() === 2);

    // Esconde todo; el puntaje debe limitarse a seis.
    let spotIndex = 3;
    for (const definition of EVIDENCE_ITEMS) {
        if (evidence.getItem(definition.id).state === EVIDENCE_STATE.NOT_FOUND) {
            evidence.pickUp(definition.id);
            evidence.hideCarried(testSpots[spotIndex++]);
        }
    }
    check('all six hidden gives exactly 6', evidence.getScore() === 6);
    for (let attempt = 0; attempt < 10; attempt++) {
        EVIDENCE_ITEMS.forEach((definition) => evidence.pickUp(definition.id));
        testSpots.forEach((spot) => evidence.hideCarried(spot));
    }
    check('repeated interactions never exceed 6', evidence.getScore() <= 6);
    check('discovered evidence leaves the score', evidence.markDiscovered('bat') && evidence.getScore() === 5);
    check('a discovered object cannot change state again', !evidence.markDiscovered('bat') && !evidence.pickUp('bat').ok);
}

{
    let distinct = true;
    let validFixed = true;
    for (let seed = 1; seed <= 300; seed++) {
        const spawns = EvidenceManager.chooseSpawnPoints(EVIDENCE_ITEMS, BELONGING_SPAWN_POINTS, FIXED_SPAWN_POINTS, createSeededRandom(seed));
        const randomIds = EVIDENCE_ITEMS.filter((item) => item.spawn === 'random').map((item) => spawns.get(item.id).id);
        if (new Set(randomIds).size !== randomIds.length) distinct = false;
        if (spawns.get('bat') !== FIXED_SPAWN_POINTS.bat || spawns.get('note') !== FIXED_SPAWN_POINTS.note) validFixed = false;
    }
    check('random belongings never share a spawn point (300 seeds)', distinct);
    check('bat and note always use their fixed spawn points', validFixed);
}

// ---------------------------------------------------------------------------
section('Inspection routes');

{
    const routeSpots = createHidingSpots();
    const inspection = new InspectionManager({
        routes: INSPECTION_ROUTES, sweepPoints: ROOM_SWEEP_POINTS, hidingSpots: routeSpots,
        layout, navigation, originTile: KEY_TILES.detectiveEntry, random: createSeededRandom(7)
    });
    check('there are four routes', INSPECTION_ROUTES.length === 4);
    INSPECTION_ROUTES.forEach((route, index) => {
        const points = inspection.startRoute(index);
        const expected = routeSpots.filter((spot) => spot.category === route.category).length + (route.includeRoomSweeps ? ROOM_SWEEP_POINTS.length : 0);
        check(`route ${route.id} visits all ${expected} required points`, points.length === expected);
        const roomsSeen = [];
        points.forEach((point) => {
            if (roomsSeen[roomsSeen.length - 1] !== point.room) roomsSeen.push(point.room);
        });
        check(`route ${route.id} visits each room in one block`, new Set(roomsSeen).size === roomsSeen.length);
    });
    const speeds = INSPECTION_ROUTES.map((route) => route.speedMultiplier);
    check('route 4 is faster than routes 1-3', speeds[3] > Math.max(...speeds.slice(0, 3)));
    const orders = new Set();
    for (let seed = 1; seed <= 20; seed++) {
        const randomInspection = new InspectionManager({
            routes: INSPECTION_ROUTES, sweepPoints: ROOM_SWEEP_POINTS, hidingSpots: routeSpots,
            layout, navigation, originTile: KEY_TILES.detectiveEntry, random: createSeededRandom(seed)
        });
        orders.add(randomInspection.startRoute(0).map((point) => point.id).join(','));
    }
    check('route order is randomised between games', orders.size > 1, `${orders.size} distinct orders`);
}

// ---------------------------------------------------------------------------
section('Detective state machine (simulated)');

/** Doble de prueba de Detective: llega de inmediato en el siguiente ciclo. */
class MockDetective {
    constructor(position) {
        this.position = { ...position };
        this.pending = null;
        this.searching = false;
        this.speedMultiplier = 1;
    }
    navigateTo(target, callbacks) {
        this.pending = { target, callbacks };
    }
    tick() {
        if (this.pending) {
            const { target, callbacks } = this.pending;
            this.pending = null;
            this.position = { ...target };
            callbacks.onArrive?.();
        }
    }
    stop() { this.pending = null; }
    getPosition() { return this.position; }
    setSpeedMultiplier(multiplier) { this.speedMultiplier = multiplier; }
    faceTowards() {}
    setSearching(searching) { this.searching = searching; }
}

function createSimulation({ rules = HIDING_RULES, prepare = () => {}, seed = 3, evidenceToSolve = 1 } = {}) {
    const simSpots = createHidingSpots();
    const evidence = new EvidenceManager(EVIDENCE_ITEMS, rules, evidenceToSolve);
    const spawns = EvidenceManager.chooseSpawnPoints(EVIDENCE_ITEMS, BELONGING_SPAWN_POINTS, FIXED_SPAWN_POINTS, createSeededRandom(seed));
    for (const [id, point] of spawns) {
        evidence.setSpawn(id, layout.tilePointToWorld(point), point.room);
    }
    const detective = new MockDetective(layout.tileCenter(KEY_TILES.detectiveOutside));
    const inspection = new InspectionManager({
        routes: INSPECTION_ROUTES, sweepPoints: ROOM_SWEEP_POINTS, hidingSpots: simSpots,
        layout, navigation, originTile: KEY_TILES.detectiveEntry, random: createSeededRandom(seed)
    });
    const playerPosition = layout.tileCenter(KEY_TILES.roroStart);
    const fsm = new DetectiveStateMachine({
        detective, inspection, evidence,
        getPlayerPosition: () => detective.position, // El detective siempre alcanza a Roro en esta simulacion.
        positions: { entry: layout.tileCenter(KEY_TILES.detectiveEntry), exit: layout.tileCenter(KEY_TILES.detectiveExit) },
        doors: { closeFrontDoor: () => {} }
    });
    const log = { interviews: [], caught: null, finished: false, rejected: [], playerPosition };
    fsm.on(DETECTIVE_EVENTS.INTERVIEW_REQUESTED, ({ interviewIndex }) => log.interviews.push(interviewIndex));
    fsm.on(DETECTIVE_EVENTS.EVIDENCE_DISCOVERED, (payload) => { log.caught = payload; });
    fsm.on(DETECTIVE_EVENTS.VISIT_FINISHED, () => { log.finished = true; });
    fsm.on(DETECTIVE_EVENTS.TRANSITION_REJECTED, (payload) => log.rejected.push(payload));
    prepare({ evidence, spots: simSpots, fsm, inspection });

    const run = (maxSteps = 5000, onStep = () => {}) => {
        fsm.start();
        for (let step = 0; step < maxSteps && fsm.isActive(); step++) {
            detective.tick();
            fsm.update(100);
            if (fsm.state === DETECTIVE_STATE.INTERVIEWING && fsm.context.phase === 'talking') {
                fsm.completeInterview();
            }
            onStep(step, fsm);
        }
        detective.tick();
        return log;
    };
    return { fsm, evidence, spots: simSpots, inspection, run, log };
}

{
    // Victoria: Roro lleva todo, sin limite de carga en esta prueba; no queda nada descubrible.
    const sim = createSimulation({
        rules: { ...HIDING_RULES, carryLimit: 6 },
        prepare: ({ evidence }) => EVIDENCE_ITEMS.forEach((item) => evidence.pickUp(item.id))
    });
    const log = sim.run();
    check('victory: visit finishes when nothing is discovered', log.finished && sim.fsm.state === DETECTIVE_STATE.FINISHED);
    check('victory: exactly three interviews, in order', log.interviews.join(',') === '0,1,2');
    check('victory: all hiding spots were inspected', sim.spots.every((spot) => spot.inspected));
    const expectedHistory = ['waiting', 'entering', 'inspecting', 'interviewing', 'inspecting', 'interviewing', 'inspecting', 'interviewing', 'inspecting', 'finished'];
    check('victory: state history follows the FSM', sim.fsm.history.join(',') === expectedHistory.join(','), sim.fsm.history.join(','));
    check('victory: no rejected transitions', log.rejected.length === 0);
}

{
    // Un hallazgo: el bate esta en un escondite muy evidente revisado en la ronda 1.
    const sim = createSimulation({
        rules: { ...HIDING_RULES, carryLimit: 6 },
        prepare: ({ evidence, spots: simSpots }) => {
            EVIDENCE_ITEMS.forEach((item) => evidence.pickUp(item.id));
            // Esconde solo el bate; los demas objetos siguen en manos de Roro.
            evidence.carriedIds = ['bat', ...evidence.carriedIds.filter((id) => id !== 'bat')];
            evidence.hideCarried(simSpots.find((spot) => spot.id === 'underBed'));
        }
    });
    const log = sim.run();
    check('first hidden evidence immediately causes defeat', !log.finished && sim.fsm.state === DETECTIVE_STATE.CAUGHT && log.caught?.discoveries[0].item.id === 'bat');
    check('discovered evidence is removed from its hiding place', !sim.spots.find(spot => spot.id === 'underBed').isOccupied());
    check('defeat stops route 1 before interviews', sim.inspection.getRouteNumber() === 1 && log.interviews.length === 0);
    check('discovered bat no longer counts', sim.evidence.getItem('bat').state === EVIDENCE_STATE.DISCOVERED && sim.evidence.getScore() === 0);
}

{
    // Es seguro esconder algo DESPUES de que se inspecciono el lugar.
    let hidden = false;
    const sim = createSimulation({
        rules: { ...HIDING_RULES, carryLimit: 6 },
        prepare: ({ evidence }) => EVIDENCE_ITEMS.forEach((item) => evidence.pickUp(item.id))
    });
    const underBed = sim.spots.find((spot) => spot.id === 'underBed');
    const log = sim.run(5000, () => {
        if (!hidden && underBed.inspected) {
            sim.evidence.carriedIds = ['bat', ...sim.evidence.carriedIds.filter((id) => id !== 'bat')];
            hidden = sim.evidence.hideCarried(underBed).ok;
        }
    });
    check('a spot searched earlier is safe for the rest of the visit', hidden && log.finished && sim.evidence.getScore() === 1);
}

{
    // Se descubre evidencia expuesta cerca de un punto de barrido de habitacion.
    const sim = createSimulation({
        prepare: ({ evidence }) => {
            const sweep = ROOM_SWEEP_POINTS.find((point) => point.id === 'sweepHallway');
            evidence.setSpawn('lamp', layout.tileCenter(sweep.tile), sweep.room);
        }
    });
    const log = sim.run();
    check('exposed evidence near an inspection point is discovered', sim.fsm.state === DETECTIVE_STATE.CAUGHT && log.caught.discoveries.some(entry => entry.reason === 'exposed'));
}

{
    // La distraccion interrumpe al detective; despues vuelve al mismo punto de ruta.
    const sim = createSimulation({
        rules: { ...HIDING_RULES, carryLimit: 6 },
        prepare: ({ evidence }) => EVIDENCE_ITEMS.forEach((item) => evidence.pickUp(item.id))
    });
    const kettle = DISTRACTIONS[0];
    const source = {
        name: kettle.name, room: kettle.room,
        position: layout.tilePointToWorld(kettle.point),
        investigatePosition: layout.tileCenter(kettle.investigateTile)
    };
    let pointBefore = null;
    let pointAfterReturn = null;
    let sawRedirected = false;
    let sawReturning = false;
    let interrupted = false;
    sim.run(5000, (step, fsm) => {
        if (!interrupted && fsm.state === DETECTIVE_STATE.INSPECTING && sim.inspection.getRouteNumber() === 2 && fsm.context.phase === 'searching') {
            pointBefore = sim.inspection.getCurrentPoint();
            interrupted = fsm.notifyDistraction(source);
        }
        if (fsm.state === DETECTIVE_STATE.REDIRECTED) sawRedirected = true;
        if (fsm.state === DETECTIVE_STATE.RETURNING) sawReturning = true;
        if (interrupted && sawReturning && pointAfterReturn === null && fsm.state === DETECTIVE_STATE.INSPECTING) {
            pointAfterReturn = sim.inspection.getCurrentPoint();
        }
    });
    check('distraction moves the detective to REDIRECTED then RETURNING', interrupted && sawRedirected && sawReturning);
    check('after a distraction the route resumes at the interrupted point', pointBefore && pointAfterReturn === pointBefore);
    check('the visit still finishes after a distraction', sim.log.finished);
}

{
    const sim = createSimulation();
    check('invalid transition WAITING -> CAUGHT is rejected', !sim.fsm.transition(DETECTIVE_STATE.CAUGHT) && sim.fsm.state === DETECTIVE_STATE.WAITING);
    check('distraction is ignored before the detective enters', !sim.fsm.notifyDistraction({}));
}

// La dificultad conserva visibilidad y cambia la cantidad de evidencias distintas necesarias.
{
    const { DIFFICULTY_SETTINGS } = await import('../src/data/gameConfig.js');
    for (const [difficulty, visibility, required] of [['easy', 'full', 3], ['normal', 'room', 2], ['hard', 'radius', 1]]) {
        check(difficulty + ': original visibility remains', DIFFICULTY_SETTINGS[difficulty].visibility === visibility);
        const sim = createSimulation({ rules: { ...HIDING_RULES, carryLimit: 6 }, prepare: ({ evidence, spots }) => {
            EVIDENCE_ITEMS.forEach(item => evidence.pickUp(item.id));
            evidence.hideCarried(spots.find(spot => spot.id === 'underBed'));
        } });
        sim.run();
        check(difficulty + ': configured evidence threshold', DIFFICULTY_SETTINGS[difficulty].evidenceToSolve === required);
        const thresholdSim = createSimulation({ evidenceToSolve: required });
        thresholdSim.fsm.start();
        thresholdSim.fsm.transition(DETECTIVE_STATE.INSPECTING, { routeIndex: 0 });
        for (let index = 0; index < required; index++) {
            const item = thresholdSim.evidence.getItem(EVIDENCE_ITEMS[index].id);
            const discovery = [{ item, reason: 'exposed' }];
            const ended = thresholdSim.fsm.handleDiscoveries(discovery, { room: 'hallway' });
            const progress = thresholdSim.evidence.getCaseProgress();
            check(difficulty + ': discovery ' + (index + 1) + ' counts toward case', progress.found === index + 1 && progress.remaining === required - index - 1);
            check(difficulty + ': defeat only when case is solved', ended === (index === required - 1));
            thresholdSim.fsm.handleDiscoveries(discovery, { room: 'hallway' });
            check(difficulty + ': the same object never counts twice', thresholdSim.evidence.getCaseProgress().found === index + 1);
        }
        check(difficulty + ': restart clears investigation', createSimulation({ evidenceToSolve: required }).evidence.getCaseProgress().found === 0);
    }
    check('normal retains room darkness', DIFFICULTY_SETTINGS.normal.obscuredAlpha === 0.93);
    check('hard retains visibility radius and darkness', DIFFICULTY_SETTINGS.hard.visibilityRadius === 110 && DIFFICULTY_SETTINGS.hard.obscuredAlpha === 0.985);
}

{
    const sim = createSimulation({ evidenceToSolve: 3, rules: { ...HIDING_RULES, carryLimit: 6 }, prepare: ({ evidence, spots }) => {
        EVIDENCE_ITEMS.forEach(item => evidence.pickUp(item.id));
        evidence.hideCarried(spots.find(spot => spot.id === 'underBed'));
        evidence.hideCarried(spots.find(spot => spot.id === 'bathtub'));
    } });
    sim.run();
    check('two discoveries do not stop a three-evidence visit', sim.log.finished && !sim.log.caught && sim.evidence.getCaseProgress().remaining === 1);
}
{
    const sim = createSimulation({ evidenceToSolve: 2 });
    sim.fsm.start();
    sim.fsm.transition(DETECTIVE_STATE.INSPECTING, { routeIndex: 0 });
    const batch = ['globe', 'stars', 'lamp'].map(id => ({ item: sim.evidence.getItem(id), reason: 'exposed' }));
    sim.fsm.handleDiscoveries(batch, { room: 'hallway' });
    check('multiple objects at once solve the case without negative remaining count', sim.evidence.getCaseProgress().remaining === 0 && sim.evidence.getCaseProgress().found === 2 && !!sim.log.caught);
}
{
    const { caseAtmosphere } = await import('../src/utils/caseAtmosphere.js');
    check('three objects remaining has normal music and no red filter', caseAtmosphere(3).musicRate === 1 && caseAtmosphere(3).intensity === 0);
    check('two remaining raises music speed and red intensity', caseAtmosphere(2).musicRate > 1 && caseAtmosphere(2).intensity === 0.5);
    check('one remaining has maximum tension', caseAtmosphere(1).musicRate === 1.3 && caseAtmosphere(1).intensity === 1);
    check('case atmosphere stays bounded', caseAtmosphere(0).intensity === 1 && caseAtmosphere(6).intensity === 0);
}

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
