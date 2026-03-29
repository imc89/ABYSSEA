/**
 * MACRO CATALOG
 * [ES] Catálogo de eventos o encuentros a micro-escala. Define puntos de interés especiales que se diferencian de los peces comunes para enriquecer la exploración.
 * [EN] Micro-scale events or encounters catalog. Defines special points of interest different from common fish to enrich exploration.
 */

const MACRO_CATALOG = {
    'eurythenes': {
        id: 'eurythenes',
        nombre: 'Eurythenes gryllus',
        cientifico: 'Anfípodo Gigante Abisal',
        imagen: 'img/little/EURYTHENES/EURYTHENES.gif',
        descripcion: 'Este carroñero abisal es capaz de detectar restos orgánicos a kilómetros de distancia. Su presencia indica una zona de afloramiento rocoso con alta actividad biológica en microescala.',

        // --- PARÁMETROS VISUALES ---
        ancho: 120,           // Ancho visual de la criatura en píxeles (base)
        alto: 60,             // Alto visual de la criatura en píxeles (base)
        minEspecimenes: 1,    // Mínimo de ejemplares visibles
        maxEspecimenes: 3,    // Máximo de ejemplares visibles

        // --- PARÁMETROS DE COMPORTAMIENTO ---
        velocidadX: 1.5,      // Velocidad máxima de desplazamiento horizontal
        velocidadY: 0.8,      // Velocidad máxima de desplazamiento vertical
        rangoDeteccion: 80,   // Radio de la mira para detectar y empezar el escaneo

        // --- PARÁMETROS DE DESPLIEGUE ---
        minProf: 500,         // Profundidad mínima de aparición (metros)
        maxProf: 600,         // Profundidad máxima de aparición (metros)
        cantidadPoints: 1     // Número de puntos de este tipo en el mapa
    },
    'hola': {
        id: 'hola',
        nombre: 'Angelito del Mar',
        cientifico: 'Clione limacina',
        imagen: 'img/little/CLIONE/CLIONE.gif',
        descripcion: 'Un molusco gasterópodo pelágico sin concha, conocido por su apariencia etérea de "ángel". Flota grácilmente en las corrientes abisales.',

        // --- PARÁMETROS VISUALES ---
        ancho: 35,
        alto: 50,
        minEspecimenes: 1,
        maxEspecimenes: 1,

        // --- PARÁMETROS DE COMPORTAMIENTO ---
        velocidadX: 1.2,
        velocidadY: 1.2,
        rangoDeteccion: 70,

        // --- PARÁMETROS DE DESPLIEGUE ---
        minProf: 100,
        maxProf: 250,
        cantidadPoints: 1
    }
    // Se pueden añadir más aquí (ej. 'calamar_juvenil', 'medusa_pequeña', etc.)
};

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.MACRO_CATALOG = MACRO_CATALOG;
}
