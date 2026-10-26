// Motor de dibujo «con volumen y trama» (la figura del agente y los dibujos de los objetos): piezas con su normal
// (cápsulas, elipses, cajas, perfiles) o fundidas en un volumen (unión suave de campos de distancia), una luz desde
// arriba a la izquierda, sombras proyectadas por las piezas de delante, un poco de grano y la sombra cuantizada con
// trama ordenada (Bayer). El resultado es una rejilla de píxeles que se pinta en un <canvas> ampliado sin suavizar
// (antes se escribía con medios bloques ▀▄ en texto y entre carácter y carácter quedaban rayas finas).

import { clamp, lerp } from '../util/rng.js';
export { clamp, lerp };
// paso suave entre a y b, y distancia de (x, y) al segmento a-b (retratos)
export const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const segD = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
export const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const DARK = [0, 0, 0];

// ---------------------------------------------------------------- formas sueltas (devuelven la normal local o null)
// Cada forma lleva, si se puede saber, su caja (f.bb = [x0, y0, x1, y1]): fuera de ella siempre devuelve null. Al
// rasterizar, una capa cuya caja no toca el punto ni se evalúa (el resultado es el mismo, píxel a píxel: la caja es
// holgada). Una forma sin caja (las hechas a mano en cada dibujo) se evalúa siempre, como antes.
const EPS = 1e-6;
const boxed = (f, x0, y0, x1, y1) => { f.bb = [x0 - EPS, y0 - EPS, x1 + EPS, y1 + EPS]; return f; };
const unionBB = (fs) => { if (!fs.length || fs.some((f) => !f || !f.bb)) return null; const b = [Infinity, Infinity, -Infinity, -Infinity]; for (const f of fs) { b[0] = Math.min(b[0], f.bb[0]); b[1] = Math.min(b[1], f.bb[1]); b[2] = Math.max(b[2], f.bb[2]); b[3] = Math.max(b[3], f.bb[3]); } return b; };
export function cap(ax, ay, bx, by, ra, rb = ra) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9, rm = Math.max(Math.abs(ra), Math.abs(rb));
  return boxed((x, y) => {
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const ox = x - (ax + dx * t), oy = y - (ay + dy * t), r = ra + (rb - ra) * t;
    return ox * ox + oy * oy <= r * r ? { nx: ox / r, ny: oy / r } : null;
  }, Math.min(ax, bx) - rm, Math.min(ay, by) - rm, Math.max(ax, bx) + rm, Math.max(ay, by) + rm);
}
// cadena de cápsulas por varios puntos (cargadores curvos, mangueras…)
export const chain = (pts, r0, r1 = r0) => any(...pts.slice(1).map((p, i) => cap(pts[i][0], pts[i][1], p[0], p[1], lerp(r0, r1, i / (pts.length - 1)), lerp(r0, r1, (i + 1) / (pts.length - 1)))));
export function ell(cx, cy, rx, ry) { return boxed((x, y) => { const nx = (x - cx) / rx, ny = (y - cy) / ry; return nx * nx + ny * ny <= 1 ? { nx, ny } : null; }, cx - Math.abs(rx), cy - Math.abs(ry), cx + Math.abs(rx), cy + Math.abs(ry)); }
export function box(x0, y0, x1, y1, soft = 0.75) {
  return boxed((x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return null;
    const k = (v) => Math.sign(v) * Math.abs(v) ** 5 * soft;
    return { nx: k(((x - x0) / (x1 - x0)) * 2 - 1), ny: k(((y - y0) / (y1 - y0)) * 2 - 1) };
  }, x0, y0, x1, y1);
}
// caja con las esquinas redondeadas (radio r)
export function rbox(x0, y0, x1, y1, r, soft = 0.8) {
  const b = box(x0, y0, x1, y1, soft);
  return boxed((x, y) => {
    const h = b(x, y);
    if (!h) return null;
    const cx = clamp(x, x0 + r, x1 - r), cy = clamp(y, y0 + r, y1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r ? h : null;
  }, x0, y0, x1, y1);
}
const smooth = (t) => t * t * (3 - 2 * t);
export const widthAt = (tbl, y) => { let i = 0; while (i < tbl.length - 2 && y > tbl[i + 1][0]) i++; const [ya, wa] = tbl[i], [yb, wb] = tbl[i + 1]; return lerp(wa, wb, smooth(clamp((y - ya) / (yb - ya || 1), 0, 1))); };
// perfil con anchura variable a lo largo de y: tabla de [y, media anchura]
export function profile(cx, tbl, flat = 0.3) {
  const y0 = tbl[0][0], y1 = tbl[tbl.length - 1][0], wm = Math.max(...tbl.map((r) => Math.abs(r[1])));
  return boxed((x, y) => {
    if (y < y0 || y > y1) return null;
    const nx = (x - cx) / widthAt(tbl, y);
    if (Math.abs(nx) > 1) return null;
    const ty = ((y - y0) / (y1 - y0)) * 2 - 1;
    return { nx: nx * (1 - flat * (1 - nx * nx)), ny: Math.sign(ty) * Math.abs(ty) ** 6 * 0.5 };
  }, cx - wm, Math.min(y0, y1), cx + wm, Math.max(y0, y1));
}
// polígono plano con los bordes biselados (piezas de armas: culatas, cajones, guardamanos…). holes: polígonos huecos
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
export function poly(P, bevel = 0.012, holes = []) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const rings = [P, ...holes];
  return boxed((x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1 || !inPoly(P, x, y) || holes.some((H) => inPoly(H, x, y))) return null;
    // distancia al borde más cercano y su normal hacia fuera
    let best = Infinity, nx = 0, ny = 0;
    for (const R of rings) for (let i = 0, j = R.length - 1; i < R.length; j = i++) {
      const [ax, ay] = R[j], [bx, by] = R[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
      if (d < best) { best = d; nx = px - x; ny = py - y; }
    }
    const k = (1 - clamp(best / bevel, 0, 1)) ** 1.4 * 0.92, l = Math.hypot(nx, ny) || 1;
    return { nx: (nx / l) * k, ny: (ny / l) * k };
  }, x0, y0, x1, y1);
}
// curva de Bézier cuadrática o cúbica como lista de puntos
export const bez = (pts, n = 12) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n;
  if (pts.length === 2) { const [a, b] = pts; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  if (pts.length === 3) { const [a, b, c] = pts; return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]]; }
  const [a, b, c, d] = pts; const u = 1 - t;
  return [u ** 3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t ** 3 * d[0], u ** 3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t ** 3 * d[1]];
});
// banda de anchura variable a lo largo de una línea (cargadores curvos, correas, hojas)
export function band(line, w0, w1 = w0, bevel) {
  const L = [], R = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (line.length - 1)) / 2;
    L.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]); R.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  return poly([...L, ...R.reverse()], bevel ?? Math.max(w0, w1) * 0.45);
}
export const any = (...fs) => { const f = (x, y) => { for (const g of fs) { const h = g(x, y); if (h) return h; } return null; }; const b = unionBB(fs); if (b) f.bb = b; return f; };
export const clip = (f, test) => { const g = (x, y) => (test(x, y) ? f(x, y) : null); if (f.bb) g.bb = f.bb; return g; };

