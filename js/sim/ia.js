// La IA del mando de un bando que defiende un objetivo (en el prototipo, el alemán en la granja). Piensa cada
// REGLAS.ia.cada pasos y da órdenes como las daría un jugador (ordena), así que pasa por la misma obediencia. Sin azar
// propio: lo que decide sale de lo que sabe el bando (sus contactos, el mapa y el despliegue enemigo), nunca de la
// posición real de lo que no ve.
//   ia(p, lado)  antes de cada paso(p)
// - El mapa de amenaza del bando (amenaza.js): se rehace cuando cambian los contactos (en bloques de
//   REGLAS.amenaza.rejilla casillas) y queda en p.amenaza[lado] para las rutas cubiertas de sus órdenes.
// - Las escuadras, a un seto que mira al enemigo por delante del objetivo y que no se vea de lejos, por la ruta
//   cubierta. Si lo que saben cambia mientras van de camino (y están en forma), rehacen la ruta.
// - El carro, emboscado junto a un seto o una casa, con campo de tiro de flanco sobre por donde se espera al carro
//   enemigo; solo va cuando tiene una escuadra cerca (escolta) y, mientras, espera detrás del objetivo.
// - La escuadra que se rompe, a la granja (una vez).
import { ordena } from './partida.js';
import { ruta, andableCerca } from './rutas.js';
import { seVe } from './vista.js';
import { fuentesAmenaza, firmaAmenaza, mapaAmenaza } from './amenaza.js';
import { REGLAS as R } from '../data/reglas.js';

const enPie = (u) => u.estado !== 'herido' && u.estado !== 'muerto';
const enCondiciones = (u) => u.estado === 'forma' || u.estado === 'suprimido';

// una posición de tiro: casilla andable con un seto justo delante, hacia la amenaza, cerca del punto pedido; con el
// mapa de amenaza, además, la que menos se ve de lejos (exponeTiro casillas² por unidad de amenaza)
export function posicionDeTiro(m, x, y, dx, dy, radio = 5, amenaza = null) {
  let best = null, bd = Infinity;
  for (let j = -radio; j <= radio; j++) for (let i = -radio; i <= radio; i++) {
    const cx = Math.floor(x) + i, cy = Math.floor(y) + j;
    if (m.coste(cx, cy, 'pie') === Infinity || m.baldosa(cx, cy).tapa) continue;
    const delante = m.baldosa(cx + dx, cy + dy);
    if (!delante || delante.id !== 'seto') continue;
    const d = i * i + j * j + (amenaza ? R.ia.exponeTiro * amenaza[cy * m.w + cx] : 0);
    if (d < bd) { bd = d; best = [cx, cy]; }
  }
  return best || andableCerca(m, x, y, 'pie');
}

// el mapa de amenaza del bando, rehecho solo si cambian sus fuentes (contactos o, sin ellos, el despliegue enemigo)
function amenazaDe(p, lado, plan) {
  const f = fuentesAmenaza(p, lado), firma = firmaAmenaza(f);
  if (firma !== plan.firma) { plan.firma = firma; plan.amenaza = mapaAmenaza(p.m, f); plan.version = (plan.version || 0) + 1; }
  p.amenaza[lado] = plan.amenaza;
  return plan.amenaza;
}

