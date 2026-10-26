// Los datos están completos (CLAUDE.md, regla 5): cada baldosa con sus reglas y su nombre en los dos idiomas, y cada
// mapa que carga, con sus despliegues y objetivos dentro, y con cada objetivo alcanzable a pie desde cada despliegue y,
// en carro, desde algún sitio de cada despliegue. Sin navegador.
// Uso: node tests/datos.mjs
import { BALDOSAS, CLASES } from '../js/data/baldosas.js';
import { MAPAS } from '../js/data/mapas/index.js';
import { cargaMapa } from '../js/sim/mapa.js';

let fallos = 0;
const ok = (c, msg) => { console.log(`${c ? '  ✓' : '  ✗'} ${msg}`); if (!c) fallos++; };
const unico = (lista, campo) => new Set(lista.map((x) => x[campo])).size === lista.length;

// las baldosas
ok(unico(BALDOSAS, 'id') && unico(BALDOSAS, 'n') && unico(BALDOSAS, 'letra'), 'baldosas: id, número y letra sin repetir');
ok(BALDOSAS.every((b, i) => b.n === i), 'baldosas: los números van seguidos y en orden (no se renumeran: se añade al final)');
for (const b of BALDOSAS) {
  const falta = [];
  if (typeof b.letra !== 'string' || b.letra.length !== 1) falta.push('letra');
  if (!b.nombre || !b.nombre.es || !b.nombre.en) falta.push('nombre es/en');
  for (const c of CLASES) if (!b.anda || !(c in b.anda) || !(b.anda[c] === null || b.anda[c] > 0)) falta.push(`anda.${c}`);
  if (typeof b.tapa !== 'boolean') falta.push('tapa');
  if (!(b.cubre >= 0 && b.cubre <= 1)) falta.push('cubre');
  ok(!falta.length, `baldosa ${b.id}${falta.length ? ': falta ' + falta.join(', ') : ''}`);
}

// los mapas
ok(unico(MAPAS, 'id'), 'mapas: id sin repetir');
// casillas alcanzables desde un conjunto de salida para una clase de movimiento (inundación por 8 vecinos sin cortar
// esquinas, como las rutas)
function alcanza(m, salida, clase) {
  const vis = new Uint8Array(m.w * m.h), cola = [];
  for (const [x, y] of salida) if (m.coste(x, y, clase) < Infinity) { vis[y * m.w + x] = 1; cola.push([x, y]); }
  while (cola.length) {
    const [x, y] = cola.pop();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if ((!dx && !dy) || !m.dentro(nx, ny) || vis[ny * m.w + nx] || m.coste(nx, ny, clase) === Infinity) continue;
      if (dx && dy && (m.coste(x + dx, y, clase) === Infinity || m.coste(x, y + dy, clase) === Infinity)) continue;
      vis[ny * m.w + nx] = 1; cola.push([nx, ny]);
    }
  }
  return vis;
}
const zona = (r) => { const out = []; for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]); return out; };
for (const def of MAPAS) {
  let m;
  try { m = cargaMapa(def); } catch (e) { ok(false, e.message); continue; }
  ok(true, `mapa ${def.id}: carga (${m.w}×${m.h}, ${m.casas.length} casas)`);
  ok(def.nombre && def.nombre.es && def.nombre.en, `mapa ${def.id}: nombre es/en`);
  const lados = Object.entries(def.despliegues || {});
  ok(lados.length >= 2, `mapa ${def.id}: dos despliegues o más`);
  for (const [lado, r] of lados) ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= m.w && r.y + r.h <= m.h, `mapa ${def.id}: el despliegue ${lado} cabe en el mapa`);
  ok((def.objetivos || []).length > 0 && unico(def.objetivos, 'id'), `mapa ${def.id}: objetivos con id`);
  for (const o of def.objetivos || []) {
    ok(o.nombre && o.nombre.es && o.nombre.en && m.dentro(o.x, o.y) && m.coste(o.x, o.y, 'pie') < Infinity, `mapa ${def.id}: objetivo ${o.id} con nombre, dentro y en casilla andable`);
    for (const [lado, r] of lados) for (const clase of CLASES) {
      const vis = alcanza(m, zona(r), clase);
      const llega = zona({ x: o.x - o.r, y: o.y - o.r, w: 2 * o.r + 1, h: 2 * o.r + 1 }).some(([x, y]) => m.dentro(x, y) && vis[y * m.w + x]);
      ok(llega, `mapa ${def.id}: ${lado} llega ${clase === 'pie' ? 'a pie' : 'en ' + clase} al objetivo ${o.id}`);
    }
  }
}
console.log(fallos ? `✗ ${fallos} fallo(s)` : '✓ todo bien');
process.exit(fallos ? 1 : 0);
