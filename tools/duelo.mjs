// El duelo de carros con y sin casco oculto (REGLAS.casco), para medir sus cifras: un carro parado y pegado a un seto
// (el oculto) contra el otro, a una distancia y con una geometría, con muchas semillas. «Sin» es la misma batalla con la
// regla apagada (el seto sigue ahí; solo deja de esconder el casco), así que la diferencia es la de la regla.
// - frente: los dos de frente, parados, ya apuntados y cada uno en un punto de su recarga (el oculto, con el seto delante).
// - flanco: el oculto, de lado al enemigo (el seto le tapa el flanco del casco; la torreta ya le apunta).
// - cruza: el otro pasa de lado (correr) por delante del oculto, a d casillas, con la torreta hacia delante: la emboscada.
// Uso: node tools/duelo.mjs [--n 200] [--d 15,30,50] [--geo frente,flanco,cruza] [--oculto panzer4,sherman]
//   Escribe, por caso, quién gana con la regla y sin ella (%), en cuánto tiempo y con cuántos disparos del cañón.
import { pathToFileURL } from 'node:url';
import { creaPartida, paso, ordena } from '../js/sim/partida.js';
import { REGLAS } from '../js/data/reglas.js';
import { CARRO } from '../js/data/unidades.js';
import { ARMA } from '../js/data/armas.js';
import { RNG } from '../js/util/rng.js';

const ANCHO = 80, ALTO = 31, SETO = 20, FILA = 15, TOPE = 1800; // pasos (3 min)
const MAPA = {
  id: 'duelo', nombre: { es: 'Duelo', en: 'Duel' }, ancho: ANCHO, alto: ALTO,
  filas: Array.from({ length: ALTO }, (_, y) => '.'.repeat(SETO) + (y >= 5 && y <= 25 ? '#' : '.') + '.'.repeat(ANCHO - SETO - 1)),
  despliegues: { us: { x: 0, y: 0, w: 4, h: ALTO }, de: { x: ANCHO - 4, y: 0, w: 4, h: ALTO } },
  objetivos: [{ id: 'o', nombre: { es: 'O', en: 'O' }, x: 40, y: FILA, r: 3 }],
};

// un duelo: { gana: 'oculto' | 'otro' | null, t (s), disparos: { oculto, otro } }
export function duelo({ oculto = 'panzer4', d = 30, geo = 'frente', semilla = 1, casco = true } = {}) {
  const otro = oculto === 'panzer4' ? 'sherman' : 'panzer4', lado = (t) => CARRO[t].lado;
  const ox = SETO - 1, oy = FILA, ex = SETO - 1 + d, ey = geo === 'cruza' ? 2 : FILA;
  const fuerzas = [
    { lado: lado(oculto), carros: [{ tipo: oculto, x: ox, y: oy, rumbo: geo === 'flanco' ? Math.PI / 2 : 0 }] },
    { lado: lado(otro), carros: [{ tipo: otro, x: ex, y: ey, rumbo: geo === 'cruza' ? Math.PI / 2 : Math.PI }] },
  ];
  const guarda = REGLAS.casco.baldosas;
  if (!casco) REGLAS.casco.baldosas = [];
  try {
    const p = creaPartida({ mapa: MAPA, semilla, fuerzas }), [a, b] = p.unidades;
    a.torreta = Math.atan2(b.y - a.y, b.x - a.x); // la emboscada: el oculto, ya apuntado
    if (geo !== 'cruza') {
      // de frente o de flanco, los dos apuntados y cada uno en un punto de su recarga (de un azar aparte, con la semilla):
      // si no, dispara siempre primero el de id más bajo y el primer disparo decide
      const r = new RNG(semilla ^ 0x9e3779b9);
      b.torreta = Math.atan2(a.y - b.y, a.x - b.x);
      for (const c of [a, b]) c.espera = 2 + r.float(0, 1 / ARMA[c.def.cañon].cadencia);
    } else ordena(p, { tipo: 'correr', carro: b.id, x: ex, y: ALTO - 3 });
    const disparos = { oculto: 0, otro: 0 };
    while (p.t < TOPE && a.estado === 'forma' && b.estado === 'forma') {
      paso(p);
      for (const s of p.sucesos) if (s.tipo === 'cañonazo') disparos[s.de === a.id ? 'oculto' : 'otro']++;
      if (geo === 'cruza' && !b.ruta.length && b.estado === 'forma') break; // ya ha pasado
    }
    const gana = a.estado !== 'forma' ? 'otro' : b.estado !== 'forma' ? 'oculto' : null;
    return { gana, t: p.t / 10, disparos };
  } finally { REGLAS.casco.baldosas = guarda; }
}

// muchas semillas: { oculto %, otro %, nadie %, t medio, disparos medios }
export function duelos(caso, n = 200, semilla0 = 1) {
  const r = { oculto: 0, otro: 0, nadie: 0, t: 0, dOculto: 0, dOtro: 0 };
  for (let s = semilla0; s < semilla0 + n; s++) {
    const x = duelo({ ...caso, semilla: s });
    r[x.gana || 'nadie']++; r.t += x.t; r.dOculto += x.disparos.oculto; r.dOtro += x.disparos.otro;
  }
  for (const k of Object.keys(r)) r[k] /= n;
  return r;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), opt = (k, v) => { const i = args.indexOf('--' + k); return i < 0 ? v : args[i + 1]; };
  const n = +opt('n', 200), ds = opt('d', '15,30,50').split(',').map(Number), geos = opt('geo', 'frente,flanco,cruza').split(','), ocultos = opt('oculto', 'panzer4,sherman').split(',');
  const pc = (v) => `${Math.round(v * 100)}`.padStart(3) + ' %';
  console.log(`casco oculto: puntería ×${REGLAS.casco.punteria}, impactos a la torreta, seto pegado a ≤ ${REGLAS.casco.pegado} casilla · ${n} semillas por caso`);
  console.log('oculto   geo     d   │ con la regla: gana oculto / otro / nadie, t, disparos │ sin ella: gana oculto / otro / nadie, t, disparos');
  for (const oculto of ocultos) for (const geo of geos) for (const d of ds) {
    const con = duelos({ oculto, d, geo, casco: true }, n), sin = duelos({ oculto, d, geo, casco: false }, n);
    const f = (r) => `${pc(r.oculto)} / ${pc(r.otro)} / ${pc(r.nadie)}, ${r.t.toFixed(0).padStart(3)} s, ${r.dOculto.toFixed(1)}–${r.dOtro.toFixed(1)}`;
    console.log(`${oculto.padEnd(8)} ${geo.padEnd(7)} ${String(d).padStart(2)}  │ ${f(con)}            │ ${f(sin)}`);
  }
}
