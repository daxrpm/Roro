import { shuffle } from '../utils/random.js';

export const INSPECTION_POINT_KIND = Object.freeze({
    HIDING_SPOT: 'hidingSpot',
    ROOM_SWEEP: 'roomSweep'
});

/**
 * Construye y conserva las rutas de inspeccion del detective.
 *
 * Los datos fijan puntos por categoria y barridos de la primera ronda. Solo se
 * aleatoriza el ORDEN: primero habitaciones y despues sus puntos. Cada punto se
 * valida como alcanzable antes de iniciar la ronda, de modo que el orden cambia
 * conservando rutas validas.
 *
 * Logica independiente de Phaser para probarla en Node.
 *
 */
export class InspectionManager {
    /**
     * @param {object} config
     * @param {Array} config.routes INSPECTION_ROUTES
     * @param {Array} config.sweepPoints ROOM_SWEEP_POINTS
     * @param {Array<import('../objects/HidingSpot.js').HidingSpot>} config.hidingSpots
     * @param {import('../world/ApartmentLayout.js').ApartmentLayout} config.layout
     * @param {import('../physics/NavigationManager.js').NavigationManager} config.navigation
     * @param {{x:number,y:number}} config.originTile tile de origen para comprobar accesibilidad
     * @param {Function} [config.random]
     */
    constructor({ routes, sweepPoints, hidingSpots, layout, navigation, originTile, random = Math.random }) {
        this.routes = routes;
        this.sweepPoints = sweepPoints;
        this.hidingSpots = hidingSpots;
        this.layout = layout;
        this.navigation = navigation;
        this.originTile = originTile;
        this.random = random;

        this.routeIndex = -1;
        this.points = [];
        this.pointIndex = 0;
        this.skippedPoints = [];
    }

    /** Puntos candidatos de una ruta antes de ordenarlos. */
    collectRoutePoints(route) {
        const points = this.hidingSpots
            .filter((spot) => spot.category === route.category)
            .map((spot) => ({
                id: `${route.id}-${spot.id}`,
                kind: INSPECTION_POINT_KIND.HIDING_SPOT,
                room: spot.room,
                tile: spot.inspectTile,
                position: this.layout.tileCenter(spot.inspectTile),
                hidingSpot: spot,
                lookRadius: route.lookRadius,
                label: spot.name
            }));

        if (route.includeRoomSweeps) {
            for (const sweep of this.sweepPoints) {
                points.push({
                    id: `${route.id}-${sweep.id}`,
                    kind: INSPECTION_POINT_KIND.ROOM_SWEEP,
                    room: sweep.room,
                    tile: sweep.tile,
                    position: this.layout.tileCenter(sweep.tile),
                    hidingSpot: null,
                    lookRadius: sweep.lookRadius ?? route.lookRadius,
                    label: `the ${this.layout.getRoom(sweep.room)?.name.toLowerCase() ?? sweep.room}`
                });
            }
        }

        return points;
    }

    /** Agrupa puntos por habitacion y baraja tanto habitaciones como puntos internos. */
    orderPoints(points) {
        const byRoom = new Map();
        for (const point of points) {
            if (!byRoom.has(point.room)) {
                byRoom.set(point.room, []);
            }
            byRoom.get(point.room).push(point);
        }
        const roomOrder = shuffle([...byRoom.keys()], this.random);
        return roomOrder.flatMap((room) => shuffle(byRoom.get(room), this.random));
    }

    startRoute(routeIndex) {
        if (routeIndex < 0 || routeIndex >= this.routes.length) {
            throw new Error(`Invalid inspection route index ${routeIndex}.`);
        }
        this.routeIndex = routeIndex;
        const route = this.routes[routeIndex];
        const candidates = this.collectRoutePoints(route);
        const reachable = candidates.filter((point) => this.navigation.isReachable(this.originTile, point.tile));
        this.skippedPoints.push(...candidates.filter((point) => !reachable.includes(point)));
        this.points = this.orderPoints(reachable);
        this.pointIndex = 0;
        return this.points;
    }

    getRoute() {
        return this.routes[this.routeIndex] ?? null;
    }

    getRouteNumber() {
        return this.routeIndex + 1;
    }

    getRouteCount() {
        return this.routes.length;
    }

    getCurrentPoint() {
        return this.points[this.pointIndex] ?? null;
    }

    /** Marca el punto actual como inspeccionado y avanza al siguiente. */
    completeCurrentPoint() {
        const point = this.getCurrentPoint();
        point?.hidingSpot?.markInspected();
        this.pointIndex += 1;
        return point;
    }

    isRouteComplete() {
        return this.pointIndex >= this.points.length;
    }

    hasNextRoute() {
        return this.routeIndex + 1 < this.routes.length;
    }

    getProgress() {
        return {
            routeNumber: this.getRouteNumber(),
            routeCount: this.getRouteCount(),
            routeName: this.getRoute()?.name ?? '',
            pointsDone: Math.min(this.pointIndex, this.points.length),
            pointCount: this.points.length
        };
    }
}
