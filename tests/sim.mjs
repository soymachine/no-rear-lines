// La simulación, sin navegador: determinismo, obediencia, la regla del seto, la supresión de una ametralladora sobre
// una escuadra que cruza al descubierto, el blindaje de los carros, el casco oculto, el humo, el mapa de amenaza y la
// ruta cubierta (también la del jugador: MOVER cubierto y CORRER directo), el carro de la IA (escolta y emboscada) y una
// batalla entera en la granja.
// Uso: node tests/sim.mjs
import { creaPartida, paso, ordena, huella, penetra, cascoOculto } from '../js/sim/partida.js';
import { ia } from '../js/sim/ia.js';
import { fuentesAmenaza, mapaAmenaza } from '../js/sim/amenaza.js';
import { seVe } from '../js/sim/vista.js';
import { cargaMapa } from '../js/sim/mapa.js';
import { GRANJA } from '../js/data/mapas/granja.js';
import { ARMA } from '../js/data/armas.js';
import { CARRO } from '../js/data/unidades.js';
import { duelos } from '../tools/duelo.mjs';

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

// el casco oculto: un carro con un seto pegado entre él y quien le dispara solo enseña la torreta; desde atrás, o con el
// seto a dos casillas, no. En el duelo de frente (tools/duelo.mjs), el Sherman oculto gana bastante más que sin la regla
{
  const m = cargaMapa(mapa(Array.from({ length: 9 }, () => '..........#..........')));
  const c = { x: 9.5, y: 4.5 };
  ok(cascoOculto(m, c, { x: 30, y: 4.5 }) && cascoOculto(m, c, { x: 30, y: 12 }), 'con el seto pegado delante, el casco no se ve (de frente y en diagonal)');
  ok(!cascoOculto(m, c, { x: 0, y: 4.5 }) && !cascoOculto(m, { x: 8.5, y: 4.5 }, { x: 30, y: 4.5 }), 'desde atrás, o con el seto a dos casillas, sí');
  const con = duelos({ oculto: 'sherman', d: 30, geo: 'frente', casco: true }, 150), sin = duelos({ oculto: 'sherman', d: 30, geo: 'frente', casco: false }, 150);
  ok(con.oculto >= sin.oculto + 0.08, `duelo de frente a 30 casillas: el Sherman oculto gana el ${(con.oculto * 100).toFixed(0)} % (sin la regla, el ${(sin.oculto * 100).toFixed(0)} %)`);
  // de lejos, el seto no hace más fácil de matar al Panzer IV (su torreta de 50 mm): a 50 casillas, de frente, gana lo mismo
  const pzCon = duelos({ oculto: 'panzer4', d: 50, geo: 'frente', casco: true }, 150), pzSin = duelos({ oculto: 'panzer4', d: 50, geo: 'frente', casco: false }, 150);
  ok(pzCon.oculto >= pzSin.oculto - 0.03, `duelo de frente a 50 casillas: el Panzer IV oculto gana el ${(pzCon.oculto * 100).toFixed(0)} % (sin la regla, el ${(pzSin.oculto * 100).toFixed(0)} %)`);
}

// el mapa de amenaza y la ruta cubierta: con un enemigo conocido al oeste que ve el campo abierto de abajo, una
// escuadra que va de este a oeste por ese campo, con MOVER cubierto, da la vuelta por detrás del seto largo (arriba) y
// solo baja al final; sin cubierto, va derecha por el campo
{
  const filas = Array.from({ length: 24 }, (_, y) => (y === 8 ? '.'.repeat(6) + '#'.repeat(40) + '.'.repeat(14) : y < 8 ? '.'.repeat(6) + '#' + '.'.repeat(53) : '.'.repeat(60)));
  // (el mapa de amenaza lo pone al día la propia partida con lo que sabe el bando: sus contactos)
  const corre = (cubierta, tipo = 'mover') => {
    const p = creaPartida({ mapa: mapa(filas), semilla: 5, fuerzas: [{ lado: 'us', escuadras: [{ tipo: 'us_fusileros', x: 2, y: 16 }] }, { lado: 'de', escuadras: [{ tipo: 'de_gruppe', x: 52, y: 14 }] }] });
    p.contactos.de.set(0, { x: 2.5, y: 16.5, t: 0, ahora: false }); // un contacto viejo: el jefe americano, al oeste
    ordena(p, { tipo, escuadra: 'de1', x: 12, y: 13, ...(cubierta != null && { cubierta }) });
    paso(p);
    // a lo largo de cada ruta (cada media casilla): qué parte está a la vista y qué parte va por detrás del seto
    const a = p.amenaza.de, us = p.unidades.filter((u) => u.lado === 'de');
    let vistas = 0, total = 0, arriba = 0;
    for (const u of us) {
      let [cx, cy] = [u.x - 0.5, u.y - 0.5], n = 0, n8 = 0;
      for (const [x, y] of u.ruta) {
        const k = Math.max(1, Math.ceil(Math.hypot(x - cx, y - cy) * 2));
        for (let i = 1; i <= k; i++) { const sx = Math.round(cx + ((x - cx) * i) / k), sy = Math.round(cy + ((y - cy) * i) / k); n++; if (sy < 8) n8++; if (a[sy * p.m.w + sx] > 0) vistas++; }
        [cx, cy] = [x, y];
      }
      total += n; if (n8 >= n * 0.5) arriba++;
    }
    return { vistas: vistas / total, arriba };
  };
  const p0 = creaPartida({ mapa: mapa(filas), semilla: 5, fuerzas: [{ lado: 'us', escuadras: [] }, { lado: 'de', escuadras: [] }] });
  p0.contactos.de = new Map(); // sin contactos: el despliegue del otro bando (x 0–3)
  const a0 = mapaAmenaza(p0.m, fuentesAmenaza(p0, 'de')), w = p0.m.w;
  ok(a0[16 * w + 40] > 0 && a0[4 * w + 40] === 0, 'la amenaza: el campo abierto a la vista del despliegue enemigo, sí; detrás del seto largo, no');
  ok(a0[4 * w + 7] > 0 && a0[4 * w + 9] === 0, 'la regla del seto: lo pegado al otro lado de un seto se ve; dos casillas más allá, no');
  const sin = corre(false), con = corre(true);
  ok(con.vistas < 0.35 && sin.vistas > 0.8, `con la ruta cubierta, ${(con.vistas * 100).toFixed(0)} % de la ruta a la vista (sin ella, ${(sin.vistas * 100).toFixed(0)} %)`);
  ok(con.arriba >= 8 && sin.arriba === 0, `con la ruta cubierta, ${con.arriba} de 10 van sobre todo por detrás del seto (sin ella, ${sin.arriba})`);
  // las órdenes del jugador no dicen nada: MOVER va por lo cubierto y CORRER por lo rápido
  const mover = corre(undefined, 'mover'), correr = corre(undefined, 'correr');
  ok(mover.vistas === con.vistas && correr.arriba === 0 && correr.vistas > 0.8, `sin decirlo, MOVER va cubierto (${(mover.vistas * 100).toFixed(0)} % a la vista) y CORRER directo (${(correr.vistas * 100).toFixed(0)} %)`);
  // niebla de guerra: un enemigo que el bando no ha visto no entra en su mapa
  // (un alemán en (40, 20), lejos de su despliegue y de su llegada esperada: su bloque de 4 × 4 no tiene fuente hasta verlo)
  const pn = creaPartida({ mapa: mapa(filas), semilla: 5, fuerzas: [{ lado: 'us', escuadras: [{ tipo: 'us_fusileros', x: 4, y: 16 }] }, { lado: 'de', escuadras: [{ tipo: 'de_gruppe', x: 40, y: 20 }] }] });
  const cerca = (f) => f.some((q) => Math.floor(q.x / 4) === 10 && Math.floor(q.y / 4) === 5);
  const antes = cerca(fuentesAmenaza(pn, 'us'));
  pn.contactos.us.set(10, { x: 40.5, y: 20.5, t: 0, ahora: true });
  ok(!antes && cerca(fuentesAmenaza(pn, 'us')), 'el mapa del jugador solo lleva lo que sabe: el alemán que no ha visto no está; visto, sí');
}

