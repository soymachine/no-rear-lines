// Rutas en la rejilla: A* por 8 vecinos sin cortar esquinas, con el coste de cada baldosa para la clase de movimiento
// (pie, carro) y heurística octil por el coste mínimo (admisible). Los empates se rompen en orden fijo (f, h y orden de
// entrada), así que la misma petición da siempre la misma ruta. Luego se suaviza tirando de la cuerda.
// La ruta cubierta suma a cada casilla peso × extra[casilla] (el mapa de amenaza de amenaza.js): la heurística sigue
// siendo admisible porque lo extra nunca resta.
const SQ2 = Math.SQRT2;
const V8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// el coste mínimo de una casilla para cada clase (para la heurística)
const minimos = new WeakMap();
function minimo(m, clase) {
  let mm = minimos.get(m);
  if (!mm) { mm = {}; minimos.set(m, mm); }
  if (mm[clase] == null) { let c = Infinity; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) c = Math.min(c, m.coste(x, y, clase)); mm[clase] = c; }
  return mm[clase];
}

// la casilla andable más cercana a (x, y) para esa clase (en espiral, por distancia y luego en orden fijo)
export function andableCerca(m, x, y, clase, tope = 6) {
  x = Math.max(0, Math.min(m.w - 1, Math.floor(x))); y = Math.max(0, Math.min(m.h - 1, Math.floor(y)));
  if (m.coste(x, y, clase) < Infinity) return [x, y];
  for (let r = 1; r <= tope; r++) {
    let best = null, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy, d = dx * dx + dy * dy;
      if (m.dentro(nx, ny) && m.coste(nx, ny, clase) < Infinity && d < bd) { bd = d; best = [nx, ny]; }
    }
    if (best) return best;
  }
  return null;
}

// los costes de cada casilla para una clase (Infinity = no se pasa), en un array por mapa y clase
const costes = new WeakMap();
function costesDe(m, clase) {
  let mm = costes.get(m);
  if (!mm) { mm = {}; costes.set(m, mm); }
  if (!mm[clase]) { const c = new Float64Array(m.w * m.h); for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) c[y * m.w + x] = m.coste(x, y, clase); mm[clase] = c; }
  return mm[clase];
}
// los búferes del A*, uno por mapa y reutilizados: g y padre valen solo si su generación es la de esta búsqueda; el
// montículo binario de (f, h, orden, casilla) en arrays tipados que crecen al doble si hace falta
const bufs = new WeakMap();
function bufDe(m) {
  let b = bufs.get(m);
  if (!b) { const N = m.w * m.h, k = 4096; b = { g: new Float64Array(N), padre: new Int32Array(N), vista: new Uint32Array(N), cerrada: new Uint32Array(N), gen: 0, hf: new Float64Array(k), hh: new Float64Array(k), ho: new Float64Array(k), hi: new Int32Array(k) }; bufs.set(m, b); }
  return b;
}
const DX = V8.map((v) => v[0]), DY = V8.map((v) => v[1]);

