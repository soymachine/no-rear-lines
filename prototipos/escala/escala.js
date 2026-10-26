// Prueba visual de escala (no es el juego): un trozo de bocage normando de 1 km, generado con semilla, con dos escuadras
// y un carro por bando, una cortina de humo y fuego de ametralladora. Sirve para decidir la resolución de dibujo, el
// tamaño de la baldosa y el de las unidades. Todo sale de raster.js, se pinta una vez en hojas (OffscreenCanvas) y se
// amplía ×N entero sin suavizar, como en el juego.
// Parámetros (?…): baldosa=8 (px por baldosa de 4 m) · res=960x540 (resolución de dibujo) · x=N (aumento; por defecto,
// el mayor entero que cabe) · vista=escena|mapa|hojas · marcas=0 (sin marcador de bando) · semilla=1944 ·
// mapa=<id> (en vez del bocage generado, un mapa de datos de js/data/mapas/, como el del prototipo: mapa=granja)
import { model, rasterize, box, ell, cap, poly, fuse, sEll, sCap, hash, hex, mix } from '../../js/ui/raster.js';
import { RNG } from '../../js/util/rng.js';

const Q = new URLSearchParams(location.search);
const T = +Q.get('baldosa') || 8, k = T / 8; // k: escala de las unidades respecto a la propuesta (baldosa de 8 px)
const [RW, RH] = (Q.get('res') || '960x540').split('x').map(Number);
const VISTA = Q.get('vista') || 'escena', MARCAS = Q.get('marcas') !== '0', SEM = +Q.get('semilla') || 1944;
const PXM = T / 4; // píxeles por metro

// ---------------------------------------------------------------- paleta (Normandía, verano de 1944)
const C = {
  pasto: hex('#6b8a3a'), pastoD: hex('#5c7833'), pastoL: hex('#7e9c45'),
  camino: hex('#8f7a55'), caminoD: hex('#76633f'), caminoL: hex('#a38d66'),
  seto: hex('#3f5f28'), setoL: hex('#56783a'), arbol: hex('#35532a'), arbolL: hex('#4a6e34'),
  suelo: hex('#46552c'), pizarra: hex('#5c6370'), teja: hex('#8e5038'), muro: hex('#a39a86'),
  usUni: hex('#7b6e46'), usCasco: hex('#5a5a3a'), deUni: hex('#5c6553'), deCasco: hex('#474d45'),
  mochila: hex('#5a5034'), arma: hex('#33302a'), piel: hex('#c49a78'),
  sherman: hex('#56603a'), panzer: hex('#b09f68'), camoV: hex('#5d6b3a'), camoM: hex('#7a5434'), oruga: hex('#2e2d28'),
  humo: hex('#d4d4cb'), fuego: hex('#ffd27a'),
};
const LADO = { us: '#4f8fe0', de: '#e0574a' }; // marcador de bando (interfaz)

