/**
 * GAME CONSTANTS - Configuración del mundo y física del juego
 */

const WORLD = {
    width: 2000,         // Reducido de 8000 para juego más vertical
    height: 120000,      // Aumentado para 12,000 metros (escala 10:1)
    depthScale: 10,      // 10 unidades de juego = 1 metro
    friction: 0.96,
    particleCount: 400,
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

const BASE_CONFIG = {
    y: -50,
    width: 3000,
    height: 150,
    color: '#1a2a3a',
    lightColor: '#00ffff'
};

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

const CAMERA_CONFIG = {
    smoothing: 0.05  // Factor de interpolación para seguimiento suave
};

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
    window.WORLD = WORLD;
    window.BASE_CONFIG = BASE_CONFIG;
    window.PLAYER_CONFIG = PLAYER_CONFIG;
    window.CAMERA_CONFIG = CAMERA_CONFIG;
    window.PHYSICS = PHYSICS;
}
