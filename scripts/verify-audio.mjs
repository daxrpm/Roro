import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUDIO_ASSETS } from '../src/data/assetManifest.js';
import { DETECTIVE_CONFIG } from '../src/data/gameConfig.js';

const storage = new Map();
globalThis.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
const { AudioManager } = await import('../src/managers/AudioManager.js');
const calls = [];
const musicConfigs = [];
const music = { isPlaying: false, play() { this.isPlaying = true; }, stop() {}, destroy() {}, setVolume(value) { this.volume = value; }, setRate(value) { this.rate = value; } };
AudioManager.init({ cache: { audio: { exists: () => true } }, sound: { add: (key, options) => { musicConfigs.push({ key, ...options }); return music; }, play: (key, options) => calls.push({ key, ...options }) } });
AudioManager.playMusic('music-rest');
assert.equal(musicConfigs.at(-1).rate, 0.75, 'Rest music plays at 0.75 speed');
AudioManager.playMusic('music-ambience');
assert.equal(musicConfigs.at(-1).rate, 1, 'Gameplay music starts at normal speed');
const beforeRateChange = musicConfigs.length;
AudioManager.playMusic('music-ambience', { rate: 1.3 });
assert.equal(music.rate, 1.3, 'Music accelerates as the case gets closer to resolution');
assert.equal(musicConfigs.length, beforeRateChange, 'Rate changes do not restart the music');
AudioManager.playMusic('music-rest');
assert.equal(musicConfigs.at(-1).rate, 0.75, 'Rest music stays at 0.75 after a tense scene');
AudioManager.playMusic('music-menu');
assert.equal(musicConfigs.at(-1).rate, 1, 'Menu music remains at normal speed');
AudioManager.setVolume(0.5);
assert.equal(music.volume, 0.3);
assert.equal(AudioManager.getSettings().sfxVolume, 0.5);
assert.ok([...storage.values()].some(value => JSON.parse(value).audio.sfxVolume === 0.5));
AudioManager.playSfx('sfx-pickup');
assert.equal(calls.at(-1).volume, 0.5);
AudioManager.setVolume(-1);
assert.equal(music.volume, 0);
assert.equal(AudioManager.getSettings().sfxVolume, 0);
AudioManager.setVolume(2);
assert.equal(music.volume, 0.6);
assert.equal(AudioManager.getSettings().sfxVolume, 1);
AudioManager.setMuted(true);
const mutedCount = calls.length;
AudioManager.setVolume(0.8);
AudioManager.playSfx('sfx-hide');
assert.equal(calls.length, mutedCount);
assert.equal(AudioManager.isMuted(), true);
AudioManager.setMuted(false);
AudioManager.setVolume(1);

const radius = DETECTIVE_CONFIG.footstepHearingDistance;
assert.equal(radius, 96);
const listener = { x: 0, y: 0 };
const step = (x, y = 0) => AudioManager.playPositionalSfx('sfx-step-detective', { x, y }, listener, radius);
const count = calls.length;
step(radius + 1); step(radius); step(radius, radius);
assert.equal(calls.length, count, 'No footsteps at or beyond the close-range boundary');
step(radius / 2);
assert.equal(calls.at(-1).volume, 0.5);
assert.ok(calls.at(-1).pan > 0);
step(-radius / 2);
assert.ok(calls.at(-1).pan < 0);
step(0);
assert.equal(calls.at(-1).volume, 1);
step(radius - 1);
assert.ok(calls.at(-1).volume < 0.02, 'Footsteps fade smoothly at the boundary');

for (const asset of AUDIO_ASSETS.filter(entry => entry.type === 'sfx')) {
    const wav = readFileSync(new URL('../public/' + asset.path, import.meta.url));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt32LE(40), wav.length - 44);
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    assert.ok(peak > 0 && peak < 32767, 'Audio is non-silent and does not clip');
}
// El silbido se emite una vez tras calentar y no se repite durante la espera.
const { DistractionSource } = await import('../src/objects/DistractionSource.js');
const { DISTRACTION_CONFIG } = await import('../src/data/gameConfig.js');
const kettle = new DistractionSource({ id: 'kettle', name: 'kettle', room: 'kitchen' },
    { position: { x: 0, y: 0 }, investigatePosition: { x: 0, y: 0 } },
    () => AudioManager.playSfx('sfx-kettle'));
const beforeKettle = calls.length;
kettle.interact();
kettle.update(DISTRACTION_CONFIG.triggerDelay - 1);
assert.equal(calls.length, beforeKettle, 'No whistle before heating finishes');
kettle.update(1);
assert.equal(calls.length, beforeKettle + 1);
assert.equal(calls.at(-1).key, 'sfx-kettle');
kettle.interact();
kettle.update(100);
assert.equal(calls.length, beforeKettle + 1, 'No repeated whistle during cooldown');

console.log('Audio checks passed: volume, persistence, mute, proximity, panning and generated WAV files.');
