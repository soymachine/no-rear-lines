// Todos los mapas, por id. Uno nuevo se añade aquí (y tests/datos.mjs lo comprueba solo).
import { GRANJA } from './granja.js';

export const MAPAS = [GRANJA];
export const MAPA = Object.fromEntries(MAPAS.map((m) => [m.id, m]));
