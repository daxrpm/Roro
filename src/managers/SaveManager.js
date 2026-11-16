import { AUDIO_DEFAULTS, DEFAULT_DIFFICULTY, DIFFICULTY, STORAGE_KEY } from '../data/gameConfig.js';

/**
 * Persistencia mediante localStorage.
 *
 * Solo guarda datos duraderos: records, nivel alcanzado, ultima dificultad y
 * audio. No conserva partidas en curso; reiniciar crea un departamento limpio.
 *
 * Todos los accesos usan try/catch porque el almacenamiento puede estar bloqueado
 * o no disponible. El juego sigue funcionando sin el.
 *
 */
function createDefaultData() {
    return {
        version: 1,
        highScore: 0,
        highScoreByDifficulty: { [DIFFICULTY.EASY]: 0, [DIFFICULTY.NORMAL]: 0, [DIFFICULTY.HARD]: 0 },
        // El juego tiene un nivel: 1 = departamento desbloqueado; 2 = completado.
        levelReached: 1,
        gamesPlayed: 0,
        gamesWon: 0,
        lastDifficulty: DEFAULT_DIFFICULTY,
        audio: { ...AUDIO_DEFAULTS }
    };
}

class SaveManagerClass {
    constructor() {
        this.data = this.load();
    }

    load() {
        const defaults = createDefaultData();
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return defaults;
            }
            const parsed = JSON.parse(raw);
            return {
                ...defaults,
                ...parsed,
                highScoreByDifficulty: { ...defaults.highScoreByDifficulty, ...(parsed.highScoreByDifficulty ?? {}) },
                audio: { ...defaults.audio, ...(parsed.audio ?? {}) }
            };
        } catch (error) {
            console.warn('[SaveManager] Could not read saved data, using defaults.', error);
            return defaults;
        }
    }

    save() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (error) {
            console.warn('[SaveManager] Could not write saved data.', error);
        }
    }

    getHighScore(difficulty = null) {
        return difficulty ? this.data.highScoreByDifficulty[difficulty] ?? 0 : this.data.highScore;
    }

    getLevelReached() {
        return this.data.levelReached;
    }

    getStats() {
        return { gamesPlayed: this.data.gamesPlayed, gamesWon: this.data.gamesWon };
    }

    getLastDifficulty() {
        return Object.values(DIFFICULTY).includes(this.data.lastDifficulty) ? this.data.lastDifficulty : DEFAULT_DIFFICULTY;
    }

    setLastDifficulty(difficulty) {
        this.data.lastDifficulty = difficulty;
        this.save();
    }

    /**
     * Registra una partida terminada. Los records solo cuentan victorias, porque el
     * puntaje se valida cuando el detective se va sin resolver el caso.
     * @returns {{ newHighScore: boolean }}
     */
    recordResult({ score, difficulty, won }) {
        this.data.gamesPlayed += 1;
        let newHighScore = false;
        if (won) {
            this.data.gamesWon += 1;
            this.data.levelReached = Math.max(this.data.levelReached, 2);
            if (score > this.data.highScore) {
                this.data.highScore = score;
                newHighScore = true;
            }
            if (score > (this.data.highScoreByDifficulty[difficulty] ?? 0)) {
                this.data.highScoreByDifficulty[difficulty] = score;
            }
        }
        this.save();
        return { newHighScore };
    }

    getAudioSettings() {
        return { ...this.data.audio };
    }

    setAudioSettings(settings) {
        this.data.audio = { ...this.data.audio, ...settings };
        this.save();
    }
}

export const SaveManager = new SaveManagerClass();