// ---------------------------------------------------------------- campos de distancia para fundir piezas
// cada pieza: (x, y) → { d (negativo dentro), r (su «grosor», para la curvatura) }
// (cada pieza sabe la caja donde su distancia es ≤ T: bbT(T); fuse la usa para su propia caja)
export const sCap = (ax, ay, bx, by, ra, rb = ra) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9, rm = Math.max(ra, rb);
  const s = (x, y) => { const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1), r = ra + (rb - ra) * t; return { d: Math.hypot(x - ax - dx * t, y - ay - dy * t) - r, r }; };
  s.bbT = (T) => { const e = rm + T; return e < 0 ? null : [Math.min(ax, bx) - e, Math.min(ay, by) - e, Math.max(ax, bx) + e, Math.max(ay, by) + e]; };
  return s;
};
export const sEll = (cx, cy, rx, ry) => {
  const s = (x, y) => { const m = Math.min(rx, ry); return { d: (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * m, r: m }; };
  // d ≤ T ⇔ la elipse ampliada (1 + T/m) veces (con m > 0)
  const m = Math.min(rx, ry);
  if (rx > 0 && ry > 0) s.bbT = (T) => { const k = 1 + T / m; return k < 0 ? null : [cx - rx * k, cy - ry * k, cx + rx * k, cy + ry * k]; };
  return s;
};
export const sProf = (cx, tbl) => {
  const y0 = tbl[0][0], y1 = tbl[tbl.length - 1][0];
  const s = (x, y) => { const hw = widthAt(tbl, clamp(y, y0, y1)); return { d: Math.max(Math.abs(x - cx) - hw, (y0 - y) * 1.5, y - y1), r: hw }; };
  const wm = Math.max(...tbl.map((r) => r[1]));
  if (y1 >= y0) s.bbT = (T) => [cx - wm - T, y0 - T / 1.5, cx + wm + T, y1 + T];
  return s;
};
// unión suave: las piezas se funden en un solo volumen; el color y la ranura son los de la pieza más cercana
export function fuse(parts, k = 0.02) {
  const ev = (x, y) => {
    let d = 1e9, r = 0.05, w = -1;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].s(x, y);
      if (w < 0) { d = p.d; r = p.r; w = i; continue; }
      if (p.d - k > d && p.d > 0.06) continue; // lejos: no cuenta
      const h = clamp(0.5 + (0.5 * (p.d - d)) / k, 0, 1);
      if (p.d < d) w = i;
      d = lerp(p.d, d, h) - k * h * (1 - h); r = lerp(p.r, r, h);
    }
    return { d, r, w };
  };
  const f = (x, y) => {
    const e = ev(x, y);
    if (e.d > 0) return null;
    const E = 0.0025, gx = ev(x + E, y).d - ev(x - E, y).d, gy = ev(x, y + E).d - ev(x, y - E).d, gl = Math.hypot(gx, gy) || 1;
    const mag = clamp(1 + e.d / e.r, 0, 1) ** 0.85; // 1 en el borde, 0 de frente
    return { nx: (gx / gl) * mag, ny: (gy / gl) * mag, part: e.w };
  };
  // la caja: cada paso de la unión suave baja la distancia como mucho k/4 respecto a la menor de las dos, así que por
  // dentro (d ≤ 0) alguna pieza tiene d ≤ (n − 1)·k/4
  if (parts.length && parts.every((p) => p.s && p.s.bbT)) {
    const T = Math.max(0, (parts.length - 1) * k / 4) + EPS, bs = parts.map((p) => p.s.bbT(T)).filter(Boolean);
    if (bs.length) f.bb = [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))];
    else f.bb = [0, 0, -1, -1];
  }
  return f;
}

