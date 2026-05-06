/**
 * MACRO CATALOG
 * [ES] Catálogo de eventos o encuentros a micro-escala. Define puntos de interés especiales que se diferencian de los peces comunes para enriquecer la exploración.
 * [EN] Micro-scale events or encounters catalog. Defines special points of interest different from common fish to enrich exploration.
 *
 * --- TIPOS DE SUBTÍTULO (campo: subtitle) ---
 * Controla el bioma del entorno generado dentro del minijuego Macro.
 *
 *  'fumarolas_hidrotermales'  → Chimeneas hidrotermales. Columnas de humo, rocas oscuras con bordes
 *                               naranja/rojizo incandescentes y partículas ascendentes con brillo cálido.
 *  'llanura_abisal'           → Fondo plano de sedimento blando. Pocos elementos, partículas lentas
 *                               y colores fríos azul-gris muy oscuros.
 *  'mar_abierto'              → Sin suelo visible. Fondo azul abisal profundo, efecto de profundidad
 *                               infinita, nieve marina y plancton bioluminiscente interactivo.
 *  'rocas'                    → Suelo por defecto. Rocas irregulares procedurales en el fondo,
 *                               gradiente oscuro azul-negro y partículas de agua estándar.
 *
 * --- POSICIONAMIENTO FIJO (campo: posiciones) ---
 * Si el array posiciones está presente y no está vacío, el POI se pintará en esas coordenadas
 * exactas del espacio lógico del mundo (1920 × logicalHeight).
 * Si se omite o está vacío, la posición se sortea aleatoriamente dentro del rango minProf/maxProf
 * y el número de puntos viene dado por cantidadPoints.
 *
 *   posiciones: [
 *     { x: 960, y: 4800 }   // coordenadas en píxeles lógicos del mundo
 *   ]
 */

const MACRO_CATALOG = {
    'eurythenes': {
        id: 'eurythenes',
        nombre: 'Eurythenes gryllus',
        cientifico: 'Anfípodo Gigante Abisal',
        imagen: 'img/little/EURYTHENES/EURYTHENES.gif',
        descripcion: 'Este carroñero abisal es capaz de detectar restos orgánicos a kilómetros de distancia. Su presencia indica una zona de afloramiento rocoso con alta actividad biológica en microescala.',

        // --- BIOMA DEL MINIJUEGO ---
        // Tipo de entorno visual generado al entrar en este macro-punto.
        // Valores válidos: 'fumarolas_hidrotermales' | 'llanura_abisal' | 'mar_abierto' | 'paredes_rocosas'
        subtitle: 'llanura_abisal',

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
        cantidadPoints: 1,    // Número de puntos de este tipo en el mapa (usado si posiciones está vacío)

        // --- POSICIÓN FIJA (opcional) ---
        // Si se define, el POI aparece exactamente en estas coordenadas del mundo lógico.
        // Si se omite o el array está vacío, la posición se sortea según minProf/maxProf.
        // posiciones: [{ x: 960, y: 4800 }]
    },
    'hola': {
        id: 'hola',
        nombre: 'Angelito del Mar',
        cientifico: 'Clione limacina',
        imagen: 'img/little/CLIONE/CLIONE.gif',
        descripcion: 'El ángel del mar abisal: un molusco gastrópodo pelágico sin concha que propulsa su cuerpo hialino mediante par de aletas parapodianes. Emite una bioluminiscencia tenue y etilárea que lo delata en la oscuridad absoluta.',

        // --- BIOMA DEL MINIJUEGO ---
        subtitle: 'mar_abierto',

        // --- PARÁMETROS VISUALES ---
        ancho: 38,
        alto: 55,
        minEspecimenes: 1,
        maxEspecimenes: 3,   // los Clione viajan en grupos difusos

        // --- PARÁMETROS DE COMPORTAMIENTO ---
        // Clione limacina es extremadamente lento y etéreo
        velocidadX: 0.55,    // movimiento delicado y casi imperceptible
        velocidadY: 0.65,    // ligero ascenso neto (son levemente positivamente buo)
        rangoDeteccion: 90,  // radio amplio: su bioluminiscencia los delata antes

        // --- PARÁMETROS DE DESPLIEGUE ---
        minProf: 100,
        maxProf: 250,
        cantidadPoints: 1,
        posiciones: [{ x: 350, y: 300 }]
    }
    // Se pueden añadir más aquí (ej. 'calamar_juvenil', 'medusa_pequeña', etc.)
};

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.MACRO_CATALOG = MACRO_CATALOG;
}
