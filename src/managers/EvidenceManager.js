import { SimpleEmitter } from '../utils/SimpleEmitter.js';
import { pickDistinct } from '../utils/random.js';
import { EVIDENCE_STATE } from '../data/evidenceData.js';
import { HIDING_RULES, SCORE_CONFIG } from '../data/gameConfig.js';

/**
 * Transiciones permitidas de evidencia. Los cambios no incluidos se rechazan para
 * impedir que un mismo objeto puntue dos veces.
 */
const ALLOWED_TRANSITIONS = Object.freeze({
    [EVIDENCE_STATE.NOT_FOUND]: [EVIDENCE_STATE.CARRIED, EVIDENCE_STATE.DISCOVERED],
    [EVIDENCE_STATE.CARRIED]: [EVIDENCE_STATE.HIDDEN],
    [EVIDENCE_STATE.HIDDEN]: [EVIDENCE_STATE.CARRIED, EVIDENCE_STATE.DISCOVERED],
    [EVIDENCE_STATE.DISCOVERED]: []
});

export const EVIDENCE_EVENTS = Object.freeze({
    STATE_CHANGED: 'stateChanged',
    SCORE_CHANGED: 'scoreChanged'
});

/**
 * Controla el estado de seis evidencias y su puntaje.
 *
 * El puntaje se deriva contando HIDDEN, en lugar de incrementarse por separado: no
 * supera la cantidad de objetos ni cuenta uno dos veces.
 *
 * Logica independiente de Phaser para poder probarla en Node.
 *
 */
export class EvidenceManager extends SimpleEmitter {
    constructor(definitions, rules = HIDING_RULES, evidenceToSolve = 3) {
        super();
        this.rules = rules;
        this.evidenceToSolve = evidenceToSolve;
        this.items = new Map(definitions.map((definition) => [definition.id, {
            id: definition.id,
            definition,
            state: EVIDENCE_STATE.NOT_FOUND,
            // Posicion en el mundo mientras el estado es NOT_FOUND.
            position: null,
            room: null,
            hidingSpotId: null,
            hasBeenRead: false
        }]));
        this.carriedIds = [];
    }

    /**
     * Elige posiciones: los objetos aleatorios reciben puntos distintos de la
     * lista predefinida; los objetos fijos usan su punto configurado.
     * @returns {Map<string, object>} id de evidencia -> punto inicial (en tiles)
     */
    static chooseSpawnPoints(definitions, randomPoints, fixedPoints, random = Math.random) {
        const randomItems = definitions.filter((definition) => definition.spawn === 'random');
        const chosen = pickDistinct(randomPoints, randomItems.length, random);
        const result = new Map();
        randomItems.forEach((definition, index) => result.set(definition.id, chosen[index]));
        for (const definition of definitions) {
            if (definition.spawn !== 'random') {
                const point = fixedPoints[definition.spawn];
                if (!point) {
                    throw new Error(`Missing fixed spawn point "${definition.spawn}" for evidence "${definition.id}".`);
                }
                result.set(definition.id, point);
            }
        }
        return result;
    }

    // ---------------------------------------------------------------- consultas

    getItem(id) {
        return this.items.get(id) ?? null;
    }

    getAll() {
        return [...this.items.values()];
    }

    getCarriedItem() {
        return this.carriedIds.length > 0 ? this.items.get(this.carriedIds[0]) : null;
    }

    getScore() {
        const hidden = this.getAll().filter((item) => item.state === EVIDENCE_STATE.HIDDEN).length;
        return Math.min(hidden, SCORE_CONFIG.MAX_SCORE);
    }

    getCaseProgress() {
        const discovered = this.getAll().filter(item => item.state === EVIDENCE_STATE.DISCOVERED && item.definition.decisive).length;
        const found = Math.min(discovered, this.evidenceToSolve);
        return { found, required: this.evidenceToSolve, remaining: Math.max(0, this.evidenceToSolve - found) };
    }

    getMaxScore() {
        return Math.min(this.items.size, SCORE_CONFIG.MAX_SCORE);
    }

    countByState(state) {
        return this.getAll().filter((item) => item.state === state).length;
    }

    // -------------------------------------------------------------- cambios

