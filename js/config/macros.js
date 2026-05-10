/**
 * MACRO CATALOG
 * [ES] Catálogo de eventos o encuentros a micro-escala. 
 */

const MACRO_CATALOG = {
    'eurythenes': {
        id: 'eurythenes',
        nombreKey: 'macro_eury_name',
        cientificoKey: 'macro_eury_sci',
        imagen: 'img/little/EURYTHENES/EURYTHENES.gif',
        descripcionKey: 'macro_eury_desc',
        subtitle: 'llanura_abisal',
        ancho: 120,
        alto: 60,
        minEspecimenes: 1,
        maxEspecimenes: 3,
        velocidadX: 1.5,
        velocidadY: 0.8,
        rangoDeteccion: 80,
        minProf: 500,
        maxProf: 600,
        cantidadPoints: 1
    },
    'hola': {
        id: 'hola',
        nombreKey: 'macro_clione_name',
        cientificoKey: 'macro_clione_sci',
        imagen: 'img/little/CLIONE/CLIONE.gif',
        descripcionKey: 'macro_clione_desc',
        subtitle: 'mar_abierto',
        ancho: 38,
        alto: 55,
        minEspecimenes: 1,
        maxEspecimenes: 3,
        velocidadX: 0.55,
        velocidadY: 0.65,
        rangoDeteccion: 90,
        minProf: 100,
        maxProf: 250,
        cantidadPoints: 1,
        posiciones: [{ x: 350, y: 300 }]
    }
};

if (typeof window !== 'undefined') {
    window.MACRO_CATALOG = MACRO_CATALOG;
}
