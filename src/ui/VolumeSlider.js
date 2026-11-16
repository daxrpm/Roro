import Phaser from 'phaser';
import { COLORS } from '../data/gameConfig.js';
import { AudioManager } from '../managers/AudioManager.js';
import { t } from '../managers/LanguageManager.js';
import { textStyle } from './textStyles.js';

/** Volumen del menu de pausa mediante clic, arrastre, tactil o flechas izquierda y derecha. */
export class VolumeSlider extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.enabled = true;
        this.pointerId = null;
        this.trackWidth = 240;
        this.label = scene.add.text(0, -26, '', textStyle()).setOrigin(0.5);
        this.track = scene.add.rectangle(-120, 0, 240, 8, COLORS.panel).setOrigin(0, 0.5).setStrokeStyle(2, COLORS.panelBorder);
        this.fill = scene.add.rectangle(-120, 0, 0, 8, COLORS.accentHex).setOrigin(0, 0.5);
        this.knob = scene.add.circle(0, 0, 9, COLORS.accentHex).setStrokeStyle(2, COLORS.panelBorder);
        this.hitArea = scene.add.zone(0, 0, 260, 32).setInteractive({ useHandCursor: true });
        this.hint = scene.add.text(0, 23, t('Left / Right: volume'), textStyle({ color: COLORS.textMuted })).setOrigin(0.5);
        this.add([this.label, this.track, this.fill, this.knob, this.hitArea, this.hint]);
        scene.add.existing(this);

        this.setFromPointer = pointer => {
            const value = (pointer.x - this.x + this.trackWidth / 2) / this.trackWidth;
            AudioManager.setVolume(Math.round(Phaser.Math.Clamp(value, 0, 1) * 100) / 100);
        };
        this.hitArea.on('pointerdown', pointer => {
            if (!this.enabled) return;
            this.pointerId = pointer.id;
            this.setFromPointer(pointer);
        });
        this.onMove = pointer => {
            if (this.enabled && this.pointerId === pointer.id && pointer.isDown) this.setFromPointer(pointer);
        };
        this.onUp = pointer => {
            if (this.pointerId === pointer.id) this.pointerId = null;
        };
        this.onLeft = () => this.adjust(-0.05);
        this.onRight = () => this.adjust(0.05);
        scene.input.on('pointermove', this.onMove);
        scene.input.on('pointerup', this.onUp);
        scene.input.on('pointerupoutside', this.onUp);
        scene.input.keyboard.on('keydown-LEFT', this.onLeft);
        scene.input.keyboard.on('keydown-RIGHT', this.onRight);
        this.unsubscribe = AudioManager.onChange(() => this.refresh());
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.unsubscribe();
            scene.input.off('pointermove', this.onMove);
            scene.input.off('pointerup', this.onUp);
            scene.input.off('pointerupoutside', this.onUp);
            scene.input.keyboard.off('keydown-LEFT', this.onLeft);
            scene.input.keyboard.off('keydown-RIGHT', this.onRight);
        });
        this.refresh();
    }

    adjust(step) {
        if (this.enabled) AudioManager.setVolume(AudioManager.getSettings().sfxVolume + step);
    }

    refresh() {
        const volume = AudioManager.getSettings().sfxVolume;
        this.label.setText(t('Volume: {value}%', { value: Math.round(volume * 100) }));
        this.fill.width = volume * this.trackWidth;
        this.knob.x = -this.trackWidth / 2 + volume * this.trackWidth;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.pointerId = null;
        this.setVisible(enabled);
    }
}
