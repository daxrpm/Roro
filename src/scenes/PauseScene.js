import { t } from '../managers/LanguageManager.js';
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../data/gameConfig.js';
import { AudioManager } from '../managers/AudioManager.js';
import { Button, ButtonList } from '../ui/Button.js';
import { VolumeSlider } from '../ui/VolumeSlider.js';
import { TEXT_STYLES, textStyle } from '../ui/textStyles.js';

/**
 * Menu sobre ApartmentScene pausada: no avanzan la fisica, temporizadores ni
 * maquina de estados del detective.
 */
export class PauseScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.PAUSE);
    }

    create() {
        AudioManager.playMusic('music-rest');
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0, 0);
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 360, 400, COLORS.panel, 0.97).setStrokeStyle(3, COLORS.panelBorder);
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 160, t('PAUSED'), TEXT_STYLES.heading).setOrigin(0.5);

        const centerX = GAME_WIDTH / 2;
        const y = GAME_HEIGHT / 2 - 100;
        const step = 48;
        this.soundButton = new Button(this, centerX, y + step * 3, '', () => {
            AudioManager.toggleMute();
            this.refreshAudioLabels();
        });
        this.volumeSlider = new VolumeSlider(this, centerX, y + step * 4 + 28);

        const buttons = [
            new Button(this, centerX, y, t('Resume'), () => this.resumeGame()),
            new Button(this, centerX, y + step, t('Restart'), () => this.restartGame()),
            new Button(this, centerX, y + step * 2, t('Main menu'), () => this.goToMenu()),
            this.soundButton
        ];
        this.add.text(centerX, GAME_HEIGHT / 2 + 176, t('ESC: resume'), textStyle({ color: COLORS.textMuted })).setOrigin(0.5);

        new ButtonList(this, buttons);
        this.refreshAudioLabels();
        this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
    }

    refreshAudioLabels() {
        const settings = AudioManager.getSettings();
        this.soundButton.setText(settings.muted ? t('Sound: OFF') : t('Sound: ON'));
    }

    resumeGame() {
        this.scene.resume(SCENE_KEYS.APARTMENT);
        this.scene.stop();
    }

    restartGame() {
        // Reiniciar la escena pausada reconstruye el departamento desde cero.
        this.scene.stop(SCENE_KEYS.APARTMENT);
        this.scene.start(SCENE_KEYS.APARTMENT);
    }

    goToMenu() {
        this.scene.stop(SCENE_KEYS.APARTMENT);
        this.scene.start(SCENE_KEYS.MAIN_MENU);
    }
}
