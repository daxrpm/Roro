/** Efectos originales sintetizados. Ejecutar: node scripts/generate-effects.mjs */
import { writeFileSync } from 'node:fs';

const RATE = 44100;
const TAU = Math.PI * 2;
function envelope(t, duration, attack = 0.005, release = 0.03) {
    return Math.max(0, Math.min(1, t / attack, (duration - t) / release));
}
function tone(frequency, t) { return Math.sin(TAU * frequency * t); }
function melody(t, notes) {
    return notes.reduce((sum, [start, frequency, duration]) => {
        const local = t - start;
        if (local < 0 || local >= duration) return sum;
        return sum + envelope(local, duration, 0.012, 0.10) * Math.exp(-local * 3)
            * (tone(frequency, local) + 0.15 * tone(frequency * 2, local));
    }, 0);
}

function render(filename, duration, sample, seed) {
    const frames = Math.round(RATE * duration);
    const values = new Float64Array(frames);
    let filtered = 0, peak = 0;
    for (let index = 0; index < frames; index++) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        const random = seed / 2147483648 - 1;
        filtered += 0.18 * (random - filtered);
        const t = index / RATE;
        const value = sample(t, random, filtered) * envelope(t, duration, 0.002, 0.02);
        if (!Number.isFinite(value)) throw new Error('Invalid sample: ' + filename);
        values[index] = value;
        peak = Math.max(peak, Math.abs(value));
    }
    if (!peak) throw new Error('Silent effect: ' + filename);
    const wav = Buffer.alloc(44 + frames * 2);
    wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8);
    wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22); wav.writeUInt32LE(RATE, 24); wav.writeUInt32LE(RATE * 2, 28);
    wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(frames * 2, 40);
    for (let index = 0; index < frames; index++) wav.writeInt16LE(Math.round(values[index] / peak * 0.65 * 32767), 44 + index * 2);
    writeFileSync(new URL('../public/assets/sounds/' + filename, import.meta.url), wav);
    console.log(filename + ' (' + duration + ' s)');
}

render('footstep_roro.wav', 0.13, (t, n, f) => 0.7 * tone(145, t) * Math.exp(-t * 62) + f * Math.exp(-t * 48) + 0.09 * n * Math.exp(-t * 240), 101);
render('door_open.wav', 0.55, (t, n, f) => {
    const creak = Math.sin(TAU * (185 * t + 75 * t * t) + 0.6 * tone(18, t));
    return 0.25 * creak * envelope(t, 0.55, 0.09, 0.12) + 0.35 * f * Math.exp(-t * 45) + 0.2 * tone(260, t) * Math.exp(-t * 70);
}, 102);
render('door_close.wav', 0.32, (t, n, f) => 0.65 * tone(95, t) * Math.exp(-t * 25) + 0.4 * tone(240, t) * Math.exp(-t * 55) + f * Math.exp(-t * 35), 103);
render('paper_rustle.wav', 0.22, (t, n, f) => (n - f) * Math.exp(-t * 13) * (0.55 + 0.45 * tone(39, t)), 104);
render('kettle_whistle.wav', 2, (t, n, f) => {
    // Silbido de vapor ascendente con vibrato, armonico suave y ruido de aire.
    const phase = TAU * (1380 * t + 65 * t * t) + 0.8 * tone(6, t);
    return envelope(t, 2, 0.3, 0.4) * (0.65 * Math.sin(phase) + 0.10 * Math.sin(2 * phase) + 0.08 * (n - f));
}, 105);
render('ui_select.wav', 0.09, t => tone(720, t) * Math.exp(-t * 45) + 0.25 * tone(1080, t) * Math.exp(-t * 65), 106);
render('victory.wav', 1.2, t => melody(t, [[0, 392, 0.35], [0.18, 494, 0.35], [0.36, 587, 0.4], [0.58, 784, 0.6]]), 107);
render('defeat.wav', 1.25, t => melody(t, [[0, 330, 0.4], [0.22, 262, 0.4], [0.44, 196, 0.5], [0.7, 131, 0.55]]) + 0.15 * tone(65.5, t) * envelope(t, 1.25, 0.08, 0.3), 108);
