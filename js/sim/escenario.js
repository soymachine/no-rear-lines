// Una batalla a partir de un escenario de js/data/escenarios.js: la partida con su mapa y sus fuerzas, y el guion de
// órdenes de prueba del bando del jugador (lo usan el bot, las pruebas y tools/batalla.mjs).
import { ESCENARIO } from '../data/escenarios.js';
import { MAPA } from '../data/mapas/index.js';
import { creaPartida, ordena } from './partida.js';

export function creaBatalla(id, semilla) {
  const esc = ESCENARIO[id];
  if (!esc) throw new Error(`no hay escenario «${id}»`);
  const p = creaPartida({ mapa: MAPA[esc.mapa], semilla, fuerzas: esc.fuerzas });
  p.escenario = esc;
  return p;
}
// las órdenes del guion que tocan en este paso (el guion va en segundos)
export function aplicaGuion(p) {
  const t = (p.t * 10) / 100; // pasos de 0,1 s → segundos
  if (!Number.isInteger(t)) return;
  for (const o of p.escenario.guion[t] || []) ordena(p, { ...o });
}
