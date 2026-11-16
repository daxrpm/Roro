/**
 * Catalogo central de claves, rutas y opciones de procesamiento de recursos.
 * Las rutas son relativas a public/, servido por Vite desde la raiz. Este modulo
 * solo declara datos y tambien puede importarse desde scripts de Node, como
 * scripts/check-assets.mjs.
 * Categorias:
 * REQUIRED: imagenes necesarias para la apariencia prevista del juego.
 *
 * OPTIONAL: imagenes que admiten una figura provisional o textura de respaldo
 * hasta agregar el archivo en path.
 *
 * AUDIO: sonidos declarados; si alguno falta, su reproduccion se omite sin
 * interrumpir la partida.
 */

// Colores del fondo opaco incluido en los PNG recortados de personajes
// y objetos. Se eliminan al cargar, sin modificar los archivos del disco.
const CROPPED_BACKGROUND_COLORS = [
    [34, 34, 38],
    [46, 46, 50],
    [3, 3, 15]
];

const CHARACTER_DIRECTIONS = ['front', 'back', 'side'];
const WALK_FRAME_COUNT = 3;

/**
 * Construye la lista de cuadros de un personaje almacenado en:
 * characters/<name>/idle/<dir>.png
 * characters/<name>/walk/<dir>/<dir>_walk00<n>.png
 */
function characterFrames(name) {
    const processing = {
        removeBackground: CROPPED_BACKGROUND_COLORS,
        // Las imagenes originales estan ampliadas por 3; el mundo usa escala 2.
        scale: 2 / 3,
        // Todos los cuadros de un personaje comparten el mismo tamano de lienzo
        // para mantener el cuerpo fisico alineado con los pies en cada cuadro.
        normalizeGroup: name
    };
    const frames = [];

    for (const direction of CHARACTER_DIRECTIONS) {
        frames.push({
            key: `${name}-idle-${direction}`,
            path: `assets/characters/${name}/idle/${direction}.png`,
            purpose: `${name} idle (${direction})`,
            processing
        });

        for (let index = 1; index <= WALK_FRAME_COUNT; index++) {
            frames.push({
                key: `${name}-walk-${direction}-${index}`,
                path: `assets/characters/${name}/walk/${direction}/${direction}_walk${String(index).padStart(3, '0')}.png`,
                purpose: `${name} walk (${direction}) frame ${index}`,
                processing
            });
        }
    }

    return frames;
}

function croppedObject(key, path, purpose, targetHeight) {
    return {
        key,
        path,
        purpose,
        processing: { removeBackground: CROPPED_BACKGROUND_COLORS, targetHeight }
    };
}

export const REQUIRED_IMAGES = [
    {
        key: 'interiors',
        path: 'assets/environment/tilesets/interiors_demo.png',
        purpose: 'Interior tileset: floors, walls and furniture'
    },
    ...characterFrames('roro'),
    ...characterFrames('detective'),
    croppedObject('item-globe', 'assets/objects/victim_belongings/compass.png', 'Victim belonging: desk globe', 30),
    croppedObject('item-stars', 'assets/objects/victim_belongings/star.png', 'Victim belonging: star ornaments', 18),
    croppedObject('item-lamp', 'assets/objects/victim_belongings/lamp.png', 'Victim belonging: blue lamp', 26),
    croppedObject('item-map', 'assets/objects/victim_belongings/art.png', 'Victim belonging: framed map', 24),
    croppedObject('item-bat', 'assets/objects/evidence/baseball_bat.png', 'Murder weapon: baseball bat', 10),
    croppedObject('item-note', 'assets/objects/evidence/victim_note.png', 'Victim note (small, in the world)', 18),
    {
        key: 'ui-note-paper',
        path: 'assets/objects/evidence/name_victim.png',
        purpose: 'Enlarged paper used by the note interface',
        processing: { removeBackground: CROPPED_BACKGROUND_COLORS }
    }
];

/**
 * Imagenes opcionales con respaldo. placeholder describe la figura provisional en
 * pixeles del mundo; fallbackTexture reutiliza una textura existente.
 */
