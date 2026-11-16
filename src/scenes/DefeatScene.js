import { t } from '../managers/LanguageManager.js';
import { COLORS, SCENE_KEYS } from '../data/gameConfig.js';
import { ResultScene } from './ResultScene.js';

/** Se muestra cuando el detective reune las evidencias necesarias para resolver el caso. */
export class DefeatScene extends ResultScene {
    constructor() {
        super(SCENE_KEYS.DEFEAT, {
            title: 'CAUGHT',
            color: COLORS.danger,
            message: (result) => `${result.reason ?? t('The detective found the evidence.')}\n${t('The routine is over.')}`
        });
    }
}
