import { DETECTIVE_CONFIG, FONT_FAMILY } from '../data/gameConfig.js';
import { Character } from './Character.js';

/**
 * Cuerpo del detective: seguimiento de ruta, puertas, animacion y pasos.
 * DetectiveStateMachine decide destino y momento de buscar mediante:
 *
 * navigateTo, stop, getPosition, setSpeedMultiplier, faceTowards y setSearching.
 *
 * El movimiento no apunta directamente al destino final: sigue puntos A* de la
 * grilla transitable para rodear paredes y muebles y atravesar puertas.
 *
 */
export class Detective extends Character {
    /**
     * @param {Phaser.Scene} scene
     * @param {{x:number,y:number}} footPosition
     * @param {object} services
     * @param {import('../physics/NavigationManager.js').NavigationManager} services.navigation
     * @param {import('../world/ApartmentLayout.js').ApartmentLayout} services.layout
     * @param {(tile:{x:number,y:number}) => import('./Door.js').Door|null} services.getDoorAtTile
     */
    constructor(scene, footPosition, { navigation, layout, getDoorAtTile }) {
        super(scene, footPosition, 'detective', DETECTIVE_CONFIG);
        this.navigation = navigation;
        this.layout = layout;
        this.getDoorAtTile = getDoorAtTile;

        this.speedMultiplier = 1;
        this.path = [];
        this.target = null;
        this.callbacks = null;
        this.waitTimer = 0;
        this.retryTimer = 0;
        this.retryCount = 0;
        this.stuckTimer = 0;
        this.lastDistance = Infinity;
        this.isSearching = false;
        // Es false cuando las reglas de visibilidad ocultan al detective al jugador.
        this.visibleToPlayer = true;

        this.searchIndicator = scene.add.text(0, 0, '?', {
            fontFamily: FONT_FAMILY,
            fontSize: '16px',
            color: '#ffe08a',
            stroke: '#1a1420',
            strokeThickness: 4
        }).setOrigin(0.5, 1).setVisible(false);
        this.searchTween = null;
    }

    // ------------------------------------------------ interfaz de movimiento FSM

    getPosition() {
        return this.getFootPosition();
    }

    setSpeedMultiplier(multiplier) {
        this.speedMultiplier = multiplier;
    }

    /**
     * Calcula una ruta y empieza a seguirla. Reemplaza cualquier solicitud previa de
     * navegacion y descarta sus callbacks.
     */
    navigateTo(target, { onArrive, onFail } = {}) {
        this.target = { x: target.x, y: target.y };
        this.callbacks = { onArrive, onFail };
        this.retryCount = 0;
        this.computePath();
    }

    computePath() {
        const path = this.navigation.findWorldPath(this.getFootPosition(), this.target);
        if (!path) {
            // Destino temporalmente inaccesible: espera y vuelve a intentarlo.
            this.path = [];
            this.retryCount += 1;
            this.retryTimer = DETECTIVE_CONFIG.retryDelay;
            if (this.retryCount > DETECTIVE_CONFIG.maxPathRetries) {
                this.failNavigation();
            }
            return;
        }
        this.path = path;
        this.retryTimer = 0;
        this.stuckTimer = 0;
        this.lastDistance = Infinity;
    }

    stop() {
        this.path = [];
        this.target = null;
        this.callbacks = null;
        this.retryTimer = 0;
        this.body.setVelocity(0, 0);
        this.updateAnimation(0, 0);
    }

    setSearching(searching) {
        this.isSearching = searching;
        this.searchIndicator.setVisible(searching && this.visibleToPlayer);
        this.searchTween?.stop();
        this.searchTween = null;
        if (searching) {
            this.searchIndicator.setAlpha(1);
            this.searchTween = this.scene.tweens.add({
                targets: this.searchIndicator,
                alpha: 0.35,
                duration: 450,
                yoyo: true,
                repeat: -1
            });
        }
    }

