/**
 * Navegacion A* sobre la grilla transitable del departamento.
 * ApartmentLayout.isWalkable excluye paredes, vacio y muebles solidos. Las puertas
 * son transitables porque el detective las abre al llegar.
 *
 * Hay ocho direcciones; las diagonales exigen ambos vecinos ortogonales libres
 * para no atravesar esquinas.
 *
 * La ruta se suaviza con una comprobacion conservadora de paso libre, permitiendo
 * tramos rectos cuando es seguro.
 *
 * No depende de Phaser y se verifica con npm test.
 */

const DIAGONAL_COST = Math.SQRT2;

const NEIGHBOURS = [
    { x: 1, y: 0, cost: 1 },
    { x: -1, y: 0, cost: 1 },
    { x: 0, y: 1, cost: 1 },
    { x: 0, y: -1, cost: 1 },
    { x: 1, y: 1, cost: DIAGONAL_COST },
    { x: 1, y: -1, cost: DIAGONAL_COST },
    { x: -1, y: 1, cost: DIAGONAL_COST },
    { x: -1, y: -1, cost: DIAGONAL_COST }
];

/** Monticulo binario minimo por priority, usado como conjunto abierto de A*. */
class MinHeap {
    constructor() {
        this.items = [];
    }

    get size() {
        return this.items.length;
    }

    push(value, priority) {
        this.items.push({ value, priority });
        let index = this.items.length - 1;
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (this.items[parent].priority <= this.items[index].priority) {
                break;
            }
            [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
            index = parent;
        }
    }

    pop() {
        const top = this.items[0];
        const last = this.items.pop();
        if (this.items.length > 0) {
            this.items[0] = last;
            let index = 0;
            for (;;) {
                const left = index * 2 + 1;
                const right = left + 1;
                let smallest = index;
                if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
                if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
                if (smallest === index) break;
                [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
                index = smallest;
            }
        }
        return top.value;
    }
}

export class NavigationManager {
    /**
     * @param {import('../world/ApartmentLayout.js').ApartmentLayout} layout
     * @param {object} [options]
     * @param {number} [options.clearance] mitad del tamano del cuerpo movil en pixeles,
     *   usada al suavizar rutas para mantener distancia segura de obstaculos.
     */
    constructor(layout, options = {}) {
        this.layout = layout;
        this.clearance = options.clearance ?? 10;
        // Tiles bloqueados temporalmente, identificados por la clave x,y.
        this.temporarilyBlocked = new Set();
    }

    setTemporarilyBlocked(tile, blocked) {
        const key = `${tile.x},${tile.y}`;
        if (blocked) {
            this.temporarilyBlocked.add(key);
        } else {
            this.temporarilyBlocked.delete(key);
        }
    }

    isWalkable(x, y) {
        return this.layout.isWalkable(x, y) && !this.temporarilyBlocked.has(`${x},${y}`);
    }

    /** Devuelve el tile transitable mas cercano a tile mediante busqueda en anchura. */
    findNearestWalkable(tile, maxDistance = 6) {
        if (this.isWalkable(tile.x, tile.y)) {
            return { x: tile.x, y: tile.y };
        }
        const visited = new Set([`${tile.x},${tile.y}`]);
        let frontier = [tile];
        for (let distance = 0; distance < maxDistance; distance++) {
            const next = [];
            for (const current of frontier) {
                for (const offset of NEIGHBOURS.slice(0, 4)) {
                    const candidate = { x: current.x + offset.x, y: current.y + offset.y };
                    const key = `${candidate.x},${candidate.y}`;
                    if (visited.has(key) || !this.layout.inBounds(candidate.x, candidate.y)) {
                        continue;
                    }
                    visited.add(key);
                    if (this.isWalkable(candidate.x, candidate.y)) {
                        return candidate;
                    }
                    next.push(candidate);
                }
            }
            frontier = next;
        }
        return null;
    }

