import { DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../data/gameConfig.js';

/** Borde rojo sobre el mundo y debajo de avisos y HUD; no captura entrada. */
export class CasePressureOverlay {
    constructor(scene) {
        this.scene = scene;
        this.tint = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x8a0000).setOrigin(0, 0);
        this.frame = scene.add.graphics();
        this.layer = scene.add.container(0, 0, [this.tint, this.frame])
            .setScrollFactor(0, 0, true).setDepth(DEPTH.visibility + 50);
        this.pulse = scene.tweens.add({ targets: this.layer, alpha: { from: 0.72, to: 1 },
            duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.setIntensity(0);
    }

    setIntensity(intensity) {
        this.tint.setAlpha(intensity * 0.10);
        this.frame.clear();
        // Las bandas pierden opacidad hacia el centro para mantener legible el juego.
        for (let band = 0; band < 20; band++) {
            const inset = band * 4;
            this.frame.fillStyle(0xa00000, intensity * 0.38 * (1 - band / 20));
            this.frame.fillRect(inset, inset, GAME_WIDTH - inset * 2, 4);
            this.frame.fillRect(inset, GAME_HEIGHT - inset - 4, GAME_WIDTH - inset * 2, 4);
            this.frame.fillRect(inset, inset + 4, 4, GAME_HEIGHT - inset * 2 - 8);
            this.frame.fillRect(GAME_WIDTH - inset - 4, inset + 4, 4, GAME_HEIGHT - inset * 2 - 8);
        }
    }

    destroy() {
        this.pulse.stop();
        this.layer.destroy(true);
    }
}
