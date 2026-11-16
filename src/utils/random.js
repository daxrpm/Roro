/**
 * Utilidades aleatorias que aceptan una funcion random inyectable para probar la
 * logica de forma determinista.
 */

/** Devuelve un array nuevo barajado mediante Fisher Yates. */
export function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

/** Selecciona count elementos distintos. */
export function pickDistinct(items, count, random = Math.random) {
    if (count > items.length) {
        throw new Error(`Cannot pick ${count} items from a list of ${items.length}.`);
    }
    return shuffle(items, random).slice(0, count);
}

/** Generador mulberry32 con semilla para pruebas reproducibles. */
export function createSeededRandom(seed) {
    let state = seed >>> 0;
    return function seededRandom() {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}
