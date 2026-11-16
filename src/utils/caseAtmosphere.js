/** La cantidad absoluta de evidencias faltantes da tension inicial a los modos mas dificiles. */
export function caseAtmosphere(remaining) {
    const intensity = Math.max(0, Math.min(1, (3 - remaining) / 2));
    return { intensity, musicRate: 1 + 0.3 * intensity };
}
