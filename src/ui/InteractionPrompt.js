import { COLORS, DEPTH } from '../data/gameConfig.js';
import { TEXT_STYLES } from './textStyles.js';

/**
 * Aviso sobre el objeto enfocado, por ejemplo [E] Recoger el bate. Se dibuja en el
 * mundo sobre la capa de oscuridad para poder leerse en cualquier dificultad.
 *
 */
export class InteractionPrompt {
    constructor(scene) {
        this.scene = scene;
        this.text = scene.add.text(0, 0, '', TEXT_STYLES.prompt)
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.prompt)
            .setVisible(false);
        this.currentKey = null;
    }

    show(message, position, enabled = true) {
        const label = enabled ? `[E] ${message}` : message;
        const key = `${label}|${enabled}`;
        if (key !== this.currentKey) {
            this.text.setText(label).setColor(enabled ? '#ffffff' : COLORS.textMuted);
            this.currentKey = key;
        }
        const camera = this.scene.cameras.main;
        // Mantiene el aviso dentro del area visible.
        const halfWidth = this.text.width / 2;
        const x = Math.min(Math.max(position.x, camera.worldView.x + halfWidth + 4), camera.worldView.right - halfWidth - 4);
        const y = Math.max(position.y - 18, camera.worldView.y + 44 + this.text.height);
        this.text.setPosition(Math.round(x), Math.round(y)).setVisible(true);
    }

    hide() {
        this.text.setVisible(false);
        this.currentKey = null;
    }
}