// A*: de la casilla (ax, ay) a (bx, by). → lista de casillas [x, y] (sin la de salida) o null si no hay
// extra (opcional): Float32Array del tamaño del mapa con lo que encarece cada casilla, × peso
export function ruta(m, ax, ay, bx, by, clase, extra = null, peso = 1) {
  const W = m.w, H = m.h, ini = ay * W + ax, fin = by * W + bx;
  if (m.coste(bx, by, clase) === Infinity) return null;
  if (ini === fin) return [];
  const C = costesDe(m, clase), b = bufDe(m), gen = ++b.gen, { g, padre, vista, cerrada } = b, cmin = minimo(m, clase);
  let hf = b.hf, hh = b.hh, ho = b.ho, hi = b.hi, n = 0, orden = 0;
  const heur = (i) => { const x = i % W, dx = Math.abs(x - bx), dy = Math.abs((i - x) / W - by); return cmin * (dx > dy ? dx + (SQ2 - 1) * dy : dy + (SQ2 - 1) * dx); };
  // a va antes que c: por f, luego por h, luego por orden de entrada
  const menor = (a, c) => hf[a] < hf[c] || (hf[a] === hf[c] && (hh[a] < hh[c] || (hh[a] === hh[c] && ho[a] < ho[c])));
  const cambia = (a, c) => {
    let t = hf[a]; hf[a] = hf[c]; hf[c] = t; t = hh[a]; hh[a] = hh[c]; hh[c] = t;
    t = ho[a]; ho[a] = ho[c]; ho[c] = t; t = hi[a]; hi[a] = hi[c]; hi[c] = t;
  };
  const push = (f, h, i) => {
    if (n === hf.length) {
      const dobla = (v) => { const w = new v.constructor(v.length * 2); w.set(v); return w; };
      b.hf = hf = dobla(hf); b.hh = hh = dobla(hh); b.ho = ho = dobla(ho); b.hi = hi = dobla(hi);
    }
    hf[n] = f; hh[n] = h; ho[n] = orden++; hi[n] = i;
    let k = n++;
    while (k) { const p = (k - 1) >> 1; if (!menor(k, p)) break; cambia(k, p); k = p; }
  };
  const pop = () => {
    const top = hi[0];
    n--;
    if (n) {
      hf[0] = hf[n]; hh[0] = hh[n]; ho[0] = ho[n]; hi[0] = hi[n];
      let k = 0;
      for (;;) { const l = 2 * k + 1, r = l + 1; let s = k; if (l < n && menor(l, s)) s = l; if (r < n && menor(r, s)) s = r; if (s === k) break; cambia(s, k); k = s; }
    }
    return top;
  };
  vista[ini] = gen; g[ini] = 0; padre[ini] = -1;
  push(heur(ini), heur(ini), ini);
  while (n) {
    const i = pop();
    if (cerrada[i] === gen) continue;
    if (i === fin) break;
    cerrada[i] = gen;
    const x = i % W, y = (i - x) / W, gi = g[i];
    for (let v = 0; v < 8; v++) {
      const dx = DX[v], dy = DY[v], nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (cerrada[j] === gen) continue;
      const c = C[j] + (extra ? peso * extra[j] : 0);
      if (c === Infinity) continue;
      if (dx && dy && (C[y * W + nx] === Infinity || C[ny * W + x] === Infinity)) continue;
      const ng = gi + c * (dx && dy ? SQ2 : 1);
      if (vista[j] !== gen || ng < g[j]) { vista[j] = gen; g[j] = ng; padre[j] = i; const h = heur(j); push(ng + h, h, j); }
    }
  }
  if (vista[fin] !== gen) return null;
  const out = [];
  for (let i = fin; i !== ini; i = padre[i]) out.push([i % W, Math.floor(i / W)]);
  return out.reverse();
}

// ¿se puede ir en línea recta de una casilla a otra sin pisar nada prohibido ni más caro que la salida? (todas las
// casillas que toca el segmento)
export function rectaLibre(m, ax, ay, bx, by, clase) {
  const cmax = Math.max(m.coste(ax, ay, clase), m.coste(bx, by, clase));
  const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 3);
  for (let k = 1; k < n; k++) {
    const t = k / n, x = Math.floor(ax + 0.5 + (bx - ax) * t), y = Math.floor(ay + 0.5 + (by - ay) * t);
    if (m.coste(x, y, clase) > cmax) return false;
  }
  return true;
}

// suavizar: desde cada punto, saltar al más lejano que se alcanza en línea recta. Con extra (la ruta cubierta), además,
// la recta no puede costar más que el trozo de ruta que se salta: así no se acorta por el campo a la vista
export function suaviza(m, ax, ay, camino, clase, extra = null, peso = 1) {
  const out = [];
  let cx = ax, cy = ay, i = 0;
  const cuesta = (x, y) => m.coste(x, y, clase) + (extra ? peso * extra[y * m.w + x] : 0);
  // lo que cuesta la ruta hasta cada casilla (acum[k + 1], hasta camino[k])
  const acum = [0];
  if (extra) camino.forEach(([x, y], k) => { const [px, py] = k ? camino[k - 1] : [ax, ay]; acum.push(acum[k] + cuesta(x, y) * (px !== x && py !== y ? SQ2 : 1)); });
  const noPeor = (j) => {
    const [bx, by] = camino[j], n = Math.ceil(Math.max(Math.abs(bx - cx), Math.abs(by - cy)) * 3);
    let suma = 0, celdas = 0, qx = cx, qy = cy;
    for (let k = 1; k <= n; k++) {
      const x = Math.floor(cx + 0.5 + (bx - cx) * (k / n)), y = Math.floor(cy + 0.5 + (by - cy) * (k / n));
      if (x === qx && y === qy) continue;
      qx = x; qy = y; suma += cuesta(x, y); celdas++;
    }
    return (suma / Math.max(1, celdas)) * Math.hypot(bx - cx, by - cy) <= acum[j + 1] - acum[i] + 1e-9;
  };
  while (i < camino.length) {
    let j = camino.length - 1;
    while (j > i && !(rectaLibre(m, cx, cy, camino[j][0], camino[j][1], clase) && (!extra || noPeor(j)))) j--;
    out.push(camino[j]);
    [cx, cy] = camino[j];
    i = j + 1;
  }
  return out;
}
