import { t } from '../managers/LanguageManager.js';
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../data/gameConfig.js';
import { INTRODUCTION, SPEAKERS, formatStoryText } from '../data/dialogueData.js';
import { AudioManager } from '../managers/AudioManager.js';
import { textStyle } from '../ui/textStyles.js';
import { fadeIn, fadeToScene } from './sceneTransitions.js';

/**
 * Introduccion con textos de dialogueData.js: desmayos, rutina y golpes de la
 * policia en la puerta. Cada fragmento aparece gradualmente; despues se avanza con
 * E, Espacio, Enter o clic.
 */
export class IntroductionScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.INTRODUCTION);
    }

    create() {
        fadeIn(this);
        AudioManager.playMusic('music-rest');
        this.lineIndex = -1;
        this.canAdvance = false;

        this.speakerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, '', textStyle({ fontSize: '16px' })).setOrigin(0.5);
        this.lineText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', textStyle({
            fontSize: '16px',
            align: 'center',
            lineSpacing: 10,
            wordWrap: { width: GAME_WIDTH - 160 }
        })).setOrigin(0.5);
        this.hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, t('E / Space / click to continue'), textStyle({ color: COLORS.textMuted })).setOrigin(0.5).setAlpha(0);

        const advance = () => this.advance();
        this.input.keyboard.on('keydown-E', advance);
        this.input.keyboard.on('keydown-SPACE', advance);
        this.input.keyboard.on('keydown-ENTER', advance);
        this.input.on('pointerdown', advance);

        this.showNextLine();
    }

    advance() {
        if (this.canAdvance) {
            this.showNextLine();
        }
    }

    showNextLine() {
        this.lineIndex += 1;
        this.canAdvance = false;
        this.hint.setAlpha(0);

        if (this.lineIndex >= INTRODUCTION.length) {
            fadeToScene(this, SCENE_KEYS.APARTMENT, {}, 600);
            return;
        }

        const line = INTRODUCTION[this.lineIndex];
        const speaker = line.speaker ? SPEAKERS[line.speaker] : null;
        this.speakerText.setText(speaker ? t(speaker.name) : '').setColor(speaker?.nameColor ?? COLORS.text);
        this.lineText.setText(formatStoryText(line.text))
            .setFontSize(line.emphasis ? 32 : 16)
            .setColor(line.knock ? COLORS.danger : COLORS.text)
            .setAlpha(0);

        if (line.knock) {
            AudioManager.playSfx('sfx-knock');
            this.cameras.main.shake(500, 0.006);
        }

        this.tweens.add({
            targets: this.lineText,
            alpha: 1,
            duration: 600,
            onComplete: () => {
                this.canAdvance = true;
                this.tweens.add({ targets: this.hint, alpha: 1, duration: 300 });
            }
        });
    }
}
