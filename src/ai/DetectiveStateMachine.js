import { SimpleEmitter } from '../utils/SimpleEmitter.js';
import { DETECTIVE_CONFIG, DISTRACTION_CONFIG } from '../data/gameConfig.js';

export const DETECTIVE_STATE = Object.freeze({
    WAITING: 'waiting',
    ENTERING: 'entering',
    INSPECTING: 'inspecting',
    INTERVIEWING: 'interviewing',
    REDIRECTED: 'redirected',
    RETURNING: 'returning',
    FINISHED: 'finished',
    CAUGHT: 'caught'
});

/**
 * Tabla de transiciones. Los cambios no incluidos se rechazan y registran.
 * WAITING --start--> ENTERING --fin de pausa de entrada--> INSPECTING
 * INSPECTING --fin de ronda 1 a 3--> INTERVIEWING --fin del dialogo--> INSPECTING (ronda siguiente)
 * INSPECTING --fin de ronda 4--> FINISHED
 * INSPECTING --caso resuelto--> CAUGHT
 * INSPECTING / RETURNING --distraccion--> REDIRECTED --fin de investigacion--> RETURNING --regreso a
 * ruta--> INSPECTING
 * REDIRECTED --caso resuelto cerca de la distraccion--> CAUGHT
 */
export const DETECTIVE_TRANSITIONS = Object.freeze({
    [DETECTIVE_STATE.WAITING]: [DETECTIVE_STATE.ENTERING],
    [DETECTIVE_STATE.ENTERING]: [DETECTIVE_STATE.INSPECTING],
    [DETECTIVE_STATE.INSPECTING]: [DETECTIVE_STATE.INTERVIEWING, DETECTIVE_STATE.REDIRECTED, DETECTIVE_STATE.FINISHED, DETECTIVE_STATE.CAUGHT],
    [DETECTIVE_STATE.INTERVIEWING]: [DETECTIVE_STATE.INSPECTING],
    [DETECTIVE_STATE.REDIRECTED]: [DETECTIVE_STATE.RETURNING, DETECTIVE_STATE.CAUGHT],
    [DETECTIVE_STATE.RETURNING]: [DETECTIVE_STATE.INSPECTING, DETECTIVE_STATE.REDIRECTED],
    [DETECTIVE_STATE.FINISHED]: [],
    [DETECTIVE_STATE.CAUGHT]: []
});

export const DETECTIVE_EVENTS = Object.freeze({
    STATE_CHANGED: 'stateChanged',
    ROUTE_STARTED: 'routeStarted',
    INSPECTION_STARTED: 'inspectionStarted',
    INSPECTION_FINISHED: 'inspectionFinished',
    INTERVIEW_REQUESTED: 'interviewRequested',
    DISTRACTED: 'distracted',
    EVIDENCE_DISCOVERED: 'evidenceDiscovered',
    CASE_PROGRESS: 'caseProgress',
    VISIT_FINISHED: 'visitFinished',
    TRANSITION_REJECTED: 'transitionRejected'
});

/**
 * Maquina de estados finitos que controla al detective.
 * La FSM decide QUE hace el detective; el objeto Detective decide COMO:
 * seguimiento de rutas, puertas y animacion. Esta interfaz mantiene la clase
 * independiente de Phaser y permite probarla en Node:
 *
 * detective.navigateTo(position, { onArrive, onFail })
 * detective.stop()
 * detective.getPosition()
 * detective.setSpeedMultiplier(multiplier)
 * detective.faceTowards(position)
 * detective.setSearching(isSearching)
 *
 * Los temporizadores avanzan con update(delta); pausar la escena tambien pausa la
 * FSM.
 */