// ---------------------------------------------------------------- utilidades
// giro de una forma alrededor de (cx, cy), con su normal girada (la luz se queda arriba a la izquierda) y su textura
function giro(a, cx, cy) {
  const c = Math.cos(a), s = Math.sin(a);
  const inv = (x, y) => [cx + (x - cx) * c + (y - cy) * s, cy - (x - cx) * s + (y - cy) * c];
  const fwd = (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
  const forma = (f) => {
    const g = (x, y) => { const [u, v] = inv(x, y), h = f(u, v); return h && { ...h, nx: h.nx * c - h.ny * s, ny: h.nx * s + h.ny * c }; };
    if (f.bb) { const [x0, y0, x1, y1] = f.bb, P = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => fwd(x, y)); g.bb = [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))]; }
    return g;
  };
  const tex = (t) => t && ((x, y, col, h) => { const [u, v] = inv(x, y); return t(u, v, col, h); });
  return { forma, tex, fwd };
}
// una rejilla rasterizada en un lienzo (lo transparente queda transparente)
function lienzo(R) { const cv = new OffscreenCanvas(R.W, R.H); cv.getContext('2d').putImageData(new ImageData(R.rgba, R.W, R.H), 0, 0); return cv; }
// la silueta de un dibujo, para su sombra en el suelo
function silueta(cv) { const s = new OffscreenCanvas(cv.width, cv.height), g = s.getContext('2d'); g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#141a0c'; g.fillRect(0, 0, cv.width, cv.height); return s; }
const px = (box_, W, L) => lienzo(rasterize(L, { W, box: box_ }));

// ---------------------------------------------------------------- el mapa: 250 × 250 baldosas de 4 m (1 km)
const DATOS = Q.get('mapa') ? (await import('../../js/data/mapas/index.js')).MAPA[Q.get('mapa')] : null;
const MW = DATOS ? DATOS.ancho : 250, MH = DATOS ? DATOS.alto : 250, CAMPO = 0, SETO = 1, CAMINO = 2, BOSQUE = 3, CASA = 4;
const map = new Uint8Array(MW * MH), arbolSeto = new Uint8Array(MW * MH);
const rng = new RNG(SEM);
const en = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const at = (x, y) => (en(x, y) ? map[y * MW + x] : -1);
const set = (x, y, t) => { if (en(x, y)) map[y * MW + x] = t; };
// parcelas por partición binaria, con setos en los bordes y alguna portilla
(function parte(x0, y0, x1, y1) {
  const w = x1 - x0, h = y1 - y0;
  if ((w <= 30 && h <= 30 && (w < 18 || h < 18 || rng.chance(0.45))) || (w < 14 && h < 14)) {
    for (let x = x0; x < x1; x++) set(x, y0, SETO);
    for (let y = y0; y < y1; y++) set(x0, y, SETO);
    if (rng.chance(0.14)) for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) set(x, y, BOSQUE);
    for (let n = rng.int(1, 2); n--;) { // portillas de 2 baldosas
      if (rng.chance(0.5)) { const x = rng.int(x0 + 2, Math.max(x0 + 2, x1 - 4)); set(x, y0, CAMPO); set(x + 1, y0, CAMPO); }
      else { const y = rng.int(y0 + 2, Math.max(y0 + 2, y1 - 4)); set(x0, y, CAMPO); set(x0, y + 1, CAMPO); }
    }
    return;
  }
  if (w >= h) { const m = x0 + Math.round(w * rng.float(0.38, 0.62)); parte(x0, y0, m, y1); parte(m, y0, x1, y1); }
  else { const m = y0 + Math.round(h * rng.float(0.38, 0.62)); parte(x0, y0, x1, m); parte(x0, m, x1, y1); }
})(0, 0, MW, MH);
for (let i = 0; i < MW * MH; i++) if (map[i] === SETO && rng.chance(0.16)) arbolSeto[i] = 1;
// caminos con setos a los lados (los caminos hundidos del bocage)
let caminoY = (x) => Math.round(124 + 7 * Math.sin(x / 37) + 3 * Math.sin(x / 13));
const caminoX = (y) => Math.round(116 + 5 * Math.sin(y / 29));
for (let x = 0; x < MW; x++) { const y = caminoY(x); set(x, y, CAMINO); set(x, y + 1, CAMINO); }
for (let y = 0; y < MH; y++) { const x = caminoX(y); set(x, y, CAMINO); set(x + 1, y, CAMINO); }
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  if (at(x, y) === CAMINO || at(x, y) === SETO) continue;
  const junto = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === CAMINO);
  if (junto && hash(x * 3, y * 7) > 0.07) set(x, y, SETO);
}
// el cruce y la granja (el objetivo), y un pueblo al este
const casas = [];
let cx = caminoX(124), cy = caminoY(cx);
const despeja = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (at(x, y) !== CAMINO) set(x, y, CAMPO); };
const casa = (x, y, w, h) => { casas.push({ x, y, w, h, teja: hash(x, y) > 0.55 }); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, CASA); };
despeja(cx + 3, cy - 15, cx + 18, cy - 2);
for (let x = cx + 3; x <= cx + 18; x++) { set(x, cy - 16, SETO); if (x < cx + 9 || x > cx + 10) set(x, cy - 1, SETO); }
for (let y = cy - 16; y <= cy - 1; y++) set(cx + 19, y, SETO);
casa(cx + 5, cy - 13, 6, 3); casa(cx + 13, cy - 12, 4, 6); casa(cx + 5, cy - 7, 3, 2);
for (let x = 160; x < 205; x += 8) {
  const y = caminoY(x);
  despeja(x - 1, y - 7, x + 6, y - 1); despeja(x - 1, y + 2, x + 6, y + 8);
  casa(x, y - 5, 4, 3); if (x % 16) casa(x + 1, y + 3, 3, 4);
}

