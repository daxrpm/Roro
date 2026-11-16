import { t } from '../managers/LanguageManager.js';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../data/gameConfig.js';
import { textStyle } from './textStyles.js';

const CHARACTERS_PER_SECOND = 38;

/**
 * Cuadro de dialogo con retrato, nombre y texto revelado letra por letra.
 *
 * No se puede acelerar la aparicion; solo se permite continuar cuando toda la
 * linea es visible.
 */
export class DialogueBox {
    constructor(scene) {
        this.scene = scene;
        const boxHeight = 170;
        const boxY = GAME_HEIGHT - boxHeight - 20;
        const portraitSize = 130;

        this.panel = scene.add.rectangle(20, boxY, GAME_WIDTH - 40, boxHeight, COLORS.panel, 0.96)
            .setOrigin(0, 0)
            .setStrokeStyle(3, COLORS.panelBorder);

        this.portraitFrame = scene.add.rectangle(40, boxY + 20, portraitSize, portraitSize, 0x120f18)
            .setOrigin(0, 0)
            .setStrokeStyle(2, COLORS.panelBorder);
        this.portrait = scene.add.image(40 + portraitSize / 2, boxY + 20 + portraitSize - 4, '__DEFAULT').setOrigin(0.5, 1);
        this.portraitMask = scene.make.graphics({}, false).fillRect(42, boxY + 22, portraitSize - 4, portraitSize - 4);
        this.portrait.setMask(this.portraitMask.createGeometryMask());
        this.portraitSize = portraitSize;
        this.portraitTop = boxY + 20;

        const textX = 40 + portraitSize + 24;
        this.nameText = scene.add.text(textX, boxY + 20, '', textStyle({ fontSize: '32px' }));
        this.bodyText = scene.add.text(textX, boxY + 62, '', textStyle({
            fontSize: '16px',
            lineSpacing: 8,
            wordWrap: { width: GAME_WIDTH - textX - 60 }
        }));
        this.continueText = scene.add.text(GAME_WIDTH - 44, boxY + boxHeight - 14, t('E / Space / click >'), textStyle({ color: COLORS.accent })).setOrigin(1, 1).setVisible(false);
        this.continueTween = scene.tweens.add({ targets: this.continueText, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

        this.fullText = '';
        this.revealed = 0;
        this.isComplete = false;
    }

    /**
     * @param {{name:string, nameColor:string, portraitKey:string}} speaker
     * @param {string} text
     */
    showLine(speaker, text) {
        this.nameText.setText(t(speaker.name)).setColor(speaker.nameColor ?? COLORS.text);
        this.portrait.setTexture(speaker.portraitKey);
        const isFallback = Boolean(this.portrait.texture.customData?.isFallback);
        if (isFallback) {
            // Sin retrato definitivo: muestra cabeza y torso del personaje a escala 2.
            const visibleHeight = Math.min(this.portrait.height, Math.floor((this.portraitSize - 8) / 2));
            this.portrait.setScale(2).setCrop(0, 0, this.portrait.width, visibleHeight);
            // El origen inferior aun corresponde al cuadro completo; se ajusta su base
            // para que el borde superior del recorte quede dentro del marco.
            this.portrait.setY(this.portraitTop + 4 + this.portrait.height * 2);
        } else {
            // Ajusta el retrato real al marco usando pixeles enteros cuando es posible.
            const scale = Math.min((this.portraitSize - 8) / this.portrait.width, (this.portraitSize - 8) / this.portrait.height);
            this.portrait.setCrop().setScale(scale >= 1 ? Math.floor(scale) : scale);
            this.portrait.setY(this.portraitTop + this.portraitSize - 4);
        }
        this.fullText = text;
        this.revealed = 0;
        this.isComplete = false;
        this.bodyText.setText('');
        this.continueText.setVisible(false);
    }

    update(delta) {
        if (this.isComplete) {
            return;
        }
        this.revealed = Math.min(this.fullText.length, this.revealed + (CHARACTERS_PER_SECOND * delta) / 1000);
        this.bodyText.setText(this.fullText.slice(0, Math.floor(this.revealed)));
        if (this.revealed >= this.fullText.length) {
            this.isComplete = true;
            this.continueText.setVisible(true);
        }
    }

    destroy() {
        this.continueTween?.stop();
        this.portraitMask?.destroy();
    }
}
