import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig } from 'vite';

const PUBLIC_DIR = resolve('public');
const VIRTUAL_ID = 'virtual:available-assets';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`;

/** Enumera archivos bajo public/ con rutas relativas, por ejemplo assets/x.png. */
function listPublicFiles(directory = PUBLIC_DIR) {
    if (!existsSync(directory)) {
        return [];
    }
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = join(directory, entry.name);
        return entry.isDirectory() ? listPublicFiles(fullPath) : [relative(PUBLIC_DIR, fullPath).split(sep).join('/')];
    });
}

/**
 * Expone archivos de public/ mediante virtual:available-assets. AssetManager omite
 * opcionales ausentes en lugar de solicitarlos y generar errores. Agregar o quitar
 * archivos de public/ recarga la pagina durante el desarrollo.
 *
 */
function availableAssetsPlugin() {
    return {
        name: 'roro-available-assets',
        resolveId(id) {
            return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : null;
        },
        load(id) {
            return id === RESOLVED_VIRTUAL_ID ? `export default ${JSON.stringify(listPublicFiles())};` : null;
        },
        configureServer(server) {
            const onChange = (file) => {
                if (!resolve(file).startsWith(PUBLIC_DIR)) {
                    return;
                }
                const graphs = [server.moduleGraph, ...Object.values(server.environments ?? {}).map((environment) => environment.moduleGraph)];
                for (const graph of graphs) {
                    const module = graph?.getModuleById(RESOLVED_VIRTUAL_ID);
                    if (module) {
                        graph.invalidateModule(module);
                    }
                }
                server.ws.send({ type: 'full-reload' });
            };
            server.watcher.add(PUBLIC_DIR);
            server.watcher.on('add', onChange);
            server.watcher.on('unlink', onChange);
        }
    };
}

export default defineConfig({
    plugins: [availableAssetsPlugin()],
    // Rutas relativas para que dist/ funcione al servirlo desde cualquier carpeta,
    // por ejemplo cuando el proyecto se entrega en un archivo ZIP.
    base: './',
    build: {
        // Phaser ocupa cerca de 1.2 MB minificado; es normal para un juego con ese motor.
        chunkSizeWarningLimit: 1600
    }
});