// un mapa de datos en lugar del generado: la rejilla de texto, sus casas y el cruce en el centro de la escena
if (DATOS) {
  const { cargaMapa } = await import('../../js/sim/mapa.js');
  const md = cargaMapa(DATOS), A = { campo: CAMPO, seto: SETO, camino: CAMINO, casa: CASA, bosque: BOSQUE };
  for (let i = 0; i < MW * MH; i++) { const b = md.baldosa(i % MW, Math.floor(i / MW)); map[i] = A[b.id]; arbolSeto[i] = map[i] === SETO && hash(i, 7) < 0.16 ? 1 : 0; }
  casas.length = 0;
  for (const c of md.casas) casas.push({ ...c, teja: hash(c.x, c.y) > 0.55 });
  cx = 62; cy = 34;
  caminoY = (x) => { for (let y = cy - 6; y <= cy + 6; y++) if (at(x, y) === CAMINO) return y; return cy; };
}

// ---------------------------------------------------------------- hojas: baldosas, setos, árboles, casas
const VAR = 4;
const mascara = (x, y, t) => (at(x, y - 1) === t ? 1 : 0) | (at(x + 1, y) === t ? 2 : 0) | (at(x, y + 1) === t ? 4 : 0) | (at(x - 1, y) === t ? 8 : 0);
const BT = { x0: 0, x1: T, y0: 0, y1: T };
// el pasto: matas de 2 px más oscuras o más claras, por variante
const pastoTex = (v) => (x, y, c) => { const i = Math.floor(x / 2), j = Math.floor(y / 2), h = hash(i + v * 13, j + v * 29); return h < 0.13 ? C.pastoD : h > 0.92 ? C.pastoL : c; };
const hPasto = Array.from({ length: VAR }, (_, v) => { const L = model(); L.add(box(0, 0, T, T, 0), C.pasto, pastoTex(v)); return px(BT, T, L); });
const hSuelo = Array.from({ length: VAR }, (_, v) => { const L = model(); L.add(box(0, 0, T, T, 0), C.suelo, (x, y, c) => (hash(Math.floor(x / 2) + v * 7, Math.floor(y / 2) + v * 3) < 0.2 ? mix(c, [0, 0, 0], 0.25) : c)); return px(BT, T, L); });
// el camino: tierra con piedrecitas; donde no sigue el camino, un borde de hierba mordido
const hCamino = Array.from({ length: 16 * 2 }, (_, n) => {
  const m = n >> 1, v = n & 1, L = model();
  L.add(box(0, 0, T, T, 0), C.camino, (x, y, c) => {
    const i = Math.floor(x), j = Math.floor(y), d = Math.min(m & 1 ? 9 : y, m & 2 ? 9 : T - x, m & 4 ? 9 : T - y, m & 8 ? 9 : x);
    if (d < 1 + (hash(i + v * 5, j) < 0.5 ? 1 : 0) * k) return d < 1 ? C.pastoD : C.caminoD;
    const h = hash(i + v * 17, j + v * 11);
    return h < 0.08 ? C.caminoD : h > 0.95 ? C.caminoL : c;
  });
  return px(BT, T, L);
});
// el seto: matas fundidas hacia los vecinos que también son seto; se sale de su baldosa (P px por lado)
const P = Math.ceil(T * 0.5), BS = { x0: -P, x1: T + P, y0: -P, y1: T + P };
const hojaTex = (x, y, c) => { const h = hash(Math.floor(x * 0.7 + 50), Math.floor(y * 0.7 + 50)); return h > 0.8 ? C.setoL : c; };
const hSeto = Array.from({ length: 16 * 2 }, (_, n) => {
  const m = n >> 1, v = n & 1, c0 = T / 2, r = T * 0.42, ext = T / 2 + P * 0.6, parts = [{ s: sEll(c0, c0, T * 0.48, T * 0.48), c: C.seto }];
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], b) => {
    if (!(m & (1 << b))) return;
    parts.push({ s: sCap(c0, c0, c0 + dx * ext, c0 + dy * ext, r), c: C.seto });
    const t = 0.3 + hash(b, v) * 0.3; parts.push({ s: sEll(c0 + dx * T * t + dy * T * 0.12, c0 + dy * T * t - dx * T * 0.12, T * 0.36, T * 0.36), c: C.seto });
  });
  const L = model(); L.add(fuse(parts, T * 0.18), parts.map((p) => p.c), null, hojaTex);
  return px(BS, T + 2 * P, L);
});
// copas de árbol (bosque y árboles de los setos), más grandes que una baldosa
const PA = T, BA = { x0: -PA, x1: T + PA, y0: -PA, y1: T + PA };
const hArbol = Array.from({ length: 3 }, (_, v) => {
  const c0 = T / 2, parts = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28 + v, d = i ? T * 0.42 : 0; parts.push({ s: sEll(c0 + Math.cos(a) * d, c0 + Math.sin(a) * d, T * (0.5 + hash(i, v) * 0.15), T * (0.5 + hash(v, i) * 0.15)), c: C.arbol }); }
  const L = model(); L.add(fuse(parts, T * 0.25), parts.map((p) => p.c), null, (x, y, c) => (hash(Math.floor(x * 0.6 + 80), Math.floor(y * 0.6 + 80)) > 0.78 ? C.arbolL : c));
  return px(BA, T + 2 * PA, L);
});
// casas: tejado a cuatro aguas (cada punto mira al borde más cercano), con alero oscuro y chimenea
function tejado(x0, y0, x1, y1) {
  const f = (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return null;
    const d = [y - y0, x1 - x, y1 - y, x - x0], i = d.indexOf(Math.min(...d)), n = [[0, -1], [1, 0], [0, 1], [-1, 0]][i];
    return { nx: n[0] * 0.62, ny: n[1] * 0.62 };
  };
  f.bb = [x0, y0, x1, y1];
  return f;
}
const hCasa = new Map();
function hojaCasa(c) {
  const key = `${c.w}x${c.h}${c.teja}`;
  if (hCasa.has(key)) return hCasa.get(key);
  const W = c.w * T, H = c.h * T, L = model(), col = c.teja ? C.teja : C.pizarra;
  L.add(tejado(0.5, 0.5, W - 0.5, H - 0.5), col, (x, y, cc) => (x < 1.5 || y < 1.5 || x > W - 1.5 || y > H - 1.5 ? mix(cc, [0, 0, 0], 0.35) : Math.floor(y) % Math.max(2, Math.round(2 * k)) === 0 ? mix(cc, [0, 0, 0], 0.12) : cc));
  L.add(box(W * 0.7, H * 0.18, W * 0.7 + 1.6 * k, H * 0.18 + 1.6 * k, 0.6), C.muro);
  const R = lienzo(rasterize(L, { W, box: { x0: 0, x1: W, y0: 0, y1: H } })), out = { cv: R, sombra: silueta(R) };
  hCasa.set(key, out);
  return out;
}

