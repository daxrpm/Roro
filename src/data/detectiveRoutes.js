import { HIDING_CATEGORY, ROOM_IDS } from './apartmentData.js';

/**
 * Cuatro rutas del detective, recorridas en este orden. Hay una entrevista tras
 * cada una de las tres primeras.
 * Cada ruta revisa todos los escondites de su category. La primera agrega un
 * barrido de cada habitacion para encontrar evidencias expuestas. Se barajan las
 * habitaciones y despues sus puntos: el orden varia por partida conservando la
 * agrupacion por habitacion.
 *
 * speedMultiplier: multiplica DETECTIVE_CONFIG.speed.
 *
 * inspectDuration: tiempo de inspeccion por punto en ms.
 *
 * lookRadius: distancia en pixeles dentro de la cual se descubre evidencia
 * expuesta al inspeccionar.
 */
export const INSPECTION_ROUTES = [
    {
        id: 1,
        name: 'Very obvious places',
        category: HIDING_CATEGORY.VERY_OBVIOUS,
        includeRoomSweeps: true,
        speedMultiplier: 1,
        inspectDuration: 2200,
        lookRadius: 64
    },
    {
        id: 2,
        name: 'Not so obvious places',
        category: HIDING_CATEGORY.NOT_SO_OBVIOUS,
        includeRoomSweeps: false,
        speedMultiplier: 1,
        inspectDuration: 2600,
        lookRadius: 64
    },
    {
        id: 3,
        name: 'Hidden places',
        category: HIDING_CATEGORY.HIDDEN,
        includeRoomSweeps: false,
        speedMultiplier: 1,
        inspectDuration: 3000,
        lookRadius: 64
    },
    {
        id: 4,
        name: 'Very hidden places',
        category: HIDING_CATEGORY.VERY_HIDDEN,
        includeRoomSweeps: false,
        // La ultima ruta es mas rapida que las anteriores (GAME_DESIGN 10.1).
        speedMultiplier: 1.6,
        inspectDuration: 1600,
        lookRadius: 64
    }
];

/**
 * Puntos de barrido en coordenadas de tiles: el detective se detiene en el centro
 * de cada habitacion y observa. Se usan con includeRoomSweeps.
 */
export const ROOM_SWEEP_POINTS = [
    { id: 'sweepBedroom', room: ROOM_IDS.BEDROOM, tile: { x: 5, y: 6 }, lookRadius: 96 },
    { id: 'sweepBathroom', room: ROOM_IDS.BATHROOM, tile: { x: 12, y: 7 }, lookRadius: 96 },
    { id: 'sweepKitchen', room: ROOM_IDS.KITCHEN, tile: { x: 21, y: 8 }, lookRadius: 96 },
    { id: 'sweepHallway', room: ROOM_IDS.HALLWAY, tile: { x: 12, y: 12 }, lookRadius: 96 },
    { id: 'sweepLivingRoom', room: ROOM_IDS.LIVING_ROOM, tile: { x: 13, y: 19 }, lookRadius: 96 }
];
