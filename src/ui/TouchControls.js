import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../data/gameConfig.js';
import { textStyle } from './textStyles.js';

/**
 * Controles en pantalla para tactil (TECHNICAL_REQUIREMENTS 3.7): pad de cuatro
 * direcciones a la izquierda y botones de interaccion y pausa a la derecha.
 * Escriben en el mismo InputManager del teclado.
 * Se crean con soporte tactil o al forzarlos mediante la URL.
 */
export class TouchControls {
    /**
     * @param {Phaser.Scene} scene
     * @param {import('../managers/InputManager.js').InputManager} input
     */
    constructor(scene, input) {
        this.scene = scene;
        this.input = input;
        this.objects = [];

        const padX = 96;
        const padY = GAME_HEIGHT - 110;
        const offset = 46;
        this.createDirection('up', padX, padY - offset, '^');
        this.createDirection('down', padX, padY + offset, 'v');
        this.createDirection('left', padX - offset, padY, '<');
        this.createDirection('right', padX + offset, padY, '>');

        this.createAction(GAME_WIDTH - 90, GAME_HEIGHT - 110, 38, 'E', () => {
            input.touchInteractQueued = true;
        });
        this.createAction(GAME_WIDTH - 40, 70, 22, 'II', () => {
            input.touchPauseQueued = true;
        });
    }

    createButton(x, y, radius, label) {
        const circle = this.scene.add.circle(x, y, radius, COLORS.panel, 0.55).setStrokeStyle(2, COLORS.panelBorder, 0.9);
        const text = this.scene.add.text(x, y, label, textStyle({ fontSize: '32px', color: COLORS.text })).setOrigin(0.5);
        for (const object of [circle, text]) {
            object.setScrollFactor(0).setDepth(DEPTH.touch);
            this.objects.push(object);
        }
        circle.setInteractive();
        return circle;
    }

    createDirection(direction, x, y, label) {
        const button = this.createButton(x, y, 26, label);
        const release = () => {
            this.input.touch[direction] = false;
            button.setFillStyle(COLORS.panel, 0.55);
        };
        button.on('pointerdown', () => {
            this.input.touch[direction] = true;
            button.setFillStyle(COLORS.accentHex, 0.6);
        });
        button.on('pointerup', release);
        button.on('pointerout', release);
    }

    createAction(x, y, radius, label, onPress) {
        const button = this.createButton(x, y, radius, label);
        button.on('pointerdown', () => {
            onPress();
            button.setFillStyle(COLORS.accentHex, 0.6);
        });
        button.on('pointerup', () => button.setFillStyle(COLORS.panel, 0.55));
        button.on('pointerout', () => button.setFillStyle(COLORS.panel, 0.55));
    }

    /** Se muestra con soporte tactil o cuando la URL contiene ?touch. */
    static isSupported(scene) {
        const forced = new URLSearchParams(window.location.search).has('touch');
        return forced || Boolean(scene.sys.game.device.input.touch);
    }
}