// ---------------------------------------------------------------- hojas: soldados y carros
const S = Math.round(10 * k), BU = { x0: 0, x1: S, y0: 0, y1: S }; // caja del soldado
const DIRS = 8;
function soldado(lado, pose, a) {
  const c = S / 2, G = giro(a, c, c), L = model(), uni = lado === 'us' ? C.usUni : C.deUni, casco = lado === 'us' ? C.usCasco : C.deCasco;
  const add = (f, col, t, o) => L.add(G.forma(f), col, null, G.tex(t) || null, o || {});
  if (pose === 'pie') {
    add(box(c - 2.4 * k, c - 1.3 * k, c - 1.0 * k, c + 1.3 * k, 0.5), C.mochila);
    add(ell(c - 0.2 * k, c, 1.5 * k, 2.6 * k), uni);
    add(cap(c + 0.2 * k, c + 1.5 * k, c + 4.6 * k, c + 1.1 * k, 0.5 * k), C.arma);
    add(cap(c, c - 1.9 * k, c + 2.4 * k, c + 0.9 * k, 0.65 * k), uni);
    add(ell(c + 0.3 * k, c, (lado === 'de' ? 1.95 : 1.75) * k, (lado === 'de' ? 1.95 : 1.75) * k), casco, null, { shiny: 0.3 });
  } else { // cuerpo a tierra
    add(cap(c - 2.6 * k, c - 0.7 * k, c - 4.6 * k, c - 1.5 * k, 0.65 * k), uni);
    add(cap(c - 2.6 * k, c + 0.7 * k, c - 4.6 * k, c + 1.3 * k, 0.65 * k), uni);
    add(ell(c - 0.9 * k, c, 2.7 * k, 1.6 * k), uni);
    add(cap(c + 2.4 * k, c + 0.9 * k, c + 4.9 * k, c + 0.7 * k, 0.45 * k), C.arma);
    add(ell(c + 2.0 * k, c, (lado === 'de' ? 1.7 : 1.5) * k, (lado === 'de' ? 1.7 : 1.5) * k), casco, null, { shiny: 0.3 });
  }
  return px(BU, S, L);
}
const hSoldado = {};
for (const lado of ['us', 'de']) for (const pose of ['pie', 'tierra']) hSoldado[lado + pose] = Array.from({ length: DIRS }, (_, d) => { const cv = soldado(lado, pose, (d / DIRS) * Math.PI * 2); return { cv, sombra: silueta(cv) }; });

