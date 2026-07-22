/**
 * GAME CONSTANTS
 * [ES] Configuración central del mundo y física del juego. Define las reglas base y constantes inmutables para mantener la coherencia en todo el juego.
 * [EN] Core world configuration and game physics. Defines baseline rules and immutable constants to maintain consistency throughout the game.
 */

/**
 * [ES] Define la calidad gráfica base. Se inicializa en 'LOW' para garantizar el rendimiento en dispositivos de gama baja por defecto.
 * [EN] Defines the baseline graphics quality. Initialized to 'LOW' to ensure performance on low-end devices by default.
 */
let GRAPHICS_QUALITY = 'LOW';
if (typeof window !== 'undefined') {
    try {
        const savedQuality = window.localStorage.getItem('abyss_graphics_quality');
        if (savedQuality && ['LOW', 'MED', 'HIGH'].includes(savedQuality)) {
            GRAPHICS_QUALITY = savedQuality;
        }
    } catch (e) {
        console.warn("localStorage no dispoible para guardar preferencias", e);
    }
}

/**
 * [ES] Perfiles predefinidos de calidad gráfica. Ajustan dinámicamente el número de entidades renderizadas para equilibrar los FPS según la capacidad del dispositivo.
 * [EN] Predefined graphics quality profiles. Dynamically adjusts the number of rendered entities to balance FPS according to the device's capability.
 */
const QUALITY_PROFILES = {
    LOW: {
        particleCount: 150,            // Océano más vacío, ultra rápido
        spotlightParticles: 35,
        aiThrottleRate: 0.12,          // IA al 12%
        useGradients: false,
        bubbleSpawnRate: 0.12,         // Muy pocas burbujas
        drawFishGlows: false,          // Sin aura de neón en los peces (ahorro masivo)
        simDistance: 900,              // Distancia de simulación reducida para IA
        useSchlieren: false,           // Desactivado en LOW
        schlierenSliceH: 32            // No se usa, pero por coherencia
    },
    MED: {
        particleCount: 350,            // Océano normal
        spotlightParticles: 80,
        aiThrottleRate: 0.30,          // IA al 30%
        useGradients: false,
        bubbleSpawnRate: 0.30,         // Burbujas normales
        drawFishGlows: true,           // Con aura de neón cacheados
        simDistance: 1200,             // Distancia de simulación intermedia
        useSchlieren: true,            // Activado en MED
        schlierenSliceH: 24            // Rodajas más grandes para mayor rendimiento
    },
    HIGH: {
        particleCount: 500,            // Denso pero alcanzable a 60fps
        spotlightParticles: 120,       // Batching por alpha — coste muy bajo ahora
        aiThrottleRate: 0.50,          // IA al 50%
        useGradients: true,            // Degradados HD en burbujas y nieve
        bubbleSpawnRate: 0.60,         // Estela densa de burbujas
        drawFishGlows: true,           // Aura de neón
        simDistance: 1400,             // Distancia de simulación completa
        useSchlieren: true,            // Activado en HIGH
        schlierenSliceH: 16            // Rodajas de alta calidad
    }
};

/**
 * [ES] Parámetros globales del mundo del juego, como dimensiones y física. Centraliza estas propiedades para facilitar ajustes de balance y diseño de niveles.
 * [EN] Global game world parameters, such as dimensions and physics. Centralizes these properties to facilitate balancing and level design tweaks.
 */
