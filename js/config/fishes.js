/**
 * FISH CATALOG
 * [ES] Catálogo general de especies de peces. Define todos los atributos (visuales y lógicos) de las criaturas para poblar el ecosistema del juego de manera estructurada.
 * [EN] General fish species catalog. Defines all attributes (visual and logical) of creatures to populate the game ecosystem in a structured way.
 * 
 * Cada especie tiene / Each species has:
 * - id: Identificador único / Unique identifier
 * - nombre: Nombre común / Common name
 * - cientifico: Nombre científico / Scientific name
 * - imagen: URL de la imagen / Image URL
 * - esCardumen: Si forma cardúmenes (true) o es solitario (false) / If it naturally schools (true) or is solitary (false)
 * - minProf: Profundidad mínima en METROS / Minimum depth in METERS
 * - maxProf: Profundidad máxima en METROS / Maximum depth in METERS
 * - cantidadGrupos: Número de grupos a generar / Number of groups to spawn
 * - pecesPorGrupo: Peces por grupo (1 para solitarios) / Fishes per group (1 for solitaries)
 * - escala: Factor de escala del sprite / Sprite scale factor
 * - velocidadBase: Velocidad base de movimiento / Base movement speed
 */

const FISH_CATALOG = [
    // ZONA EPIPELÁGICA (0-200m) - Aguas superficiales con luz
    {
        id: 'pez_linterna',
        nombre: 'Pez Linterna',
        cientifico: 'Myctophidae',
        imagen: './img/fishes/fish.gif',
        descripcion: 'El pez linterna es un pez que se encuentra en el océano profundo y que es conocido por su capacidad para emitir luz.',
        esCardumen: true,
        huyeDelJugador: true,
        distanciaCardumen: 90,
        minProf: 0,      // 0 metros
        maxProf: 100,    // 100 metros
        cantidadGrupos: 3,
        pecesPorGrupo: 20,
        ancho: 40,
        alto: 20,
        velocidadBase: 1.2,

    },
    {
        id: 'Anoplogaster',
        nombre: 'Anoplogaster',
        cientifico: 'Anoplogaster',
        imagen: './img/fishes/ANOPLOGASTER/ANOPLOGASTER.gif',
        descripcion: 'el Anoplogaster es un pez que se encuentra en el océano profundo y que es conocido por su capacidad para emitir luz.',
        esCardumen: false,
        huyeDelJugador: false,
        distanciaCardumen: 500,
        minProf: 300,    // 300 metros
        maxProf: 480,    // 480 metros
        cantidadGrupos: 1,
        pecesPorGrupo: 20,
        ancho: 50,
        alto: 30,
        velocidadBase: 1.0
    },

    // ZONA MESOPELÁGICA (200-500m) - Zona de penumbra
    {
        id: 'beroe',
        nombre: 'Beroe',
        cientifico: 'Beroe',
        imagen: './img/fishes/beroe.gif',
        descripcion: 'El Beroe es un pez que se encuentra en el océano profundo y que es conocido por su capacidad para emitir luz.',
        esCardumen: false,
        huyeDelJugador: false,
        distanciaCardumen: 500,
        minProf: 500,    // 500 metros
        maxProf: 700,    // 700 metros
        cantidadGrupos: 1,
        pecesPorGrupo: 5,
        ancho: 30,
        alto: 55,
        velocidadBase: 0.5,
        // --- Ejemplo de configuración de bioluminiscencia ---
        numLuces: 3,
        // Las posiciones (x, y) son relativas al centro del pez (0, 0). 
        // X positivo es hacia la cabeza, X negativo es hacia la cola.
        posluz1: { x: -10, y: 0 },  // Foco cerca de la cola
        posluz2: { x: 0, y: 0 },    // Foco central
        posluz3: { x: 10, y: 0 },   // Foco cerca de la cabeza
        // Potencia/Radio del brillo en píxeles
        powerluz1: 25,
        powerluz2: 35,
        powerluz3: 25,

        // Colores en formato RGBA (Red, Green, Blue, Alpha/Opacidad)
        colorluz: "rgba(0, 255, 255, 0.7)",   // Color genérico (cian) si no se específica uno particular
        colorluz2: "rgba(0, 150, 255, 0.8)",  // Azul más intenso para el foco central
        colorluz3: "rgba(0, 255, 200, 0.7)"   // Toque verdoso para la cabeza
    },
    {
        id: 'melanocetus',
        nombre: 'Melanocetus jhonsonii',
        cientifico: 'Melanocetus jhonsonii',
        imagen: './img/fishes/MELANOCETUS/MELANOCETUS.gif',
        descripcion: 'El Melanocetus jhonsonii es un pez que se encuentra en el océano profundo y que es conocido por su capacidad para emitir luz.',
        esCardumen: false,
        huyeDelJugador: false,
        distanciaCardumen: 500,
        minProf: 600,    // 500 metros
        maxProf: 650,    // 700 metros
        cantidadGrupos: 1,
        pecesPorGrupo: 5,
        ancho: 55,
        alto: 40,
        velocidadBase: 0.5,

        // --- Ejemplo de configuración de bioluminiscencia ---
        numLuces: 1,
        // Las posiciones (x, y) son relativas al centro del pez (0, 0). 
        // X positivo es hacia la cabeza, X negativo es hacia la cola.
        posluz1: { x: -10, y: 0 },  // Foco cerca de la cola
        // Potencia/Radio del brillo en píxeles
        powerluz1: 25,
        // Control de parpadeo (ON/OFF)
        // Si no se especifica, la luz está siempre encendida.
        // Si se especifica, la luz se apaga y enciende cada 'sleep' milisegundos.
        onofluz1: true,   // Luz 1 parpadea
        sleepluz1: 1000,  // Parpadea cada 1000ms (1 segundo)
        // Colores en formato RGBA (Red, Green, Blue, Alpha/Opacidad)
        colorluz: "rgba(0, 150, 255, 0.8)",  // Azul más intenso para el foco central
    },
    {
        id: 'malacosteus',
        nombre: 'Malacosteus Niger',
        cientifico: 'Thunnus thynnus',
        imagen: './img/fishes/MALACOSTEUS/MALACOSTEUS.gif',
        descripcion: 'Conocido como el pez mandíbula suelta, el Malacosteus posee la capacidad única de producir luz roja, invisible para la mayoría de sus presas.',
        esCardumen: false,
        huyeDelJugador: false,
        distanciaCardumen: 500,
        minProf: 800,    // 500 metros
        maxProf: 1000,    // 700 metros
        cantidadGrupos: 1,
        pecesPorGrupo: 3,
        ancho: 95,
        alto: 40,
        velocidadBase: 0.5,
        // --- Ejemplo de configuración de bioluminiscencia ---
        numLuces: 1,
        // Las posiciones (x, y) son relativas al centro del pez (0, 0). 
        // X positivo es hacia la cabeza, X negativo es hacia la cola.
        posluz1: { x: 36, y: -5 },  // Foco cerca de la cola
        // Potencia/Radio del brillo en píxeles
        powerluz1: 15,
        // Control de parpadeo (ON/OFF)
        // Si no se especifica, la luz está siempre encendida.
        // Si se especifica, la luz se apaga y enciende cada 'sleep' milisegundos.
        onofluz1: true,   // Luz 1 parpadea
        sleepluz1: 2000,  // Parpadea cada 1000ms (1 segundo)
        capaluz1: 'front', // Luz por delante de la imagen
        // Colores en formato RGBA (Red, Green, Blue, Alpha/Opacidad)
        colorluz: "rgba(255, 0, 0, 0.94)",  // Azul más intenso para el foco central
    }
    // {
    //     id: 'pez_espada',
    //     nombre: 'Pez Espada',
    //     cientifico: 'Xiphias gladius',
    //     imagen: 'https://static.vecteezy.com/system/resources/thumbnails/050/794/773/small/moorish-idol-fish-swiming-isolated-on-a-transparent-background-png.png',
    //     esCardumen: false,
    //     minProf: 300,
    //     maxProf: 450,
    //     cantidadGrupos: 20,
    //     pecesPorGrupo: 1,
    //     escala: 1.5,
    //     velocidadBase: 3.0
    // },

    // // ZONA BATIPELÁGICA (500-800m) - Aguas profundas oscuras
    // {
    //     id: 'linterna',
    //     nombre: 'Pez Linterna',
    //     cientifico: 'Myctophidae',
    //     imagen: 'https://static.vecteezy.com/system/resources/thumbnails/050/794/773/small/moorish-idol-fish-swiming-isolated-on-a-transparent-background-png.png',
    //     esCardumen: false,
    //     minProf: 500,
    //     maxProf: 800,
    //     cantidadGrupos: 40,
    //     pecesPorGrupo: 1,
    //     escala: 0.5,
    //     velocidadBase: 0.8
    // },
    // {
    //     id: 'pez_hacha',
    //     nombre: 'Pez Hacha',
    //     cientifico: 'Sternoptychidae',
    //     imagen: 'https://static.vecteezy.com/system/resources/thumbnails/050/794/773/small/moorish-idol-fish-swiming-isolated-on-a-transparent-background-png.png',
    //     esCardumen: true,
    //     minProf: 600,
    //     maxProf: 750,
    //     cantidadGrupos: 12,
    //     pecesPorGrupo: 25,
    //     escala: 0.4,
    //     velocidadBase: 0.7
    // },

    // // ZONA ABISAL (800-1100m) - Profundidades extremas
    // {
    //     id: 'rape',
    //     nombre: 'Rape Abisal',
    //     cientifico: 'Melanocetus johnsonii',
    //     imagen: 'https://static.vecteezy.com/system/resources/thumbnails/050/794/773/small/moorish-idol-fish-swiming-isolated-on-a-transparent-background-png.png',
    //     esCardumen: false,
    //     minProf: 800,
    //     maxProf: 1100,
    //     cantidadGrupos: 25,
    //     pecesPorGrupo: 1,
    //     escala: 0.9,
    //     velocidadBase: 0.5
    // },
    // {
    //     id: 'calamar_gigante',
    //     nombre: 'Calamar Gigante',
    //     cientifico: 'Architeuthis dux',
    //     imagen: 'https://static.vecteezy.com/system/resources/thumbnails/050/794/773/small/moorish-idol-fish-swiming-isolated-on-a-transparent-background-png.png',
    //     esCardumen: false,
    //     minProf: 900,
    //     maxProf: 1100,
    //     cantidadGrupos: 8,
    //     pecesPorGrupo: 1,
    //     escala: 2.0,
    //     velocidadBase: 1.5
    // }
];

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.FISH_CATALOG = FISH_CATALOG;
}
