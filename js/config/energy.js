/**
 * CONFIGURACIÓN DEL SISTEMA DE ENERGÍA - GUÍA DE CONFIGURACIÓN
 * 
 * ¿CÓMO SE CALCULA EL CONSUMO?
 * El sistema usa un cálculo de dos pasos en EnergyManager.js:
 * 
 * 1. Consumo en Watts (Vatios): 
 *    Suma la 'baseDischargeRate' + todos los sistemas activos en 'consumptionParams'.
 *    - Este valor (Watts) es el que ves en el monitor de "Watts" y en la barra de eficiencia.
 * 
 * 2. Drenaje de Batería (% por segundo):
 *    Fórmula: (Watts Totales * 0.005) * dt (delta time)
 *    - El multiplicador fijo es 0.005.
 *    - Ejemplo: Si consumes 15W totales -> 15 * 0.005 = 0.075% de batería por segundo.
 *    - Con 15W, la batería duraría 1333 segundos (aprox. 22 minutos).
 */

window.ENERGY_CONFIG = {
    // --- PARÁMETROS GENERALES ---
    maxBattery: 100, // Siempre 100 como base para el porcentaje.

    // Descarga constante del submarino (Electrónica base, soporte vital mínimo).
    // Se divide por 60 en el código para obtener el gasto por segundo.
    baseDischargeRate: 48,

    // --- CELDAS DE REPUESTO ---
    cellCount: 3,

    // Tiempo que tarda una batería vacía en volver a estar al 100% en el inventario.
    cellRechargeTime: 5, // En MINUTOS.

    // Tiempo que el submarino se queda a oscuras (Blackout) mientras cambias la batería.
    swapTime: 0.05, // En MINUTOS (0.05 min = 3 segundos).

    // --- CONSUMO POR SISTEMA (En Watts) ---
    // Aumentar estos valores hará que la batería baje más rápido y la barra de eficiencia suba.
    consumptionParams: {
        faro: 5,        // El faro exterior.
        sonar: 3,       // El sonar de profundidad.
        motores: 12,    // Propulsión activa.
        scrubbers: 2,   // Filtros de CO2.
        calefactor: 8,  // Calefacción interna (Bioma Abisal).
        ventilacion: 10 // Sistemas de ventilación (Soporte Vital).
    },

    // --- MONITOR DE EFICIENCIA ---
    // Controla cuándo la barra de consumo cambia de color (Verde -> Amarillo -> Rojo).
    // Estos valores deben ir en consonancia con la suma de tus 'consumptionParams'.
    efficiencyThresholds: {
        green: 15,  // Hasta 15W la barra es verde (Estable).
        yellow: 25  // De 15W a 25W es amarilla (Sobrecarga). Más de 25W es roja (Crítico).
    }
};
