import { t } from '../managers/LanguageManager.js';
import Phaser from 'phaser';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../data/gameConfig.js';
import { AssetManager } from '../managers/AssetManager.js';
import { AudioManager } from '../managers/AudioManager.js';

/**
 * Carga los recursos de assetManifest.js con Phaser, muestra el progreso y despues
 * prepara texturas y animaciones.
 */
export class PreloadScene extends Phaser.Scene {
    constructor() {
        super(SCENE_KEYS.PRELOAD);
    }

    preload() {
        const barWidth = 360;
        const x = (GAME_WIDTH - barWidth) / 2;
        const y = GAME_HEIGHT / 2;
        this.add.rectangle(x, y, barWidth, 16, COLORS.panel).setOrigin(0, 0.5).setStrokeStyle(2, COLORS.panelBorder);
        const fill = this.add.rectangle(x + 2, y, 0, 12, COLORS.accentHex).setOrigin(0, 0.5);
        const label = this.add.text(GAME_WIDTH / 2, y - 30, 'Loading...', {
            fontFamily: FONT_FAMILY,
            fontSize: '16px',
            color: COLORS.text
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            fill.width = (barWidth - 4) * value;
        });
        this.load.on('fileprogress', (file) => {
            label.setText(t("Loading {file}...", { file: file.key }));
        });

        AssetManager.queueAll(this);
    }

    create() {
        AssetManager.prepareTextures(this);
        AudioManager.init(this.game);
        this.scene.start(SCENE_KEYS.MAIN_MENU);
    }
}
