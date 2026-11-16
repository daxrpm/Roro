import { t } from '../managers/LanguageManager.js';
import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';
import { COLORS, DIFFICULTY, DIFFICULTY_SETTINGS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../data/gameConfig.js';
import { GameSession } from '../managers/GameSession.js';
import { Button, ButtonList } from '../ui/Button.js';
import { TEXT_STYLES, textStyle } from '../ui/textStyles.js';
import { fadeIn, fadeToScene } from './sceneTransitions.js';

/** Permite elegir Facil, Normal o Dificil; guarda la seleccion en GameSession. */
export class DifficultyScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.DIFFICULTY);
    }

    create() {
        AudioManager.playMusic('music-rest');
        fadeIn(this);
        this.add.text(GAME_WIDTH / 2, 70, t('Choose a difficulty'), TEXT_STYLES.heading).setOrigin(0.5);

        const order = [DIFFICULTY.EASY, DIFFICULTY.NORMAL, DIFFICULTY.HARD];
        const description = this.add.text(GAME_WIDTH / 2, 380, '', textStyle({ align: 'center', lineSpacing: 6, color: COLORS.textMuted })).setOrigin(0.5, 0);

        const buttons = order.map((difficulty, index) => {
            const button = new Button(this, GAME_WIDTH / 2, 170 + index * 56, t(DIFFICULTY_SETTINGS[difficulty].label), () => {
                GameSession.setDifficulty(difficulty);
                fadeToScene(this, SCENE_KEYS.INTRODUCTION);
            }, { fontSize: '32px', height: 46 });
            return button;
        });
        const back = new Button(this, GAME_WIDTH / 2, 170 + order.length * 56 + 10, t('Back'), () => fadeToScene(this, SCENE_KEYS.MAIN_MENU));
        const list = new ButtonList(this, [...buttons, back]);

        // Muestra la descripcion de la dificultad seleccionada.
        const originalSelect = list.select.bind(list);
        list.select = (index) => {
            originalSelect(index);
            const difficulty = order[index];
            description.setText(difficulty ? t(DIFFICULTY_SETTINGS[difficulty].description) + '\n' + t('Evidence to solve the case: {required}', { required: DIFFICULTY_SETTINGS[difficulty].evidenceToSolve }) : t('Return to the main menu.'));
        };
        list.select(Math.max(0, order.indexOf(GameSession.difficulty)));

        this.input.keyboard.on('keydown-ESC', () => fadeToScene(this, SCENE_KEYS.MAIN_MENU));
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, t('Difficulty changes visibility and evidence needed to solve the case.'), textStyle({ color: COLORS.textMuted })).setOrigin(0.5);
    }
}
