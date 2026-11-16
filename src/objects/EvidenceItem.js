import { t } from '../managers/LanguageManager.js';
import { COLORS, DEPTH } from '../data/gameConfig.js';
import { EVIDENCE_STATE } from '../data/evidenceData.js';
import { InteractiveObject } from './InteractiveObject.js';

/**
 * Representacion visual e interactiva de una evidencia en el departamento.
 * EvidenceManager controla el estado; esta clase muestra u oculta el sprite y
 * delega las interacciones.
 *
 * La primera interaccion con la nota la abre para leer; la siguiente la recoge.
 *
 */
export class EvidenceItem extends InteractiveObject {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} record registro de evidencia de EvidenceManager
     * @param {{x:number,y:number}} position posicion del mundo en el centro
     */
    constructor(scene, record, position) {
        super({ id: record.id, position });
        this.record = record;
        this.definition = record.definition;
        // Objetos sobre el suelo: la base del sprite queda un poco debajo del centro.
        this.sprite = scene.add.image(Math.round(position.x), Math.round(position.y + 6), this.definition.textureKey)
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.worldBase + position.y);
        this.shadow = scene.add.ellipse(Math.round(position.x), Math.round(position.y + 6), Math.max(10, this.sprite.width * 0.8), 5, 0x000000, 0.25)
            .setDepth(DEPTH.rugs + 1);
    }

    isAvailable() {
        return this.record.state === EVIDENCE_STATE.NOT_FOUND;
    }

    needsReading() {
        return this.definition.readable && !this.record.hasBeenRead;
    }

    canInteract({ evidence }) {
        return this.needsReading() || evidence.getCarriedItem() === null;
    }

    getPrompt({ evidence }) {
        if (this.needsReading()) {
            return t('Read the note');
        }
        if (evidence.getCarriedItem()) {
            return t("Your hands are full ({name})", { name: t(this.definition.name) });
        }
        return t("Pick up the {name}", { name: t(this.definition.name) });
    }

    interact(context) {
        if (this.needsReading()) {
            context.openNote(this);
            return;
        }
        const result = context.evidence.pickUp(this.id);
        context.onEvidenceAction?.(result, this);
    }

    /** Se llama al cambiar el estado de la evidencia. */
    syncVisibility() {
        const visible = this.record.state === EVIDENCE_STATE.NOT_FOUND;
        this.sprite.setVisible(visible);
        this.shadow.setVisible(visible);
    }

    setFocused(focused) {
        super.setFocused(focused);
        if (focused) {
            this.sprite.setTint(COLORS.focusTint);
        } else {
            this.sprite.clearTint();
        }
    }
}
