// Las escuadras y los carros: una ficha por tipo, con su id. Distancias en casillas de 4 m, velocidades en casillas por
// segundo, giros en grados por segundo. La prueba tests/datos.mjs comprueba que cada ficha está completa.

// cada soldado: su puesto (el primero es el jefe) y su arma (js/data/armas.js)
export const ESCUADRAS = [
  {
    id: 'us_fusileros', lado: 'us', nombre: { es: 'Escuadra de fusileros', en: 'Rifle squad' }, humo: 2, moral: 70,
    soldados: [
      { puesto: 'jefe', arma: 'thompson' }, { puesto: 'bar', arma: 'bar' },
      ...Array.from({ length: 8 }, () => ({ puesto: 'fusilero', arma: 'm1' })),
    ],
  },
  {
    id: 'de_gruppe', lado: 'de', nombre: { es: 'Gruppe de fusileros', en: 'Rifle Gruppe' }, humo: 2, moral: 72,
    soldados: [
      { puesto: 'jefe', arma: 'mp40' }, { puesto: 'ametrallador', arma: 'mg42' },
      { puesto: 'sirviente', arma: 'kar98k' }, { puesto: 'sirviente', arma: 'kar98k' },
      ...Array.from({ length: 6 }, () => ({ puesto: 'fusilero', arma: 'kar98k' })),
    ],
  },
];

// blindaje: mm efectivos a 0° (ya con la inclinación de la placa) por lado, del casco y de la torreta
export const CARROS = [
  {
    id: 'sherman', lado: 'us', nombre: { es: 'M4 Sherman', en: 'M4 Sherman' }, cañon: 'm3_75', coaxial: 'browning',
    velocidad: 2.2, giroCasco: 30, giroTorreta: 24, vista: 60, largo: 6, ancho: 3,
    blindaje: { casco: { frente: 90, lado: 38, trasera: 38 }, torreta: { frente: 76, lado: 51, trasera: 51 } },
  },
  {
    id: 'panzer4', lado: 'de', nombre: { es: 'Panzer IV H', en: 'Panzer IV H' }, cañon: 'kwk40', coaxial: 'mg34',
    velocidad: 2, giroCasco: 28, giroTorreta: 14, vista: 60, largo: 6, ancho: 3,
    blindaje: { casco: { frente: 85, lado: 30, trasera: 20 }, torreta: { frente: 50, lado: 30, trasera: 30 } },
  },
];

export const ESCUADRA = Object.fromEntries(ESCUADRAS.map((e) => [e.id, e]));
export const CARRO = Object.fromEntries(CARROS.map((c) => [c.id, c]));
