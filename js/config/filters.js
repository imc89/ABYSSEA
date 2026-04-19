/**
 * [ES] Configuración central del sistema de soporte vital. 
 * Todos los valores temporales se expresan en MINUTOS para facilitar el balanceo del juego.
 */
const FILTER_CONFIG = {
    // DURACIONES TOTALES (En Minutos)
    oxygenDuration: 30.0,            // El tanque de oxígeno dura 30 minutos (autonomía total)
    co2BuildUpTime: 5.0,            // Sin filtros, tarda 5 min en llegar a 15% (Acelerado por peligro)

    // FILTROS DE CAL SODADA (En Minutos)
    scrubberDuration: 5,          // Cada filtro dura 5 minutos de uso continuo
    scrubberReplacementTime: 3,    // Mantenimiento de 2.5 minutos (enfriamiento de filtro usado)

    // UMBRALES DE EMERGENCIA (En Segundos)
    co2PoisoningGracePeriod: 10,   // 10 Segundos de gracia (con alerta visual y cuenta atrás)

    // CAUDALÍMETRO (TANQUES Y CABINA)
    tankDuration: 15.0,           // Cada tanque dura 15 minutos de suministro nominal
    tankRefillTime: 5.0,          // Tardas 5 minutos en recargar un tanque vacío
    cabinO2DropRate: 1,         // La cabina baja % de O2 por segundo sin suministro
    cabinCo2RiseRate: 1,       // La cabina sube % de CO2 por segundo sin filtros (Acelerado)
    purgeCO2ReductionRate: 5.0,   // % de CO2 reducido por segundo durante purga manual
    purgeO2DrainRate: 2.0,        // % de tanque consumido por segundo durante purga (rapidísimo)
};
