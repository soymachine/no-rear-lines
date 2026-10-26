// La simulación, sin navegador: determinismo, obediencia, la regla del seto, la supresión de una ametralladora sobre
// una escuadra que cruza al descubierto, el blindaje de los carros, el humo y una batalla entera en la granja.
// Uso: node tests/sim.mjs
import { creaPartida, paso, ordena, huella, penetra } from '../js/sim/partida.js';
import { ia } from '../js/sim/ia.js';
import { seVe } from '../js/sim/vista.js';
import { cargaMapa } from '../js/sim/mapa.js';
import { GRANJA } from '../js/data/mapas/granja.js';
import { ARMA } from '../js/data/armas.js';
import { CARRO } from '../js/data/unidades.js';

let fallos = 0;
const ok = (c, msg) => { console.log(`${c ? '  ✓' : '  ✗'} ${msg}`); if (!c) fallos++; };
const FUERZAS = [
  { lado: 'us', escuadras: [{ tipo: 'us_fusileros', x: 8, y: 30 }, { tipo: 'us_fusileros', x: 8, y: 42 }], carros: [{ tipo: 'sherman', x: 4, y: 35 }] },
  { lado: 'de', escuadras: [{ tipo: 'de_gruppe', x: 120, y: 28 }, { tipo: 'de_gruppe', x: 120, y: 38 }], carros: [{ tipo: 'panzer4', x: 122, y: 33 }] },
];
const ORDENES = { 0: [{ tipo: 'mover', escuadra: 'us0', x: 38, y: 28 }, { tipo: 'mover', escuadra: 'us1', x: 38, y: 42 }, { tipo: 'mover', carro: 20, x: 34, y: 35 }] };
function juega(semilla, pasos) {
  const p = creaPartida({ mapa: GRANJA, semilla, fuerzas: FUERZAS });
  for (let i = 0; i < pasos && !p.fin; i++) { for (const o of ORDENES[p.t] || []) ordena(p, o); ia(p, 'de'); paso(p); }
  return p;
}
// un mapa de prueba hecho a mano: filas de texto
const mapa = (filas, extra = {}) => ({ id: 'prueba', nombre: { es: 'Prueba', en: 'Test' }, ancho: filas[0].length, alto: filas.length, filas, despliegues: { us: { x: 0, y: 0, w: 4, h: filas.length }, de: { x: filas[0].length - 4, y: 0, w: 4, h: filas.length } }, objetivos: [{ id: 'o', nombre: { es: 'O', en: 'O' }, x: filas[0].length >> 1, y: filas.length >> 1, r: 3 }], ...extra });

// determinismo
{
  const a = juega(7, 900), b = juega(7, 900), c = juega(8, 900);
  ok(huella(a) === huella(b), `la misma semilla y las mismas órdenes dan la misma batalla (${huella(a)})`);
  ok(huella(a) !== huella(c), 'otra semilla, otra batalla');
}

// obediencia: una escuadra en forma cumple siempre; suprimida, no siempre; retirarse, siempre
{
  const campo = mapa(Array.from({ length: 20 }, () => '.'.repeat(60)));
  const p = creaPartida({ mapa: campo, semilla: 3, fuerzas: [{ lado: 'us', escuadras: [{ tipo: 'us_fusileros', x: 10, y: 10 }] }, { lado: 'de', escuadras: [] }] });
  ordena(p, { tipo: 'mover', escuadra: 'us0', x: 40, y: 10 }); paso(p);
  const o1 = p.sucesos.find((s) => s.tipo === 'orden');
  ok(o1 && o1.cumplen === 10, `en forma y sin enemigos, cumplen ${o1 && o1.cumplen}/10`);
  let rechazan = 0, total = 0;
  for (let k = 0; k < 20; k++) {
    for (const u of p.unidades) { u.sup = 50; u.estado = 'suprimido'; u.moral = 55; }
    ordena(p, { tipo: 'mover', escuadra: 'us0', x: 40, y: 10 }); paso(p);
    const o = p.sucesos.find((s) => s.tipo === 'orden'); rechazan += o.total - o.cumplen; total += o.total;
  }
  ok(rechazan > total * 0.2 && rechazan < total * 0.9, `suprimidos, rechazan avanzar ${rechazan} de ${total}, con motivo`);
  for (const u of p.unidades) { u.sup = 90; u.estado = 'acobardado'; }
  ordena(p, { tipo: 'retirada', escuadra: 'us0' }); paso(p);
  const o3 = p.sucesos.find((s) => s.tipo === 'orden');
  ok(o3.cumplen === o3.total, `retirarse lo cumplen todos aunque estén fijados (${o3.cumplen}/${o3.total})`);
}

