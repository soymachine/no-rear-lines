// Mide un mapa sin navegador, con las cifras de reference/diseno-niveles.md. Carga el mapa como la simulación
// (js/sim/mapa.js) y usa la línea de visión de verdad (js/sim/fov.js).
// Uso (desde la raíz): node .claude/skills/mapas/scripts/mide-mapa.mjs <id|todos> [--texto archivo.txt] [--baldosas]
//   --texto: el mapa en letras con las rutas encima (a: a pie del primer despliegue, c: en carro; o: el objetivo;
//            · lo que no se ve desde el objetivo), para leerlo sin capturas. Fuera del repo.
//   --baldosas: la tabla de baldosas en markdown (para reference/proyecto.md).
// Cifras:
//   alcanzable  % de lo andable a pie que se alcanza desde cada despliegue
//   ruta        coste y largo (m) de la ruta más barata de cada despliegue al objetivo, a pie y en carro
//   otraRuta    lo que cuesta la segunda ruta (tapando la primera y sus vecinas) respecto a la primera; — si no hay
//   abierto     % de lo andable sin nada que cubra o tape a 2 casillas o menos
//   vistaLarga  % de lo que se ve desde el objetivo que está a 12 casillas (48 m) o más
//   zonaMuerta  % de lo andable a menos de 60 casillas del objetivo que no se ve desde él
//   carro       % del mapa practicable para un carro
//   contacto    metros entre los dos despliegues por la ruta a pie más corta
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BALDOSAS, METROS } from '../../../../js/data/baldosas.js';
import { MAPAS, MAPA } from '../../../../js/data/mapas/index.js';
import { cargaMapa } from '../../../../js/sim/mapa.js';
import { computeFOV } from '../../../../js/sim/fov.js';

const V8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// Dijkstra desde varias casillas de salida; tapado: casillas prohibidas además del terreno. → { dist, padre }
export function costes(m, salida, clase, tapado = null) {
  const N = m.w * m.h, dist = new Float64Array(N).fill(Infinity), padre = new Int32Array(N).fill(-1), heap = [];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let s = k; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === k) break; [heap[s], heap[k]] = [heap[k], heap[s]]; k = s; } } return top; };
  for (const [x, y] of salida) { const i = y * m.w + x; if (m.coste(x, y, clase) < Infinity) { dist[i] = 0; push(0, i); } }
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    const x = i % m.w, y = (i - x) / m.w;
    for (const [dx, dy] of V8) {
      const nx = x + dx, ny = y + dy, j = ny * m.w + nx;
      if (!m.dentro(nx, ny) || (tapado && tapado[j])) continue;
      const c = m.coste(nx, ny, clase);
      if (c === Infinity || (dx && dy && (m.coste(x + dx, y, clase) === Infinity || m.coste(x, y + dy, clase) === Infinity))) continue;
      const nd = d + c * (dx && dy ? Math.SQRT2 : 1);
      if (nd < dist[j]) { dist[j] = nd; padre[j] = i; push(nd, j); }
    }
  }
  return { dist, padre };
}
const zona = (r) => { const out = []; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]); return out; };
const cerca = (o) => zona({ x: o.x - o.r, y: o.y - o.r, w: 2 * o.r + 1, h: 2 * o.r + 1 });
// la ruta más barata hasta el objetivo: { coste, metros, casillas }
function ruta(m, C, o) {
  let best = -1;
  for (const [x, y] of cerca(o)) if (m.dentro(x, y)) { const i = y * m.w + x; if (best < 0 || C.dist[i] < C.dist[best]) best = i; }
  if (best < 0 || C.dist[best] === Infinity) return null;
  const casillas = [];
  let metros = 0;
  for (let i = best; i >= 0; i = C.padre[i]) { const p = C.padre[i]; casillas.push(i); if (p >= 0) metros += (Math.abs((i % m.w) - (p % m.w)) + Math.abs(Math.floor(i / m.w) - Math.floor(p / m.w)) === 2 ? Math.SQRT2 : 1) * METROS; }
  return { coste: C.dist[best], metros, casillas };
}
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

