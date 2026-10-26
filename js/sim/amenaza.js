// El mapa de amenaza de un bando: cuánto se ve cada casilla desde los enemigos que conoce (sus contactos, en su última
// posición) y desde donde los espera: su despliegue (solo mientras no hay contactos) y la primera parte de su llegada
// (las rutas más rápidas a pie y en carro desde su despliegue hasta el objetivo, que salen del mapa y no de lo que hace
// el enemigo: no es trampa). Lo usan la ruta cubierta (cumple, en
// partida.js, con las órdenes que llevan cubierta: true) y la IA del mando para elegir dónde ponerse. Niebla de guerra:
// solo los contactos del bando, nunca la posición real de lo que no ve.
//   fuentesAmenaza(p, lado) → [{ x, y, peso, alcance }]  ·  mapaAmenaza(m, fuentes) → Float32Array (w × h, 0 … tope)
// Cada fuente ilumina con shadowcasting (fov.js) lo que ve, con la regla del seto de vista.js: lo pegado a la fuente no
// le tapa, y lo pegado a un seto o bosque que ve se ve por encima. Sin azar y en orden fijo (por casilla).
import { computeFOV } from './fov.js';
import { seVe } from './vista.js';
import { ruta, andableCerca } from './rutas.js';
import { REGLAS as R } from '../data/reglas.js';

// las fuentes: una por bloque de A.rejilla casillas (las del mismo bloque suman su peso y miran desde la casilla de la
// primera, por id), ordenadas por bloque
export function fuentesAmenaza(p, lado) {
  const A = R.amenaza, m = p.m, porCasilla = new Map(), k = A.rejilla;
  const mete = (x, y, peso, alcance) => {
    const i = Math.floor(y / k) * m.w + Math.floor(x / k), f = porCasilla.get(i);
    if (f) { f.peso += peso; f.alcance = Math.max(f.alcance, alcance); } else porCasilla.set(i, { x: Math.floor(x), y: Math.floor(y), peso, alcance });
  };
  const ids = [...p.contactos[lado].keys()].sort((a, b) => a - b);
  for (const id of ids) {
    const c = p.contactos[lado].get(id), e = p.porId[id];
    if (e.tipo === 'carro') mete(c.x, c.y, A.carro, e.def.vista); else mete(c.x, c.y, A.soldado, R.vista);
  }
  for (const l of Object.keys(p.def.despliegues).sort()) {
    if (l === lado) continue;
    const z = p.def.despliegues[l];
    // sin contactos, el despliegue enemigo (una fuente cada A.rejilla casillas)
    if (!ids.length) for (let y = z.y + (A.rejilla >> 1); y < z.y + z.h; y += A.rejilla) for (let x = z.x + (A.rejilla >> 1); x < z.x + z.w; x += A.rejilla) if (!m.tapa(x, y)) mete(x, y, A.despliegue, R.vista);
    // siempre, su llegada esperada
    for (const [x, y] of llegada(m, p.def, l)) mete(x, y, A.despliegue, R.vista);
  }
  return [...porCasilla.keys()].sort((a, b) => a - b).map((i) => porCasilla.get(i));
}

// la llegada esperada de un bando: las rutas a pie y en carro de su despliegue al objetivo, una casilla cada
// 2 × A.rejilla hasta A.avance de su largo (por mapa y bando, se calcula una vez)
const llegadas = new WeakMap();
function llegada(m, def, l) {
  let c = llegadas.get(m);
  if (!c) { c = {}; llegadas.set(m, c); }
  if (c[l]) return c[l];
  const A = R.amenaza, z = def.despliegues[l], o = def.objetivos[0], out = [];
  for (const clase of m.clases) {
    const a = andableCerca(m, z.x + z.w / 2, z.y + z.h / 2, clase), b = andableCerca(m, o.x, o.y, clase), r = a && b && ruta(m, a[0], a[1], b[0], b[1], clase);
    if (r) for (let k = 0; k < r.length * A.avance; k += 2 * A.rejilla) out.push(r[k]);
  }
  return (c[l] = out);
}

// una firma corta de las fuentes, en bloques de A.rejilla casillas: si no cambia, el mapa sirve
export function firmaAmenaza(fuentes) {
  const k = R.amenaza.rejilla;
  return fuentes.map((f) => `${Math.floor(f.x / k)},${Math.floor(f.y / k)},${f.peso}`).join(';');
}

// el mapa: para cada casilla, Σ peso × caída con la distancia de las fuentes que la ven, hasta A.tope
export function mapaAmenaza(m, fuentes) {
  const A = R.amenaza, W = m.w, t = new Float32Array(W * m.h), visto = new Int32Array(W * m.h).fill(-1), probado = new Int32Array(W * m.h).fill(-1);
  fuentes.forEach((f, n) => {
    const casas = (x, y) => m.dentro(x, y) && m.baldosa(x, y).id === 'casa';
    // lo pegado a la fuente no le tapa (salvo las casas): ve por encima de su seto
    const opaco = (x, y) => !m.dentro(x, y) || (m.tapa(x, y) && (Math.abs(x - f.x) > 1 || Math.abs(y - f.y) > 1 || casas(x, y)));
    const caida = (d) => f.peso * (1 - A.lejos * Math.min(1, d / f.alcance));
    const pon = (x, y, d) => { const i = y * W + x; if (visto[i] === n) return; visto[i] = n; t[i] += caida(d); };
    const bordes = [];
    computeFOV(f.x, f.y, f.alcance, opaco, (x, y, d) => {
      if (!m.dentro(x, y)) return;
      pon(x, y, d);
      if (m.tapa(x, y) && !casas(x, y)) bordes.push(x, y);
    });
    // lo pegado al otro lado de un seto (o en el borde de un bosque) que la fuente ve: se ve por encima si la línea
    // no la corta otra cosa (la de vista.js, exacta; solo para estas casillas)
    for (let k = 0; k < bordes.length; k += 2) {
      const bx = bordes[k], by = bordes[k + 1], vx = bx - f.x, vy = by - f.y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = bx + dx, y = by + dy, i = y * W + x;
        if (!(dx || dy) || dx * vx + dy * vy <= 0 || !m.dentro(x, y) || visto[i] === n || probado[i] === n) continue;
        probado[i] = n;
        if (seVe(m, [], f.x + 0.5, f.y + 0.5, x + 0.5, y + 0.5, f.alcance)) pon(x, y, Math.hypot(x - f.x, y - f.y));
      }
    }
  });
  for (let i = 0; i < t.length; i++) if (t[i] > A.tope) t[i] = A.tope;
  return t;
}
