/**
 * Definiciones de evidencias. Hay seis objetos; cada objeto escondido suma un
 * punto (SCORE_CONFIG.MAX_SCORE = 6).
 */

export const EVIDENCE_TYPE = Object.freeze({
    BELONGING: 'belonging',
    WEAPON: 'weapon',
    NOTE: 'note'
});

/**
 * Estados explicitos de evidencia, sin booleanos independientes:
 * NOT_FOUND: objeto visible en algun punto del departamento.
 * CARRIED: objeto en manos de Roro.
 * HIDDEN: guardado en un escondite; aporta al puntaje.
 * DISCOVERED: encontrado por el detective; hace avanzar el caso.
 */
export const EVIDENCE_STATE = Object.freeze({
    NOT_FOUND: 'notFound',
    CARRIED: 'carried',
    HIDDEN: 'hidden',
    DISCOVERED: 'discovered'
});

/**
 * spawn: random elige desde BELONGING_SPAWN_POINTS; cualquier otro valor es una
 * clave de FIXED_SPAWN_POINTS (apartmentData.js).
 * decisive: cuenta entre las evidencias necesarias para resolver el caso.
 * GAME_DESIGN.md no distingue objetos decisivos, por lo que los seis lo son.
 */
export const EVIDENCE_ITEMS = [
    { id: 'globe', name: 'desk globe', type: EVIDENCE_TYPE.BELONGING, textureKey: 'item-globe', spawn: 'random', decisive: true },
    { id: 'stars', name: 'star ornaments', type: EVIDENCE_TYPE.BELONGING, textureKey: 'item-stars', spawn: 'random', decisive: true },
    { id: 'lamp', name: 'blue lamp', type: EVIDENCE_TYPE.BELONGING, textureKey: 'item-lamp', spawn: 'random', decisive: true },
    { id: 'framedMap', name: 'framed map', type: EVIDENCE_TYPE.BELONGING, textureKey: 'item-map', spawn: 'random', decisive: true },
    { id: 'bat', name: 'baseball bat', type: EVIDENCE_TYPE.WEAPON, textureKey: 'item-bat', spawn: 'bat', decisive: true },
    { id: 'note', name: 'victim\'s note', type: EVIDENCE_TYPE.NOTE, textureKey: 'item-note', spawn: 'note', decisive: true, readable: true }
];

/**
 * Texto de la nota de la victima. {victimName} se reemplaza por
 * STORY.victimFullName durante la ejecucion.
 */
export const NOTE_CONTENT = Object.freeze({
    heading: 'Month six.',
    body: 'Name:',
    nameTemplate: '{victimName}',
    footer: 'Hide everything. Like always.'
});
