import { COLORS, DEPTH, TILE_SIZE, TILE_SOURCE_SIZE, WORLD_SCALE } from '../data/gameConfig.js';
import { FURNITURE_LAYER } from '../data/apartmentData.js';
import { FLOOR_STYLES, TILESET_KEY, WALL_STYLES } from '../data/tilesetData.js';
import { CELL_TYPE } from './ApartmentLayout.js';

/**
 * Dibuja el departamento desde ApartmentLayout. CollisionManager crea la fisica
 * por separado, permitiendo sustituir los graficos.
 * Pisos y caras de pared usan capas tilemap de 16 x 16 escaladas por WORLD_SCALE.
 *
 * Las partes altas son rectangulos oscuros porque el tileset no incluye ese
 * detalle.
 *
 * Los muebles usan cuadros del tileset o texturas opcionales con figuras
 * provisionales como respaldo.
 */
export class ApartmentRenderer {
    constructor(scene, layout) {
        this.scene = scene;
        this.layout = layout;
        this.furnitureSprites = new Map();
    }

    build() {
        this.buildTileLayers();
        this.drawWallTops();
        this.buildFurniture();
        return this;
    }

    buildTileLayers() {
        const { scene, layout } = this;
        const map = scene.make.tilemap({
            tileWidth: TILE_SOURCE_SIZE,
            tileHeight: TILE_SOURCE_SIZE,
            width: layout.width,
            height: layout.height
        });
        const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SOURCE_SIZE, TILE_SOURCE_SIZE, 0, 0);
        const floorLayer = map.createBlankLayer('floor', tileset, 0, 0).setScale(WORLD_SCALE).setDepth(DEPTH.floor);
        const wallLayer = map.createBlankLayer('walls', tileset, 0, 0).setScale(WORLD_SCALE).setDepth(DEPTH.walls);

        for (let y = 0; y < layout.height; y++) {
            for (let x = 0; x < layout.width; x++) {
                const cell = layout.getCell(x, y);
                if (cell === CELL_TYPE.FLOOR) {
                    floorLayer.putTileAt(this.floorTileFor(layout.getRoomIdAtTile(x, y)), x, y);
                } else if (cell === CELL_TYPE.DOOR) {
                    // Los umbrales usan el piso de la habitacion situada debajo.
                    floorLayer.putTileAt(this.floorTileFor(this.roomBelow(x, y)), x, y);
                } else if (cell === CELL_TYPE.WALL) {
                    const faceTile = this.wallFaceTile(x, y);
                    if (faceTile !== null) {
                        wallLayer.putTileAt(faceTile, x, y);
                    }
                }
            }
        }
        this.map = map;
    }

    floorTileFor(roomId) {
        const room = this.layout.getRoom(roomId);
        return FLOOR_STYLES[room?.floor ?? 'wood'];
    }

    roomBelow(x, y) {
        for (let offset = 0; offset < 4; offset++) {
            const roomId = this.layout.getRoomIdAtTile(x, y + offset);
            if (roomId) {
                return roomId;
            }
        }
        return null;
    }

    /**
     * Las paredes con suelo debajo muestran una cara de dos tiles: inferior justo
     * sobre el piso y superior encima de aquel. Devuelve null para paredes vistas
     * desde arriba.
     */
    wallFaceTile(x, y) {
        const isOpenBelow = (tileX, tileY) => {
            const cell = this.layout.getCell(tileX, tileY);
            return cell === CELL_TYPE.FLOOR || cell === CELL_TYPE.DOOR;
        };
        if (isOpenBelow(x, y + 1)) {
            return this.wallStyleFor(x, y + 1).lower;
        }
        if (this.layout.isWall(x, y + 1) && isOpenBelow(x, y + 2)) {
            return this.wallStyleFor(x, y + 2).upper;
        }
        return null;
    }

    wallStyleFor(x, y) {
        const roomId = this.layout.getRoomIdAtTile(x, y) ?? this.roomBelow(x, y);
        const room = this.layout.getRoom(roomId);
        return WALL_STYLES[room?.wall ?? 'blue'];
    }

    drawWallTops() {
        const { layout } = this;
        const graphics = this.scene.add.graphics().setDepth(DEPTH.walls);
        for (let y = 0; y < layout.height; y++) {
            for (let x = 0; x < layout.width; x++) {
                if (!layout.isWall(x, y) || this.wallFaceTile(x, y) !== null) {
                    continue;
                }
                graphics.fillStyle(COLORS.wallTop, 1);
                graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                // Borde mas claro donde la parte alta de pared limita con una zona transitable.
                graphics.fillStyle(COLORS.wallTopEdge, 1);
                if (!layout.isWall(x - 1, y) && layout.getCell(x - 1, y) !== CELL_TYPE.VOID) {
                    graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, 3, TILE_SIZE);
                }
                if (!layout.isWall(x + 1, y) && layout.getCell(x + 1, y) !== CELL_TYPE.VOID) {
                    graphics.fillRect((x + 1) * TILE_SIZE - 3, y * TILE_SIZE, 3, TILE_SIZE);
                }
                if (!layout.isWall(x, y - 1) && layout.getCell(x, y - 1) !== CELL_TYPE.VOID) {
                    graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, 3);
                }
            }
        }
    }

    buildFurniture() {
        for (const item of this.layout.furniture) {
            const x = item.x * TILE_SIZE;
            const y = item.y * TILE_SIZE;
            let sprite;
            if (item.frame) {
                sprite = this.scene.add.image(x, y, TILESET_KEY, item.frame).setOrigin(0, 0).setScale(WORLD_SCALE);
            } else {
                sprite = this.scene.add.image(x, y, item.texture).setOrigin(0, 0)
                    .setDisplaySize(item.size.w * TILE_SIZE, item.size.h * TILE_SIZE);
            }
            sprite.setPosition(Math.round(x), Math.round(y));
            sprite.setDepth(this.depthFor(item, sprite));
            this.furnitureSprites.set(item.id, sprite);
        }
    }

    depthFor(item, sprite) {
        switch (item.layer) {
            case FURNITURE_LAYER.WALL:
                return DEPTH.walls + 1;
            case FURNITURE_LAYER.RUG:
                return DEPTH.rugs;
            default: {
                const support = item.stackedOn ? this.furnitureSprites.get(item.stackedOn) : null;
                if (support) {
                    return support.depth + 0.5;
                }
                // Ordena por borde inferior, como los pies de los personajes.
                return DEPTH.worldBase + sprite.y + sprite.displayHeight;
            }
        }
    }

    getFurnitureSprite(id) {
        return this.furnitureSprites.get(id) ?? null;
    }
}
