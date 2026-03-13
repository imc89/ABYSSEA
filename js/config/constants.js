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
        particleCount: 80,             // Océano más vacío, ultra rápido
        spotlightParticles: 20,
        aiThrottleRate: 0.2,           // IA al 20%
        useGradients: false,
        bubbleSpawnRate: 0.15,         // Muy pocas burbujas
        drawFishGlows: false           // Sin aura de neón en los peces (ahorro masivo)
    },
    MED: {
        particleCount: 200,            // Océano normal
        spotlightParticles: 60,
        aiThrottleRate: 0.5,           // IA al 50%
        useGradients: false,
        bubbleSpawnRate: 0.35,         // Burbujas normales
        drawFishGlows: true            // Con aura de neón cacheados
    },
    HIGH: {
        particleCount: 450,            // Océano denso
        spotlightParticles: 120,
        aiThrottleRate: 1.0,           // IA en tiempo real 
        useGradients: true,            // Degradados HD en burbujas y nieve
        bubbleSpawnRate: 0.70,         // Estela densa de burbujas
        drawFishGlows: true            // Aura de neón
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
    lightSpotRange: 275,     // Longitud del foco direccional (cono)
    lightGlowRange: 250,     // Radio del halo radial alrededor del submarino
    lightGlowIntensity: 0.24, // Opacidad máxima del halo radial (0.0 a 1.0)
    lightAngle: 0.24,
    lightOffsetY: 12,

    // Límites horizontales más estrictos
    horizontalBoundary: 100,  // Margen antes de empujar al jugador de vuelta

    // Zonas de profundidad reales (Basadas en infografía científica)
    // El orden es importante para la interpolación de color
    zones: [
        { depth: 0, color: [12, 74, 110], name: 'ZONA EPIPELÁGICA' },    // 0-200m
        { depth: 200, color: [2, 16, 43], name: 'ZONA MESOPELÁGICA' },   // 200-1000m
        { depth: 1000, color: [1, 5, 20], name: 'ZONA BATIPELÁGICA' },   // 1000-4000m
        { depth: 4000, color: [0, 1, 5], name: 'ZONA ABISOPELÁGICA' },  // 4000-6000m
        { depth: 6000, color: [0, 0, 0], name: 'ZONA HADALPELÁGICA' }   // 6000m+
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
    width: 150,
    height: 120,
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
    smoothing: 0.05  // Factor de interpolación para seguimiento suave
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