// ---------------------------------------------------------------- modelo: capas de atrás hacia delante
// { f: forma, c: color (o uno por pieza en las fundidas), slot?, tex?: (x, y, c, h) → c, flat?, glow? }
export function model() {
  const L = [];
  L.add = (f, c, slot = null, tex = null, opts = {}) => {
    // tolera los argumentos corridos: una textura donde va la ranura, o las opciones donde va la textura
    if (typeof slot === 'function') { opts = tex && typeof tex === 'object' ? tex : opts; tex = slot; slot = null; }
    if (tex && typeof tex === 'object') { opts = tex; tex = null; }
    L.push({ f, c, slot, tex, ...opts }); return L;
  };
  L.fused = (parts, k, tex = null) => L.add(fuse(parts, k), parts.map((p) => p.c), parts.map((p) => p.slot || null), tex);
  return L;
}

// la capa visible en (x, y), con su luz y la sombra que le echan las piezas de delante. { c, slot, shade, i }
const LIGHT = (() => { const v = [-0.45, -0.6, 0.66], n = Math.hypot(...v); return v.map((k) => k / n); })();
function sampler(M, opts) {
  // las cajas de las capas (las que la tienen): fuera, la capa ni se mira
  const N = M.length, BX0 = new Float64Array(N).fill(-Infinity), BY0 = new Float64Array(N).fill(-Infinity), BX1 = new Float64Array(N).fill(Infinity), BY1 = new Float64Array(N).fill(Infinity);
  for (let i = 0; i < N; i++) { const b = M[i].f.bb; if (b) { BX0[i] = b[0]; BY0[i] = b[1]; BX1[i] = b[2]; BY1[i] = b[3]; } }
  const top = (x, y) => { for (let i = N - 1; i >= 0; i--) { if (x < BX0[i] || x > BX1[i] || y < BY0[i] || y > BY1[i]) continue; const h = M[i].f(x, y); if (h) return [i, h]; } return null; };
  // la capa de más arriba que tapa (x, y) entre las que están por delante de la capa i (o -1): la sombra solo mira
  // esas (las de detrás, a menudo las más caras, el cuerpo fundido, no cambian nada)
  const above = (x, y, i) => { for (let j = N - 1; j > i; j--) { if (x < BX0[j] || x > BX1[j] || y < BY0[j] || y > BY1[j]) continue; if (M[j].f(x, y)) return j; } return -1; };
  const sh = opts.shadow || [0.012, 0.022], grainK = opts.grain ?? 0.1, gs = opts.grainScale || 300;
  return (x, y) => {
    const t = top(x, y);
    if (!t) return null;
    const [i, h] = t, m = M[i];
    const c0 = Array.isArray(m.c[0]) ? m.c[h.part] : m.c;
    const slot = Array.isArray(m.slot) ? m.slot[h.part] : m.slot;
    if (m.flat) return { c: c0, slot: null, shade: m.flat === true ? 0.35 : m.flat, i };
    if (m.glow) return { c: m.tex ? m.tex(x, y, c0, h) : c0, slot, shade: 1, i, glow: true };
    const nz = Math.sqrt(Math.max(0, 1 - h.nx * h.nx - h.ny * h.ny));
    let dif = Math.max(0, h.nx * LIGHT[0] + h.ny * LIGHT[1] + nz * LIGHT[2]);
    // sombra proyectada: si hacia la luz hay una pieza que está delante, esta casilla queda a la sombra
    for (const d of sh) { const o = above(x + LIGHT[0] * d, y + LIGHT[1] * d, i); if (o >= 0 && !M[o].flat) { dif *= 0.55; break; } }
    // brillo especular en metal y cristal
    let spec = 0;
    if (m.shiny) { const hz = nz * 0.72 + (-h.nx * 0.42 - h.ny * 0.55) * 0.55; spec = Math.max(0, hz) ** 18 * m.shiny; }
    const grain = (hash(Math.floor(x * gs), Math.floor(y * gs)) - 0.5) * grainK;
    const shade = clamp(0.14 + 0.86 * dif + grain + spec, 0, 1.25);
    return { c: m.tex ? m.tex(x, y, c0, h) : c0, slot, shade, i };
  };
}

