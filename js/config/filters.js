/**
 * [ES] Configuración central del sistema de soporte vital. 
 * Todos los valores temporales se expresan en MINUTOS para facilitar el balanceo del juego.
 */
const FILTER_CONFIG = {
    // DURACIONES TOTALES (En Minutos)
    oxygenDuration: 30.0,            // El tanque de oxígeno dura 30 minutos (autonomía total)
    co2BuildUpTime: 12.0,            // Sin filtros, te asfixias en 12 minutos

    // FILTROS DE CAL SODADA (En Minutos)
    scrubberDuration: 0.5,          // Cada filtro dura 10 minutos de uso continuo
    scrubberReplacementTime: 2.5,    // Mantenimiento de 2.5 minutos (enfriamiento de filtro usado)

    // UMBRALES DE EMERGENCIA (En Segundos)
    co2PoisoningGracePeriod: 6,   // 10 Segundos de gracia (con alerta visual y cuenta atrás)
};