export const OPTIONAL_IMAGES = [
    {
        key: 'door-closed',
        path: 'assets/environment/objects/door_closed.png',
        purpose: 'Interior/front door (closed)',
        placeholder: { width: 64, height: 64, shape: 'door', color: 0x7a4b2a }
    },
    {
        key: 'door-open',
        path: 'assets/environment/objects/door_open.png',
        purpose: 'Interior/front door (open)',
        placeholder: { width: 64, height: 64, shape: 'doorOpen', color: 0x7a4b2a }
    },
    {
        key: 'kitchen-counter',
        path: 'assets/environment/objects/kitchen_counter.png',
        purpose: 'Kitchen counter with cabinets (hiding place)',
        placeholder: { width: 96, height: 40, shape: 'counter', color: 0x8c6a4a }
    },
    {
        key: 'kitchen-stove',
        path: 'assets/environment/objects/kitchen_stove.png',
        purpose: 'Stove / oven (hiding place)',
        placeholder: { width: 32, height: 40, shape: 'stove', color: 0x6d6d78 }
    },
    {
        key: 'kitchen-sink',
        path: 'assets/environment/objects/kitchen_sink.png',
        purpose: 'Kitchen sink (decoration)',
        placeholder: { width: 32, height: 40, shape: 'sink', color: 0x8c6a4a }
    },
    {
        key: 'kitchen-fridge',
        path: 'assets/environment/objects/kitchen_fridge.png',
        purpose: 'Fridge (hiding place)',
        placeholder: { width: 40, height: 64, shape: 'fridge', color: 0xc9ccd4 }
    },
    {
        key: 'trash-bin',
        path: 'assets/environment/objects/trash_bin.png',
        purpose: 'Kitchen trash bin (hiding place)',
        placeholder: { width: 22, height: 28, shape: 'bin', color: 0x4f5a4f }
    },
    {
        key: 'bathroom-bathtub',
        path: 'assets/environment/objects/bathtub.png',
        purpose: 'Bathtub (hiding place)',
        placeholder: { width: 64, height: 104, shape: 'bathtub', color: 0xdfe6ea }
    },
    {
        key: 'bathroom-toilet',
        path: 'assets/environment/objects/toilet.png',
        purpose: 'Toilet (hiding place: cistern)',
        placeholder: { width: 28, height: 44, shape: 'toilet', color: 0xdfe6ea }
    },
    {
        key: 'bathroom-washbasin',
        path: 'assets/environment/objects/washbasin.png',
        purpose: 'Washbasin (hiding place: under the sink)',
        placeholder: { width: 32, height: 36, shape: 'washbasin', color: 0xdfe6ea }
    },
    {
        key: 'portrait-roro',
        path: 'assets/portraits/roro.png',
        purpose: 'Dialogue portrait for Roro',
        fallbackTexture: 'roro-idle-front'
    },
    {
        key: 'portrait-detective',
        path: 'assets/portraits/detective.png',
        purpose: 'Dialogue portrait for the detective',
        fallbackTexture: 'detective-idle-front'
    }
];

export const AUDIO_TYPE = Object.freeze({ MUSIC: 'music', SFX: 'sfx' });

export const AUDIO_ASSETS = [
    { key: 'music-ambience', path: 'assets/sounds/suspenseful.mp3', type: AUDIO_TYPE.MUSIC, purpose: 'Background ambience (gameplay)' },
    { key: 'music-menu', path: 'assets/sounds/menu_sound.mp3', type: AUDIO_TYPE.MUSIC, purpose: 'Menu music' },
    { key: 'music-rest', path: 'assets/sounds/rest_sound.mp3', type: AUDIO_TYPE.MUSIC, purpose: 'Music outside the main menu and active gameplay' },
    { key: 'sfx-step-roro', path: 'assets/sounds/footstep_roro.wav', type: AUDIO_TYPE.SFX, purpose: 'Roro footsteps' },
    { key: 'sfx-step-detective', path: 'assets/sounds/footstep_detective.wav', type: AUDIO_TYPE.SFX, purpose: 'Detective footsteps (location cue)' },
    { key: 'sfx-knock', path: 'assets/sounds/door_knock.wav', type: AUDIO_TYPE.SFX, purpose: 'Police knocking on the door' },
    { key: 'sfx-door-open', path: 'assets/sounds/door_open.wav', type: AUDIO_TYPE.SFX, purpose: 'Door opening' },
    { key: 'sfx-door-close', path: 'assets/sounds/door_close.wav', type: AUDIO_TYPE.SFX, purpose: 'Door closing' },
    { key: 'sfx-pickup', path: 'assets/sounds/item_pickup.wav', type: AUDIO_TYPE.SFX, purpose: 'Picking up or retrieving evidence' },
    { key: 'sfx-hide', path: 'assets/sounds/item_hide.wav', type: AUDIO_TYPE.SFX, purpose: 'Successfully hiding evidence' },
    { key: 'sfx-interact', path: 'assets/sounds/paper_rustle.wav', type: AUDIO_TYPE.SFX, purpose: 'Paper rustle when reading the note' },
    { key: 'sfx-kettle', path: 'assets/sounds/kettle_whistle.wav', type: AUDIO_TYPE.SFX, purpose: 'Kettle whistle (distraction)' },
    { key: 'sfx-ui', path: 'assets/sounds/ui_select.wav', type: AUDIO_TYPE.SFX, purpose: 'Menu selection' },
    { key: 'sfx-victory', path: 'assets/sounds/victory.wav', type: AUDIO_TYPE.SFX, purpose: 'Victory jingle' },
    { key: 'sfx-defeat', path: 'assets/sounds/defeat.wav', type: AUDIO_TYPE.SFX, purpose: 'Defeat sting' }
];

export const FONT_ASSETS = [
    { key: 'm6x11', path: 'assets/ui/fonts/m6x11.ttf', purpose: 'Pixel font used by all text' }
];
