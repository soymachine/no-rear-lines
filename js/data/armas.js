// Las armas: una ficha por arma, con su id. Distancias en casillas de 4 m, tiempos en segundos.
// - alcance: hasta dónde dispara.
// - cadencia: disparos por segundo cuando dispara (las automáticas, en ráfagas: rafaga balas cada 1/cadencia s).
// - precision y caida: probabilidad de acierto a quemarropa y cómo cae con la distancia (× e^(−d / caida)).
// - supresion: lo que suma a la supresión de quien está cerca de cada bala (radio en casillas).
// - letal: de cada impacto, la parte que mata (el resto hiere).
// Los cañones llevan penetracion (mm a 0 y a 250 casillas, entre medias se interpola) y explosivo (radio en casillas).
// La prueba tests/datos.mjs comprueba que cada ficha está completa.
export const ARMAS = [
  { id: 'm1', nombre: { es: 'M1 Garand', en: 'M1 Garand' }, tipo: 'fusil', alcance: 100, cadencia: 0.6, rafaga: 1, precision: 0.55, caida: 45, supresion: 5, radio: 1.2, letal: 0.4 },
  { id: 'thompson', nombre: { es: 'Subfusil Thompson', en: 'Thompson SMG' }, tipo: 'subfusil', alcance: 40, cadencia: 1.2, rafaga: 4, precision: 0.3, caida: 12, supresion: 4, radio: 1.2, letal: 0.35 },
  { id: 'bar', nombre: { es: 'Fusil automático BAR', en: 'BAR' }, tipo: 'automatico', alcance: 100, cadencia: 1, rafaga: 4, precision: 0.3, caida: 35, supresion: 9, radio: 1.6, letal: 0.4 },
  { id: 'kar98k', nombre: { es: 'Fusil Kar 98k', en: 'Kar 98k rifle' }, tipo: 'fusil', alcance: 100, cadencia: 0.4, rafaga: 1, precision: 0.6, caida: 45, supresion: 5, radio: 1.2, letal: 0.45 },
  { id: 'mp40', nombre: { es: 'Subfusil MP 40', en: 'MP 40 SMG' }, tipo: 'subfusil', alcance: 40, cadencia: 1.2, rafaga: 4, precision: 0.3, caida: 12, supresion: 4, radio: 1.2, letal: 0.35 },
  { id: 'mg42', nombre: { es: 'Ametralladora MG 42', en: 'MG 42 machine gun' }, tipo: 'ametralladora', alcance: 150, cadencia: 1.5, rafaga: 8, precision: 0.16, caida: 55, supresion: 14, radio: 2.2, letal: 0.4 },
  { id: 'browning', nombre: { es: 'Ametralladora coaxial Browning', en: 'Coaxial Browning MG' }, tipo: 'ametralladora', alcance: 120, cadencia: 1.2, rafaga: 6, precision: 0.14, caida: 50, supresion: 12, radio: 2, letal: 0.4 },
  { id: 'mg34', nombre: { es: 'Ametralladora coaxial MG 34', en: 'Coaxial MG 34' }, tipo: 'ametralladora', alcance: 120, cadencia: 1.2, rafaga: 7, precision: 0.15, caida: 50, supresion: 13, radio: 2, letal: 0.4 },
  { id: 'm3_75', nombre: { es: 'Cañón M3 de 75 mm', en: '75 mm M3 gun' }, tipo: 'cañon', alcance: 250, cadencia: 0.14, rafaga: 1, precision: 0.7, caida: 160, supresion: 30, radio: 3, letal: 0.6, penetracion: [90, 65], explosivo: 2 },
  { id: 'kwk40', nombre: { es: 'Cañón KwK 40 de 75 mm', en: '75 mm KwK 40 gun' }, tipo: 'cañon', alcance: 250, cadencia: 0.12, rafaga: 1, precision: 0.72, caida: 180, supresion: 30, radio: 3, letal: 0.6, penetracion: [120, 90], explosivo: 2 },
];
export const ARMA = Object.fromEntries(ARMAS.map((a) => [a.id, a]));
// lo que tiene que traer cada arma
export const CAMPOS_ARMA = ['alcance', 'cadencia', 'rafaga', 'precision', 'caida', 'supresion', 'radio', 'letal'];
