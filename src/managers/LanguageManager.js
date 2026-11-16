import { SPANISH } from '../data/translations.js';

const STORAGE_KEY = 'roro-language';
const SUPPORTED = ['en', 'es'];
let language = 'en';
try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) language = saved;
} catch { /* El almacenamiento puede fallar; la sesion sigue funcionando. */ }

function updateDocumentLanguage() {
    if (globalThis.document) document.documentElement.lang = language;
}
updateDocumentLanguage();

export function getLanguage() { return language; }

export function setLanguage(next) {
    if (!SUPPORTED.includes(next)) throw new Error('Unsupported language: ' + next);
    language = next;
    try { globalThis.localStorage?.setItem(STORAGE_KEY, next); } catch { /* Conserva la preferencia durante esta sesion. */ }
    updateDocumentLanguage();
}

/** Resuelve el texto fuente e inserta valores sin traducir nombres ni identificadores. */
export function t(source, values = {}) {
    const text = language === 'es' ? SPANISH[source] ?? source : source;
    return text.replace(/\{(\w+)\}/g, (token, key) => Object.hasOwn(values, key) ? String(values[key]) : token);
}