export class DetectiveStateMachine extends SimpleEmitter {
    /**
     * @param {object} deps
     * @param {object} deps.detective interfaz de movimiento descrita arriba
     * @param {import('../managers/InspectionManager.js').InspectionManager} deps.inspection
     * @param {import('../managers/EvidenceManager.js').EvidenceManager} deps.evidence
     * @param {() => {x:number,y:number}} deps.getPlayerPosition
     * @param {{ entry: {x,y}, exit: {x,y} }} deps.positions posiciones en el mundo
     * @param {{ closeFrontDoor: Function }} deps.doors
     * @param {object} [deps.config]
     */
    constructor({ detective, inspection, evidence, getPlayerPosition, positions, doors, config = DETECTIVE_CONFIG, distractionConfig = DISTRACTION_CONFIG }) {
        super();
        this.detective = detective;
        this.inspection = inspection;
        this.evidence = evidence;
        this.getPlayerPosition = getPlayerPosition;
        this.positions = positions;
        this.doors = doors;
        this.config = config;
        this.distractionConfig = distractionConfig;

        this.state = DETECTIVE_STATE.WAITING;
        this.previousState = null;
        // Aumenta en cada transicion; se ignoran los callbacks de estados anteriores.
        this.stateToken = 0;
        // Datos usados por el estado actual: fase, temporizadores y objetivos.
        this.context = {};
        this.history = [DETECTIVE_STATE.WAITING];

        this.handlers = {
            [DETECTIVE_STATE.WAITING]: {},
            [DETECTIVE_STATE.ENTERING]: {
                enter: () => this.enterEntering(),
                update: (delta) => this.updateEntering(delta)
            },
            [DETECTIVE_STATE.INSPECTING]: {
                enter: (payload) => this.enterInspecting(payload),
                update: (delta) => this.updateInspecting(delta),
                exit: () => this.detective.setSearching(false)
            },
            [DETECTIVE_STATE.INTERVIEWING]: {
                enter: (payload) => this.enterInterviewing(payload),
                update: (delta) => this.updateInterviewing(delta)
            },
            [DETECTIVE_STATE.REDIRECTED]: {
                enter: (payload) => this.enterRedirected(payload),
                update: (delta) => this.updateRedirected(delta),
                exit: () => this.detective.setSearching(false)
            },
            [DETECTIVE_STATE.RETURNING]: {
                enter: () => this.enterReturning()
            },
            [DETECTIVE_STATE.FINISHED]: {
                enter: () => this.enterFinished()
            },
            [DETECTIVE_STATE.CAUGHT]: {
                enter: (payload) => this.enterCaught(payload)
            }
        };
    }

    // ------------------------------------------------------------- estructura

    canTransition(nextState) {
        return DETECTIVE_TRANSITIONS[this.state].includes(nextState);
    }

    transition(nextState, payload = {}) {
        if (!this.canTransition(nextState)) {
            this.emit(DETECTIVE_EVENTS.TRANSITION_REJECTED, { from: this.state, to: nextState });
            return false;
        }
        this.handlers[this.state].exit?.();
        this.previousState = this.state;
        this.state = nextState;
        this.stateToken += 1;
        this.context = {};
        this.history.push(nextState);
        this.emit(DETECTIVE_EVENTS.STATE_CHANGED, { from: this.previousState, to: nextState, payload });
        this.handlers[nextState].enter?.(payload);
        return true;
    }

    /** Protege un callback para ejecutarlo solo si el estado no ha cambiado. */
    guard(callback) {
        const token = this.stateToken;
        return (...args) => {
            if (token === this.stateToken) {
                callback(...args);
            }
        };
    }

    navigate(position, onArrive, onFail) {
        this.detective.navigateTo(position, {
            onArrive: this.guard(onArrive),
            onFail: this.guard(onFail ?? onArrive)
        });
    }

    update(delta) {
        this.handlers[this.state].update?.(delta);
    }

    isActive() {
        return this.state !== DETECTIVE_STATE.FINISHED && this.state !== DETECTIVE_STATE.CAUGHT;
    }

    // --------------------------------------------------------- eventos externos

    /** Inicia la visita despues de los golpes en la puerta y la introduccion. */
    start() {
        return this.transition(DETECTIVE_STATE.ENTERING);
    }

