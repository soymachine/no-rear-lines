// El terreno de un mapa entero, pintado una vez en un lienzo (el suelo en baldosas, los setos que se salen de su
// casilla, los árboles y las casas, cada uno con su sombra hacia abajo a la derecha). Cada fotograma solo copia el trozo
// que se ve. Las marcas que quedan (cráteres) se pintan encima de este mismo lienzo.
//   pintaTerreno(m) → OffscreenCanvas de m.w·T × m.h·T     (m: cargaMapa)
import { model, box, fuse, sEll, sCap, hash, mix } from '../ui/raster.js';
import { T, C, pinta, silueta } from './comun.js';

const VAR = 4, BT = { x0: 0, x1: T, y0: 0, y1: T };
const P = Math.ceil(T * 0.5), BS = { x0: -P, x1: T + P, y0: -P, y1: T + P }; // los setos se salen P px
const PA = T, BA = { x0: -PA, x1: T + PA, y0: -PA, y1: T + PA }; // y las copas, una casilla
let hojas = null;

function hazHojas() {
  const pastoTex = (v) => (x, y, c) => { const h = hash(Math.floor(x / 2) + v * 13, Math.floor(y / 2) + v * 29); return h < 0.13 ? C.pastoD : h > 0.92 ? C.pastoL : c; };
  const pasto = Array.from({ length: VAR }, (_, v) => { const L = model(); L.add(box(0, 0, T, T, 0), C.pasto, pastoTex(v)); return pinta(BT, T, L); });
  const suelo = Array.from({ length: VAR }, (_, v) => { const L = model(); L.add(box(0, 0, T, T, 0), C.suelo, (x, y, c) => (hash(Math.floor(x / 2) + v * 7, Math.floor(y / 2) + v * 3) < 0.2 ? mix(c, [0, 0, 0], 0.25) : c)); return pinta(BT, T, L); });
  // el camino: tierra con piedrecitas; donde no sigue, un borde de hierba mordido
  const camino = Array.from({ length: 32 }, (_, n) => {
    const m = n >> 1, v = n & 1, L = model();
    L.add(box(0, 0, T, T, 0), C.camino, (x, y, c) => {
      const i = Math.floor(x), j = Math.floor(y), d = Math.min(m & 1 ? 9 : y, m & 2 ? 9 : T - x, m & 4 ? 9 : T - y, m & 8 ? 9 : x);
      if (d < 1 + (hash(i + v * 5, j) < 0.5 ? 1 : 0)) return d < 1 ? C.pastoD : C.caminoD;
      const h = hash(i + v * 17, j + v * 11);
      return h < 0.08 ? C.caminoD : h > 0.95 ? C.caminoL : c;
    });
    return pinta(BT, T, L);
  });
  // el seto: matas fundidas hacia los vecinos que también son seto (máscara de 4 bits)
  const hojaTex = (x, y, c) => (hash(Math.floor(x * 0.7 + 50), Math.floor(y * 0.7 + 50)) > 0.8 ? C.setoL : c);
  const seto = Array.from({ length: 32 }, (_, n) => {
    const m = n >> 1, v = n & 1, c0 = T / 2, r = T * 0.42, ext = T / 2 + P * 0.6, parts = [{ s: sEll(c0, c0, T * 0.48, T * 0.48), c: C.seto }];
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], b) => {
      if (!(m & (1 << b))) return;
      parts.push({ s: sCap(c0, c0, c0 + dx * ext, c0 + dy * ext, r), c: C.seto });
      const t = 0.3 + hash(b, v) * 0.3; parts.push({ s: sEll(c0 + dx * T * t + dy * T * 0.12, c0 + dy * T * t - dx * T * 0.12, T * 0.36, T * 0.36), c: C.seto });
    });
    const L = model(); L.add(fuse(parts, T * 0.18), parts.map((p) => p.c), null, hojaTex);
    return pinta(BS, T + 2 * P, L);
  });
  // copas de árbol (bosque y árboles de los setos)
  const arbol = Array.from({ length: 3 }, (_, v) => {
    const c0 = T / 2, parts = [];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28 + v, d = i ? T * 0.42 : 0; parts.push({ s: sEll(c0 + Math.cos(a) * d, c0 + Math.sin(a) * d, T * (0.5 + hash(i, v) * 0.15), T * (0.5 + hash(v, i) * 0.15)), c: C.arbol }); }
    const L = model(); L.add(fuse(parts, T * 0.25), parts.map((p) => p.c), null, (x, y, c) => (hash(Math.floor(x * 0.6 + 80), Math.floor(y * 0.6 + 80)) > 0.78 ? C.arbolL : c));
    return pinta(BA, T + 2 * PA, L);
  });
  return { pasto, suelo, camino, seto, arbol, setoS: seto.map(silueta), arbolS: arbol.map(silueta) };
}