const B = Math.round(32 * k), BB = { x0: 0, x1: B, y0: 0, y1: B }; // caja de casco y torreta (cabe girada)
const CARROS = {
  sherman: { L: 23, W: 11.5, col: C.sherman, aro: 1, cañon: 15, camo: false },
  panzer: { L: 23, W: 11, col: C.panzer, aro: -0.5, cañon: 18, camo: true },
};
const camo = (on) => on && ((x, y, c) => { const h = hash(Math.floor(x / (3 * k)), Math.floor(y / (3 * k))); return h < 0.25 ? C.camoV : h > 0.82 ? C.camoM : c; });
function casco(tipo, a) {
  const t = CARROS[tipo], c = B / 2, G = giro(a, c, c), L = model(), l = t.L * k / 2, w = t.W * k / 2;
  const add = (f, col, tx, o) => L.add(G.forma(f), col, null, G.tex(tx) || null, o || {});
  const ruedas = (x, y, cc) => (Math.floor((x - c) / (2 * k)) % 2 ? mix(cc, [0, 0, 0], 0.3) : cc);
  add(box(c - l, c - w, c + l, c - w + 2.6 * k, 0.4), C.oruga, ruedas);
  add(box(c - l, c + w - 2.6 * k, c + l, c + w, 0.4), C.oruga, ruedas);
  add(poly([[c - l + 0.6 * k, c - w + 2.2 * k], [c + l - 2.6 * k, c - w + 2.2 * k], [c + l - 0.4 * k, c - w + 3.6 * k], [c + l - 0.4 * k, c + w - 3.6 * k], [c + l - 2.6 * k, c + w - 2.2 * k], [c - l + 0.6 * k, c + w - 2.2 * k]], 1.2 * k), t.col, camo(t.camo));
  add(box(c - l + 1.2 * k, c - w + 3.4 * k, c - l + 5.2 * k, c + w - 3.4 * k, 0.3), mix(t.col, [0, 0, 0], 0.15), (x, y, cc) => (Math.floor((x - c) / k) % 2 ? mix(cc, [0, 0, 0], 0.25) : cc));
  return px(BB, B, L);
}
function torreta(tipo, a) {
  const t = CARROS[tipo], c = B / 2, G = giro(a, c, c), L = model();
  const add = (f, col, tx, o) => L.add(G.forma(f), col, null, G.tex(tx) || null, o || {});
  add(cap(c + 3 * k, c, c + t.cañon * k, c, 0.65 * k), mix(t.col, [0, 0, 0], 0.2), null, { shiny: 0.4 });
  if (tipo === 'panzer') add(box(c + (t.cañon - 1.2) * k, c - 0.9 * k, c + t.cañon * k, c + 0.9 * k, 0.5), mix(t.col, [0, 0, 0], 0.3));
  if (tipo === 'sherman') add(ell(c, c, 4.8 * k, 4.3 * k), t.col);
  else add(poly([[c - 4.6 * k, c - 3.8 * k], [c + 2.8 * k, c - 3.8 * k], [c + 4.2 * k, c - 2.2 * k], [c + 4.2 * k, c + 2.2 * k], [c + 2.8 * k, c + 3.8 * k], [c - 4.6 * k, c + 3.8 * k]], 1.0 * k), t.col, camo(true));
  add(ell(c - 1.6 * k, c + 1.4 * k, 1.3 * k, 1.3 * k), mix(t.col, [0, 0, 0], 0.25));
  return px(BB, B, L);
}
const conSombra = (cv) => ({ cv, sombra: silueta(cv) });
const hCasco = {}, hTorreta = {};
for (const tipo of Object.keys(CARROS)) {
  hCasco[tipo] = Array.from({ length: 16 }, (_, d) => conSombra(casco(tipo, (d / 16) * Math.PI * 2)));
  hTorreta[tipo] = Array.from({ length: 32 }, (_, d) => torreta(tipo, (d / 32) * Math.PI * 2));
}
// el humo: bocanadas con volumen (3 tamaños), que se pintan con algo de transparencia
const hHumo = [3, 4.5, 6].map((r) => { const R = Math.ceil(r * k) + 1, L = model(); L.add(ell(R, R, r * k, r * k), C.humo, (x, y, c) => (hash(Math.floor(x), Math.floor(y)) > 0.85 ? mix(c, [255, 255, 255], 0.3) : c)); return px({ x0: 0, x1: 2 * R, y0: 0, y1: 2 * R }, 2 * R, L); });
const hFogonazo = (() => { const R = Math.ceil(3 * k), L = model(); L.add(fuse([{ s: sEll(R, R, 2.6 * k, 1.1 * k), c: C.fuego }, { s: sEll(R - 0.6 * k, R, 1.2 * k, 2 * k), c: C.fuego }], 0.6 * k), [C.fuego, C.fuego], null, { glow: true }); return px({ x0: 0, x1: 2 * R, y0: 0, y1: 2 * R }, 2 * R, L); })();

