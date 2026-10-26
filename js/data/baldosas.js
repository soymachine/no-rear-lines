// Las baldosas del terreno: una ficha por baldosa, con su id, su número (el que se guarda en la rejilla del mapa: no se
// renumera, se añade al final), la letra con la que se dibuja en los mapas de texto y sus reglas. Cada casilla mide 4 m.
// - anda: coste de cruzar la casilla para cada clase de movimiento (1 = campo abierto); null = no se puede.
// - tapa: corta la línea de visión (fov.js).
// - cubre: cuánto protege a quien está en ella o detrás (0 nada … 1 todo); la usa la puntería.
// La prueba tests/datos.mjs comprueba que cada ficha está completa.
export const BALDOSAS = [
  { id: 'campo', n: 0, letra: '.', nombre: { es: 'Campo', en: 'Field' }, anda: { pie: 1, carro: 1 }, tapa: false, cubre: 0 },
  { id: 'seto', n: 1, letra: '#', nombre: { es: 'Seto', en: 'Hedgerow' }, anda: { pie: 2.5, carro: 4 }, tapa: true, cubre: 0.25 },
  { id: 'camino', n: 2, letra: '=', nombre: { es: 'Camino', en: 'Road' }, anda: { pie: 0.8, carro: 0.6 }, tapa: false, cubre: 0 },
  { id: 'casa', n: 3, letra: 'C', nombre: { es: 'Casa', en: 'House' }, anda: { pie: null, carro: null }, tapa: true, cubre: 0.8 },
  { id: 'bosque', n: 4, letra: 'B', nombre: { es: 'Bosque', en: 'Woods' }, anda: { pie: 1.6, carro: null }, tapa: true, cubre: 0.4 },
];
// las clases de movimiento que tiene que traer cada baldosa
export const CLASES = ['pie', 'carro'];
export const BALDOSA = Object.fromEntries(BALDOSAS.map((b) => [b.id, b]));
export const POR_LETRA = Object.fromEntries(BALDOSAS.map((b) => [b.letra, b]));
// metros por casilla
export const METROS = 4;
