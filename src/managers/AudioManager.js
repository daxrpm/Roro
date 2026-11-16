import { AUDIO_ASSETS, AUDIO_TYPE } from '../data/assetManifest.js';
import { SaveManager } from './SaveManager.js';

const AUDIO_TYPES_BY_KEY = new Map(AUDIO_ASSETS.map((asset) => [asset.key, asset.type]));

/**
 * Servicio central de audio, independiente de las reglas de juego.
 *
 * Usa el gestor de sonido global de Phaser: la musica continua entre escenas.
 *
 * Antes de reproducir comprueba que el archivo este cargado. Los sonidos ausentes
 * se omiten; luego pueden agregarse en las rutas de assetManifest.js.
 *
 * SaveManager conserva silencio y volumenes entre sesiones.
 */
class AudioManagerClass {
    constructor() {
        this.game = null;
        this.settings = SaveManager.getAudioSettings();
        this.currentMusicKey = null;
        this.currentMusic = null;
        this.warnedKeys = new Set();
        this.listeners = new Set();
    }

    init(game) {
        this.game = game;
        this.applyMute();
    }

    isAvailable(key) {
        const available = Boolean(this.game?.cache.audio.exists(key));
        if (!available && !this.warnedKeys.has(key)) {
            this.warnedKeys.add(key);
            console.info(`[AudioManager] "${key}" is not loaded; playback skipped.`);
        }
        return available;
    }

    // ------------------------------------------------------------------ musica

    playMusic(key, { loop = true, rate = key === 'music-rest' ? 0.75 : 1 } = {}) {
        if (this.currentMusicKey === key && this.currentMusic?.isPlaying) {
            this.currentMusic.setRate(rate);
            return;
        }
        this.stopMusic();
        this.currentMusicKey = key;
        if (!this.isAvailable(key)) {
            return;
        }
        try {
            this.currentMusic = this.game.sound.add(key, {
                loop,
                volume: this.settings.musicVolume,
                rate
            });
            this.currentMusic.play();
        } catch (error) {
            console.warn(`[AudioManager] Could not play music "${key}".`, error);
            this.currentMusic = null;
        }
    }

    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic.destroy();
        }
        this.currentMusic = null;
        this.currentMusicKey = null;
    }

    // --------------------------------------------------------------- efectos

    /**
     * Reproduce un efecto sonoro una sola vez.
     * @param {string} key
     * @param {object} [options]
     * @param {number} [options.volume] multiplicador de volumen de efectos entre 0 y 1
     * @param {number} [options.pan] -1 (izquierda) a 1 (derecha), solo WebAudio
     * @param {number} [options.detune]
     */
    playSfx(key, { volume = 1, pan = 0, detune = 0 } = {}) {
        if (this.settings.muted || !this.isAvailable(key)) {
            return;
        }
        try {
            // WebAudio aplica pan; el audio HTML5 ignora ese parametro.
            this.game.sound.play(key, {
                volume: Math.max(0, Math.min(1, volume * this.settings.sfxVolume)),
                detune,
                pan: Math.max(-1, Math.min(1, pan))
            });
        } catch (error) {
            console.warn(`[AudioManager] Could not play "${key}".`, error);
        }
    }

    /**
     * Reproduce un paso escuchado desde listener. El volumen disminuye con la
     * distancia y la panoramica lo situa a izquierda o derecha para localizar al
     * detective por sonido en Normal y Dificil.
     */
    playPositionalSfx(key, source, listener, hearingDistance) {
        const dx = source.x - listener.x;
        const distance = Math.hypot(dx, source.y - listener.y);
        if (hearingDistance <= 0 || distance >= hearingDistance) {
            return;
        }
        const volume = 1 - distance / hearingDistance;
        this.playSfx(key, { volume, pan: dx / (hearingDistance * 0.6), detune: (Math.random() - 0.5) * 100 });
    }

    // -------------------------------------------------------------- ajustes

    getSettings() {
        return { ...this.settings };
    }

    isMuted() {
        return this.settings.muted;
    }

    setMuted(muted) {
        this.settings.muted = muted;
        this.applyMute();
        this.persist();
    }

    toggleMute() {
        this.setMuted(!this.settings.muted);
        return this.settings.muted;
    }

    /** Un control para efectos y musica que conserva la musica mas suave. */
    setVolume(volume) {
        const level = Math.max(0, Math.min(1, volume));
        this.settings.sfxVolume = level;
        this.settings.musicVolume = level * 0.6;
        this.currentMusic?.setVolume(this.settings.musicVolume);
        this.persist();
    }

    setMusicVolume(volume) {
        this.settings.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic && 'setVolume' in this.currentMusic) {
            this.currentMusic.setVolume(this.settings.musicVolume);
        }
        this.persist();
    }

    setSfxVolume(volume) {
        this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
        this.persist();
    }

    applyMute() {
        if (this.game) {
            this.game.sound.mute = this.settings.muted;
        }
    }

    persist() {
        SaveManager.setAudioSettings(this.settings);
        this.listeners.forEach((listener) => listener(this.getSettings()));
    }

    /** Suscribe cambios de ajustes; devuelve una funcion para cancelar la suscripcion. */
    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getType(key) {
        return AUDIO_TYPES_BY_KEY.get(key) ?? AUDIO_TYPE.SFX;
    }
}

export const AudioManager = new AudioManagerClass();
