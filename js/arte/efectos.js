// Los efectos: bocanadas de humo (sin volumen y con transparencia: con sombreado parecían algodón), fogonazos (pequeño
// para las armas ligeras, grande para el cañón) y la explosión en cuatro fotogramas. Se pintan una vez.
//   hojasEfectos() → { humo: [3 tamaños], fogonazo: { chico, grande }, explosion: [4 fotogramas] }
import { model, ell, fuse, sEll, hash, mix } from '../ui/raster.js';
import { C, pinta } from './comun.js';

const disco = (r, col, tex, o = { glow: true }) => { const R = Math.ceil(r) + 1, L = model(); L.add(ell(R, R, r, r), col, null, tex || null, o); return pinta({ x0: 0, x1: 2 * R, y0: 0, y1: 2 * R }, 2 * R, L); };

let hechas = null;
export function hojasEfectos() {
  if (hechas) return hechas;
  // humo: tinta plana en dos tonos, con el tono oscuro abajo a la derecha (la luz sigue arriba a la izquierda)
  const humo = [3, 4.5, 6].map((r) => disco(r, C.humo, (x, y, c, h) => (h && h.nx + h.ny > 0.75 ? C.humoD : hash(Math.floor(x / 2), Math.floor(y / 2)) > 0.88 ? mix(c, [255, 255, 255], 0.35) : c)));
  const llama = (r, f) => { const R = Math.ceil(r * 1.6), L = model(); L.add(fuse([{ s: sEll(R, R, r, r * 0.45), c: C.fuego }, { s: sEll(R - r * 0.25, R, r * 0.45, r * 0.8), c: C.fuego }], r * 0.25), [C.fuego, C.fuego], null, f || null, { glow: true }); return pinta({ x0: 0, x1: 2 * R, y0: 0, y1: 2 * R }, 2 * R, L); };
  const fogonazo = { chico: llama(1.6), grande: llama(3.2, (x, y, c, h) => (h && Math.abs(h.nx) + Math.abs(h.ny) > 0.7 ? C.fuegoN : c)) };
  const explosion = [
    disco(3, [255, 246, 214]),
    disco(4, C.fuego, (x, y, c, h) => (h && Math.hypot(h.nx, h.ny) > 0.6 ? C.fuegoN : c)),
    disco(4.5, C.fuegoR, (x, y, c, h) => (h && Math.hypot(h.nx, h.ny) > 0.55 ? mix(C.fuegoR, [40, 30, 20], 0.5) : c)),
    disco(5, [92, 84, 70], (x, y, c) => (hash(Math.floor(x / 2), Math.floor(y / 2)) > 0.7 ? [120, 110, 92] : c)),
  ];
  hechas = { humo, fogonazo, explosion };
  return hechas;
}
// cuánto dura cada fotograma de la explosión (s)
export const TIEMPOS_EXPLOSION = [0.06, 0.1, 0.16, 0.5];
