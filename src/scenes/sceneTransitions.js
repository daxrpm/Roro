/**
 * Funciones de aparicion y desvanecimiento compartidas por las escenas.
 */
const FADE_DURATION = 300;

export function fadeIn(scene, duration = FADE_DURATION) {
    scene.cameras.main.fadeIn(duration, 0, 0, 0);
}

/** Desvanece la camara a negro e inicia key; ignora llamadas repetidas. */
export function fadeToScene(scene, key, data = {}, duration = FADE_DURATION) {
    if (scene.isTransitioning) {
        return;
    }
    scene.isTransitioning = true;
    scene.cameras.main.fadeOut(duration, 0, 0, 0);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
        scene.isTransitioning = false;
        scene.scene.start(key, data);
    });
}