// dónde emboscar al carro enemigo: por dónde se le espera (la ruta más rápida para un carro desde su último contacto,
// o desde el centro de su despliegue, hasta el objetivo), y la casilla junto a un seto o una casa, cerca del objetivo,
// que más ve de esa llegada, de flanco y a distancia de tiro, sin que se la vea de lejos. → { x, y, mira } o null
export function emboscada(p, lado, amenaza) {
  const C = R.ia.carro, m = p.m, o = p.def.objetivos[0];
  let s = null;
  for (const [id, k] of [...p.contactos[lado]].sort((a, b) => a[0] - b[0])) if (p.porId[id].tipo === 'carro' && p.porId[id].estado === 'forma') { s = k; break; }
  if (!s) { const l = Object.keys(p.def.despliegues).sort().find((x) => x !== lado), z = p.def.despliegues[l]; s = { x: z.x + z.w / 2, y: z.y + z.h / 2 }; }
  const a = andableCerca(m, s.x, s.y, 'carro'), b = andableCerca(m, o.x, o.y, 'carro');
  const llegada = a && b && ruta(m, a[0], a[1], b[0], b[1], 'carro');
  if (!llegada || llegada.length < 3) return null;
  const hd = Math.hypot(s.x - o.x, s.y - o.y) || 1, hx = (s.x - o.x) / hd, hy = (s.y - o.y) / hd; // hacia el enemigo
  // cada casilla de la llegada con su dirección (para el flanco)
  const L = llegada.map(([x, y], k) => { const [px, py] = llegada[Math.max(0, k - 1)], [nx, ny] = llegada[Math.min(llegada.length - 1, k + 1)], d = Math.hypot(nx - px, ny - py) || 1; return { x: x + 0.5, y: y + 0.5, ux: (nx - px) / d, uy: (ny - py) / d }; });
  let best = null, bs = -Infinity;
  for (let cy = Math.floor(o.y) - C.radio; cy <= Math.floor(o.y) + C.radio; cy++) for (let cx = Math.floor(o.x) - C.radio; cx <= Math.floor(o.x) + C.radio; cx++) {
    if (!m.dentro(cx, cy) || m.coste(cx, cy, 'carro') === Infinity || m.tapa(cx, cy) || m.baldosa(cx, cy).id === 'camino') continue;
    // cerca del objetivo y no por delante de su infantería (como mucho, adelante casillas hacia el enemigo)
    if (Math.hypot(cx - o.x, cy - o.y) > C.radio || (cx - o.x) * hx + (cy - o.y) * hy > C.adelante) continue;
    let junto = false;
    for (let j = -1; j <= 1 && !junto; j++) for (let i = -1; i <= 1; i++) if ((i || j) && m.dentro(cx + i, cy + j) && m.tapa(cx + i, cy + j)) { junto = true; break; }
    if (!junto) continue;
    const x = cx + 0.5, y = cy + 0.5;
    let ve = 0, primera = null;
    for (const r of L) {
      const dx = r.x - x, dy = r.y - y, d = Math.hypot(dx, dy);
      if (d < C.tiro[0] || d > C.tiro[1] || !seVe(m, [], x, y, r.x, r.y)) continue;
      ve += 1 - C.flanco + C.flanco * Math.abs(dx * r.uy - dy * r.ux) / d;
      if (!primera) primera = r;
    }
    if (!ve) continue;
    const score = ve / L.length - C.expone * (amenaza[cy * m.w + cx] / R.amenaza.tope) - C.lejos * Math.hypot(cx - o.x, cy - o.y);
    // mira (casco y torreta) hacia el primer punto de la llegada que ve: por ahí asomará el enemigo
    if (score > bs) { bs = score; best = { x: cx, y: cy, mira: Math.atan2(primera.y - y, primera.x - x), score }; }
  }
  return best;
}