    /**
     * Busqueda A* entre dos tiles.
     * @returns {Array<{x:number,y:number}>|null} ruta de tiles que incluye inicio y destino.
     */
    findTilePath(startTile, goalTile) {
        const start = this.findNearestWalkable(startTile);
        const goal = this.findNearestWalkable(goalTile);
        if (!start || !goal) {
            return null;
        }

        const width = this.layout.width;
        const toIndex = (x, y) => y * width + x;
        const goalIndex = toIndex(goal.x, goal.y);
        const costSoFar = new Map([[toIndex(start.x, start.y), 0]]);
        const cameFrom = new Map();
        const closed = new Set();
        const open = new MinHeap();
        const heuristic = (x, y) => {
            const dx = Math.abs(x - goal.x);
            const dy = Math.abs(y - goal.y);
            return (dx + dy) + (DIAGONAL_COST - 2) * Math.min(dx, dy);
        };

        open.push(start, heuristic(start.x, start.y));

        while (open.size > 0) {
            const current = open.pop();
            const currentIndex = toIndex(current.x, current.y);
            if (currentIndex === goalIndex) {
                return this.reconstructPath(cameFrom, current, toIndex);
            }
            if (closed.has(currentIndex)) {
                continue;
            }
            closed.add(currentIndex);

            for (const offset of NEIGHBOURS) {
                const nextX = current.x + offset.x;
                const nextY = current.y + offset.y;
                if (!this.isWalkable(nextX, nextY)) {
                    continue;
                }
                // Impide atravesar esquinas al moverse en diagonal.
                if (offset.x !== 0 && offset.y !== 0 &&
                    (!this.isWalkable(current.x + offset.x, current.y) || !this.isWalkable(current.x, current.y + offset.y))) {
                    continue;
                }
                const nextIndex = toIndex(nextX, nextY);
                const newCost = costSoFar.get(currentIndex) + offset.cost;
                if (!costSoFar.has(nextIndex) || newCost < costSoFar.get(nextIndex)) {
                    costSoFar.set(nextIndex, newCost);
                    cameFrom.set(nextIndex, current);
                    open.push({ x: nextX, y: nextY }, newCost + heuristic(nextX, nextY));
                }
            }
        }

        return null;
    }

    reconstructPath(cameFrom, goal, toIndex) {
        const path = [goal];
        let current = goal;
        while (cameFrom.has(toIndex(current.x, current.y))) {
            current = cameFrom.get(toIndex(current.x, current.y));
            path.unshift(current);
        }
        return path;
    }

    /**
     * Ruta entre posiciones del mundo usando centros de tiles. Conserva el inicio
     * exacto como primer punto solo si el suavizado no puede omitirlo. Devuelve null
     * si no se alcanza el destino.
     */
    findWorldPath(fromWorld, toWorld) {
        const startTile = this.layout.worldToTile(fromWorld.x, fromWorld.y);
        const goalTile = this.layout.worldToTile(toWorld.x, toWorld.y);
        const tilePath = this.findTilePath(startTile, goalTile);
        if (!tilePath) {
            return null;
        }

        const points = tilePath.map((tile) => this.layout.tileCenter(tile));
        // Reemplaza el primer centro de tile por la posicion inicial exacta para
        // que el personaje no retroceda al centro de la celda donde ya se encuentra.
        points[0] = { x: fromWorld.x, y: fromWorld.y };
        return this.smoothPath(points);
    }

    /** Quita puntos intermedios cuando existe un segmento recto libre. */
    smoothPath(points) {
        if (points.length <= 2) {
            return points.slice(1).length ? points.slice(1) : points;
        }
        const result = [];
        let anchor = points[0];
        let index = 1;
        while (index < points.length) {
            let farthest = index;
            for (let candidate = points.length - 1; candidate > index; candidate--) {
                if (this.hasClearLine(anchor, points[candidate])) {
                    farthest = candidate;
                    break;
                }
            }
            result.push(points[farthest]);
            anchor = points[farthest];
            index = farthest + 1;
        }
        return result;
    }

    /** Comprobacion conservadora: las esquinas del cuerpo permanecen en tiles transitables. */
    hasClearLine(from, to) {
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.ceil(distance / 4));
        const clearance = this.clearance;
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            for (const [cornerX, cornerY] of [[x - clearance, y - clearance], [x + clearance, y - clearance], [x - clearance, y + clearance], [x + clearance, y + clearance]]) {
                const tile = this.layout.worldToTile(cornerX, cornerY);
                if (!this.isWalkable(tile.x, tile.y)) {
                    return false;
                }
            }
        }
        return true;
    }

    /** Devuelve true si puede llegarse a toTile desde fromTile. */
    isReachable(fromTile, toTile) {
        return this.findTilePath(fromTile, toTile) !== null;
    }
}