// el carro de la IA: sin escolta de infantería no sale a emboscar (espera detrás del objetivo); con ella, se emboscan
// junto a un seto o una casa, fuera del camino, y no se queda parado en el camino en toda la batalla
{
  const o = GRANJA.objetivos[0];
  const solo = creaPartida({ mapa: GRANJA, semilla: 1, fuerzas: [FUERZAS[0], { ...FUERZAS[1], escuadras: [] }] });
  for (let i = 0; i < 600; i++) { ia(solo, 'de'); paso(solo); }
  const pz = solo.unidades.find((u) => u.tipo === 'carro' && u.lado === 'de');
  ok(pz.x > o.x && solo.iaPlan.de.carro[pz.id].va === 'reserva', `sin escolta, el Panzer espera detrás de la granja (${pz.x.toFixed(0)}, ${pz.y.toFixed(0)})`);
  let enCamino = 0, emb = null, escoltado = true;
  for (const s of [1, 2, 3]) {
    const p = creaPartida({ mapa: GRANJA, semilla: s, fuerzas: FUERZAS });
    for (let i = 0; i < 3000 && !p.fin; i++) {
      for (const o2 of ORDENES[p.t] || []) ordena(p, o2);
      ia(p, 'de'); paso(p);
      const c = p.unidades.find((u) => u.tipo === 'carro' && u.lado === 'de'), pc = p.iaPlan.de.carro[c.id];
      if (p.t > 20 && c.estado === 'forma' && !c.ruta.length && p.m.baldosa(Math.floor(c.x), Math.floor(c.y)).id === 'camino') enCamino++;
      emb = pc.emb;
      // parado en la emboscada: tiene una escuadra en condiciones a menos de 1,5 × escolta (o se va en ≤ 3 s)
      if (p.t % 30 === 29 && c.estado === 'forma' && !c.ruta.length && Math.floor(c.x) === emb.x && Math.floor(c.y) === emb.y && pc.va === 'reserva') escoltado = false;
    }
  }
  const junto = [-1, 0, 1].some((j) => [-1, 0, 1].some((i) => (i || j) && GRANJA.filas[emb.y + j][emb.x + i].match(/[#C]/)));
  ok(enCamino === 0, `el Panzer no se para en el camino (${enCamino / 10} s parado en él en tres batallas, tras recibir su orden)`);
  ok(junto && GRANJA.filas[emb.y][emb.x] !== '=', `su emboscada, (${emb.x}, ${emb.y}), está junto a un seto o una casa y fuera del camino`);
  ok(escoltado, 'parado en la emboscada, siempre con escolta');
}

// una batalla entera en la granja: acaba, sin errores, y deprisa
for (const s of [1, 2, 3]) {
  const t0 = performance.now(), p = juega(s, 9000), ms = (performance.now() - t0) / Math.max(1, p.t);
  ok(p.fin && ms < 3, `batalla con semilla ${s}: acaba a los ${(p.t / 10).toFixed(0)} s (${p.fin.ganador}, ${p.fin.motivo}), ${ms.toFixed(2)} ms por paso`);
}

console.log(fallos ? `✗ ${fallos} fallo(s)` : '✓ todo bien');
process.exit(fallos ? 1 : 0);
