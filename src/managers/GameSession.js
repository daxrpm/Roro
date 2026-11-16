import { DIFFICULTY_SETTINGS } from '../data/gameConfig.js';
import { SaveManager } from './SaveManager.js';

/**
 * Estado compartido entre escenas durante la sesion: dificultad seleccionada y
 * ultimo resultado. Los datos persistentes viven en SaveManager; esta instancia
 * dura mientras la pagina esta abierta.
 */
class GameSessionClass {
    constructor() {
        this.difficulty = SaveManager.getLastDifficulty();
        this.lastResult = null;
    }

    setDifficulty(difficulty) {
        if (!DIFFICULTY_SETTINGS[difficulty]) {
            throw new Error(`Unknown difficulty "${difficulty}".`);
        }
        this.difficulty = difficulty;
        SaveManager.setLastDifficulty(difficulty);
    }

    getDifficultySettings() {
        return DIFFICULTY_SETTINGS[this.difficulty];
    }

    /** Guarda el resultado de una partida terminada y actualiza records persistentes. */
    finishGame({ won, score, maxScore, caseProgress, reason = null }) {
        const { newHighScore } = SaveManager.recordResult({ score, difficulty: this.difficulty, won });
        this.lastResult = {
            won,
            score,
            maxScore,
            caseProgress,
            reason,
            difficulty: this.difficulty,
            newHighScore,
            highScore: SaveManager.getHighScore()
        };
        return this.lastResult;
    }
}

export const GameSession = new GameSessionClass();
