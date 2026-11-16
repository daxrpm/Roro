import Phaser from 'phaser';

/**
 * Entrada de una escena de juego. Combina teclado (WASD, flechas, E y ESC) y
 * controles tactiles opcionales mediante una interfaz comun; Roro no necesita
 * conocer el origen de la entrada.
 */
export class InputManager {
    constructor(scene) {
        this.scene = scene;
        const keyboard = scene.input.keyboard;
        const codes = Phaser.Input.Keyboard.KeyCodes;
        this.keys = keyboard.addKeys({
            up: codes.W,
            down: codes.S,
            left: codes.A,
            right: codes.D,
            upArrow: codes.UP,
            downArrow: codes.DOWN,
            leftArrow: codes.LEFT,
            rightArrow: codes.RIGHT,
            interact: codes.E,
            pause: codes.ESC
        });
        // TouchControls escribe el estado de la entrada tactil.
        this.touch = { up: false, down: false, left: false, right: false };
        this.touchInteractQueued = false;
        this.touchPauseQueued = false;
        this.enabled = true;
        this.vector = { x: 0, y: 0 };
    }

    /** Vector normalizado: moverse en diagonal no aumenta la rapidez. */
    getMovementVector() {
        if (!this.enabled) {
            this.vector.x = 0;
            this.vector.y = 0;
            return this.vector;
        }
        const k = this.keys;
        const x = (k.right.isDown || k.rightArrow.isDown || this.touch.right ? 1 : 0) -
            (k.left.isDown || k.leftArrow.isDown || this.touch.left ? 1 : 0);
        const y = (k.down.isDown || k.downArrow.isDown || this.touch.down ? 1 : 0) -
            (k.up.isDown || k.upArrow.isDown || this.touch.up ? 1 : 0);
        const length = Math.hypot(x, y) || 1;
        this.vector.x = x / length;
        this.vector.y = y / length;
        return this.vector;
    }

    /** Devuelve true una vez por pulsacion de E o del boton tactil de interaccion. */
    consumeInteract() {
        const pressed = Phaser.Input.Keyboard.JustDown(this.keys.interact) || this.touchInteractQueued;
        this.touchInteractQueued = false;
        return this.enabled && pressed;
    }

    consumePause() {
        const pressed = Phaser.Input.Keyboard.JustDown(this.keys.pause) || this.touchPauseQueued;
        this.touchPauseQueued = false;
        return pressed;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /** Limpia teclas mantenidas, por ejemplo al regresar de pausa o dialogo. */
    reset() {
        Object.values(this.keys).forEach((key) => key.reset());
        this.touch.up = this.touch.down = this.touch.left = this.touch.right = false;
        this.touchInteractQueued = false;
        this.touchPauseQueued = false;
    }
}
