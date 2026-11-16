import { t } from '../managers/LanguageManager.js';
import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../data/gameConfig.js';
import { INTERVIEWS, SPEAKERS, formatStoryText } from '../data/dialogueData.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { TEXT_STYLES } from '../ui/textStyles.js';

/**
 * Pantalla de entrevista superpuesta al departamento pausado. Las lineas de
 * dialogueData.js son fijas y lineales: deben revelarse completas antes de avanzar
 * y no ofrecen elecciones.
 *
 * Al terminar la ultima linea reanuda ApartmentScene con { interviewCompleted:
 * true }.
 *
 */
export class DialogueScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.DIALOGUE);
    }

    init(data) {
        this.interview = INTERVIEWS[data.interviewIndex] ?? INTERVIEWS[0];
        this.lineIndex = -1;
        this.finished = false;
    }

    create() {
        AudioManager.playMusic('music-rest');
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x07060c, 0.94).setOrigin(0, 0);
        this.add.text(GAME_WIDTH / 2, 48, t(this.interview.title).toUpperCase(), TEXT_STYLES.heading).setOrigin(0.5);

        // Ambos personajes se miran sobre el cuadro de dialogo.
        this.add.image(GAME_WIDTH / 2 - 150, 300, SPEAKERS.roro.portraitKey).setScale(2).setOrigin(0.5, 1);
        this.add.image(GAME_WIDTH / 2 + 150, 300, SPEAKERS.detective.portraitKey).setScale(2).setOrigin(0.5, 1).setTint(0xb8c4ff);
        this.add.rectangle(GAME_WIDTH / 2, 302, 420, 4, COLORS.panelBorder);

        this.dialogueBox = new DialogueBox(this);

        const advance = () => this.advance();
        this.input.keyboard.on('keydown-E', advance);
        this.input.keyboard.on('keydown-SPACE', advance);
        this.input.keyboard.on('keydown-ENTER', advance);
        this.input.on('pointerdown', advance);

        this.cameras.main.fadeIn(250, 0, 0, 0);
        this.showNextLine();
    }

    update(time, delta) {
        this.dialogueBox.update(delta);
    }

    advance() {
        // No se puede adelantar: ignora entrada hasta mostrar toda la linea actual.
        if (!this.finished && this.dialogueBox.isComplete) {
            this.showNextLine();
        }
    }

    showNextLine() {
        this.lineIndex += 1;
        if (this.lineIndex >= this.interview.lines.length) {
            this.finish();
            return;
        }
        const line = this.interview.lines[this.lineIndex];
        this.dialogueBox.showLine(SPEAKERS[line.speaker], formatStoryText(line.text));
    }

    finish() {
        this.finished = true;
        this.dialogueBox.destroy();
        this.scene.resume(SCENE_KEYS.APARTMENT, { interviewCompleted: true });
        this.scene.stop();
    }
}
