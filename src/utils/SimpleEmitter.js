/**
 * Emisor minimo de eventos para logica pura de evidencias e IA. Al no depender de
 * Phaser, estos modulos pueden ejecutarse en Node para pruebas automaticas con
 * scripts/verify-logic.mjs.
 */
export class SimpleEmitter {
    constructor() {
        this.listeners = new Map();
    }

    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);
        return this;
    }

    off(eventName, callback) {
        this.listeners.get(eventName)?.delete(callback);
        return this;
    }

    emit(eventName, payload) {
        const callbacks = this.listeners.get(eventName);
        if (!callbacks) {
            return;
        }
        for (const callback of [...callbacks]) {
            callback(payload);
        }
    }

    removeAllListeners() {
        this.listeners.clear();
    }
}