export function ia(p, lado) {
  const I = R.ia;
  if (p.fin) return;
  if (!p.iaPlan) p.iaPlan = {};
  const plan = (p.iaPlan[lado] = p.iaPlan[lado] || { puesto: false, replegada: {}, ordenes: {}, rehecha: {}, carro: {}, cola: [] });
  // las órdenes salen de una en una, un paso cada una: así sus rutas no se calculan todas en el mismo paso
  if (plan.cola.length) ordena(p, plan.cola.shift());
  if (p.t % I.cada) return;
  const o = p.def.objetivos[0], enemigo = Object.keys(p.def.despliegues).sort().find((l) => l !== lado), z = p.def.despliegues[enemigo];
  const ex = z.x + z.w / 2, ey = z.y + z.h / 2, d = Math.hypot(ex - o.x, ey - o.y), ux = (ex - o.x) / d, uy = (ey - o.y) / d;
  const sx = Math.abs(ux) >= Math.abs(uy) ? Math.sign(ux) : 0, sy = sx ? 0 : Math.sign(uy); // hacia dónde mira el seto
  const mira = Math.atan2(uy, ux);
  const mias = p.escuadras.filter((e) => e.lado === lado);
  const soldados = (e) => e.soldados.map((id) => p.porId[id]);
  const fuera = (e) => { const us = soldados(e); return us.filter((u) => !enPie(u) || u.estado === 'panico').length / us.length; };
  const amenaza = amenazaDe(p, lado, plan);
  const manda = (e, orden) => { plan.ordenes[e.id] = { orden, version: plan.version }; plan.rehecha[e.id] = p.t; plan.cola.push({ ...orden }); };
  if (!plan.puesto) {
    plan.puesto = true;
    // cada escuadra, a un seto por delante del objetivo, abiertas a los lados, por la ruta cubierta; la de cada lado,
    // al seto de su lado (por dónde está a lo ancho del frente, y luego por id), para que no se crucen
    const lado0 = (e) => { const us = soldados(e); return us.reduce((a, u) => a - uy * u.x + ux * u.y, 0) / us.length; };
    [...mias].sort((a, b) => lado0(a) - lado0(b) || (a.id < b.id ? -1 : 1)).forEach((e, i) => {
      const lat = (i - (mias.length - 1) / 2) * I.separa, px = o.x + ux * I.delante - uy * lat, py = o.y + uy * I.delante + ux * lat;
      const [x, y] = posicionDeTiro(p.m, px, py, sx, sy, 5, amenaza);
      manda(e, { tipo: 'correr', escuadra: e.id, x, y, formacion: 'linea', mira, cubierta: true });
    });
  } else {
    // una escuadra que se rompe se repliega a la granja (una vez)
    for (const e of mias) if (!plan.replegada[e.id] && fuera(e) >= 0.5) {
      plan.replegada[e.id] = true;
      manda(e, { tipo: 'mover', escuadra: e.id, x: o.x, y: o.y, mira, cubierta: true });
    }
    // si lo que sabe ha cambiado, la escuadra que aún va de camino (en forma) rehace su ruta cubierta
    for (const e of mias) {
      const ult = plan.ordenes[e.id];
      if (!ult || ult.version === plan.version || p.t - plan.rehecha[e.id] < I.replanea) continue;
      const us = soldados(e).filter(enPie);
      if (!us.length || us.some((u) => u.estado !== 'forma') || us.filter((u) => u.ruta.length > 2).length * 2 < us.length) continue;
      manda(e, ult.orden);
    }
  }
  carroIA(p, lado, plan, amenaza, mias, mira);
}

// el carro: a la emboscada con escolta; sin ella, detrás del objetivo. No se le cambia la orden mientras tiene blanco
function carroIA(p, lado, plan, amenaza, mias, mira) {
  const C = R.ia.carro, o = p.def.objetivos[0];
  for (const c of p.unidades.filter((u) => u.tipo === 'carro' && u.lado === lado)) {
    if (c.estado !== 'forma' || c.blanco != null) continue;
    const pc = (plan.carro[c.id] = plan.carro[c.id] || { va: null });
    // la emboscada se busca al empezar y otra vez si aparece (o cambia de sitio) el carro enemigo, mientras no ha llegado
    const clave = [...p.contactos[lado]].filter(([id]) => p.porId[id].tipo === 'carro').map(([id, k]) => `${id}:${Math.floor(k.x / 8)},${Math.floor(k.y / 8)}`).sort().join(';');
    if (!pc.emb || (pc.clave !== clave && pc.va !== 'emboscada')) { pc.emb = emboscada(p, lado, amenaza); pc.clave = clave; }
    const e = pc.emb;
    // escolta: una escuadra con la mitad en condiciones con su centro cerca (más margen para irse que para llegar)
    const radio = C.escolta * (pc.va === 'emboscada' ? 1.5 : 1);
    const escolta = e && mias.some((s) => {
      const us = s.soldados.map((id) => p.porId[id]).filter(enCondiciones);
      if (us.length * 2 < s.soldados.length) return false;
      const cx = us.reduce((a, u) => a + u.x, 0) / us.length, cy = us.reduce((a, u) => a + u.y, 0) / us.length;
      return Math.hypot(cx - e.x - 0.5, cy - e.y - 0.5) <= radio;
    });
    const va = escolta ? 'emboscada' : 'reserva';
    if (pc.va === va && (va === 'reserva' || (pc.x === e.x && pc.y === e.y))) continue;
    let x, y, m = mira;
    if (va === 'emboscada') ({ x, y, mira: m } = e);
    else [x, y] = andableCerca(p.m, o.x - Math.cos(mira) * C.atras, o.y - Math.sin(mira) * C.atras, 'carro') || [Math.floor(c.x), Math.floor(c.y)];
    pc.va = va; pc.x = x; pc.y = y;
    plan.cola.push({ tipo: 'mover', carro: c.id, x, y, mira: m, cubierta: true });
  }
}