    /**
     * Una distraccion produjo ruido. Solo interrumpe la inspeccion o el regreso a la
     * ruta; no interrumpe entrevistas, entrada ni salida.
     */
    notifyDistraction(distraction) {
        if (this.state !== DETECTIVE_STATE.INSPECTING && this.state !== DETECTIVE_STATE.RETURNING) {
            return false;
        }
        return this.transition(DETECTIVE_STATE.REDIRECTED, { distraction });
    }

    /** La escena lo llama cuando termina la lectura del dialogo de entrevista. */
    completeInterview() {
        if (this.state !== DETECTIVE_STATE.INTERVIEWING || this.context.phase !== 'talking') {
            return false;
        }
        return this.transition(DETECTIVE_STATE.INSPECTING, { routeIndex: this.context.interviewIndex + 1 });
    }

    // ----------------------------------------------------------------- estados

    enterEntering() {
        this.context.phase = 'walking';
        // El detective abre la puerta principal cuando su recorrido llega a ella.
        this.navigate(this.positions.entry, () => {
            this.context.phase = 'lookingAround';
            this.context.timer = this.config.entryPause;
            this.detective.stop();
            this.detective.setSearching(true);
        });
    }

    updateEntering(delta) {
        if (this.context.phase !== 'lookingAround') {
            return;
        }
        this.context.timer -= delta;
        if (this.context.timer <= 0) {
            this.detective.setSearching(false);
            this.doors.closeFrontDoor();
            this.transition(DETECTIVE_STATE.INSPECTING, { routeIndex: 0 });
        }
    }

    enterInspecting(payload) {
        if (payload.routeIndex !== undefined) {
            this.inspection.startRoute(payload.routeIndex);
            const route = this.inspection.getRoute();
            this.detective.setSpeedMultiplier(route.speedMultiplier);
            this.emit(DETECTIVE_EVENTS.ROUTE_STARTED, { route, progress: this.inspection.getProgress() });
        }
        this.travelToCurrentPoint();
    }

    travelToCurrentPoint() {
        const point = this.inspection.getCurrentPoint();
        if (!point) {
            this.finishRoute();
            return;
        }
        this.context.phase = 'travelling';
        this.context.point = point;
        this.navigate(point.position,
            () => this.beginSearch(point),
            () => {
                // Punto inaccesible por ahora: se omite para evitar detener la partida.
                this.inspection.completeCurrentPoint();
                this.travelToCurrentPoint();
            });
    }

    beginSearch(point) {
        this.context.phase = 'searching';
        this.context.timer = this.inspection.getRoute().inspectDuration;
        this.detective.stop();
        if (point.hidingSpot) {
            this.detective.faceTowards(point.hidingSpot.position);
        }
        this.detective.setSearching(true);
        this.emit(DETECTIVE_EVENTS.INSPECTION_STARTED, { point });
    }

    updateInspecting(delta) {
        if (this.context.phase !== 'searching') {
            return;
        }
        this.context.timer -= delta;
        if (this.context.timer > 0) {
            return;
        }

        const point = this.context.point;
        this.detective.setSearching(false);
        const discoveries = this.evidence.findDiscoverable({
            hidingSpot: point.hidingSpot,
            position: point.position,
            lookRadius: point.lookRadius,
            room: point.room
        });

        if (this.handleDiscoveries(discoveries, point)) {
            return;
        }

        this.inspection.completeCurrentPoint();
        this.emit(DETECTIVE_EVENTS.INSPECTION_FINISHED, { point, progress: this.inspection.getProgress() });
        this.travelToCurrentPoint();
    }

    /**
     * La visita termina al descubrir suficientes evidencias distintas.
     */
    handleDiscoveries(discoveries, point) {
        if (discoveries.length === 0) {
            return false;
        }
        if (!this.isActive()) return false;
        const newlyFound = discoveries.filter(({ item }) => this.evidence.markDiscovered(item.id));
        if (newlyFound.length === 0) return false;
        for (const { item, hidingSpot } of newlyFound) hidingSpot?.remove(item.id);
        const decisive = newlyFound.filter(({ item }) => item.definition.decisive);
        const progress = this.evidence.getCaseProgress();
        this.emit(DETECTIVE_EVENTS.CASE_PROGRESS, { discoveries: newlyFound, point, progress });
        if (decisive.length > 0 && progress.remaining === 0) {
            this.transition(DETECTIVE_STATE.CAUGHT, { discoveries: decisive, point });
            return true;
        }
        return false;
    }

