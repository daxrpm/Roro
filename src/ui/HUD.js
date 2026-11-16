import { t } from '../managers/LanguageManager.js';
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../data/gameConfig.js';
import { MuteButton } from './MuteButton.js';
import { TEXT_STYLES, textStyle } from './textStyles.js';

/**
 * HUD fijo a la camara:
 * Puntaje numerico y seis marcas como indicador adicional.
 * Dificultad, fase de inspeccion y objeto llevado.
 * Mensajes temporales de objetos, puertas y distracciones.
 * Control para silenciar sonido.
 */
export class HUD {
    constructor(scene, { maxScore, difficultyLabel }) {
        this.scene = scene;
        this.maxScore = maxScore;
        const objects = [];

        const bar = scene.add.rectangle(0, 0, GAME_WIDTH, 36, 0x0d0b12, 0.78).setOrigin(0, 0);
        objects.push(bar);

        this.scoreText = scene.add.text(12, 8, '', TEXT_STYLES.hud);
        objects.push(this.scoreText);

        this.pips = [];
        for (let index = 0; index < maxScore; index++) {
            const pip = scene.add.rectangle(170 + index * 16, 18, 10, 10, 0x2c2536).setStrokeStyle(2, COLORS.panelBorder);
            this.pips.push(pip);
            objects.push(pip);
        }

        this.phaseText = scene.add.text(GAME_WIDTH / 2 + 20, 8, '', textStyle({ color: COLORS.textMuted })).setOrigin(0.5, 0);
        objects.push(this.phaseText);

        this.difficultyText = scene.add.text(GAME_WIDTH - 140, 8, t(difficultyLabel), textStyle({ color: COLORS.accent })).setOrigin(1, 0);
        objects.push(this.difficultyText);

        this.muteButton = new MuteButton(scene, GAME_WIDTH - 66, 18, { fixed: true });
        objects.push(this.muteButton);

        const caseBar = scene.add.rectangle(6, 40, 422, 26, 0x0d0b12, 0.85).setOrigin(0, 0);
        this.caseText = scene.add.text(12, 45, '', TEXT_STYLES.hud);
        objects.push(caseBar, this.caseText);

        this.carryText = scene.add.text(12, GAME_HEIGHT - 28, '', TEXT_STYLES.hud);
        objects.push(this.carryText);

        this.hintText = scene.add.text(GAME_WIDTH - 12, GAME_HEIGHT - 28, t('WASD: move   E: interact   ESC: pause   M: sound'), textStyle({ color: COLORS.textMuted, stroke: '#000000', strokeThickness: 4 })).setOrigin(1, 0);
        objects.push(this.hintText);

        this.messageText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 78, '', textStyle({
            fontSize: '16px',
            color: COLORS.text,
            backgroundColor: '#0d0b12cc',
            padding: { x: 10, y: 6 },
            align: 'center'
        })).setOrigin(0.5).setVisible(false);
        objects.push(this.messageText);
        this.messageTimer = null;

        for (const object of objects) {
            object.setScrollFactor(0).setDepth(DEPTH.hud);
        }

        this.setScore(0);
        this.setCarried(null);
    }

    setScore(score) {
        this.scoreText.setText(t("HIDDEN {score} / {max}", { score: score, max: this.maxScore }));
        this.pips.forEach((pip, index) => pip.setFillStyle(index < score ? COLORS.accentHex : 0x2c2536));
    }

    setCaseProgress({ found, required, remaining }) {
        this.caseText.setText(t('CASE: {found}/{required} | STILL NEEDED: {remaining}', { found, required, remaining }));
        this.caseText.setColor(remaining <= 1 ? COLORS.danger : COLORS.accent);
    }

    setPhase(text) {
        this.phaseText.setText(text);
    }

    setCarried(name) {
        this.carryText.setText(name ? t("Carrying: {name}", { name: t(name) }) : t('Carrying: nothing'));
        this.carryText.setColor(name ? COLORS.accent : COLORS.textMuted);
    }

    /** Muestra un mensaje inferior durante duration milisegundos. */
    showMessage(text, { duration = 2600, color = COLORS.text } = {}) {
        this.messageText.setText(text).setColor(color).setVisible(true).setAlpha(1);
        this.messageTimer?.remove();
        this.messageTimer = this.scene.time.delayedCall(duration, () => {
            this.scene.tweens.add({ targets: this.messageText, alpha: 0, duration: 300, onComplete: () => this.messageText.setVisible(false) });
        });
    }

    setTouchMode(touch) {
        this.hintText.setVisible(!touch);
    }
}
