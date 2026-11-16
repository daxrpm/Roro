import { t } from '../managers/LanguageManager.js';
import { DISTRACTION_CONFIG } from '../data/gameConfig.js';
import { InteractiveObject } from './InteractiveObject.js';

export const DISTRACTION_STATE = Object.freeze({
    READY: 'ready',
    ARMED: 'armed',
    COOLDOWN: 'cooldown'
});

/**
 * Objeto que emite ruido para redirigir al detective, como la tetera.
 * READY --E--> ARMED --triggerDelay--> ruido y aviso al detective --> COOLDOWN
 * --cooldown--> READY
 *
 * Los temporizadores avanzan con update(delta) y se detienen durante la pausa.
 */
export class DistractionSource extends InteractiveObject {
    /**
     * @param {object} definition entrada de DISTRACTIONS (apartmentData.js)
     * @param {{position:{x,y}, investigatePosition:{x,y}}} world posiciones en pixeles
     * @param {(source: DistractionSource) => void} onNoise
     */
    constructor(definition, { position, investigatePosition }, onNoise) {
        super({ id: definition.id, position });
        this.definition = definition;
        this.name = definition.name;
        this.room = definition.room;
        this.investigatePosition = investigatePosition;
        this.onNoise = onNoise;
        this.state = DISTRACTION_STATE.READY;
        this.timer = 0;
        this.highlightTarget = null;
    }

    isAvailable() {
        return true;
    }

    canInteract() {
        return this.state === DISTRACTION_STATE.READY;
    }

    getPrompt() {
        switch (this.state) {
            case DISTRACTION_STATE.READY:
                return t(this.definition.prompt);
            case DISTRACTION_STATE.ARMED:
                return t("The {name} is heating up...", { name: t(this.name) });
            default:
                return t("The {name} is still hot (wait {seconds}s)", { name: t(this.name), seconds: Math.ceil(this.timer / 1000) });
        }
    }

    interact() {
        if (this.state !== DISTRACTION_STATE.READY) {
            return;
        }
        this.state = DISTRACTION_STATE.ARMED;
        this.timer = DISTRACTION_CONFIG.triggerDelay;
    }

    update(delta) {
        if (this.state === DISTRACTION_STATE.READY) {
            return;
        }
        this.timer -= delta;
        if (this.timer > 0) {
            return;
        }
        if (this.state === DISTRACTION_STATE.ARMED) {
            this.state = DISTRACTION_STATE.COOLDOWN;
            this.timer = DISTRACTION_CONFIG.cooldown;
            this.onNoise(this);
        } else {
            this.state = DISTRACTION_STATE.READY;
        }
    }

    setFocused(focused) {
        super.setFocused(focused);
        if (this.highlightTarget) {
            if (focused) {
                this.highlightTarget.setTint(0xfff2a8);
            } else {
                this.highlightTarget.clearTint();
            }
        }
    }
}
