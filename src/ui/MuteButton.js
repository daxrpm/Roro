import { t } from '../managers/LanguageManager.js';
import Phaser from 'phaser';
import { COLORS } from '../data/gameConfig.js';
import { AudioManager } from '../managers/AudioManager.js';
import { textStyle } from './textStyles.js';

/**
 * Control de sonido en menus y HUD, activable tambien con M. Permanece
 * sincronizado con los ajustes de AudioManager.
 */
export class MuteButton extends Phaser.GameObjects.Container {
    constructor(scene, x, y, { fixed = false } = {}) {
        super(scene, x, y);
        this.ownerScene = scene;
        this.background = scene.add.rectangle(0, 0, 112, 28, COLORS.panel, 0.9).setStrokeStyle(2, COLORS.panelBorder);
        this.label = scene.add.text(0, 0, '', textStyle()).setOrigin(0.5);
        this.add([this.background, this.label]);
        this.setSize(112, 28);
        if (fixed) {
            // Los hijos tambien necesitan factor de desplazamiento fijo; de otro modo,
            // sus areas de entrada se mueven con la camara.
            this.setScrollFactor(0, 0, true);
        }

        this.background.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation();
            AudioManager.toggleMute();
        });

        this.unsubscribe = AudioManager.onChange(() => this.refresh());
        this.onKey = () => AudioManager.toggleMute();
        scene.input.keyboard.on('keydown-M', this.onKey);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

        this.refresh();
        scene.add.existing(this);
    }

    refresh() {
        const muted = AudioManager.isMuted();
        this.label.setText(muted ? t('Sound: OFF') : t('Sound: ON'));
        this.label.setColor(muted ? COLORS.textMuted : COLORS.text);
    }

    cleanup() {
        this.unsubscribe?.();
        this.ownerScene.input.keyboard?.off('keydown-M', this.onKey);
    }
}
