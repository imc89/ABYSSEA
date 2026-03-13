/**
 * UTILITY HELPERS
 * [ES] Colección de funciones auxiliares reutilizables. Centralizar operaciones comunes reduce la duplicación de código y mejora la mantenibilidad.
 * [EN] Collection of reusable helper functions. Centralizing common operations reduces code duplication and improves maintainability.
 */

/**
 * [ES] Interpolación lineal entre dos colores RGB. Útil para transiciones suaves de color en el juego, como los cambios de profundidad.
 * [EN] Linear interpolation between two RGB colors. Useful for smooth color transitions in the game, as depths dynamically change.
 * @param {Array} c1 - Color inicial [R, G, B]
 * @param {Array} c2 - Color final [R, G, B]
 * @param {number} t - Factor de interpolación (0-1)
 * @returns {Array} Color interpolado [R, G, B]
 */
function lerpColor(c1, c2, t) {
    return c1.map((val, i) => Math.round(val + (c2[i] - val) * t));
}

/**
 * [ES] Dibuja una imagen en el canvas previniendo excepciones si la imagen está corrupta o no ha cargado, evitando que el juego colapse.
 * [EN] Draws an image on the canvas preventing exceptions if the image is corrupted or hasn't loaded, keeping the game from crashing.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Image} image - Objeto Image a dibujar
 * @param {number} dx - Posición X
 * @param {number} dy - Posición Y
 * @param {number} dw - Ancho
 * @param {number} dh - Alto
 * @returns {boolean} true si se dibujó correctamente, false si falló
 */
function safeDrawImage(ctx, image, dx, dy, dw, dh) {
    if (image && image.isLoaded && !image.isBroken) {
        try {
            ctx.drawImage(image, dx, dy, dw, dh);
            return true;
        } catch (e) {
            console.warn('Error drawing image:', e);
            return false;
        }
    }
    return false;
}

/**
 * [ES] Sistema de caché de imágenes. Almacena temporalmente las texturas en memoria del navegador para evitar tirones (stutters) de carga durante el juego.
 * [EN] Image caching system. Temporarily stores textures in the browser's memory to prevent loading stutters while playing.
 */
class ImageCache {
    constructor() {
        this.images = {};
    }

    /**
     * [ES] Inicia la carga asíncrona de una imagen, administrando callbacks para reaccionar a cargas exitosas o fallidas, garantizando la integridad visual.
     * [EN] Initiates asynchronous image loading, managing callbacks for success and failure to ensure visual integrity.
     * @param {string} id - Identificador único
     * @param {string} src - URL de la imagen
     * @param {Function} onLoad - Callback cuando carga exitosamente
     * @param {Function} onError - Callback cuando falla la carga
     */
    load(id, src, onLoad, onError) {
        const img = new Image();

        // Solo aplicar crossOrigin a URLs externas para evitar errores CORS en archivos locales
        if (src.startsWith('http')) {
            img.crossOrigin = "anonymous";
        }

        img.onload = () => {
            img.isLoaded = true;
            if (onLoad) onLoad(img);
        };

        img.onerror = () => {
            console.warn(`Error cargando imagen: ${id} desde ${src}`);
            img.isBroken = true;
            if (onError) onError(img);
        };

        img.src = src;
        this.images[id] = img;
    }

    /**
     * [ES] Recupera inmediatamente una imagen usando su identificador en caché para ser renderizada al vuelo.
     * [EN] Immediately retrieves an image using its cached identifier to be rendered on the fly.
     * @param {string} id - Identificador de la imagen
     * @returns {Image|null}
     */
    get(id) {
        return this.images[id] || null;
    }

    /**
     * [ES] Chequeo de estado global. Confirma si todos los recursos han terminado sus intentos de carga para autorizar el inicio del juego.
     * [EN] Global state check. Confirms if all resources have finished their loading attempts in order to authorize the start of gameplay.
     * @returns {boolean}
     */
    allLoaded() {
        return Object.values(this.images).every(img => img.isLoaded || img.isBroken);
    }
}

/**
 * [ES] Calcula la distancia euclidiana entre dos puntos. Operación fundamental para sistemas mecánicos de proximidad y colisión.
 * [EN] Calculates the Euclidean distance between two points. Fundamental math operation for mechanical proximity and collision systems.
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * [ES] Restringe un valor numérico a unos bordes específicos. Evita que entidades salgan del área de juego o crucen variables límite.
 * [EN] Restricts a numeric value to specific borders. Prevents entities from leaving the play area or spilling over bounds variables.
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * [ES] Pre-cálculo y dibujado de un gradiente radial en un lienzo invisible. Increíblemente útil para dispositivos de gama baja que se saturan creando "radial gradients" por frame.
 * [EN] Pre-calculation and drawing of a radial gradient onto an invisible canvas. Incredibly useful for low-end devices which get bloated generating per-frame "radial gradients".
 * Se debe usar con ctx.globalAlpha y ctx.drawImage.
 * @param {number} radius - Radio del gradiente
 * @param {Array} colorStops - Array de objetos {stop: number, color: string}
 * @returns {HTMLCanvasElement} Canvas offscreen pre-dibujado
 */
function createPreRenderedRadialGradient(radius, colorStops) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = radius * 2;
    c.height = radius * 2;
    const ctx = c.getContext('2d');

    // Para simplificar la cache, creamos el gradiente base
    const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    for (let cStop of colorStops) {
        grad.addColorStop(cStop.stop, cStop.color);
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();
    return c;
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.lerpColor = lerpColor;
    window.safeDrawImage = safeDrawImage;
    window.ImageCache = ImageCache;
    window.distance = distance;
    window.clamp = clamp;
    window.createPreRenderedRadialGradient = createPreRenderedRadialGradient;
}
