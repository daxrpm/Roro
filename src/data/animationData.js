/**
 * Definiciones de animacion de personajes a partir de las claves de texturas de
 * assetManifest.js. Los cuadros de caminar 001 a 003 se reproducen de ida y vuelta
 * (1-2-3-2-1...), siguiendo las posturas de las imagenes originales.
 */
export const DIRECTION = Object.freeze({
    FRONT: 'front',
    BACK: 'back',
    SIDE: 'side'
});

export const WALK_FRAME_RATE = 7;

export const CHARACTER_KEYS = Object.freeze(['roro', 'detective']);

export function idleTextureKey(character, direction) {
    return `${character}-idle-${direction}`;
}

export function walkAnimationKey(character, direction) {
    return `${character}-walk-${direction}`;
}

/** Devuelve las configuraciones de animacion de cada personaje y direccion. */
export function getCharacterAnimationConfigs() {
    const configs = [];

    for (const character of CHARACTER_KEYS) {
        for (const direction of Object.values(DIRECTION)) {
            configs.push({
                key: walkAnimationKey(character, direction),
                frames: [1, 2, 3].map((index) => ({ key: `${character}-walk-${direction}-${index}` })),
                frameRate: WALK_FRAME_RATE,
                repeat: -1,
                yoyo: true
            });
        }
    }

    return configs;
}