// ---------------------------------------------------------------- la escena (metros respecto al cruce)
const O = { x: (cx + 1) * T, y: (cy + 1) * T }; // el cruce, en píxeles del mundo
const m2 = (mx, my) => ({ x: O.x + mx * PXM, y: O.y + my * PXM });
const enCamino = (mx) => { const tx = Math.round(cx + 1 + mx / 4); return { x: O.x + mx * PXM, y: (caminoY(tx) + 1) * T }; };
const dirA = (a) => ((Math.round(a / ((2 * Math.PI) / DIRS)) % DIRS) + DIRS) % DIRS;
const unidades = [];
const escuadra = (lado, pose, centro, a, huecos) => huecos.forEach(([dx, dy]) => { const c = Math.cos(a), s = Math.sin(a); unidades.push({ tipo: 'soldado', lado, pose, x: centro.x + (dx * c - dy * s) * PXM, y: centro.y + (dx * s + dy * c) * PXM, a: a + (hash(dx * 9, dy * 7) - 0.5) * 0.5 }); });
const CUÑA = [[0, 0], [-5, -5], [-5, 5], [-10, -10], [-10, 10], [-15, -15], [-15, 15], [-20, 0]];
const COLUMNA = [[0, 0], [-6, 1], [-12, -1], [-18, 1], [-24, -1], [-30, 1], [-36, 0], [-42, 1]];
escuadra('us', 'tierra', m2(-62, 22), 0.05, CUÑA);
escuadra('us', 'pie', enCamino(-80), 0, COLUMNA.map(([x, y]) => [x, y + 2]));
escuadra('de', 'tierra', m2(34, -26), Math.PI, [[0, 0], [0, 6], [0, -6], [3, 12], [3, -12]]);
escuadra('de', 'pie', m2(48, -16), Math.PI * 0.9, [[0, 0], [-4, 5], [-4, -5]]);
const mg = DATOS ? m2(26, 8) : m2(14, 16); escuadra('de', 'tierra', mg, Math.PI * 1.05, [[0, 0], [-2, 3]]);
unidades.push({ tipo: 'carro', carro: 'sherman', ...enCamino(-38), a: 0, ta: -0.35, dispara: true });
unidades.push({ tipo: 'carro', carro: 'panzer', ...m2(55, -80), a: Math.PI * 0.8, ta: Math.PI });
const humo = m2(-16, 25), crater = m2(-18, -12);
const trazadoras = [0, 1, 2].map((i) => ({ de: mg, a: m2(-58 + i * 4, 20 - i * 3), t: 0.25 + i * 0.3 }));

