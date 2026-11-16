/**
 * Muestra que recursos de src/data/assetManifest.js existen en public/.
 *
 * Ejecutar: npm run check-assets.
 *
 * Termina con codigo 1 si falta una imagen REQUIRED. Los opcionales ausentes solo
 * generan aviso porque se usan sustitutos o silencio.
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO_ASSETS, FONT_ASSETS, OPTIONAL_IMAGES, REQUIRED_IMAGES } from '../src/data/assetManifest.js';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function status(asset) {
    const file = join(publicDir, asset.path);
    return existsSync(file) && statSync(file).size > 0;
}

function printTable(title, rows) {
    console.log(`\n${title} (${rows.length})`);
    if (rows.length === 0) {
        console.log('  none');
        return;
    }
    for (const row of rows) {
        console.log(`  - ${row.key}`);
        console.log(`      type:     ${row.type}`);
        console.log(`      expected: public/${row.path}`);
        console.log(`      purpose:  ${row.purpose}`);
        console.log(`      fallback: ${row.fallback}`);
    }
}

const required = [
    ...REQUIRED_IMAGES.map((asset) => ({ ...asset, type: 'image', fallback: 'magenta placeholder box (error)' })),
    ...FONT_ASSETS.map((asset) => ({ ...asset, type: 'font', fallback: 'browser monospace font' }))
];
const optional = [
    ...OPTIONAL_IMAGES.map((asset) => ({
        ...asset,
        type: 'image',
        fallback: asset.fallbackTexture ? `reuses texture "${asset.fallbackTexture}"` : `programmatic placeholder (${asset.placeholder.shape}, ${asset.placeholder.width}x${asset.placeholder.height}px)`
    })),
    ...AUDIO_ASSETS.map((asset) => ({ ...asset, type: `audio (${asset.type})`, fallback: 'silent: playback skipped' }))
];

const missingRequired = required.filter((asset) => !status(asset));
const missingOptional = optional.filter((asset) => !status(asset));

console.log('RORO asset report');
console.log(`  required: ${required.length - missingRequired.length}/${required.length} present`);
console.log(`  optional: ${optional.length - missingOptional.length}/${optional.length} present`);
printTable('MISSING REQUIRED ASSETS', missingRequired);
printTable('MISSING OPTIONAL ASSETS (fallback in use)', missingOptional);

process.exit(missingRequired.length > 0 ? 1 : 0);