// ---------------------------------------------------------------- estilo «trama en costuras» (el del juego)
// Sin grano aleatorio (rompía el patrón de la trama), 4 tonos por material con el tono desplazado (sombras frías, luces
// cálidas) en vez de multiplicar el color y trama Bayer solo en la franja (band) entre un tono y otro. Los degradados
// de luz propia (cielos, halos) van en escalones de brillo (glowStep) con la misma trama. setRasterStyle(null) vuelve
// al estilo anterior (color × sombra con grano y trama en todo); los otros campos (levels, palette) son de prueba.
export const RASTER_STYLE = Object.freeze({ grain: 0, band: 0.3, glowStep: 14 });
let STYLE = RASTER_STYLE;
export function setRasterStyle(s) { STYLE = s || null; }
export const rasterStyle = () => STYLE;
const COOL = [26, 22, 44], WARM = [255, 236, 196];
const TONES = [(c) => mix(mix(c, DARK, 0.62), COOL, 0.3), (c) => mix(mix(c, DARK, 0.4), COOL, 0.14), (c) => mix(c, DARK, 0.17), (c) => c, (c) => mix(c.map((v) => Math.min(255, v * 1.12)), WARM, 0.2)];
// cuatro tonos por material: sombra profunda (fría), sombra, base y luz (cálida)
const TONES4 = [(c) => mix(mix(c, DARK, 0.58), COOL, 0.26), (c) => mix(mix(c, DARK, 0.32), COOL, 0.1), (c) => c, (c) => mix(c.map((v) => Math.min(255, v * 1.14)), WARM, 0.16)];
const PALETTE = ['#0d0b0f', '#1a1719', '#2a2628', '#3d3836', '#55504a', '#716a60', '#938a7c', '#b8ad9a', '#ddd2bc', '#f4ecda',
  '#1b2030', '#2c3446', '#46506a', '#6a768e', '#9aa5b6', '#151a10', '#252e19', '#3a4524', '#55613a', '#768452', '#9eaa72',
  '#2e2616', '#4a3d22', '#6b5a34', '#8e7a4c', '#b3a06c', '#d8c897', '#2a160d', '#4a2716', '#6f3d1f', '#985a2c', '#c27d3f',
  '#5a2a0c', '#9c4a12', '#d8781e', '#f6a838', '#ffd77a', '#3a0c10', '#6e1818', '#a82626', '#e04a36', '#4a2c22', '#7a4e3a',
  '#a8745a', '#d0a080', '#ecc8a6', '#10303a', '#1d5a62', '#2f8f92', '#5fd0d0', '#b8fff4', '#2a1840', '#4e2a72', '#7a44a8',
  '#b07ae0', '#806010', '#d0a420', '#ffe060', '#16264a', '#2a4a8a', '#4a7ad0'].map(hex);
