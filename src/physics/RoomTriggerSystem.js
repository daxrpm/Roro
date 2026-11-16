/**
 * Deteccion de habitaciones mediante zonas de superposicion de Arcade Physics.
 *
 * Cada habitacion y puerta tiene una zona estatica invisible. Los callbacks de
 * overlap registran las zonas que tocan los pies durante el paso fisico; la escena
 * consulta la ubicacion resultante.
 *
 * Un umbral pertenece a las dos habitaciones conectadas, por lo que ambas se
 * revelan mientras Roro esta en el.
 */
export class RoomTriggerSystem {
    /**
     * @param {Phaser.Scene} scene
     * @param {import('../world/ApartmentLayout.js').ApartmentLayout} layout
     */
    constructor(scene, layout) {
        this.scene = scene;
        this.layout = layout;
        this.triggers = scene.physics.add.staticGroup();
        this.tracked = new Map();

        for (const room of layout.rooms) {
            this.createTrigger(layout.rectToWorld(room.rect), { roomId: room.id, doorId: null, rooms: [room.id] });
        }
        for (const door of layout.doors) {
            this.createTrigger(layout.rectToWorld(door.rect), { roomId: null, doorId: door.id, rooms: door.rooms });
        }
    }

    createTrigger(rect, location) {
        const zone = this.scene.add.zone(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height);
        zone.setData('location', location);
        this.triggers.add(zone);
        zone.body.updateFromGameObject();
    }

    /** Registra un personaje; las superposiciones se recogen en cada paso fisico. */
    track(character, initialPosition) {
        const entry = {
            hits: [],
            location: this.layout.getLocationAt(initialPosition.x, initialPosition.y)
        };
        this.tracked.set(character, entry);
        this.scene.physics.add.overlap(character, this.triggers, (_character, zone) => {
            entry.hits.push(zone.getData('location'));
        });
    }

    /**
     * Resuelve ubicacion con las superposiciones desde la ultima llamada. Las puertas
     * tienen prioridad porque revelan ambas habitaciones. Si no hubo paso fisico,
     * conserva la ubicacion anterior.
     */
    update() {
        for (const entry of this.tracked.values()) {
            if (entry.hits.length === 0) {
                continue;
            }
            entry.location = entry.hits.find((hit) => hit.doorId) ?? entry.hits[0];
            entry.hits.length = 0;
        }
    }

    getLocation(character) {
        return this.tracked.get(character)?.location ?? { roomId: null, doorId: null, rooms: [] };
    }
}
