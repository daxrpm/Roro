import Phaser from 'phaser';
import { SCENE_KEYS } from '../data/gameConfig.js';

/**
 * Primera escena. La barra de progreso no necesita recursos previos, por lo que
 * pasa inmediatamente a PreloadScene.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.BOOT);
    }

    create() {
        this.scene.start(SCENE_KEYS.PRELOAD);
    }
}
