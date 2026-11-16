import { t } from '../managers/LanguageManager.js';
import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';
import { COLORS, DIFFICULTY_SETTINGS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../data/gameConfig.js';
import { GameSession } from '../managers/GameSession.js';
import { Button, ButtonList } from '../ui/Button.js';
import { TEXT_STYLES, textStyle } from '../ui/textStyles.js';
import { fadeIn, fadeToScene } from './sceneTransitions.js';

/**
 * Diseno compartido de victoria y derrota: titulo, mensaje, puntaje final, record
 * y botones para reiniciar o volver al menu.
 */
export class ResultScene extends Phaser.Scene {
    /**
     * @param {string} key clave de escena
     * @param {{title:string, color:string, message:(result)=>string}} presentation
     */
    constructor(key, presentation) {
        super(key);
        this.presentation = presentation;
    }

    create() {
        AudioManager.playMusic('music-rest');
        fadeIn(this, 500);
        const result = GameSession.lastResult ?? { score: 0, maxScore: 6, won: false, highScore: 0, difficulty: GameSession.difficulty };
        const centerX = GAME_WIDTH / 2;

        this.add.text(centerX, 90, t(this.presentation.title), { ...TEXT_STYLES.title, fontSize: '64px', color: this.presentation.color }).setOrigin(0.5);
        this.add.text(centerX, 160, t(this.presentation.message(result)), textStyle({ align: 'center', lineSpacing: 6, wordWrap: { width: 700 } })).setOrigin(0.5, 0);

        this.add.text(centerX, 250, t("Evidence hidden: {score} / {max}", { score: result.score, max: result.maxScore }), TEXT_STYLES.heading).setOrigin(0.5);
        const difficultyLabel = t(DIFFICULTY_SETTINGS[result.difficulty]?.label ?? '');
        const highScoreText = result.newHighScore ? t('New best score!') : t("Best score: {score} / {max}", { score: result.highScore, max: result.maxScore });
        this.add.text(centerX, 292, t("{difficulty}  -  {scoreText}", { difficulty: difficultyLabel, scoreText: highScoreText }), textStyle({ color: result.newHighScore ? COLORS.accent : COLORS.textMuted })).setOrigin(0.5);

        if (result.caseProgress) {
            this.add.text(centerX, 330, t('Case evidence: {found}/{required}', result.caseProgress),
                textStyle({ color: result.won ? COLORS.textMuted : COLORS.danger })).setOrigin(0.5);
        }

        const buttons = [
            new Button(this, centerX, 370, t('Restart'), () => fadeToScene(this, SCENE_KEYS.APARTMENT)),
            new Button(this, centerX, 420, t('Main menu'), () => fadeToScene(this, SCENE_KEYS.MAIN_MENU))
        ];
        new ButtonList(this, buttons);
        this.add.text(centerX, GAME_HEIGHT - 30, t('Arrows + Enter, or click'), textStyle({ color: COLORS.textMuted })).setOrigin(0.5);
    }
}