    /** Muestra u oculta al detective segun la visibilidad de Normal o Dificil. */
    setVisibleToPlayer(visible) {
        if (visible === this.visibleToPlayer) {
            return;
        }
        this.visibleToPlayer = visible;
        this.setVisible(visible);
        this.searchIndicator.setVisible(this.isSearching && visible);
    }

    // ---------------------------------------------------------------- avance

    update(delta) {
        this.followPath(delta);
        this.updateFootsteps(delta);
        this.searchIndicator.setPosition(Math.round(this.x), Math.round(this.y - this.height + 6));
        this.searchIndicator.setDepth(this.depth + 1);
    }

    followPath(delta) {
        if (this.waitTimer > 0) {
            this.waitTimer -= delta;
            this.body.setVelocity(0, 0);
            this.updateAnimation(0, 0);
            return;
        }

        if (this.retryTimer > 0 && this.target) {
            this.retryTimer -= delta;
            if (this.retryTimer <= 0) {
                this.computePath();
            }
            return;
        }

        if (!this.target || this.path.length === 0) {
            if (this.target && this.path.length === 0 && this.retryTimer <= 0) {
                this.arrive();
            }
            return;
        }

        const position = this.getFootPosition();
        const waypoint = this.path[0];
        const dx = waypoint.x - position.x;
        const dy = waypoint.y - position.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= DETECTIVE_CONFIG.arriveThreshold) {
            this.path.shift();
            this.lastDistance = Infinity;
            if (this.path.length === 0) {
                this.placeAtFoot(waypoint);
                this.arrive();
            }
            return;
        }

        if (this.openDoorAhead(position, dx / distance, dy / distance)) {
            return;
        }

        const speed = DETECTIVE_CONFIG.speed * this.speedMultiplier;
        // Limita el movimiento para no sobrepasar el punto en un solo paso fisico.
        const stepSpeed = Math.min(speed, distance / Math.max(delta / 1000, 0.001));
        const velocityX = (dx / distance) * stepSpeed;
        const velocityY = (dy / distance) * stepSpeed;
        this.body.setVelocity(velocityX, velocityY);
        this.updateAnimation(velocityX, velocityY);
        this.detectStuck(delta, distance);
    }

    /**
     * Si los siguientes pixeles de la ruta cruzan una puerta cerrada, se detiene, la
     * abre y espera brevemente antes de continuar.
     */
    openDoorAhead(position, directionX, directionY) {
        const lookAhead = 14;
        const tile = this.layout.worldToTile(position.x + directionX * lookAhead, position.y + directionY * lookAhead);
        const door = this.getDoorAtTile(tile);
        if (door && !door.isOpen) {
            door.open('detective');
            this.waitTimer = DETECTIVE_CONFIG.doorOpenDelay;
            this.body.setVelocity(0, 0);
            this.updateAnimation(0, 0);
            return true;
        }
        return false;
    }

    /** Recalcula la ruta cuando el detective deja de avanzar. */
    detectStuck(delta, distance) {
        if (distance < this.lastDistance - 0.5) {
            this.lastDistance = distance;
            this.stuckTimer = 0;
            return;
        }
        this.stuckTimer += delta;
        if (this.stuckTimer >= DETECTIVE_CONFIG.stuckTimeout) {
            this.stuckTimer = 0;
            this.lastDistance = Infinity;
            this.computePath();
        }
    }

    arrive() {
        const callbacks = this.callbacks;
        this.path = [];
        this.target = null;
        this.callbacks = null;
        this.body.setVelocity(0, 0);
        this.updateAnimation(0, 0);
        callbacks?.onArrive?.();
    }

    failNavigation() {
        const callbacks = this.callbacks;
        this.path = [];
        this.target = null;
        this.callbacks = null;
        this.body.setVelocity(0, 0);
        this.updateAnimation(0, 0);
        callbacks?.onFail?.();
    }

    destroy(fromScene) {
        this.searchTween?.stop();
        this.searchIndicator?.destroy();
        super.destroy(fromScene);
    }
}
