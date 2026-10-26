// Rutas en la rejilla: A* por 8 vecinos sin cortar esquinas, con el coste de cada baldosa para la clase de movimiento
// (pie, carro) y heurística octil por el coste mínimo (admisible). Los empates se rompen en orden fijo (f, h y orden de
// entrada), así que la misma petición da siempre la misma ruta. Luego se suaviza tirando de la cuerda.
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

// A*: de la casilla (ax, ay) a (bx, by). → lista de casillas [x, y] (sin la de salida) o null si no hay
export function ruta(m, ax, ay, bx, by, clase) {
  const W = m.w, N = W * m.h, ini = ay * W + ax, fin = by * W + bx;
  if (m.coste(bx, by, clase) === Infinity) return null;
  if (ini === fin) return [];
  const g = new Float64Array(N).fill(Infinity), padre = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N);
  const cmin = minimo(m, clase), heur = (i) => { const dx = Math.abs((i % W) - bx), dy = Math.abs(Math.floor(i / W) - by); return cmin * (Math.max(dx, dy) + (SQ2 - 1) * Math.min(dx, dy)); };
  // montículo binario de [f, h, orden, i]
  const H = [];
  let orden = 0;
  const menor = (a, b) => a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])));
  const push = (e) => { H.push(e); let k = H.length - 1; while (k) { const p = (k - 1) >> 1; if (!menor(H[k], H[p])) break; [H[p], H[k]] = [H[k], H[p]]; k = p; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let s = k; if (l < H.length && menor(H[l], H[s])) s = l; if (r < H.length && menor(H[r], H[s])) s = r; if (s === k) break; [H[s], H[k]] = [H[k], H[s]]; k = s; } } return top; };
  g[ini] = 0;
  push([heur(ini), heur(ini), orden++, ini]);
  while (H.length) {
    const [, , , i] = pop();
    if (cerrado[i]) continue;
    if (i === fin) break;
    cerrado[i] = 1;
    const x = i % W, y = (i - x) / W;
    for (const [dx, dy] of V8) {
      const nx = x + dx, ny = y + dy;
      if (!m.dentro(nx, ny)) continue;
      const j = ny * W + nx, c = m.coste(nx, ny, clase);
      if (c === Infinity || cerrado[j]) continue;
      if (dx && dy && (m.coste(x + dx, y, clase) === Infinity || m.coste(x, y + dy, clase) === Infinity)) continue;
      const ng = g[i] + c * (dx && dy ? SQ2 : 1);
      if (ng < g[j]) { g[j] = ng; padre[j] = i; const h = heur(j); push([ng + h, h, orden++, j]); }
    }
  }
  if (padre[fin] < 0) return null;
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

// suavizar: desde cada punto, saltar al más lejano que se alcanza en línea recta
export function suaviza(m, ax, ay, camino, clase) {
  const out = [];
  let cx = ax, cy = ay, i = 0;
  while (i < camino.length) {
    let j = camino.length - 1;
    while (j > i && !rectaLibre(m, cx, cy, camino[j][0], camino[j][1], clase)) j--;
    out.push(camino[j]);
    [cx, cy] = camino[j];
    i = j + 1;
  }
  return out;
}
