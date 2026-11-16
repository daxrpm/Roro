import { t } from '../managers/LanguageManager.js';
import { InteractiveObject } from './InteractiveObject.js';

/**
 * Lugar predefinido para esconder una evidencia.
 *
 * Guarda identificadores de objetos. EvidenceManager es la autoridad sobre estados
 * y puntaje. El detective inspecciona el lugar al llegar al inspectTile de su
 * ruta.
 */
export class HidingSpot extends InteractiveObject {
    /**
     * @param {object} definition entrada de HIDING_SPOTS (apartmentData.js)
     * @param {object} world posiciones convertidas a pixeles del mundo
     * @param {{x:number,y:number}} world.position
     * @param {{x:number,y:number}} world.inspectPosition
     * @param {number} capacity
     */
    constructor(definition, { position, inspectPosition }, capacity = 1) {
        super({ id: definition.id, position });
        this.definition = definition;
        this.name = definition.name;
        this.room = definition.room;
        this.category = definition.category;
        this.inspectTile = definition.inspectTile;
        this.inspectPosition = inspectPosition;
        this.capacity = capacity;
        this.storedEvidenceIds = [];
        this.inspected = false;
    }

    isOccupied() {
        return this.storedEvidenceIds.length > 0;
    }

    hasCapacity() {
        return this.storedEvidenceIds.length < this.capacity;
    }

    store(evidenceId) {
        if (!this.hasCapacity() || this.storedEvidenceIds.includes(evidenceId)) {
            return false;
        }
        this.storedEvidenceIds.push(evidenceId);
        return true;
    }

    remove(evidenceId) {
        const index = this.storedEvidenceIds.indexOf(evidenceId);
        if (index === -1) {
            return false;
        }
        this.storedEvidenceIds.splice(index, 1);
        return true;
    }

    markInspected() {
        this.inspected = true;
    }

    // ------------------------------------------------------------ interaccion

    isAvailable({ evidence }) {
        // Se muestra cuando Roro lleva algo o cuando existe un objeto recuperable.
        return evidence.getCarriedItem() !== null || (this.isOccupied() && evidence.rules.allowRetrieval);
    }

    canInteract({ evidence }) {
        const carried = evidence.getCarriedItem();
        if (carried) {
            return this.hasCapacity();
        }
        return this.isOccupied() && evidence.rules.allowRetrieval;
    }

    getPrompt({ evidence }) {
        const carried = evidence.getCarriedItem();
        if (carried) {
            return this.hasCapacity()
                ? t("Hide the {name} {place}", { name: t(carried.definition.name), place: t(this.name) })
                : t("Something is already hidden {place}", { place: t(this.name) });
        }
        const storedItem = evidence.getItem(this.storedEvidenceIds[0]);
        return t("Take back the {name}", { name: t(storedItem.definition.name) });
    }

    interact(context) {
        const { evidence } = context;
        const result = evidence.getCarriedItem()
            ? evidence.hideCarried(this)
            : evidence.retrieveFrom(this);
        context.onEvidenceAction?.(result, this);
    }
}