    setSpawn(id, position, room) {
        const item = this.items.get(id);
        item.position = position;
        item.room = room;
    }

    markRead(id) {
        const item = this.items.get(id);
        if (item) {
            item.hasBeenRead = true;
        }
    }

    transition(item, nextState) {
        if (!ALLOWED_TRANSITIONS[item.state].includes(nextState)) {
            return false;
        }
        const previousScore = this.getScore();
        const from = item.state;
        item.state = nextState;
        this.emit(EVIDENCE_EVENTS.STATE_CHANGED, { item, from, to: nextState });
        const score = this.getScore();
        if (score !== previousScore) {
            this.emit(EVIDENCE_EVENTS.SCORE_CHANGED, { score, previousScore, item });
        }
        return true;
    }

    /** Roro recoge un objeto que esta en el departamento. */
    pickUp(id) {
        const item = this.items.get(id);
        if (!item || item.state !== EVIDENCE_STATE.NOT_FOUND) {
            return { ok: false, reason: 'unavailable' };
        }
        if (this.carriedIds.length >= this.rules.carryLimit) {
            return { ok: false, reason: 'handsFull' };
        }
        this.carriedIds.push(id);
        item.position = null;
        item.room = null;
        this.transition(item, EVIDENCE_STATE.CARRIED);
        return { ok: true, action: 'pickUp', item };
    }

    /** Guarda el objeto llevado en un escondite y suma un punto. */
    hideCarried(hidingSpot) {
        const item = this.getCarriedItem();
        if (!item) {
            return { ok: false, reason: 'nothingCarried' };
        }
        if (!hidingSpot.hasCapacity()) {
            return { ok: false, reason: 'occupied' };
        }
        if (!hidingSpot.store(item.id)) {
            return { ok: false, reason: 'occupied' };
        }
        this.carriedIds = this.carriedIds.filter((id) => id !== item.id);
        item.hidingSpotId = hidingSpot.id;
        this.transition(item, EVIDENCE_STATE.HIDDEN);
        return { ok: true, action: 'hide', item, hidingSpot };
    }

    /** Recupera un objeto del escondite y resta un punto. */
    retrieveFrom(hidingSpot) {
        if (!this.rules.allowRetrieval) {
            return { ok: false, reason: 'notAllowed' };
        }
        if (this.carriedIds.length >= this.rules.carryLimit) {
            return { ok: false, reason: 'handsFull' };
        }
        const id = hidingSpot.storedEvidenceIds[0];
        const item = id ? this.items.get(id) : null;
        if (!item || item.state !== EVIDENCE_STATE.HIDDEN) {
            return { ok: false, reason: 'empty' };
        }
        hidingSpot.remove(id);
        item.hidingSpotId = null;
        this.carriedIds.push(id);
        this.transition(item, EVIDENCE_STATE.CARRIED);
        return { ok: true, action: 'retrieve', item, hidingSpot };
    }

    /**
     * Evidencias encontradas al inspeccionar un punto:
     * Todos los objetos guardados en el escondite revisado.
     * Los objetos expuestos dentro de lookRadius en la misma habitacion.
     * Nunca se descubren los objetos que Roro lleva en sus manos.
     */
    findDiscoverable({ hidingSpot = null, position, lookRadius, room }) {
        const found = [];
        if (hidingSpot) {
            for (const id of hidingSpot.storedEvidenceIds) {
                const item = this.items.get(id);
                if (item?.state !== EVIDENCE_STATE.HIDDEN) continue;
                found.push({ item, reason: 'hidingSpot', hidingSpot });
            }
        }
        for (const item of this.items.values()) {
            if (item.state !== EVIDENCE_STATE.NOT_FOUND || !item.position) {
                continue;
            }
            const distance = Math.hypot(item.position.x - position.x, item.position.y - position.y);
            if (distance <= lookRadius && (!room || item.room === room)) {
                found.push({ item, reason: 'exposed' });
            }
        }
        return found;
    }

    markDiscovered(id) {
        const item = this.items.get(id);
        if (!item || !this.transition(item, EVIDENCE_STATE.DISCOVERED)) return false;
        item.position = null;
        item.room = null;
        item.hidingSpotId = null;
        return true;
    }
}
