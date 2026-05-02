/**
 * CAMERA
 * [ES] Sistema de cámara con seguimiento suave. Controla qué parte del mundo se renderiza en pantalla y facilita la conversión de coordenadas.
 * [EN] Camera system with smooth tracking. Controls which part of the world is rendered on screen and handles coordinate conversion.
 */

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
    }

    /**
     * [ES] Actualiza la posición de la cámara centrada en el jugador, aplicando interpolación para un movimiento fluido y limitando el scroll solo al eje vertical.
     * [EN] Updates the camera position centered on the player, applying interpolation for smooth movement and restricting scroll to the vertical axis only.
     */
    update(player, canvas) {
        // NO SCROLL HORIZONTAL - el mundo es exactamente igual al lienzo en nuestra resolución lógica
        this.x = 0;

        // SCROLL VERTICAL SOLAMENTE - seguir al jugador en profundidad
        const targetY = player.y - canvas.height / 2;
        this.y += (targetY - this.y) * CAMERA_CONFIG.smoothing;
    }

    /**
     * [ES] Convierte coordenadas absolutas del mundo del juego a coordenadas relativas a la pantalla actual.
     * [EN] Converts absolute game world coordinates to screen-relative coordinates.
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    /**
     * [ES] Convierte coordenadas relativas a la pantalla en coordenadas absolutas del mundo del juego (ej. para clics del ratón).
     * [EN] Converts screen-relative coordinates to absolute game world coordinates (e.g., for mouse clicks).
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
