/**
 * Figuras provisionales para recursos ausentes, como puertas y muebles de cocina o
 * bano. Se generan una vez al cargar con Phaser Graphics y usan la misma clave de
 * textura del archivo definitivo; agregar el PNG no requiere cambiar codigo.
 *
 * Son figuras simples con contorno magenta predeterminado por PLACEHOLDER_STYLE
 * para reconocerlas facilmente.
 *
 */

function shade(color, factor) {
    const red = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
    const green = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
    const blue = Math.min(255, Math.round((color & 0xff) * factor));
    return (red << 16) | (green << 8) | blue;
}

const SHAPES = {
    box(graphics, width, height, color) {
        graphics.fillStyle(color, 1).fillRect(0, 0, width, height);
    },

    door(graphics, width, height, color) {
        graphics.fillStyle(shade(color, 0.6), 1).fillRect(0, 0, width, height);
        graphics.fillStyle(color, 1).fillRect(3, 3, width - 6, height - 6);
        graphics.fillStyle(shade(color, 0.8), 1).fillRect(7, 7, width - 14, height / 2 - 10);
        graphics.fillRect(7, height / 2 + 3, width - 14, height / 2 - 10);
        graphics.fillStyle(0xe0b354, 1).fillRect(width - 12, height / 2 - 2, 4, 4);
    },

    doorOpen(graphics, width, height, color) {
        // Puerta abierta vista desde arriba: hoja delgada junto al marco izquierdo.
        graphics.fillStyle(shade(color, 0.6), 1).fillRect(0, 0, 6, height);
        graphics.fillStyle(color, 1).fillRect(1, 1, 4, height - 2);
    },

    counter(graphics, width, height, color) {
        graphics.fillStyle(0xcfc6b8, 1).fillRect(0, 0, width, 12);
        graphics.fillStyle(color, 1).fillRect(0, 12, width, height - 12);
        graphics.fillStyle(shade(color, 0.7), 1);
        for (let x = 4; x < width - 4; x += 32) {
            graphics.fillRect(x, 16, 26, height - 20);
        }
    },

    stove(graphics, width, height, color) {
        graphics.fillStyle(shade(color, 1.2), 1).fillRect(0, 0, width, 12);
        graphics.fillStyle(0x2a2a2e, 1).fillCircle(9, 6, 3).fillCircle(width - 9, 6, 3);
        graphics.fillStyle(color, 1).fillRect(0, 12, width, height - 12);
        graphics.fillStyle(0x2a2a2e, 1).fillRect(5, 17, width - 10, height - 22);
    },

    sink(graphics, width, height, color) {
        graphics.fillStyle(0xcfc6b8, 1).fillRect(0, 0, width, 12);
        graphics.fillStyle(0x9aa7b0, 1).fillRect(5, 2, width - 10, 8);
        graphics.fillStyle(color, 1).fillRect(0, 12, width, height - 12);
        graphics.fillStyle(shade(color, 0.7), 1).fillRect(4, 16, width - 8, height - 20);
    },

    fridge(graphics, width, height, color) {
        graphics.fillStyle(color, 1).fillRect(0, 0, width, height);
        graphics.fillStyle(shade(color, 0.75), 1).fillRect(0, height * 0.38, width, 2);
        graphics.fillStyle(0x6d6d78, 1).fillRect(width - 7, 8, 3, 10).fillRect(width - 7, height * 0.45, 3, 14);
    },

    bin(graphics, width, height, color) {
        graphics.fillStyle(shade(color, 1.3), 1).fillRect(0, 0, width, 5);
        graphics.fillStyle(color, 1).fillRect(2, 5, width - 4, height - 5);
    },

    bathtub(graphics, width, height, color) {
        graphics.fillStyle(color, 1).fillRoundedRect(0, 0, width, height, 10);
        graphics.fillStyle(0x9cc3d5, 1).fillRoundedRect(7, 10, width - 14, height - 20, 8);
        graphics.fillStyle(0x9aa7b0, 1).fillRect(width / 2 - 3, 3, 6, 5);
    },

    toilet(graphics, width, height, color) {
        graphics.fillStyle(shade(color, 0.92), 1).fillRect(2, 0, width - 4, 14);
        graphics.fillStyle(color, 1).fillEllipse(width / 2, height - 15, width - 2, 26);
        graphics.fillStyle(0x9cc3d5, 1).fillEllipse(width / 2, height - 15, width - 12, 14);
    },

    washbasin(graphics, width, height, color) {
        graphics.fillStyle(color, 1).fillRoundedRect(0, 0, width, height - 10, 6);
        graphics.fillStyle(0x9cc3d5, 1).fillEllipse(width / 2, (height - 10) / 2 + 2, width - 10, height - 22);
        graphics.fillStyle(shade(color, 0.8), 1).fillRect(width / 2 - 4, height - 10, 8, 10);
    }
};

export function drawPlaceholder(graphics, shape, width, height, color) {
    (SHAPES[shape] ?? SHAPES.box)(graphics, width, height, color);
}
