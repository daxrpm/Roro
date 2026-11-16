import { COLORS, SCENE_KEYS } from '../data/gameConfig.js';
import { ResultScene } from './ResultScene.js';

/** Se muestra cuando el detective termina la visita sin resolver el caso. */
export class VictoryScene extends ResultScene {
    constructor() {
        super(SCENE_KEYS.VICTORY, {
            title: 'THE DOOR CLOSES',
            color: COLORS.success,
            message: (result) => (result.score === result.maxScore
                ? 'The detective found nothing. Every trace is gone.\nThe routine is complete. Until next month.'
                : 'The detective left before solving the case.\nBut not everything was hidden...')
        });
    }
}
