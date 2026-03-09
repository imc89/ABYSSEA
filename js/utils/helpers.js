/**
 * UTILITY HELPERS - Funciones auxiliares reutilizables
 */

/**
 * Interpolación lineal entre dos colores RGB
 * @param {Array} c1 - Color inicial [R, G, B]
 * @param {Array} c2 - Color final [R, G, B]
 * @param {number} t - Factor de interpolación (0-1)
 * @returns {Array} Color interpolado [R, G, B]
 */
function lerpColor(c1, c2, t) {
    return c1.map((val, i) => Math.round(val + (c2[i] - val) * t));
}

/**
 * Dibuja una imagen de forma segura manejando errores de carga
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
 * Cache de imágenes con manejo de errores
 */
class ImageCache {
    constructor() {
        this.images = {};
    }

    /**
     * Carga una imagen y la almacena en caché
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
     * Obtiene una imagen del caché
     * @param {string} id - Identificador de la imagen
     * @returns {Image|null}
     */
    get(id) {
        return this.images[id] || null;
    }

    /**
     * Verifica si todas las imágenes están cargadas
     * @returns {boolean}
     */
    allLoaded() {
        return Object.values(this.images).every(img => img.isLoaded || img.isBroken);
    }
}

/**
 * Calcula la distancia entre dos puntos
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
 * Limita un valor entre un mínimo y máximo
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Crea un canvas en memoria con un gradiente radial pre-renderizado, guiño a la optimización
 * para hardware de gama baja limitando "createRadialGradient" en tiempo real.
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
