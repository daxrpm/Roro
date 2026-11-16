/**
 * Clase base de los objetos con los que Roro interactua con E.
 *
 * Las subclases implementan isAvailable, getPrompt e interact. InteractionManager
 * elige el disponible mas cercano dentro del rango y usa ese contrato para
 * evidencias, escondites, puertas, nota y distracciones.
 *
 * context entrega servicios como evidencias, interfaz y audio sin dependencias
 * directas.
 *
 * No importa Phaser; el dibujo se enlaza mediante onFocusChange.
 *
 */
export class InteractiveObject {
    /**
     * @param {object} config
     * @param {string} config.id
     * @param {{x:number,y:number}} config.position punto de interaccion en pixeles del mundo
     * @param {number} [config.range] rango personalizado en lugar del predeterminado
     */
    constructor({ id, position, range = null }) {
        this.id = id;
        this.position = position;
        this.range = range;
        this.focused = false;
        this.onFocusChange = null;
    }

    /** Indica si el objeto acepta interaccion en este momento. */
    // eslint-disable-next-line no-unused-vars
    isAvailable(context) {
        return true;
    }

    /** Texto mostrado en el aviso de interaccion. */
    // eslint-disable-next-line no-unused-vars
    getPrompt(context) {
        return 'Interact';
    }

    /**
     * Indica si pulsar E ejecuta una accion ahora. El aviso puede informar que las
     * manos estan llenas aunque la accion este deshabilitada.
     */
    // eslint-disable-next-line no-unused-vars
    canInteract(context) {
        return true;
    }

    // eslint-disable-next-line no-unused-vars
    interact(context) {}

    setFocused(focused) {
        if (this.focused === focused) {
            return;
        }
        this.focused = focused;
        this.onFocusChange?.(focused);
    }
}
