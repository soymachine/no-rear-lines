// Una batalla sin navegador, para mirar cómo se comporta la simulación: el bando del jugador sigue el guion de órdenes
// del escenario (js/data/escenarios.js) y el otro lo lleva la IA. Escribe los sucesos
// que importan, segundo a segundo, y el resumen. Es el germen del bot de playtest.
// Uso: node tools/batalla.mjs [--escenario granja] [--semilla N] [--todo] [--json salida.json]
//   --todo: también los disparos y los cambios de estado; --json: todos los sucesos y el final, fuera del repo
import { writeFileSync } from 'node:fs';
import { paso, huella } from '../js/sim/partida.js';
import { creaBatalla, aplicaGuion } from '../js/sim/escenario.js';
import { ia } from '../js/sim/ia.js';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const semilla = +opt('semilla', 1), todo = args.includes('--todo'), json = opt('json', null);
const p = creaBatalla(opt('escenario', 'granja'), semilla);
const todos = [], cuenta = {};
const IMPORTA = new Set(['orden', 'baja', 'destruido', 'penetra', 'rebote', 'humo', 'humoIA', 'fin']);
const t0 = performance.now();
while (!p.fin) {
  aplicaGuion(p);
  for (const l of p.escenario.ia) ia(p, l);
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
