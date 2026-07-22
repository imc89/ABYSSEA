/**
 * EVENT CREATURES CATALOG
 * [ES] Catálogo de criaturas de eventos aleatorios.
 *      Aquí se define la configuración completa de cada criatura de evento:
 *      datos visuales, de profundidad, movimiento y probabilidad de aparición.
 * [EN] Random event creatures catalog.
 *      Complete configuration for each event creature:
 *      visual data, depth range, movement, and spawn probability.
 */

const EVENT_CREATURES = [
    {
        // --- Identificación y Escaneo / Identification & Scanning ---
        id: 'event_cachalote',
        nombreKey: 'event_cachalote_name',
        cientificoKey: 'event_cachalote_sci',
        descripcionKey: 'event_cachalote_desc',
        groupId: 'event_cachalote_group',

        // --- Recurso Visual / Visual Asset ---
        imagen: 'img/event_creatures/WHALE/sperm_whale.gif',
        width: 1650,
        height: 663,

        // --- Profundidad de aparición / Depth spawn range ---
        minProf: 1500,
        maxProf: 2250,

        // --- Comportamiento / Behaviour ---
        esCardumen: false,
        numLuces: 0,

        // --- Movimiento inicial / Initial movement ---
        spawnOffsetX: 2400,   // Desplazamiento X desde el jugador para aparecer / X offset from player to spawn
        spawnOffsetY: -200,   // Desplazamiento Y desde el jugador / Y offset from player
        initialVx: -2.0,
        initialVy: 0.2,

        // --- Control de spawn / Spawn control ---
        spawnProbability: 1,   // 0.0 = nunca / 1.0 = siempre  
        checkInterval: 7     // Segundos entre comprobaciones de spawn / Seconds between spawn checks
    }
];

// Exportación global / Global export
if (typeof window !== 'undefined') {
    window.EVENT_CREATURES = EVENT_CREATURES;
}
