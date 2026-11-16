import { TILE_SIZE } from '../data/gameConfig.js';
import {
    APARTMENT_BOUNDS,
    DOORS,
    FURNITURE,
    GRID_HEIGHT,
    GRID_WIDTH,
    ROOMS
} from '../data/apartmentData.js';

export const CELL_TYPE = Object.freeze({
    VOID: 0,
    WALL: 1,
    FLOOR: 2,
    DOOR: 3
});

// Un collider de mueble debe superponerse a un tile mas que este margen en
// ambos ejes para bloquear esa celda en la grilla de navegacion.
const NAVIGATION_BLOCK_MARGIN = 4;

/**
 * Modelo puro del departamento construido desde apartmentData.js.
 *
 * Responde consultas espaciales sobre habitaciones, tiles transitables y paredes
 * para dibujo, colisiones, navegacion y visibilidad. No depende de Phaser.
 *
 */
export class ApartmentLayout {
    constructor(data = { GRID_WIDTH, GRID_HEIGHT, APARTMENT_BOUNDS, ROOMS, DOORS, FURNITURE }) {
        this.width = data.GRID_WIDTH;
        this.height = data.GRID_HEIGHT;
        this.tileSize = TILE_SIZE;
        this.rooms = data.ROOMS;
        this.doors = data.DOORS;
        this.furniture = data.FURNITURE;

        this.roomsById = new Map(this.rooms.map((room) => [room.id, room]));
        this.cells = new Uint8Array(this.width * this.height);
        this.roomAtCell = new Array(this.width * this.height).fill(null);
        this.doorAtCell = new Array(this.width * this.height).fill(null);
        this.furnitureBlocked = new Uint8Array(this.width * this.height);

        this.buildCells(data.APARTMENT_BOUNDS);
        this.furnitureColliders = this.buildFurnitureColliders();
        this.markFurnitureBlockedCells();
    }

    // ---------------------------------------------------------------- construccion

    buildCells(bounds) {
        this.fillRect(bounds, CELL_TYPE.WALL);

        for (const room of this.rooms) {
            this.forEachCellInRect(room.rect, (x, y) => {
                this.setCell(x, y, CELL_TYPE.FLOOR);
                this.roomAtCell[this.index(x, y)] = room.id;
            });
        }

        for (const door of this.doors) {
            this.forEachCellInRect(door.rect, (x, y) => {
                this.setCell(x, y, CELL_TYPE.DOOR);
                this.doorAtCell[this.index(x, y)] = door.id;
            });
        }
    }

    buildFurnitureColliders() {
        const colliders = [];
        for (const item of this.furniture) {
            if (!item.collider) {
                continue;
            }
            colliders.push({
                id: item.id,
                x: (item.x + item.collider.x) * this.tileSize,
                y: (item.y + item.collider.y) * this.tileSize,
                width: item.collider.w * this.tileSize,
                height: item.collider.h * this.tileSize
            });
        }
        return colliders;
    }

    markFurnitureBlockedCells() {
        for (const collider of this.furnitureColliders) {
            const firstX = Math.floor(collider.x / this.tileSize);
            const lastX = Math.floor((collider.x + collider.width) / this.tileSize);
            const firstY = Math.floor(collider.y / this.tileSize);
            const lastY = Math.floor((collider.y + collider.height) / this.tileSize);

            for (let y = firstY; y <= lastY; y++) {
                for (let x = firstX; x <= lastX; x++) {
                    if (!this.inBounds(x, y)) {
                        continue;
                    }
                    const overlapX = Math.min(collider.x + collider.width, (x + 1) * this.tileSize) - Math.max(collider.x, x * this.tileSize);
                    const overlapY = Math.min(collider.y + collider.height, (y + 1) * this.tileSize) - Math.max(collider.y, y * this.tileSize);
                    if (overlapX > NAVIGATION_BLOCK_MARGIN && overlapY > NAVIGATION_BLOCK_MARGIN) {
                        this.furnitureBlocked[this.index(x, y)] = 1;
                    }
                }
            }
        }
    }