// tejado a cuatro aguas: cada punto mira al borde más cercano
function tejado(x0, y0, x1, y1) {
  const f = (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return null;
    const d = [y - y0, x1 - x, y1 - y, x - x0], i = d.indexOf(Math.min(...d)), n = [[0, -1], [1, 0], [0, 1], [-1, 0]][i];
    return { nx: n[0] * 0.62, ny: n[1] * 0.62 };
  };
  f.bb = [x0, y0, x1, y1];
  return f;
}
function casa(c) {
  const W = c.w * T, H = c.h * T, L = model(), col = c.teja ? C.teja : C.pizarra;
  L.add(tejado(0.5, 0.5, W - 0.5, H - 0.5), col, (x, y, cc) => (x < 1.5 || y < 1.5 || x > W - 1.5 || y > H - 1.5 ? mix(cc, [0, 0, 0], 0.35) : Math.floor(y) % 2 === 0 ? mix(cc, [0, 0, 0], 0.12) : cc));
  L.add(box(W * 0.7, H * 0.18, W * 0.7 + 1.6, H * 0.18 + 1.6, 0.6), C.muro);
  return pinta({ x0: 0, x1: W, y0: 0, y1: H }, W, L);
}

export function pintaTerreno(m) {
  if (!hojas) hojas = hazHojas();
  const H = hojas, cv = new OffscreenCanvas(m.w * T, m.h * T), g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const id = (x, y) => { const b = m.baldosa(x, y); return b ? b.id : null; };
  const mascara = (x, y, t) => (id(x, y - 1) === t ? 1 : 0) | (id(x + 1, y) === t ? 2 : 0) | (id(x, y + 1) === t ? 4 : 0) | (id(x - 1, y) === t ? 8 : 0);
  const v = (x, y) => Math.floor(hash(x, y) * VAR);
  const so = 1; // la sombra, 1 px abajo a la derecha (2 las casas y los árboles)
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = id(x, y), hj = t === 'camino' ? H.camino[mascara(x, y, 'camino') * 2 + (v(x, y) & 1)] : t === 'bosque' ? H.suelo[v(x, y)] : H.pasto[v(x, y)];
    g.drawImage(hj, x * T, y * T);
  }
  const arbolEn = (x, y) => (id(x, y) === 'bosque' && (x + y) % 2 === 0) || (id(x, y) === 'seto' && hash(x * 7, y) < 0.16);
  const casas = m.casas.map((c) => ({ ...c, teja: hash(c.x, c.y) > 0.55 })).map((c) => ({ ...c, cv: casa(c) }));
  g.globalAlpha = 0.45;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (id(x, y) === 'seto') g.drawImage(H.setoS[mascara(x, y, 'seto') * 2 + (v(x, y) & 1)], x * T - P + so, y * T - P + so);
  for (const c of casas) g.drawImage(silueta(c.cv), c.x * T + 2 * so, c.y * T + 2 * so);
  g.globalAlpha = 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (id(x, y) === 'seto') g.drawImage(H.seto[mascara(x, y, 'seto') * 2 + (v(x, y) & 1)], x * T - P, y * T - P);
  for (const c of casas) g.drawImage(c.cv, c.x * T, c.y * T);
  g.globalAlpha = 0.45;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (arbolEn(x, y)) g.drawImage(H.arbolS[v(y, x) % 3], x * T - PA + 2 * so, y * T - PA + 2 * so);
  g.globalAlpha = 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (arbolEn(x, y)) { const j = Math.round((hash(x, y + 5) - 0.5) * T * 0.5); g.drawImage(H.arbol[v(y, x) % 3], x * T - PA + j, y * T - PA - j); }
  return cv;
}

// un cráter o una mancha quemada, pintado para siempre en el lienzo del terreno
export function marcaCrater(cv, x, y, r = 3) {
  const g = cv.getContext('2d');
  g.fillStyle = `rgb(${C.craterL.join(',')})`; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), r + 1, r * 0.8 + 1, 0, 0, 7); g.fill();
  g.fillStyle = `rgb(${C.crater.join(',')})`; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), r, r * 0.8, 0, 0, 7); g.fill();
}

// el color de cada baldosa para el mapa táctico (una casilla, un píxel)
export const COLOR_TACTICO = { campo: C.pasto, seto: C.seto, camino: C.camino, casa: C.teja, bosque: C.arbol };