export function mide(def) {
  const m = cargaMapa(def), o = def.objetivos[0], lados = Object.entries(def.despliegues), N = m.w * m.h;
  const andable = (i) => m.coste(i % m.w, Math.floor(i / m.w), 'pie') < Infinity;
  const r = { id: def.id, tamaño: `${m.w}×${m.h} (${m.w * METROS}×${m.h * METROS} m)`, lados: {} };
  let nAnd = 0; for (let i = 0; i < N; i++) if (andable(i)) nAnd++;
  for (const [lado, z] of lados) {
    const L = (r.lados[lado] = {});
    const pie = costes(m, zona(z), 'pie'), carro = costes(m, zona(z), 'carro');
    let alc = 0; for (let i = 0; i < N; i++) if (andable(i) && pie.dist[i] < Infinity) alc++;
    L.alcanzable = pct(alc, nAnd);
    const rp = ruta(m, pie, o), rc = ruta(m, carro, o);
    L.pie = rp && { coste: +rp.coste.toFixed(1), metros: Math.round(rp.metros) };
    L.carro = rc && { coste: +rc.coste.toFixed(1), metros: Math.round(rc.metros) };
    if (rp) { // otra ruta: se tapa la primera (salvo cerca del despliegue y del objetivo) y sus vecinas
      const tap = new Uint8Array(N), enZ = (x, y) => x >= z.x - 1 && x <= z.x + z.w && y >= z.y - 1 && y <= z.y + z.h, enO = (x, y) => Math.abs(x - o.x) <= o.r + 1 && Math.abs(y - o.y) <= o.r + 1;
      for (const i of rp.casillas) { const x = i % m.w, y = Math.floor(i / m.w); for (const [dx, dy] of [[0, 0], ...V8]) if (m.dentro(x + dx, y + dy) && !enZ(x + dx, y + dy) && !enO(x + dx, y + dy)) tap[(y + dy) * m.w + x + dx] = 1; }
      const r2 = ruta(m, costes(m, zona(z), 'pie', tap), o);
      L.otraRuta = r2 ? +(r2.coste / rp.coste).toFixed(2) : null;
      L.rutaPie = rp.casillas; L.rutaCarro = rc ? rc.casillas : [];
    }
  }
  // abierto
  let abierto = 0;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!andable(y * m.w + x)) continue;
    let hay = false;
    for (let dy = -2; dy <= 2 && !hay; dy++) for (let dx = -2; dx <= 2; dx++) { const b = m.baldosa(x + dx, y + dy); if (b && (b.tapa || b.cubre > 0)) { hay = true; break; } }
    if (!hay) abierto++;
  }
  r.abierto = pct(abierto, nAnd);
  // lo que se ve desde el objetivo
  const visto = new Uint8Array(N);
  let vistas = 0, largas = 0;
  computeFOV(o.x, o.y, 60, (x, y) => m.tapa(x, y), (x, y) => { if (!m.dentro(x, y) || visto[y * m.w + x]) return; visto[y * m.w + x] = 1; vistas++; if (Math.hypot(x - o.x, y - o.y) >= 12) largas++; });
  r.vistaLarga = pct(largas, vistas);
  let cercaA = 0, muerta = 0;
  for (let i = 0; i < N; i++) { const x = i % m.w, y = Math.floor(i / m.w); if (!andable(i) || Math.hypot(x - o.x, y - o.y) > 60) continue; cercaA++; if (!visto[i]) muerta++; }
  r.zonaMuerta = pct(muerta, cercaA);
  let carro = 0; for (let i = 0; i < N; i++) if (m.coste(i % m.w, Math.floor(i / m.w), 'carro') < Infinity) carro++;
  r.carro = pct(carro, N);
  const [[, za], [, zb]] = lados, cab = costes(m, zona(za), 'pie');
  let dmin = Infinity, best = -1;
  for (const [x, y] of zona(zb)) { const i = y * m.w + x; if (cab.dist[i] < dmin) { dmin = cab.dist[i]; best = i; } }
  let met = 0; for (let i = best; i >= 0 && cab.padre[i] >= 0; i = cab.padre[i]) { const p = cab.padre[i]; met += (Math.abs((i % m.w) - (p % m.w)) + Math.abs(Math.floor(i / m.w) - Math.floor(p / m.w)) === 2 ? Math.SQRT2 : 1) * METROS; }
  r.contacto = Math.round(met);
  r._m = m; r._visto = visto;
  return r;
}

function texto(r) {
  const m = r._m, g = m.def.filas.map((f) => f.split('')), o = m.def.objetivos[0], [primero] = Object.values(r.lados);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (!r._visto[y * m.w + x] && g[y][x] === '.' && Math.hypot(x - o.x, y - o.y) <= 60) g[y][x] = '·';
  for (const i of primero.rutaCarro || []) g[Math.floor(i / m.w)][i % m.w] = 'c';
  for (const i of primero.rutaPie || []) g[Math.floor(i / m.w)][i % m.w] = 'a';
  g[o.y][o.x] = 'o';
  return g.map((f) => f.join('')).join('\n') + '\n';
}

function main() {
  const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf('--' + k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
  if (args.includes('--baldosas')) {
    console.log('| n.º | id | letra | nombre | a pie | carro | tapa | cubre |\n|---|---|---|---|---|---|---|---|');
    for (const b of BALDOSAS) console.log(`| ${b.n} | ${b.id} | \`${b.letra}\` | ${b.nombre.es} | ${b.anda.pie ?? '—'} | ${b.anda.carro ?? '—'} | ${b.tapa ? 'sí' : ''} | ${b.cubre} |`);
    return;
  }
  const out = opt('texto'), id = args[0] || 'todos';
  const defs = id === 'todos' ? MAPAS : [MAPA[id]];
  if (!defs[0]) { console.error(`no hay mapa «${id}»`); process.exit(2); }
  for (const def of defs) {
    const r = mide(def);
    console.log(`${r.id} · ${r.tamaño} · abierto ${r.abierto} % · vistaLarga ${r.vistaLarga} % · zonaMuerta ${r.zonaMuerta} % · carro ${r.carro} % · contacto ${r.contacto} m`);
    for (const [lado, L] of Object.entries(r.lados)) console.log(`  ${lado}: alcanzable ${L.alcanzable} % · a pie ${L.pie ? `${L.pie.metros} m (coste ${L.pie.coste})` : 'NO LLEGA'} · otraRuta ×${L.otraRuta ?? '—'} · en carro ${L.carro ? `${L.carro.metros} m (coste ${L.carro.coste})` : 'NO LLEGA'}`);
    if (out) { writeFileSync(out, texto(r)); console.log(`  (mapa en letras en ${out})`); }
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
