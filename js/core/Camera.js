/**
 * CAMERA - Sistema de cámara con seguimiento suave
 */

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
    }

    update(player, canvas) {
        // NO SCROLL HORIZONTAL - mundo del ancho de pantalla
        this.x = 0;

        // SCROLL VERTICAL SOLAMENTE - seguir al jugador en profundidad
        const targetY = player.y - canvas.height / 2;
        this.y += (targetY - this.y) * CAMERA_CONFIG.smoothing;
    }

    /**
     * Convierte coordenadas del mundo a coordenadas de pantalla
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    /**
     * Convierte coordenadas de pantalla a coordenadas del mundo
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Camera = Camera;
}
