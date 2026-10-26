// Las hojas de las tropas: soldados de cada bando (de pie, cuerpo a tierra y caído, en 8 direcciones) y carros (el
// casco en 16 direcciones, entero y destruido; la torreta en 32), cada uno con su sombra. Se pintan una vez y se copian.
// La luz se queda arriba a la izquierda al girar (comun.js giro).
//   const h = hojasTropas();  h.soldado.us.pie[dir] → { cv, sombra }  ·  h.carro.sherman.casco[dir] / .roto[dir] / .torreta[dir]
import { model, box, ell, cap, poly, hash, mix } from '../ui/raster.js';
import { C, BANDO, DIBUJO_CARRO, giro, pinta, silueta, oscuro } from './comun.js';

export const S = 10; // caja del soldado (px)
export const B = 32; // caja de casco y torreta (px; caben girados)
export const DIRS = 8, DIRS_CASCO = 16, DIRS_TORRETA = 32;
const BU = { x0: 0, x1: S, y0: 0, y1: S }, BB = { x0: 0, x1: B, y0: 0, y1: B };

// el soldado mirando hacia a (radianes). Pocas piezas: a 10 px, brazos y mochila lo convertían en una araña
function soldado(lado, pose, a) {
  const c = S / 2, G = giro(a, c, c), L = model(), { uniforme, casco, grande } = BANDO[lado], rc = grande ? 1.95 : 1.75;
  const add = (f, col, o) => L.add(G.forma(f), col, null, null, o || {});
  if (pose === 'pie') {
    add(ell(c - 0.3, c, 1.6, 2.7), uniforme);
    add(cap(c + 0.6, c + 1.3, c + 4.4, c + 1.0, 0.5), C.arma);
    add(ell(c + 0.3, c, rc, rc), casco, { shiny: 0.3 });
  } else if (pose === 'tierra') {
    add(cap(c - 2.4, c, c - 4.6, c, 1.2), mix(uniforme, [0, 0, 0], 0.12));
    add(ell(c - 0.8, c, 2.6, 1.7), uniforme);
    add(cap(c + 2.4, c + 0.9, c + 4.8, c + 0.8, 0.45), C.arma);
    add(ell(c + 2.0, c, rc - 0.2, rc - 0.2), casco, { shiny: 0.3 });
  } else { // caído: de lado, sin arma, el casco suelto
    add(cap(c - 2.2, c + 0.6, c - 4.4, c + 1.8, 1.1), mix(uniforme, [0, 0, 0], 0.12));
    add(ell(c - 0.5, c, 2.6, 1.8), uniforme);
    add(ell(c + 3.0, c - 1.4, rc - 0.3, rc - 0.3), casco);
  }
  return pinta(BU, S, L);
}

const camo = (on) => on && ((x, y, c) => { const h = hash(Math.floor(x / 3), Math.floor(y / 3)); return h < 0.25 ? C.camoV : h > 0.82 ? C.camoM : c; });
function casco(d, a) {
  const c = B / 2, G = giro(a, c, c), L = model(), l = d.largo / 2, w = d.ancho / 2;
  const add = (f, col, tx, o) => L.add(G.forma(f), col, null, G.tex(tx) || null, o || {});
  const ruedas = (x, y, cc) => (Math.floor((x - c) / 2) % 2 ? mix(cc, [0, 0, 0], 0.3) : cc);
  add(box(c - l, c - w, c + l, c - w + 2.6, 0.4), C.oruga, ruedas);
  add(box(c - l, c + w - 2.6, c + l, c + w, 0.4), C.oruga, ruedas);
  add(poly([[c - l + 0.6, c - w + 2.2], [c + l - 2.6, c - w + 2.2], [c + l - 0.4, c - w + 3.6], [c + l - 0.4, c + w - 3.6], [c + l - 2.6, c + w - 2.2], [c - l + 0.6, c + w - 2.2]], 1.2), d.color, camo(d.camo));
  add(box(c - l + 1.2, c - w + 3.4, c - l + 5.2, c + w - 3.4, 0.3), mix(d.color, [0, 0, 0], 0.15), (x, y, cc) => (Math.floor(x - c) % 2 ? mix(cc, [0, 0, 0], 0.25) : cc));
  return pinta(BB, B, L);
}
// la torreta, en otro tono que el casco y con un aro oscuro debajo: del mismo color se perdía a ×1
function torreta(d, a) {
  const c = B / 2, G = giro(a, c, c), L = model(), col = mix(d.color, [255, 250, 225], 0.14);
  const add = (f, cc, tx, o) => L.add(G.forma(f), cc, null, G.tex(tx) || null, o || {});
  add(ell(c, c, 5.4, 5), mix(d.color, [0, 0, 0], 0.55), null, { flat: 0.5 });
  add(cap(c + 3, c, c + d.cañon, c, 0.65), mix(d.color, [0, 0, 0], 0.2), null, { shiny: 0.4 });
  if (d.torreta === 'caja') add(box(c + d.cañon - 1.2, c - 0.9, c + d.cañon, c + 0.9, 0.5), mix(d.color, [0, 0, 0], 0.3));
  if (d.torreta === 'redonda') add(ell(c, c, 4.8, 4.3), col);
  else add(poly([[c - 4.6, c - 3.8], [c + 2.8, c - 3.8], [c + 4.2, c - 2.2], [c + 4.2, c + 2.2], [c + 2.8, c + 3.8], [c - 4.6, c + 3.8]], 1.0), col, camo(d.camo));
  add(ell(c - 1.6, c + 1.4, 1.3, 1.3), mix(d.color, [0, 0, 0], 0.3));
  return pinta(BB, B, L);
}

let hechas = null;
export function hojasTropas() {
  if (hechas) return hechas;
  const conS = (cv) => ({ cv, sombra: silueta(cv) });
  const soldadoH = {};
  for (const lado of Object.keys(BANDO)) {
    soldadoH[lado] = {};
    for (const pose of ['pie', 'tierra', 'caido']) soldadoH[lado][pose] = Array.from({ length: DIRS }, (_, i) => { const cv = soldado(lado, pose, (i / DIRS) * Math.PI * 2); return conS(pose === 'caido' ? oscuro(cv, 0.35) : cv); });
  }
  const carroH = {};
  for (const [id, d] of Object.entries(DIBUJO_CARRO)) {
    const cascos = Array.from({ length: DIRS_CASCO }, (_, i) => casco(d, (i / DIRS_CASCO) * Math.PI * 2));
    const torretas = Array.from({ length: DIRS_TORRETA }, (_, i) => torreta(d, (i / DIRS_TORRETA) * Math.PI * 2));
    carroH[id] = { casco: cascos.map(conS), roto: cascos.map((cv) => conS(oscuro(cv, 0.6))), torreta: torretas, torretaRota: torretas.map((cv) => oscuro(cv, 0.6)) };
  }
  hechas = { soldado: soldadoH, carro: carroH };
  return hechas;
}
// la fila de una hoja para un ángulo (radianes), con n direcciones
export const fila = (a, n) => ((Math.round(a / ((2 * Math.PI) / n)) % n) + n) % n;