    forEachCellInRect(rect, callback) {
        for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
                if (this.inBounds(x, y)) {
                    callback(x, y);
                }
            }
        }
    }

    fillRect(rect, type) {
        this.forEachCellInRect(rect, (x, y) => this.setCell(x, y, type));
    }

    // ---------------------------------------------------------------- consultas

    index(x, y) {
        return y * this.width + x;
    }

    inBounds(x, y) {
        return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }

    setCell(x, y, type) {
        if (this.inBounds(x, y)) {
            this.cells[this.index(x, y)] = type;
        }
    }

    getCell(x, y) {
        return this.inBounds(x, y) ? this.cells[this.index(x, y)] : CELL_TYPE.VOID;
    }

    isWall(x, y) {
        return this.getCell(x, y) === CELL_TYPE.WALL;
    }

    /** Transitable: piso o puerta sin bloqueo por muebles. */
    isWalkable(x, y) {
        const cell = this.getCell(x, y);
        return (cell === CELL_TYPE.FLOOR || cell === CELL_TYPE.DOOR) && !this.furnitureBlocked[this.index(x, y)];
    }

    getRoomIdAtTile(x, y) {
        return this.inBounds(x, y) ? this.roomAtCell[this.index(x, y)] : null;
    }

    getDoorIdAtTile(x, y) {
        return this.inBounds(x, y) ? this.doorAtCell[this.index(x, y)] : null;
    }

    getRoom(roomId) {
        return this.roomsById.get(roomId) ?? null;
    }

    getDoor(doorId) {
        return this.doors.find((door) => door.id === doorId) ?? null;
    }

    worldToTile(worldX, worldY) {
        return { x: Math.floor(worldX / this.tileSize), y: Math.floor(worldY / this.tileSize) };
    }

    tileCenter(tile) {
        return { x: (tile.x + 0.5) * this.tileSize, y: (tile.y + 0.5) * this.tileSize };
    }

    /** Convierte un punto fraccionario de tiles, como los de apartmentData, a pixeles. */
    tilePointToWorld(point) {
        return { x: point.x * this.tileSize, y: point.y * this.tileSize };
    }

    rectToWorld(rect) {
        return {
            x: rect.x * this.tileSize,
            y: rect.y * this.tileSize,
            width: rect.w * this.tileSize,
            height: rect.h * this.tileSize
        };
    }

    /**
     * Ubicacion de un punto mundo: id de habitacion y, dentro de un umbral, id de
     * puerta y sus dos habitaciones conectadas.
     */
    getLocationAt(worldX, worldY) {
        const tile = this.worldToTile(worldX, worldY);
        const doorId = this.getDoorIdAtTile(tile.x, tile.y);
        if (doorId) {
            return { roomId: null, doorId, rooms: this.getDoor(doorId).rooms };
        }
        const roomId = this.getRoomIdAtTile(tile.x, tile.y);
        return { roomId, doorId: null, rooms: roomId ? [roomId] : [] };
    }

    /**
     * Rectangulo visible de una habitacion: piso y paredes circundantes, con dos tiles
     * adicionales arriba para la cara visible de pared.
     */
    getRoomVisibleRect(roomId) {
        const room = this.getRoom(roomId);
        if (!room) {
            return null;
        }
        return this.rectToWorld({
            x: room.rect.x - 1,
            y: room.rect.y - 2,
            w: room.rect.w + 2,
            h: room.rect.h + 3
        });
    }

    /** Habitaciones conectadas directamente con roomId mediante una puerta. */
    getConnectedRooms(roomId) {
        const connected = new Set();
        for (const door of this.doors) {
            if (door.rooms.includes(roomId)) {
                door.rooms.filter((other) => other !== roomId).forEach((other) => connected.add(other));
            }
        }
        return [...connected];
    }

    /**
     * Fusiona celdas de pared en rectangulos del mundo para crear menos cuerpos
     * estaticos grandes en lugar de uno por tile.
     */
    getWallRectangles() {
        const rowRuns = [];
        for (let y = 0; y < this.height; y++) {
            let x = 0;
            while (x < this.width) {
                if (!this.isWall(x, y)) {
                    x++;
                    continue;
                }
                const start = x;
                while (x < this.width && this.isWall(x, y)) {
                    x++;
                }
                rowRuns.push({ x: start, y, w: x - start, h: 1 });
            }
        }

        // Fusiona tramos con igual extension horizontal en filas consecutivas.
        const merged = [];
        for (const run of rowRuns) {
            const previous = merged.find((rect) => rect.x === run.x && rect.w === run.w && rect.y + rect.h === run.y);
            if (previous) {
                previous.h += 1;
            } else {
                merged.push({ ...run });
            }
        }

        return merged.map((rect) => this.rectToWorld(rect));
    }

    /** Tamano total del mundo en pixeles. */
    getWorldSize() {
        return { width: this.width * this.tileSize, height: this.height * this.tileSize };
    }
}
