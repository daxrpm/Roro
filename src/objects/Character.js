import Phaser from 'phaser';
import { DEPTH } from '../data/gameConfig.js';
import { DIRECTION, idleTextureKey, walkAnimationKey } from '../data/animationData.js';

export const CHARACTER_EVENTS = Object.freeze({
    FOOTSTEP: 'footstep'
});

/**
 * Clase base de Roro y detective: sprite fisico con cuerpo pequeno en los pies,
 * tres orientaciones (frente, espalda y lateral) y pasos.
 *
 * El origen del sprite esta en el centro inferior. getFootPosition() devuelve el
 * centro del cuerpo fisico, usado para navegar, medir distancias y detectar
 * habitaciones.
 */
export class Character extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {{x:number,y:number}} footPosition
     * @param {string} characterKey 'roro' | 'detective'
     * @param {{bodyWidth:number, bodyHeight:number, footstepInterval:number}} config
     */
    constructor(scene, footPosition, characterKey, config) {
        super(scene, footPosition.x, footPosition.y + config.bodyHeight / 2, idleTextureKey(characterKey, DIRECTION.FRONT));
        this.characterKey = characterKey;
        this.config = config;
        this.facing = DIRECTION.FRONT;
        this.isWalking = false;
        this.footstepTimer = 0;
        this.footPosition = { x: 0, y: 0 };

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setOrigin(0.5, 1);
        // Todos los cuadros tienen el mismo tamano (AssetManager), por lo que
        // el desplazamiento del cuerpo se calcula una vez y queda alineado con los pies.
        this.body.setSize(config.bodyWidth, config.bodyHeight);
        this.body.setOffset((this.width - config.bodyWidth) / 2, this.height - config.bodyHeight);
        this.updateDepth();
    }

    getFootPosition() {
        this.footPosition.x = this.x;
        this.footPosition.y = this.y - this.config.bodyHeight / 2;
        return this.footPosition;
    }

    /**
     * Coloca al personaje con los pies centrados en un punto del mundo.
     *
     * No usa body.reset() de Arcade porque alinea el cuerpo con la esquina superior
     * izquierda del sprite e ignora el desplazamiento de los pies.
     */
    placeAtFoot(position) {
        this.setPosition(position.x, position.y + this.config.bodyHeight / 2);
        const body = this.body;
        body.stop();
        body.updateFromGameObject();
        body.prev.copy(body.position);
        body.prevFrame.copy(body.position);
        this.updateDepth();
    }

    /**
     * Elige orientacion y animacion desde la velocidad. El eje dominante determina la
     * direccion; con ejes iguales conserva orientacion para evitar oscilaciones
     * visuales en diagonales.
     */
    updateAnimation(velocityX, velocityY) {
        const moving = Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5;

        if (moving) {
            const absX = Math.abs(velocityX);
            const absY = Math.abs(velocityY);
            let direction = this.facing;
            if (absX > absY + 0.5) {
                direction = DIRECTION.SIDE;
            } else if (absY > absX + 0.5) {
                direction = velocityY < 0 ? DIRECTION.BACK : DIRECTION.FRONT;
            } else if (this.facing === DIRECTION.FRONT || this.facing === DIRECTION.BACK) {
                direction = velocityY < 0 ? DIRECTION.BACK : DIRECTION.FRONT;
            }
            this.setFacing(direction, velocityX);
            this.anims.play(walkAnimationKey(this.characterKey, this.facing), true);
        } else if (this.isWalking) {
            this.showIdle();
        }

        this.isWalking = moving;
        this.updateDepth();
    }

    setFacing(direction, horizontalHint = 0) {
        this.facing = direction;
        if (direction === DIRECTION.SIDE && horizontalHint !== 0) {
            // Los cuadros laterales miran a la derecha; para la izquierda se reflejan.
            this.setFlipX(horizontalHint < 0);
        } else if (direction !== DIRECTION.SIDE) {
            this.setFlipX(false);
        }
    }

    showIdle() {
        this.anims.stop();
        this.setTexture(idleTextureKey(this.characterKey, this.facing));
    }

    /** Mira hacia un punto del mundo sin desplazarse. */
    faceTowards(target) {
        const foot = this.getFootPosition();
        const dx = target.x - foot.x;
        const dy = target.y - foot.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            this.setFacing(DIRECTION.SIDE, dx);
        } else {
            this.setFacing(dy < 0 ? DIRECTION.BACK : DIRECTION.FRONT);
        }
        this.showIdle();
        this.isWalking = false;
    }

    /** Emite FOOTSTEP a intervalos regulares mientras camina. */
    updateFootsteps(delta) {
        if (!this.isWalking) {
            this.footstepTimer = this.config.footstepInterval * 0.5;
            return;
        }
        this.footstepTimer -= delta;
        if (this.footstepTimer <= 0) {
            this.footstepTimer += this.config.footstepInterval;
            this.emit(CHARACTER_EVENTS.FOOTSTEP, this);
        }
    }

    updateDepth() {
        this.setDepth(DEPTH.worldBase + this.y);
    }
}