// ---------------------------------------------------------------- dibujar
const back = new OffscreenCanvas(RW, RH), g = back.getContext('2d');
g.imageSmoothingEnabled = false;
const cam = { x: Math.round(O.x + 10 * PXM - RW / 2), y: Math.round(O.y - RH / 2) };
function dibujaEscena() {
  g.fillStyle = '#000'; g.fillRect(0, 0, RW, RH);
  const tx0 = Math.floor(cam.x / T) - 2, ty0 = Math.floor(cam.y / T) - 2, tx1 = Math.ceil((cam.x + RW) / T) + 2, ty1 = Math.ceil((cam.y + RH) / T) + 2;
  const sx = (x) => Math.round(x - cam.x), sy = (y) => Math.round(y - cam.y), v = (x, y) => Math.floor(hash(x, y) * VAR);
  // el suelo
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) {
    const t = at(x, y); if (t < 0) continue;
    const hj = t === CAMINO ? hCamino[mascara(x, y, CAMINO) * 2 + (v(x, y) & 1)] : t === BOSQUE ? hSuelo[v(x, y)] : hPasto[v(x, y)];
    g.drawImage(hj, sx(x * T), sy(y * T));
  }
  // el cráter, en la capa de marcas
  g.fillStyle = '#3d3222'; g.beginPath(); g.ellipse(sx(crater.x), sy(crater.y), 3 * k, 2.4 * k, 0, 0, 7); g.fill();
  // setos y casas, con su sombra hacia abajo a la derecha
  const so = Math.max(1, Math.round(1.5 * k));
  g.globalAlpha = 0.45;
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) if (at(x, y) === SETO) g.drawImage(silSeto[mascara(x, y, SETO) * 2 + (v(x, y) & 1)], sx(x * T - P) + so, sy(y * T - P) + so);
  for (const c of casas) { const h = hojaCasa(c); g.drawImage(h.sombra, sx(c.x * T) + so * 2, sy(c.y * T) + so * 2); }
  g.globalAlpha = 1;
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) if (at(x, y) === SETO) g.drawImage(hSeto[mascara(x, y, SETO) * 2 + (v(x, y) & 1)], sx(x * T - P), sy(y * T - P));
  for (const c of casas) g.drawImage(hojaCasa(c).cv, sx(c.x * T), sy(c.y * T));
  // copas: el bosque y los árboles de los setos
  g.globalAlpha = 0.45;
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) if ((at(x, y) === BOSQUE && (x + y) % 2 === 0) || arbolSeto[y * MW + x]) g.drawImage(silArbol[v(y, x) % 3], sx(x * T - PA) + so * 2, sy(y * T - PA) + so * 2);
  g.globalAlpha = 1;
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) if ((at(x, y) === BOSQUE && (x + y) % 2 === 0) || arbolSeto[y * MW + x]) { const j = Math.round((hash(x, y + 5) - 0.5) * T * 0.5); g.drawImage(hArbol[v(y, x) % 3], sx(x * T - PA) + j, sy(y * T - PA) - j); }
  // las unidades: sombra y dibujo
  const orden = [...unidades].sort((a, b) => a.y - b.y);
  for (const u of orden) {
    if (u.tipo === 'soldado') {
      const h = hSoldado[u.lado + u.pose][dirA(u.a)], x = sx(u.x) - S / 2, y = sy(u.y) - S / 2;
      g.globalAlpha = 0.4; g.drawImage(h.sombra, x + so, y + so); g.globalAlpha = 1; g.drawImage(h.cv, x, y);
      if (MARCAS) { g.fillStyle = LADO[u.lado]; g.fillRect(x + Math.round(S / 2 - k), y + S, Math.max(2, Math.round(2 * k)), 1); }
    } else {
      const d16 = ((Math.round(u.a / (Math.PI / 8)) % 16) + 16) % 16, d32 = ((Math.round(u.ta / (Math.PI / 16)) % 32) + 32) % 32, t = CARROS[u.carro];
      const x = sx(u.x) - B / 2, y = sy(u.y) - B / 2, h = hCasco[u.carro][d16], ha = (d16 * Math.PI) / 8;
      g.globalAlpha = 0.4; g.drawImage(h.sombra, x + so * 2, y + so * 2); g.globalAlpha = 1; g.drawImage(h.cv, x, y);
      g.drawImage(hTorreta[u.carro][d32], Math.round(x + Math.cos(ha) * t.aro * k), Math.round(y + Math.sin(ha) * t.aro * k));
      if (u.dispara) { const ta = (d32 * Math.PI) / 16, bx = sx(u.x) + Math.cos(ta) * (t.cañon + 2.2) * k, by = sy(u.y) + Math.sin(ta) * (t.cañon + 2.2) * k; g.drawImage(hFogonazo, Math.round(bx - hFogonazo.width / 2), Math.round(by - hFogonazo.height / 2)); }
      if (MARCAS) { g.fillStyle = LADO[u.carro === 'sherman' ? 'us' : 'de']; g.fillRect(sx(u.x) - Math.round(3 * k), sy(u.y) + Math.round(9 * k), Math.round(6 * k), 1); }
    }
  }
  // trazadoras de la ametralladora
  for (const tr of trazadoras) {
    const dx = tr.a.x - tr.de.x, dy = tr.a.y - tr.de.y, d = Math.hypot(dx, dy), n = Math.round(10 * k);
    for (let i = 0; i < n; i++) { const f = tr.t + (i / d); g.fillStyle = i > n - 2 ? '#fff6c8' : '#ffc860'; g.fillRect(sx(tr.de.x + dx * f), sy(tr.de.y + dy * f), 1, 1); }
  }
  // la cortina de humo: bocanadas con su semilla, las de fuera más transparentes
  const rh = new RNG(7);
  for (let i = 0; i < 16; i++) { const a = rh.float(0, 6.28), d = rh.float(0, 7) * PXM, b = hHumo[rh.int(0, 2)]; g.globalAlpha = d > 5 * PXM ? 0.7 : 0.92; g.drawImage(b, sx(humo.x + Math.cos(a) * d * 1.4) - b.width / 2, sy(humo.y + Math.sin(a) * d) - b.height / 2); }
  g.globalAlpha = 1;
}
const silSeto = hSeto.map(silueta), silArbol = hArbol.map(silueta);

