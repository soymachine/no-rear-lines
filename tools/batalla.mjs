// Una batalla en la granja sin navegador, para mirar cómo se comporta la simulación: el bando de EE. UU. sigue un guion
// de órdenes (el de un jugador que avanza por los setos y el camino) y el alemán lo lleva la IA. Escribe los sucesos
// que importan, segundo a segundo, y el resumen. Es el germen del bot de playtest.
// Uso: node tools/batalla.mjs [--semilla N] [--todo] [--json salida.json]
//   --todo: también los disparos y los cambios de estado; --json: todos los sucesos y el final, fuera del repo
import { writeFileSync } from 'node:fs';
import { creaPartida, paso, ordena, huella } from '../js/sim/partida.js';
import { ia } from '../js/sim/ia.js';
import { GRANJA } from '../js/data/mapas/granja.js';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const semilla = +opt('semilla', 1), todo = args.includes('--todo'), json = opt('json', null);
const p = creaPartida({ mapa: GRANJA, semilla, fuerzas: [
  { lado: 'us', escuadras: [{ tipo: 'us_fusileros', x: 8, y: 30 }, { tipo: 'us_fusileros', x: 8, y: 42 }], carros: [{ tipo: 'sherman', x: 4, y: 35 }] },
  { lado: 'de', escuadras: [{ tipo: 'de_gruppe', x: 120, y: 28 }, { tipo: 'de_gruppe', x: 120, y: 38 }], carros: [{ tipo: 'panzer4', x: 122, y: 33 }] },
] });
const sherman = p.unidades.find((u) => u.tipo === 'carro' && u.lado === 'us').id;
// el guion del jugador: a los setos de la primera línea, a los de la segunda y a la granja (segundos → órdenes)
const GUION = {
  0: [['us0', 'mover', 38, 28], ['us1', 'mover', 38, 42], ['carro', 'mover', 34, 35]],
  120: [['us0', 'mover', 50, 28], ['us1', 'mover', 50, 42], ['carro', 'mover', 46, 35]],
  240: [['us0', 'mover', 60, 27], ['us1', 'mover', 60, 41], ['carro', 'mover', 58, 35]],
  420: [['us0', 'correr', 72, 27], ['us1', 'correr', 70, 30]],
};
const todos = [], cuenta = {};
const IMPORTA = new Set(['orden', 'baja', 'destruido', 'penetra', 'rebote', 'humo', 'humoIA', 'fin']);
const t0 = performance.now();
while (!p.fin) {
  for (const [q, tipo, x, y] of GUION[p.t / 10] || []) ordena(p, q === 'carro' ? { tipo, carro: sherman, x, y } : { tipo, escuadra: q, x, y });
  ia(p, 'de');
  paso(p);
  for (const s of p.sucesos) {
    cuenta[s.tipo] = (cuenta[s.tipo] || 0) + 1;
    if (json) todos.push(s);
    if (todo || IMPORTA.has(s.tipo) || (s.tipo === 'estado' && s.a === 'panico')) { const { t, tipo, ...r } = s; console.log(`${(t / 10).toFixed(1).padStart(6)} s  ${tipo.padEnd(9)} ${JSON.stringify(r)}`); }
  }
}
const ms = (performance.now() - t0) / p.t;
console.log(`\nfin a los ${(p.t / 10).toFixed(0)} s: gana ${p.fin.ganador} (${p.fin.motivo}) · ${p.t} pasos, ${ms.toFixed(2)} ms por paso · huella ${huella(p)}`);
for (const lado of ['us', 'de']) { const por = {}; for (const u of p.unidades) if (u.lado === lado && u.tipo === 'soldado') por[u.estado] = (por[u.estado] || 0) + 1; console.log(`  ${lado}: ${JSON.stringify(por)}`); }
console.log(`  sucesos: ${JSON.stringify(cuenta)}`);
if (json) writeFileSync(json, JSON.stringify({ semilla, fin: p.fin, sucesos: todos }));
