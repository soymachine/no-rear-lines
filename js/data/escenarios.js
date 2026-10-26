// Los escenarios: el mapa, las fuerzas de cada bando, quién lleva cada bando y el guion de órdenes de prueba (el que
// usan el bot y las pruebas para el bando del jugador). Una ficha por escenario, con su id.
export const ESCENARIOS = [
  {
    id: 'granja', mapa: 'granja', nombre: { es: 'La granja del cruce', en: 'The crossroads farm' },
    descripcion: { es: 'Normandía, julio de 1944. Tomad la granja del cruce antes de que pasen quince minutos.', en: 'Normandy, July 1944. Take the crossroads farm within fifteen minutes.' },
    jugador: 'us', ia: ['de'],
    fuerzas: [
      { lado: 'us', escuadras: [{ tipo: 'us_fusileros', x: 8, y: 30 }, { tipo: 'us_fusileros', x: 8, y: 42 }], carros: [{ tipo: 'sherman', x: 4, y: 35 }] },
      { lado: 'de', escuadras: [{ tipo: 'de_gruppe', x: 120, y: 28 }, { tipo: 'de_gruppe', x: 120, y: 38 }], carros: [{ tipo: 'panzer4', x: 122, y: 33 }] },
    ],
    // segundos → órdenes del jugador (para el bot y las pruebas): a los setos de la primera línea, de la segunda y a la granja
    guion: {
      0: [{ tipo: 'mover', escuadra: 'us0', x: 38, y: 28 }, { tipo: 'mover', escuadra: 'us1', x: 38, y: 42 }, { tipo: 'mover', carro: 'us', x: 34, y: 35 }],
      120: [{ tipo: 'mover', escuadra: 'us0', x: 50, y: 28 }, { tipo: 'mover', escuadra: 'us1', x: 50, y: 42 }, { tipo: 'mover', carro: 'us', x: 46, y: 35 }],
      240: [{ tipo: 'mover', escuadra: 'us0', x: 60, y: 27 }, { tipo: 'mover', escuadra: 'us1', x: 60, y: 41 }, { tipo: 'mover', carro: 'us', x: 58, y: 35 }],
      420: [{ tipo: 'correr', escuadra: 'us0', x: 72, y: 27 }, { tipo: 'correr', escuadra: 'us1', x: 70, y: 30 }],
    },
  },
];
export const ESCENARIO = Object.fromEntries(ESCENARIOS.map((e) => [e.id, e]));
