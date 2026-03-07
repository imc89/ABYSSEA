/**
 * MACRO CATALOG - Configuración de encuentros de micro-escala
 */

const MACRO_CATALOG = {
    'eurythenes': {
        id: 'eurythenes',
        nombre: 'Eurythenes gryllus',
        cientifico: 'Anfípodo Gigante Abisal',
        imagen: './img/little/Eurythenes.png',
        descripcion: 'Este carroñero abisal es capaz de detectar restos orgánicos a kilómetros de distancia. Su presencia indica una zona de afloramiento rocoso con alta actividad biológica en microescala.',
        escala: 0.4,
        velocidadX: 1.5,
        velocidadY: 0.8,
        rangoDeteccion: 80,
        minProf: 500, // Metros
        maxProf: 600, // Metros
        cantidadPoints: 1 // Cuántos puntos de este tipo aparecen en el mapa
    }
    // Se pueden añadir más aquí (ej. 'calamar_juvenil', 'medusa_pequeña', etc.)
};

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.MACRO_CATALOG = MACRO_CATALOG;
}