const SNAP = new Map();
function snap(c) {
  const k = ((c[0] >> 2) << 12) | ((c[1] >> 2) << 6) | (c[2] >> 2);
  let r = SNAP.get(k);
  if (r) return r;
  let best = 1e18;
  for (const p of PALETTE) {
    const rm = (c[0] + p[0]) / 2, dr = c[0] - p[0], dg = c[1] - p[1], db = c[2] - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < best) { best = d; r = p; }
  }
  SNAP.set(k, r);
  return r;
}

// ---------------------------------------------------------------- a píxeles
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const b4 = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];
// rejilla W×H de la caja box = { x0, x1, y0, y1 } (píxeles cuadrados: H = W × alto / ancho)
// crop = { i, j, w, h }: solo ese trozo de la rejilla, idéntico píxel a píxel (para animar una parte del dibujo)
export function rasterize(M, { W: Wf, box: B, levels = 6, crop = null, warp = null, ...opts }) {
  const Hf = Math.round((Wf * (B.y1 - B.y0)) / (B.x1 - B.x0));
  const C = crop || { i: 0, j: 0, w: Wf, h: Hf }, W = C.w, H = C.h;
  const st = STYLE;
  if (st) { opts = { ...opts, grain: st.grain ?? 0 }; levels = st.levels ?? 4; }
  const S0 = sampler(M, opts);
  const S = warp ? (x, y) => { const [u, v] = warp(x, y); return S0(u, v); } : S0; // warp: deformar la figura (p. ej. piernas más cortas)
  const rgba = new Uint8ClampedArray(W * H * 4), slots = new Array(W * H).fill(null);
  const pw = (B.x1 - B.x0) / Wf, ph = (B.y1 - B.y0) / Hf;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const gi = i + C.i, gj = j + C.j;
    const h = S(B.x0 + (gi + 0.5) * pw, B.y0 + (gj + 0.5) * ph);
    if (!h) continue;
    const k = j * W + i;
    const lv = h.glow ? 1 : Math.floor(h.shade * levels + b4(gi, gj)) / levels; // sombra cuantizada con trama
    if (st && st.band != null) {
      // trama solo en las costuras: tonos sólidos y, en una franja estrecha (st.band) entre uno y otro, trama Bayer
      let c;
      if (h.glow) {
        c = h.c.map((v) => Math.min(255, v * 1.1));
        // luz propia (cielos, degradados): escalones de st.glowStep por canal, con la misma trama en la costura
        const q = st.glowStep, w = st.glowBand ?? st.band;
        if (q) {
          // escalones del brillo (el canal mayor) sin tocar el tono: el color se escala entero
          const m = Math.max(c[0], c[1], c[2], 1), t = m / q, fl = Math.floor(t), fr = t - fl;
          const k = Math.max(1, fl + (fr < 0.5 - w / 2 ? 0 : fr > 0.5 + w / 2 ? 1 : (fr - (0.5 - w / 2)) / w > b4(gi, gj) ? 1 : 0)) * q / m;
          c = c.map((v) => Math.min(255, v * k));
        }
      }
      else {
        const t = clamp(h.shade, 0, 1.2) * 3.1 - 0.1, fl = Math.floor(t), fr = t - fl, w = st.band;
        const up = fr < 0.5 - w / 2 ? 0 : fr > 0.5 + w / 2 ? 1 : (fr - (0.5 - w / 2)) / w > b4(gi, gj) ? 1 : 0;
        c = TONES4[clamp(fl + up, 0, 3)](h.c);
      }
      rgba[k * 4] = c[0]; rgba[k * 4 + 1] = c[1]; rgba[k * 4 + 2] = c[2]; rgba[k * 4 + 3] = 255;
    } else if (st) {
      let c = h.glow ? h.c.map((v) => Math.min(255, v * 1.1)) : TONES[clamp(Math.round(lv * 4 - 0.25), 0, 4)](h.c);
      if (st.palette) c = snap(c);
      rgba[k * 4] = c[0]; rgba[k * 4 + 1] = c[1]; rgba[k * 4 + 2] = c[2]; rgba[k * 4 + 3] = 255;
    } else {
      const f = h.glow ? 1.1 : 0.3 + 0.95 * lv;
      rgba[k * 4] = h.c[0] * f; rgba[k * 4 + 1] = h.c[1] * f; rgba[k * 4 + 2] = h.c[2] * f; rgba[k * 4 + 3] = 255;
    }
    slots[k] = h.slot;
  }
  return { W, H, rgba, slots };
}
// la rejilla en un <canvas> ampliado scale veces, nítido (sin suavizar)
// (cada rejilla se pasa a un lienzo una vez; las copias siguientes, con drawImage: mucho más rápido que putImageData,
// que la base hacía en cada repintado con cada figura y cada retrato. Nadie cambia R.rgba después de dibujarla)
const SRC = new WeakMap();
export function sourceCanvas(R) {
  let src = SRC.get(R);
  if (!src) {
    src = document.createElement('canvas'); src.width = R.W; src.height = R.H;
    src.getContext('2d').putImageData(new ImageData(R.rgba, R.W, R.H), 0, 0);
    SRC.set(R, src);
  }
  return src;
}
export function toCanvas(R, scale = 3, cls = '') {
  const cv = document.createElement('canvas');
  cv.width = R.W; cv.height = R.H;
  cv.getContext('2d').drawImage(sourceCanvas(R), 0, 0);
  cv.className = 'px-art ' + cls;
  cv.style.width = R.W * scale + 'px'; cv.style.height = R.H * scale + 'px';
  return cv;
}
// píxel de la rejilla bajo el ratón
export function pixelAt(cv, R, ev) {
  const r = cv.getBoundingClientRect();
  const i = Math.floor(((ev.clientX - r.left) / r.width) * R.W), j = Math.floor(((ev.clientY - r.top) / r.height) * R.H);
  return i >= 0 && j >= 0 && i < R.W && j < R.H ? j * R.W + i : -1;
}