// el mapa entero, una baldosa por píxel, con el recuadro de lo que se ve
function dibujaMapa() {
  const cv = new OffscreenCanvas(MW, MH), m = cv.getContext('2d'), img = m.createImageData(MW, MH);
  const col = { [CAMPO]: C.pasto, [SETO]: C.seto, [CAMINO]: C.camino, [BOSQUE]: C.arbol, [CASA]: C.teja };
  for (let i = 0; i < MW * MH; i++) { const c = col[map[i]]; img.data.set([c[0], c[1], c[2], 255], i * 4); }
  m.putImageData(img, 0, 0);
  m.strokeStyle = '#ffffff'; m.strokeRect(Math.round(cam.x / T) + 0.5, Math.round(cam.y / T) + 0.5, Math.round(RW / T), Math.round(RH / T));
  return cv;
}
// las hojas, ampliadas, para mirar los dibujos de cerca
function dibujaHojas() {
  const cv = new OffscreenCanvas(RW, RH), h = cv.getContext('2d');
  h.fillStyle = '#6b8a3a'; h.fillRect(0, 0, RW, RH);
  let y = 2;
  for (const key of ['uspie', 'ustierra', 'depie', 'detierra']) { hSoldado[key].forEach((s, d) => h.drawImage(s.cv, 2 + d * (S + 2), y)); y += S + 2; }
  y += 2;
  for (const tipo of Object.keys(CARROS)) { for (let d = 0; d < 16; d++) { const x = 2 + d * (B + 1); h.drawImage(hCasco[tipo][d].cv, x, y); h.drawImage(hTorreta[tipo][d * 2], x + Math.round(Math.cos((d * Math.PI) / 8) * CARROS[tipo].aro * k), y + Math.round(Math.sin((d * Math.PI) / 8) * CARROS[tipo].aro * k)); } y += B + 1; }
  hSeto.forEach((s, i) => { if (i % 2 === 0) h.drawImage(s, 2 + (i / 2) * (T + 2 * P + 1), y); });
  return cv;
}

// ---------------------------------------------------------------- a la pantalla, ×N entero
const pant = document.getElementById('pantalla');
let fuente;
if (VISTA === 'mapa') fuente = dibujaMapa(); else if (VISTA === 'hojas') fuente = dibujaHojas(); else { dibujaEscena(); fuente = back; }
const N = +Q.get('x') || Math.max(1, Math.floor(Math.min(innerWidth / fuente.width, innerHeight / fuente.height)));
pant.width = fuente.width * N; pant.height = fuente.height * N;
const pg = pant.getContext('2d');
pg.imageSmoothingEnabled = false;
pg.drawImage(fuente, 0, 0, pant.width, pant.height);
document.getElementById('info').textContent = `${VISTA} · baldosa ${T} px (4 m) · ${RW}×${RH} ×${N} · se ven ${Math.round(RW / PXM)}×${Math.round(RH / PXM)} m · mapa ${MW * 4}×${MH * 4} m`;
window.__listo = true;
