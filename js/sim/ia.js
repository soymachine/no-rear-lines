// La IA del mando de un bando que defiende un objetivo (en el prototipo, el alemán en la granja). Piensa cada pocos
// segundos y da órdenes como las daría un jugador (ordena), así que pasa por la misma obediencia. Sin azar propio: lo
// que decide sale del estado de la partida.
//   ia(p, lado)  antes de cada paso(p)
import { ordena } from './partida.js';
import { andableCerca } from './rutas.js';

const CADA = 30; // pasos entre una decisión y otra (3 s)
const DELANTE = 10; // casillas por delante del objetivo donde se busca el seto

// una posición de tiro: casilla andable con un seto justo delante, hacia la amenaza, cerca del punto pedido
export function posicionDeTiro(m, x, y, dx, dy, radio = 5) {
  let best = null, bd = Infinity;
  for (let j = -radio; j <= radio; j++) for (let i = -radio; i <= radio; i++) {
    const cx = Math.floor(x) + i, cy = Math.floor(y) + j;
    if (m.coste(cx, cy, 'pie') === Infinity || m.baldosa(cx, cy).tapa) continue;
    const delante = m.baldosa(cx + dx, cy + dy);
    if (!delante || delante.id !== 'seto') continue;
    const d = i * i + j * j;
    if (d < bd) { bd = d; best = [cx, cy]; }
  }
  return best || andableCerca(m, x, y, 'pie');
}

export function ia(p, lado) {
  if (p.fin || p.t % CADA) return;
  const o = p.def.objetivos[0], enemigo = Object.keys(p.def.despliegues).find((l) => l !== lado), z = p.def.despliegues[enemigo];
  const ex = z.x + z.w / 2, ey = z.y + z.h / 2, d = Math.hypot(ex - o.x, ey - o.y), ux = (ex - o.x) / d, uy = (ey - o.y) / d;
  const sx = Math.abs(ux) >= Math.abs(uy) ? Math.sign(ux) : 0, sy = sx ? 0 : Math.sign(uy); // hacia dónde mira el seto
  const mias = p.escuadras.filter((e) => e.lado === lado);
  const estado = (e) => { const us = e.soldados.map((id) => p.porId[id]); return { fuera: us.filter((u) => u.estado === 'herido' || u.estado === 'muerto' || u.estado === 'panico').length / us.length }; };
  if (!p.iaPlan) p.iaPlan = {};
  const plan = (p.iaPlan[lado] = p.iaPlan[lado] || { puesto: false, replegada: {} });
  if (!plan.puesto) {
    plan.puesto = true;
    // cada escuadra, a un seto por delante del objetivo, abiertas a los lados
    mias.forEach((e, i) => {
      const lat = (i - (mias.length - 1) / 2) * 14, px = o.x + ux * DELANTE - uy * lat, py = o.y + uy * DELANTE + ux * lat;
      const [x, y] = posicionDeTiro(p.m, px, py, sx, sy);
      ordena(p, { tipo: 'correr', escuadra: e.id, x, y, formacion: 'linea', mira: Math.atan2(uy, ux) });
    });
    for (const c of p.unidades.filter((u) => u.tipo === 'carro' && u.lado === lado)) {
      const [x, y] = andableCerca(p.m, o.x + ux * 6 + uy * 9, o.y + uy * 6 - ux * 9, 'carro') || [o.x, o.y];
      ordena(p, { tipo: 'mover', carro: c.id, x, y });
    }
    return;
  }
  // una escuadra que se rompe se repliega a la granja (una vez)
  for (const e of mias) if (!plan.replegada[e.id] && estado(e).fuera >= 0.5) {
    plan.replegada[e.id] = true;
    ordena(p, { tipo: 'mover', escuadra: e.id, x: o.x, y: o.y, mira: Math.atan2(uy, ux) });
  }
}
