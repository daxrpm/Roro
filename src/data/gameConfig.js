/**
 * Configuracion central del juego.
 *
 * Reune parametros ajustables: resolucion, velocidades, tiempos, dificultad y
 * constantes narrativas, para que la logica pueda consultarlos sin repetirlos.
 */

// Resolucion interna de dibujo. Phaser la adapta a la ventana del navegador.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// El tileset interior usa cuadros originales de 16 x 16. El mundo se dibuja
// con escala entera 2; cada tile del mundo mide 32 x 32 pixeles.
export const TILE_SOURCE_SIZE = 16;
export const WORLD_SCALE = 2;
export const TILE_SIZE = TILE_SOURCE_SIZE * WORLD_SCALE;

export const SCENE_KEYS = Object.freeze({
    BOOT: 'BootScene',
    PRELOAD: 'PreloadScene',
    MAIN_MENU: 'MainMenuScene',
    DIFFICULTY: 'DifficultyScene',
    INTRODUCTION: 'IntroductionScene',
    APARTMENT: 'ApartmentScene',
    DIALOGUE: 'DialogueScene',
    PAUSE: 'PauseScene',
    VICTORY: 'VictoryScene',
    DEFEAT: 'DefeatScene'
});

export const DIFFICULTY = Object.freeze({
    EASY: 'easy',
    NORMAL: 'normal',
    HARD: 'hard'
});

export const VISIBILITY_MODE = Object.freeze({
    FULL: 'full',
    ROOM: 'room',
    RADIUS: 'radius'
});

/**
 * La dificultad cambia la visibilidad y las evidencias necesarias para resolver el caso. El
 * comportamiento del detective es el mismo en todos los modos (GAME_DESIGN.md, seccion 11).
 */
export const DIFFICULTY_SETTINGS = Object.freeze({
    [DIFFICULTY.EASY]: {
        label: 'Easy',
        evidenceToSolve: 3,
        description: 'The whole apartment is visible.\nYou can see the detective at all times.',
        visibility: VISIBILITY_MODE.FULL
    },
    [DIFFICULTY.NORMAL]: {
        label: 'Normal',
        evidenceToSolve: 2,
        description: 'Only the room you are in is visible.\nListen for the detective\'s footsteps.',
        visibility: VISIBILITY_MODE.ROOM,
        // Oscuridad de las habitaciones donde no esta Roro: 0 = ninguna, 1 = negro.
        obscuredAlpha: 0.93
    },
    [DIFFICULTY.HARD]: {
        label: 'Hard',
        evidenceToSolve: 1,
        description: 'You only see a small circle around Roro.\nListen for the detective\'s footsteps.',
        visibility: VISIBILITY_MODE.RADIUS,
        obscuredAlpha: 0.985,
        // Radio del circulo visible alrededor de Roro, en pixeles del mundo.
        visibilityRadius: 110
    }
});

export const DEFAULT_DIFFICULTY = DIFFICULTY.NORMAL;

export const SCORE_CONFIG = Object.freeze({
    MAX_SCORE: 6
});

export const PLAYER_CONFIG = Object.freeze({
    speed: 110,
    // Cuerpo fisico pequeno en los pies del personaje, en pixeles del mundo.
    bodyWidth: 16,
    bodyHeight: 8,
    // Distancia maxima entre los pies de Roro y el punto de interaccion.
    interactionRange: 40,
    footstepInterval: 330
});

export const DETECTIVE_CONFIG = Object.freeze({
    speed: 58,
    bodyWidth: 16,
    bodyHeight: 8,
    // Distancia en pixeles a la que se considera alcanzado un punto de ruta.
    arriveThreshold: 3,
    // Tiempo en ms que el detective observa al terminar de entrar.
    entryPause: 5000,
    // Tiempo en ms para abrir una puerta cerrada antes de atravesarla.
    doorOpenDelay: 450,
    // Distancia a Roro, en pixeles, a la que comienza una entrevista.
    interviewDistance: 44,
    // Intervalo en ms para recalcular la ruta hacia un objetivo movil como Roro.
    chaseRepathInterval: 600,
    // Tiempo sin avance en ms que provoca un nuevo calculo de ruta.
    stuckTimeout: 1500,
    // Reintentos antes de omitir un destino inaccesible.
    maxPathRetries: 4,
    retryDelay: 500,
    // Tras esta espera en ms sin alcanzar a Roro, la entrevista inicia de todos modos.
    interviewFallbackTimeout: 6000,
    footstepInterval: 420,
    // Los pasos dejan de oirse mas alla de esta distancia de Roro, en pixeles.
    footstepHearingDistance: 96
});

/**
 * Reglas para esconder y descubrir evidencias. README explica los valores
 * predeterminados en la seccion de decisiones de diseno.
 */
export const HIDING_RULES = Object.freeze({
    // Roro lleva como maximo una evidencia a la vez.
    carryLimit: 1,
    // Cantidad maxima de evidencias que admite cada escondite.
    hidingSpotCapacity: 1,
    // Roro puede recuperar un objeto oculto; el puntaje disminuye en uno.
    allowRetrieval: true
});

export const DISTRACTION_CONFIG = Object.freeze({
    // Espera en ms entre activar la tetera y emitir el silbido.
    triggerDelay: 2000,
    // Tiempo en ms que el detective investiga la distraccion antes de regresar.
    investigateDuration: 4000,
    // Tiempo en ms antes de poder reutilizar la misma distraccion.
    cooldown: 30000
});

export const STORY = Object.freeze({
    playerName: 'Roro',
    detectiveName: 'Detective',
    // Se muestra en la nota y se revela en la tercera entrevista.
    victimFullName: 'Daniel Ortega Vidal',
    monthsWithBlackouts: 6
});

export const AUDIO_DEFAULTS = Object.freeze({
    muted: false,
    musicVolume: 0.5,
    sfxVolume: 0.8
});

export const STORAGE_KEY = 'roro.save.v1';

export const FONT_FAMILY = '"m6x11", "Courier New", monospace';

export const COLORS = Object.freeze({
    background: 0x14121b,
    backgroundCss: '#14121b',
    panel: 0x1f1b29,
    panelBorder: 0x5a4a6e,
    text: '#f2e9dc',
    textMuted: '#a89bb5',
    accent: '#e0b354',
    accentHex: 0xe0b354,
    danger: '#d65a5a',
    dangerHex: 0xd65a5a,
    success: '#7fc28a',
    wallTop: 0x2a2233,
    wallTopEdge: 0x3c3149,
    darkness: 0x07060c,
    focusTint: 0xfff2a8
});

/**
 * Las figuras provisionales de recursos ausentes usan este color de contorno para
 * identificarlas facilmente en capturas.
 */
export const PLACEHOLDER_STYLE = Object.freeze({
    showOutline: true,
    outlineColor: 0xff00ff
});

// Capas de profundidad. Personajes y muebles usan su coordenada y inferior.
export const DEPTH = Object.freeze({
    floor: 0,
    walls: 1,
    rugs: 2,
    worldBase: 10,
    visibility: 5000,
    prompt: 5500,
    hud: 6000,
    modal: 7000,
    touch: 8000
});
