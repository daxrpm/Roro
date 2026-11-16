/**
 * Regiones de interiors_demo.png (256 x 176, Pixel Lands Interiors de Trislin).
 *
 * La imagen no es una grilla uniforme: cada mueble tiene su propio tamano. Los
 * rectangulos ajustan los limites de cada pieza, medidos sobre la imagen real en
 * pixeles originales.
 */
export const TILESET_KEY = 'interiors';

export const FURNITURE_FRAMES = Object.freeze({
    window: { x: 103, y: 9, w: 18, h: 18 },
    armchairFront: { x: 130, y: 2, w: 28, h: 30 },
    armchairRight: { x: 161, y: 0, w: 23, h: 32 },
    armchairBack: { x: 194, y: 7, w: 28, h: 25 },
    armchairLeft: { x: 232, y: 0, w: 23, h: 32 },
    rugBlue: { x: 80, y: 53, w: 32, h: 22 },
    wardrobe: { x: 116, y: 58, w: 24, h: 22 },
    nightstand: { x: 144, y: 44, w: 16, h: 20 },
    cabinetSmall: { x: 160, y: 44, w: 16, h: 20 },
    stool: { x: 145, y: 64, w: 14, h: 16 },
    bedDouble: { x: 177, y: 37, w: 46, h: 59 },
    bedSingle: { x: 225, y: 37, w: 30, h: 59 },
    rugRed: { x: 81, y: 81, w: 46, h: 46 },
    chairGreenFront: { x: 128, y: 97, w: 16, h: 31 },
    chairGreenRight: { x: 144, y: 97, w: 16, h: 31 },
    chairGreenBack: { x: 160, y: 98, w: 16, h: 30 },
    chairGreenLeft: { x: 176, y: 97, w: 16, h: 31 },
    tableSmall: { x: 196, y: 103, w: 24, h: 25 },
    plantTall: { x: 224, y: 97, w: 16, h: 31 },
    kettle: { x: 244, y: 99, w: 9, h: 9 },
    flowerPot: { x: 242, y: 114, w: 10, h: 14 },
    sofaFront: { x: 0, y: 130, w: 47, h: 30 },
    sofaSide: { x: 49, y: 128, w: 23, h: 48 },
    sofaBack: { x: 80, y: 135, w: 47, h: 25 },
    armchairTallSide: { x: 136, y: 128, w: 23, h: 48 },
    bookshelf: { x: 160, y: 128, w: 32, h: 44 },
    tableLarge: { x: 192, y: 137, w: 48, h: 39 },
    plantSmall: { x: 242, y: 130, w: 11, h: 14 },
    pictureA: { x: 240, y: 145, w: 16, h: 14 },
    pictureB: { x: 240, y: 161, w: 16, h: 14 },
    bookOpen: { x: 98, y: 166, w: 13, h: 9 },
    bookBlue: { x: 114, y: 164, w: 11, h: 11 }
});

/**
 * Indices de tiles de 16 x 16 en la imagen (fila * 16 + columna), usados por las
 * capas tilemap de Phaser para pisos y caras de pared.
 */
export const TILE_INDEX = Object.freeze({
    floorWood: 2 * 16 + 7,
    floorStone: 2 * 16 + 6,
    // Paneles de pared de 3 x 3: papel azul en columnas 0 a 2 y piedra en 3 a 5.
    // La columna central se repite horizontalmente. Fila superior: moldura; inferior: zocalo.
    wallBlueUpper: 0 * 16 + 1,
    wallBlueLower: 2 * 16 + 1,
    wallStoneUpper: 0 * 16 + 4,
    wallStoneLower: 2 * 16 + 4
});

export const WALL_STYLES = Object.freeze({
    blue: { upper: TILE_INDEX.wallBlueUpper, lower: TILE_INDEX.wallBlueLower },
    stone: { upper: TILE_INDEX.wallStoneUpper, lower: TILE_INDEX.wallStoneLower }
});

export const FLOOR_STYLES = Object.freeze({
    wood: TILE_INDEX.floorWood,
    stone: TILE_INDEX.floorStone
});