// la regla del seto: quien está pegado a él ve por encima; desde más atrás, no
{
  const m = cargaMapa(mapa(Array.from({ length: 9 }, () => '..........#..........')));
  ok(seVe(m, [], 9.5, 4.5, 15.5, 4.5), 'pegado al seto, se ve el campo de al lado');
  ok(!seVe(m, [], 6.5, 4.5, 15.5, 4.5), 'tres casillas atrás, el seto tapa');
  ok(seVe(m, [], 6.5, 4.5, 11.5, 4.5), 'y se ve a quien está pegado al otro lado (lo mismo al revés)');
  ok(!seVe(m, [{ x: 13, y: 4.5, r: 1.5 }], 9.5, 4.5, 15.5, 4.5), 'el humo tapa');
}

// supresión: una escuadra que cruza 200 m de campo abierto hacia una MG 42 tras un seto se queda clavada
{
  const filas = Array.from({ length: 20 }, () => '.'.repeat(55) + '#' + '.'.repeat(14));
  const p = creaPartida({ mapa: mapa(filas), semilla: 11, fuerzas: [{ lado: 'us', escuadras: [{ tipo: 'us_fusileros', x: 4, y: 10 }] }, { lado: 'de', escuadras: [{ tipo: 'de_gruppe', x: 57, y: 10 }] }] });
  for (const u of p.unidades) if (u.lado === 'de') { u.x = 56.5; u.postura = 'tierra'; }
  ordena(p, { tipo: 'mover', escuadra: 'us0', x: 50, y: 10 });
  let primera = null;
  for (let i = 0; i < 1500 && !p.fin; i++) { paso(p); if (primera == null && p.sucesos.some((s) => s.tipo === 'estado' && s.a === 'suprimido')) primera = p.t; }
  const us = p.unidades.filter((u) => u.lado === 'us'), fuera = us.filter((u) => u.estado !== 'forma').length;
  const llega = us.filter((u) => u.estado === 'forma' && u.x > 45).length;
  ok(primera != null, `la escuadra queda suprimida (la primera vez a los ${primera != null ? (primera / 10).toFixed(0) : '—'} s)`);
  ok(fuera >= 6 && llega <= 2, `a los 150 s, ${fuera} de 10 fuera de forma y ${llega} en forma junto a la ametralladora`);
}

// blindaje: el 75 mm del Sherman contra el Panzer IV, de frente no y de lado sí (a 100 casillas, 400 m)
{
  const pz = { x: 100, y: 0, rumbo: Math.PI, torreta: Math.PI, def: CARRO.panzer4 }, sh = { x: 0, y: 0 };
  const frente = penetra(sh, pz, ARMA.m3_75, 100);
  ok(!frente.atraviesa && frente.lado === 'frente', `de frente no atraviesa (${frente.pen} mm contra ${frente.espesor})`);
  const lado = penetra(sh, { ...pz, rumbo: Math.PI / 2 }, ARMA.m3_75, 100);
  ok(lado.atraviesa && lado.lado === 'lado', `de lado atraviesa (${lado.pen} mm contra ${lado.espesor})`);
  const sesgo = penetra(sh, { ...pz, rumbo: Math.PI + 0.85 }, ARMA.m3_75, 100); // el flanco, a unos 40° del proyectil
  ok(sesgo.lado === 'lado' && sesgo.espesor >= CARRO.panzer4.blindaje.casco.lado * 1.25, `un flanco sesgado cuenta más espesor (${sesgo.espesor} mm frente a ${CARRO.panzer4.blindaje.casco.lado})`);
}

// una batalla entera en la granja: acaba, sin errores, y deprisa
for (const s of [1, 2, 3]) {
  const t0 = performance.now(), p = juega(s, 9000), ms = (performance.now() - t0) / Math.max(1, p.t);
  ok(p.fin && ms < 3, `batalla con semilla ${s}: acaba a los ${(p.t / 10).toFixed(0)} s (${p.fin.ganador}, ${p.fin.motivo}), ${ms.toFixed(2)} ms por paso`);
}

console.log(fallos ? `✗ ${fallos} fallo(s)` : '✓ todo bien');
process.exit(fallos ? 1 : 0);
