import {
    AUDIO_ASSETS,
    FONT_ASSETS,
    OPTIONAL_IMAGES,
    REQUIRED_IMAGES
} from '../data/assetManifest.js';
import { FURNITURE_FRAMES, TILESET_KEY } from '../data/tilesetData.js';
import { getCharacterAnimationConfigs } from '../data/animationData.js';
import { PLACEHOLDER_STYLE } from '../data/gameConfig.js';
import {
    imageToCanvas,
    padToSize,
    removeBackground,
    resizeNearest,
    trimCanvas
} from '../utils/imageProcessing.js';
import { drawPlaceholder } from '../ui/placeholderShapes.js';
// Archivos presentes en public/, enumerados por el plugin de vite.config.js.
import availableAssetPaths from 'virtual:available-assets';

const AVAILABLE_ASSETS = new Set(availableAssetPaths);

/**
 * Carga recursos de assetManifest.js, prepara texturas y registra faltantes.
 * Los recursos ausentes tienen respaldo:
 * Las imagenes opcionales usan figuras provisionales o texturas existentes.
 *
 * AudioManager omite los sonidos no cargados.
 *
 * Una imagen obligatoria fallida tambien recibe sustituto y se informa como error.
 */
class AssetManagerClass {
    constructor() {
        this.missingKeys = new Set();
        this.report = null;
    }

    /** Indica si el archivo existe en public/, segun el inventario de compilacion o desarrollo. */
    isAvailable(asset) {
        return AVAILABLE_ASSETS.has(asset.path);
    }

    /**
     * Encola recursos en el cargador de la escena; se llama desde preload(). Las
     * imagenes obligatorias siempre se solicitan y sus fallos se informan. Los
     * opcionales solo se piden si existen, evitando errores de carga por archivos aun
     * ausentes.
     */
    queueAll(scene) {
        const { load } = scene;
        for (const font of FONT_ASSETS) {
            load.font(font.key, font.path, 'truetype');
        }
        for (const image of REQUIRED_IMAGES) {
            load.image(image.key, image.path);
        }
        for (const image of OPTIONAL_IMAGES.filter((asset) => this.isAvailable(asset))) {
            load.image(image.key, image.path);
        }
        for (const audio of AUDIO_ASSETS.filter((asset) => this.isAvailable(asset))) {
            load.audio(audio.key, audio.path);
        }
    }

    /** Procesamiento posterior a la carga; se llama desde create(). */
    prepareTextures(scene) {
        // Un recurso solicitado pero no decodificado, por formato o corrupcion,
        // se trata igual que un archivo ausente.
        this.missingKeys = new Set([
            ...[...REQUIRED_IMAGES, ...OPTIONAL_IMAGES].filter((image) => !scene.textures.exists(image.key)).map((image) => image.key),
            ...AUDIO_ASSETS.filter((audio) => !scene.cache.audio.exists(audio.key)).map((audio) => audio.key),
            ...FONT_ASSETS.filter((font) => !document.fonts.check(`16px "${font.key}"`)).map((font) => font.key)
        ]);
        this.processImages(scene);
        this.addTilesetFrames(scene);
        this.createMissingImageSubstitutes(scene);
        this.createAnimations(scene);
        this.report = this.buildReport();
        this.logReport();
        return this.report;
    }

    processImages(scene) {
        const groups = new Map();

        for (const image of REQUIRED_IMAGES) {
            if (!image.processing || !scene.textures.exists(image.key)) {
                continue;
            }
            const options = image.processing;
            let canvas = imageToCanvas(scene.textures.get(image.key).getSourceImage());
            if (options.removeBackground) {
                removeBackground(canvas, options.removeBackground);
            }
            canvas = trimCanvas(canvas);
            if (options.targetHeight) {
                canvas = resizeNearest(canvas, options.targetHeight / canvas.height);
            } else if (options.scale) {
                canvas = resizeNearest(canvas, options.scale);
            }

            if (options.normalizeGroup) {
                if (!groups.has(options.normalizeGroup)) {
                    groups.set(options.normalizeGroup, []);
                }
                groups.get(options.normalizeGroup).push({ key: image.key, canvas });
            } else {
                this.replaceTexture(scene, image.key, canvas);
            }
        }

        // Todos los cuadros del personaje comparten tamano y se alinean en los pies.
        for (const frames of groups.values()) {
            const width = Math.max(...frames.map((frame) => frame.canvas.width));
            const height = Math.max(...frames.map((frame) => frame.canvas.height));
            for (const frame of frames) {
                this.replaceTexture(scene, frame.key, padToSize(frame.canvas, width, height));
            }
        }
    }