const WORLD = {
    width: 2000,         // Reducido de 8000 para juego más vertical
    height: 120000,      // Aumentado para 12,000 metros (escala 10:1)
    depthScale: 10,      // 10 unidades de juego = 1 metro
    friction: 0.96,
    // Propiedades dinámicas administradas por QUALITY_PROFILES
    particleCount: QUALITY_PROFILES[GRAPHICS_QUALITY].particleCount,
    spotlightParticles: QUALITY_PROFILES[GRAPHICS_QUALITY].spotlightParticles,
    aiThrottleRate: QUALITY_PROFILES[GRAPHICS_QUALITY].aiThrottleRate,
    useGradients: QUALITY_PROFILES[GRAPHICS_QUALITY].useGradients,
    bubbleSpawnRate: QUALITY_PROFILES[GRAPHICS_QUALITY].bubbleSpawnRate,
    drawFishGlows: QUALITY_PROFILES[GRAPHICS_QUALITY].drawFishGlows,
    simDistance: QUALITY_PROFILES[GRAPHICS_QUALITY].simDistance,
    useSchlieren: QUALITY_PROFILES[GRAPHICS_QUALITY].useSchlieren,
    schlierenSliceH: QUALITY_PROFILES[GRAPHICS_QUALITY].schlierenSliceH,
    lightSpotRange: 275,     // Longitud del foco direccional (cono)
    lightGlowRange: 250,     // Radio del halo radial alrededor del submarino
    lightGlowIntensity: 0.24, // Opacidad máxima del halo radial (0.0 a 1.0)
    lightAngle: 0.24,
    lightOffsetY: 51,
    lightOffsetX: 75,
    lightStartWidth: 20,

    // Límites horizontales más estrictos
    horizontalBoundary: 100,  // Margen antes de empujar al jugador de vuelta

    // Zonas de profundidad reales (Basadas en infografía científica)
    // El orden es importante para la interpolación de color
    zones: [
        { depth: 0, color: [12, 74, 110], name: 'zone_epipelagic' },    // 0-200m
        { depth: 200, color: [2, 16, 43], name: 'zone_mesopelagic' },   // 200-1000m
        { depth: 1000, color: [1, 5, 20], name: 'zone_bathypelagic' },   // 1000-4000m
        { depth: 4000, color: [0, 1, 5], name: 'zone_abyssopelagic' },  // 4000-6000m
        { depth: 6000, color: [0, 0, 0], name: 'zone_hadalpelagic' }   // 6000m+
    ]
};

/**
 * [ES] Configuración de la base inicial submarina. Sirve como punto de partida seguro y lugar de anclaje para el jugador.
 * [EN] Configuration for the starting underwater base. It serves as a safe starting point and anchor location for the player.
 */
const BASE_CONFIG = {
    y: -50,
    width: 3000,
    height: 150,
    color: '#1a2a3a',
    lightColor: '#00ffff'
};

/**
 * [ES] Configuración inicial del jugador, incluyendo posición, atributos de movimiento y habilidades como el sonar.
 * [EN] Initial player configuration, including start position, movement attributes, and abilities like sonar.
 */
const PLAYER_CONFIG = {
    startX: 800,   // Centro aproximado, se ajustará al ancho del canvas
    startY: 220,
    speed: 0.42,
    boost: 2.2,
    width: 185,
    height: 220,
    sonarMaxCooldown: 9,     // 10 segundos
    sonarMaxRadius: 2500,
    sonarExpansionSpeed: 25,
    lightDrainRate: 0.05,
    lightRechargeRate: 0.1,
    image: './img/submarine/sub1.png'
};

/**
 * [ES] Ajustes de la cámara del juego. Define la suavidad del seguimiento para evitar mareos (motion sickness) en el jugador.
 * [EN] Game camera settings. Defines tracking smoothness to prevent motion sickness for the player.
 */
const CAMERA_CONFIG = {
    smoothing: 0.08  // Factor de interpolación aumentado para un seguimiento más firme y fluido
};

/**
 * [ES] Valores físicos globales para simulaciones como flotabilidad y burbujas, aportando realismo al entorno acuático.
 * [EN] Global physical values for simulations such as buoyancy and bubbles, adding realism to the aquatic environment.
 */
const PHYSICS = {
    bubbleDecayMin: 0.003,
    bubbleDecayMax: 0.010,
    buoyancyMin: 0.04,
    buoyancyMax: 0.16,
    bubbleVelocityDamping: { x: 0.98, y: 0.97 },
    bubbleGrowthRate: 0.015,
    bubbleSizeMultiplierMin: 1.2,
    bubbleSizeMultiplierMax: 1.8
};

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.GRAPHICS_QUALITY = GRAPHICS_QUALITY;
    window.QUALITY_PROFILES = QUALITY_PROFILES;
    window.WORLD = WORLD;
    window.BASE_CONFIG = BASE_CONFIG;
    window.PLAYER_CONFIG = PLAYER_CONFIG;
    window.CAMERA_CONFIG = CAMERA_CONFIG;
    window.PHYSICS = PHYSICS;
}