    finishRoute() {
        if (this.inspection.hasNextRoute()) {
            this.transition(DETECTIVE_STATE.INTERVIEWING, { interviewIndex: this.inspection.routeIndex });
        } else {
            this.transition(DETECTIVE_STATE.FINISHED);
        }
    }

    enterInterviewing({ interviewIndex }) {
        this.context.interviewIndex = interviewIndex;
        this.context.phase = 'approaching';
        this.context.repathTimer = 0;
        this.context.elapsed = 0;
    }

    updateInterviewing(delta) {
        if (this.context.phase !== 'approaching') {
            return;
        }
        this.context.elapsed += delta;
        const playerPosition = this.getPlayerPosition();
        const position = this.detective.getPosition();
        const distance = Math.hypot(playerPosition.x - position.x, playerPosition.y - position.y);

        if (distance <= this.config.interviewDistance || this.context.elapsed >= this.config.interviewFallbackTimeout) {
            this.context.phase = 'talking';
            this.detective.stop();
            this.detective.faceTowards(playerPosition);
            this.emit(DETECTIVE_EVENTS.INTERVIEW_REQUESTED, { interviewIndex: this.context.interviewIndex });
            return;
        }

        // Roro se mueve; por eso se recalcula periodicamente la ruta hacia el.
        this.context.repathTimer -= delta;
        if (this.context.repathTimer <= 0) {
            this.context.repathTimer = this.config.chaseRepathInterval;
            this.navigate(playerPosition, () => {}, () => {});
        }
    }

    enterRedirected({ distraction }) {
        this.context.distraction = distraction;
        this.context.phase = 'travelling';
        this.emit(DETECTIVE_EVENTS.DISTRACTED, { distraction });
        this.navigate(distraction.investigatePosition,
            () => {
                this.context.phase = 'investigating';
                this.context.timer = this.distractionConfig.investigateDuration;
                this.detective.stop();
                this.detective.faceTowards(distraction.position);
                this.detective.setSearching(true);
            },
            () => this.transition(DETECTIVE_STATE.RETURNING));
    }

    updateRedirected(delta) {
        if (this.context.phase !== 'investigating') {
            return;
        }
        this.context.timer -= delta;
        if (this.context.timer > 0) {
            return;
        }
        const distraction = this.context.distraction;
        const discoveries = this.evidence.findDiscoverable({
            position: distraction.investigatePosition,
            lookRadius: this.inspection.getRoute()?.lookRadius ?? 64,
            room: distraction.room
        });
        if (this.handleDiscoveries(discoveries, { label: distraction.name, room: distraction.room })) {
            return;
        }
        this.transition(DETECTIVE_STATE.RETURNING);
    }

    enterReturning() {
        const point = this.inspection.getCurrentPoint();
        if (!point) {
            this.transition(DETECTIVE_STATE.INSPECTING);
            return;
        }
        // La ruta se conserva: el detective regresa al punto al que se dirigia
        // o que estaba inspeccionando, y retoma la busqueda desde alli.
        this.navigate(point.position,
            () => this.transition(DETECTIVE_STATE.INSPECTING, { resumed: true }),
            () => this.transition(DETECTIVE_STATE.INSPECTING, { resumed: true }));
    }

    enterFinished() {
        this.detective.setSpeedMultiplier(1);
        this.navigate(this.positions.exit, () => {
            this.detective.stop();
            this.doors.closeFrontDoor();
            this.emit(DETECTIVE_EVENTS.VISIT_FINISHED, {});
        });
    }

    enterCaught({ discoveries, point }) {
        this.detective.stop();
        this.detective.faceTowards(this.getPlayerPosition());
        this.emit(DETECTIVE_EVENTS.EVIDENCE_DISCOVERED, { discoveries, point });
    }
}