    replaceTexture(scene, key, canvas) {
        scene.textures.remove(key);
        scene.textures.addCanvas(key, canvas);
    }

    addTilesetFrames(scene) {
        if (!scene.textures.exists(TILESET_KEY)) {
            return;
        }
        const texture = scene.textures.get(TILESET_KEY);
        for (const [name, rect] of Object.entries(FURNITURE_FRAMES)) {
            if (!texture.has(name)) {
                texture.add(name, 0, rect.x, rect.y, rect.w, rect.h);
            }
        }
    }

    createMissingImageSubstitutes(scene) {
        for (const image of OPTIONAL_IMAGES) {
            if (scene.textures.exists(image.key)) {
                continue;
            }
            if (image.fallbackTexture && scene.textures.exists(image.fallbackTexture)) {
                // Reutiliza una textura existente con la clave esperada.
                const source = scene.textures.get(image.fallbackTexture).getSourceImage();
                const texture = scene.textures.addCanvas(image.key, imageToCanvas(source));
                // Marca el sustituto para que la interfaz pueda, por ejemplo, recortar un retrato.
                texture.customData.isFallback = true;
            } else if (image.placeholder) {
                this.generatePlaceholder(scene, image.key, image.placeholder);
            }
        }

        // Tambien se sustituye una imagen obligatoria que fallo para continuar;
        // el informe conserva ese fallo como error.
        for (const image of REQUIRED_IMAGES) {
            if (!scene.textures.exists(image.key)) {
                this.generatePlaceholder(scene, image.key, { width: 32, height: 32, shape: 'box', color: 0x884488 });
            }
        }
    }

    generatePlaceholder(scene, key, { width, height, shape, color }) {
        const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
        drawPlaceholder(graphics, shape, width, height, color);
        if (PLACEHOLDER_STYLE.showOutline) {
            graphics.lineStyle(1, PLACEHOLDER_STYLE.outlineColor, 1);
            graphics.strokeRect(0.5, 0.5, width - 1, height - 1);
        }
        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    createAnimations(scene) {
        for (const config of getCharacterAnimationConfigs()) {
            if (!scene.anims.exists(config.key)) {
                scene.anims.create(config);
            }
        }
    }

    // ---------------------------------------------------------------- informe

    buildReport() {
        const missingRequired = REQUIRED_IMAGES
            .filter((image) => this.missingKeys.has(image.key))
            .map((image) => ({ ...image, type: 'image', fallback: 'magenta placeholder box' }));
        const missingOptionalImages = OPTIONAL_IMAGES
            .filter((image) => this.missingKeys.has(image.key))
            .map((image) => ({
                ...image,
                type: 'image',
                fallback: image.fallbackTexture ? `reuses "${image.fallbackTexture}"` : `programmatic placeholder (${image.placeholder.shape})`
            }));
        const missingAudio = AUDIO_ASSETS
            .filter((audio) => this.missingKeys.has(audio.key))
            .map((audio) => ({ ...audio, type: `audio (${audio.type})`, fallback: 'silent (playback skipped)' }));
        const missingFonts = FONT_ASSETS
            .filter((font) => this.missingKeys.has(font.key))
            .map((font) => ({ ...font, type: 'font', fallback: 'browser monospace font' }));

        return { missingRequired, missingOptional: [...missingOptionalImages, ...missingAudio, ...missingFonts] };
    }

    logReport() {
        const { missingRequired, missingOptional } = this.report;
        if (missingRequired.length === 0 && missingOptional.length === 0) {
            console.info('[AssetManager] All assets loaded.');
            return;
        }
        const toRow = (entry) => ({ key: entry.key, type: entry.type, path: `public/${entry.path}`, purpose: entry.purpose, fallback: entry.fallback });
        if (missingRequired.length > 0) {
            console.error('[AssetManager] Missing REQUIRED assets:');
            console.table(missingRequired.map(toRow));
        }
        if (missingOptional.length > 0) {
            console.warn(`[AssetManager] ${missingOptional.length} optional assets are missing (fallbacks in use):`);
            console.table(missingOptional.map(toRow));
        }
    }

    getReport() {
        return this.report;
    }
}

export const AssetManager = new AssetManagerClass();
