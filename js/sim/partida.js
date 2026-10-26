// La partida: la simulación en pasos fijos (REGLAS.paso, 10 por segundo). No toca el DOM, el canvas ni el audio:
// emite sucesos (p.sucesos, los de este paso) que el dibujo y el sonido leen después. Todo el azar sale de p.rng, con
// la semilla de la partida, y las unidades se recorren siempre por id: la misma semilla y las mismas órdenes dan la
// misma batalla (huella()).
//
//   const p = creaPartida({ mapa, semilla, fuerzas });  ordena(p, orden);  paso(p);  … p.fin
// fuerzas: [{ lado, escuadras: [{ tipo, x, y }], carros: [{ tipo, x, y, rumbo }] }]
// órdenes: { tipo: 'mover'|'correr'|'esconderse'|'retirada'|'humo'|'alto', escuadra | carro: id, x, y }. Entran al
// principio del paso siguiente; cada soldado decide si la cumple según su estado (obediencia filtrada por la moral).
// Con cubierta: true, la ruta pesa lo que se ve desde el enemigo (p.amenaza[lado], el mapa de amenaza que deja la IA
// del bando: amenaza.js); con mira, el carro, al llegar, encara el casco y la torreta hacia ese rumbo.
import { RNG } from '../util/rng.js';
import { ARMA } from '../data/armas.js';
import { ESCUADRA, CARRO } from '../data/unidades.js';
import { REGLAS as R } from '../data/reglas.js';
import { cargaMapa } from './mapa.js';
import { ruta, suaviza, andableCerca } from './rutas.js';
import { seVe } from './vista.js';

const DT = R.paso;
const ang = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const difAng = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const enPie = (u) => u.estado !== 'herido' && u.estado !== 'muerto';
const enCondiciones = (u) => u.estado === 'forma' || u.estado === 'suprimido';
// huecos de formación (cuña) relativos al jefe, mirando hacia +x, en casillas
const CUÑA = [[0, 0], [-1.5, -1.5], [-1.5, 1.5], [-3, -3], [-3, 3], [-4.5, -4.5], [-4.5, 4.5], [-6, -2], [-6, 2], [-7.5, 0]];
const LINEA = [[0, 0], [0, -2], [0, 2], [0, -4], [0, 4], [0, -6], [0, 6], [0, -8], [0, 8], [0, -10]];

export function creaPartida({ mapa, semilla = 1, fuerzas }) {
  const p = {
    m: cargaMapa(mapa), def: mapa, semilla, rng: new RNG(semilla), t: 0, unidades: [], porId: {}, escuadras: [],
    contactos: { us: new Map(), de: new Map() }, amenaza: { us: null, de: null }, humo: [], lanzamientos: [], cola: [], sucesos: [], fin: null,
  };
  let n = 0;
  const pon = (u) => { u.id = n++; p.unidades.push(u); p.porId[u.id] = u; return u; };
  for (const f of fuerzas) {
    for (const e of f.escuadras || []) {
      const def = ESCUADRA[e.tipo], esc = { id: `${f.lado}${p.escuadras.length}`, lado: f.lado, def, soldados: [], humo: def.humo, orden: null };
      p.escuadras.push(esc);
      def.soldados.forEach((s, i) => {
        const [ox, oy] = CUÑA[i % CUÑA.length], dir = f.lado === 'us' ? 1 : -1;
        const [cx, cy] = andableCerca(p.m, e.x + ox * dir, e.y + oy, 'pie') || [e.x, e.y];
        const u = pon({ tipo: 'soldado', lado: f.lado, esc: esc.id, puesto: s.puesto, arma: ARMA[s.arma], x: cx + 0.5, y: cy + 0.5, rumbo: f.lado === 'us' ? 0 : Math.PI, postura: 'pie', estado: 'forma', sup: 0, moral: def.moral, ruta: [], modo: 'andar', espera: p.rng.float(0, 2), blanco: null, quieto: true, disparo: -99, fuego: true, huye: 0 });
        esc.soldados.push(u.id);
      });
    }
    for (const c of f.carros || []) {
      const def = CARRO[c.tipo];
      pon({ tipo: 'carro', lado: f.lado, def, x: c.x + 0.5, y: c.y + 0.5, rumbo: c.rumbo ?? (f.lado === 'us' ? 0 : Math.PI), torreta: c.rumbo ?? (f.lado === 'us' ? 0 : Math.PI), estado: 'forma', ruta: [], espera: 2, esperaCoax: 1, blanco: null, disparo: -99 });
    }
  }
  for (const u of p.unidades) { u.px = u.x; u.py = u.y; u.prumbo = u.rumbo; u.det = { us: 0, de: 0 }; u.vista = { us: -99, de: -99 }; }
  return p;
}

export function ordena(p, orden) { p.cola.push(orden); }
const suceso = (p, s) => p.sucesos.push({ t: p.t, ...s });
const escuadra = (p, id) => p.escuadras.find((e) => e.id === id);
const soldados = (p, esc) => esc.soldados.map((id) => p.porId[id]);
const jefeDe = (p, esc) => soldados(p, esc).find((u) => enPie(u) && u.estado !== 'panico');

// ---------------------------------------------------------------- un paso
export function paso(p) {
  if (p.fin) return;
  p.sucesos = [];
  for (const u of p.unidades) { u.px = u.x; u.py = u.y; u.prumbo = u.rumbo; if (u.tipo === 'carro') u.ptorreta = u.torreta; }
  for (const o of p.cola.splice(0)) cumple(p, o);
  for (const l of p.lanzamientos.splice(0)) if (l.cuando <= p.t) { p.humo.push({ x: l.x, y: l.y, r: R.humo.radio, hasta: p.t + R.humo.vida / DT }); suceso(p, { tipo: 'humo', x: l.x, y: l.y, r: R.humo.radio }); } else p.lanzamientos.push(l);
  p.humo = p.humo.filter((n) => n.hasta > p.t);
  detecta(p);
  for (const u of p.unidades) if (u.tipo === 'soldado') soldado(p, u); else carro(p, u);
  moral(p);
  humoIA(p);
  victoria(p);
  p.t++;
}

// ---------------------------------------------------------------- órdenes y obediencia
function cumple(p, o) {
  if (o.carro != null) {
    // el carro por su id, o el primero de un bando ('us')
    const c = typeof o.carro === 'string' ? p.unidades.find((u) => u.tipo === 'carro' && u.lado === o.carro) : p.porId[o.carro];
    if (!c || c.estado !== 'forma') return;
    c.mira = o.mira ?? null;
    if (o.tipo === 'alto') c.ruta = [];
    else {
      const [ex, pe] = rutaCubierta(p, c.lado, o, 'carro'), ax = Math.floor(c.x), ay = Math.floor(c.y);
      const r = ruta(p.m, ax, ay, ...(andableCerca(p.m, o.x, o.y, 'carro') || [ax, ay]), 'carro', ex, pe);
      c.ruta = r ? suaviza(p.m, ax, ay, r, 'carro', ex, pe) : [];
    }
    suceso(p, { tipo: 'orden', carro: c.id, orden: o.tipo, cumplen: 1, total: 1, motivo: null });
    return;
  }
  const esc = escuadra(p, o.escuadra);
  if (!esc) return;
  esc.orden = o;
  const us = soldados(p, esc).filter(enPie), jefe = jefeDe(p, esc);
  const motivos = {};
  let cumplen = 0;
  if (o.tipo === 'humo') { lanzaHumo(p, esc, o.x, o.y); return; }
  // los huecos de cada uno en el destino: cuña hacia donde va (línea si es para defender)
  const cx = us.reduce((s, u) => s + u.x, 0) / (us.length || 1), cy = us.reduce((s, u) => s + u.y, 0) / (us.length || 1);
  const dir = ang(cx, cy, o.x, o.y), F = o.formacion === 'linea' ? LINEA : CUÑA, c = Math.cos(dir), s = Math.sin(dir);
  const [ex, pe] = rutaCubierta(p, esc.lado, o, o.tipo);
  us.forEach((u, i) => {
    const r = disposicion(p, u, o, jefe);
    if (!r.cumple) { motivos[r.motivo] = (motivos[r.motivo] || 0) + 1; if (o.tipo !== 'alto') u.ruta = []; return; }
    cumplen++;
    if (o.tipo === 'alto') { u.ruta = []; return; }
    if (o.tipo === 'esconderse') { u.ruta = []; u.postura = 'tierra'; u.fuego = false; return; }
    u.fuego = true;
    let tx = o.x, ty = o.y;
    if (o.tipo === 'retirada') { const z = p.def.despliegues[u.lado]; tx = z.x + z.w / 2; ty = z.y + z.h / 2; }
    const [ox, oy] = F[i % F.length];
    let dest = andableCerca(p.m, tx + ox * c - oy * s, ty + ox * s + oy * c, 'pie') || andableCerca(p.m, tx, ty, 'pie');
    if (dest && ex) dest = huecoCubierto(p, dest, ex);
    const rr = dest && ruta(p.m, Math.floor(u.x), Math.floor(u.y), dest[0], dest[1], 'pie', ex, pe);
    u.ruta = rr ? suaviza(p.m, Math.floor(u.x), Math.floor(u.y), rr, 'pie', ex, pe) : [];
    u.modo = o.tipo === 'correr' || o.tipo === 'retirada' ? 'correr' : 'andar';
    u.rumboFinal = o.mira != null ? o.mira : dir;
  });
  const motivo = Object.entries(motivos).sort((a, b) => b[1] - a[1])[0];
  suceso(p, { tipo: 'orden', escuadra: esc.id, orden: o.tipo, cumplen, total: us.length, motivo: motivo ? motivo[0] : null });
}
// la ruta cubierta: el mapa de amenaza del bando y lo que pesa para esta orden (REGLAS.amenaza.peso), o nada
function rutaCubierta(p, lado, o, clase) {
  const a = o.cubierta && p.amenaza[lado], pe = a && R.amenaza.peso[clase];
  return pe ? [a, pe] : [null, 1];
}
// con la ruta cubierta, el hueco se corre a la casilla andable menos vista de alrededor (sin meterse en lo que tapa)
function huecoCubierto(p, [hx, hy], ex) {
  const A = R.amenaza;
  let best = [hx, hy], bd = A.huecoPeso * ex[hy * p.m.w + hx];
  for (let j = -A.hueco; j <= A.hueco; j++) for (let i = -A.hueco; i <= A.hueco; i++) {
    const x = hx + i, y = hy + j;
    if (!p.m.dentro(x, y) || p.m.coste(x, y, 'pie') === Infinity || p.m.tapa(x, y)) continue;
    const d = i * i + j * j + A.huecoPeso * ex[y * p.m.w + x];
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}
// ¿cumple este soldado la orden? Retirarse, esconderse y parar casi siempre; avanzar depende de su estado
function disposicion(p, u, o, jefe) {
  if (u.estado === 'panico') return { cumple: false, motivo: 'panico' };
  if (o.tipo === 'retirada' || o.tipo === 'esconderse' || o.tipo === 'alto') return { cumple: true };
  if (u.sup >= R.supresion.fijado[0]) return { cumple: false, motivo: 'fijado' };
  if (u.estado === 'acobardado') return { cumple: false, motivo: 'acobardado' };
  if (u.estado === 'suprimido') {
    const cerca = jefe && jefe !== u && dist(jefe, u) <= R.moral.radioJefe ? R.obediencia.jefeCerca : 0;
    return p.rng.chance((u.moral / 100) * R.obediencia.suprimido + cerca) ? { cumple: true } : { cumple: false, motivo: 'suprimido' };
  }
  return { cumple: true };
}
function lanzaHumo(p, esc, x, y) {
  if (esc.humo <= 0) return false;
  const u = soldados(p, esc).filter(enCondiciones).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y) || a.id - b.id)[0];
  if (!u) return false;
  const d = Math.hypot(x - u.x, y - u.y), k = d > R.humo.alcance ? R.humo.alcance / d : 1;
  esc.humo--;
  const l = { x: u.x + (x - u.x) * k, y: u.y + (y - u.y) * k, cuando: p.t + R.humo.lanzar / DT };
  p.lanzamientos.push(l);
  suceso(p, { tipo: 'lanza', de: u.id, x: l.x, y: l.y });
  return true;
}

// ---------------------------------------------------------------- detección (por bando)
function detecta(p) {
  const piensa = (u) => (p.t + u.id) % R.pensar === 0;
  for (const v of p.unidades) {
    if (!enPie(v) || v.estado === 'destruido' || !piensa(v)) continue;
    const alcance = v.tipo === 'carro' ? v.def.vista : R.vista;
    for (const e of p.unidades) {
      if (e.lado === v.lado || e.estado === 'muerto' || e.estado === 'destruido') continue;
      if (seVe(p.m, p.humo, v.x, v.y, e.x, e.y, alcance)) e.vista[v.lado] = p.t;
    }
  }
  for (const lado of ['us', 'de']) {
    const C = p.contactos[lado];
    for (const e of p.unidades) {
      if (e.lado === lado) continue;
      if (e.estado === 'muerto' || e.estado === 'destruido') { C.delete(e.id); continue; }
      if (p.t - e.vista[lado] <= R.pensar) {
        const dispara = p.t - e.disparo < 20;
        const k = e.tipo === 'carro' ? R.detectar.carro : (e.postura === 'tierra' ? R.detectar.tierra : R.detectar.pie) * (dispara ? R.detectar.disparando : 1);
        e.det[lado] = Math.min(1, e.det[lado] + k * DT);
        if (e.det[lado] >= 1) C.set(e.id, { x: e.x, y: e.y, t: p.t, ahora: true });
      } else {
        e.det[lado] = Math.max(0, e.det[lado] - 0.2 * DT);
        const c = C.get(e.id);
        if (c) { c.ahora = false; if ((p.t - c.t) * DT > R.olvido) C.delete(e.id); }
      }
    }
  }
}

// ---------------------------------------------------------------- un soldado
function soldado(p, u) {
  if (!enPie(u)) return;
  // la supresión se va sola (más deprisa a cubierto)
  const vm = p.m.cubre(Math.floor(u.x), Math.floor(u.y)) > 0 || u.postura === 'tierra' ? R.supresion.vidaMediaCubierto : R.supresion.vidaMedia;
  u.sup *= Math.pow(0.5, DT / vm);
  if (u.sup >= R.supresion.tumbarse && u.postura === 'pie') { u.postura = 'tierra'; suceso(p, { tipo: 'tumbarse', id: u.id }); }
  // el pánico: huye hacia su despliegue
  if (u.estado === 'panico') {
    if (!u.ruta.length && u.huye <= 0) {
      const z = p.def.despliegues[u.lado], d = andableCerca(p.m, z.x + z.w / 2, z.y + z.h / 2, 'pie'), r = d && ruta(p.m, Math.floor(u.x), Math.floor(u.y), d[0], d[1], 'pie');
      u.ruta = r ? suaviza(p.m, Math.floor(u.x), Math.floor(u.y), r, 'pie') : []; u.modo = 'correr'; u.huye = 20 / DT; u.postura = 'pie';
    }
    u.huye--;
    if (u.ruta.length) mueve(p, u);
    return;
  }
  const fijado = u.sup >= R.supresion.fijado[0] || u.estado === 'acobardado';
  const retirada = p.escuadras.find((e) => e.id === u.esc).orden?.tipo === 'retirada';
  if (u.ruta.length && (!fijado || retirada)) {
    if (u.estado === 'suprimido' && !retirada) { u.modo = 'arrastrarse'; u.postura = 'tierra'; } else if (u.postura === 'tierra' && u.modo !== 'arrastrarse') u.postura = 'pie';
    mueve(p, u);
  } else if (!u.ruta.length && u.rumboFinal != null && !u.blanco) u.rumbo += difAng(u.rumbo, u.rumboFinal) * 0.2;
  dispara(p, u);
}
function mueve(p, u) {
  const [tx, ty] = u.ruta[0], cx = tx + 0.5, cy = ty + 0.5, d = Math.hypot(cx - u.x, cy - u.y);
  const v = (R.velocidad[u.modo] / Math.max(0.5, p.m.coste(Math.floor(u.x), Math.floor(u.y), 'pie'))) * DT;
  if (d <= v) { u.x = cx; u.y = cy; u.ruta.shift(); } else { u.x += ((cx - u.x) / d) * v; u.y += ((cy - u.y) / d) * v; }
  if (!u.blanco) u.rumbo = ang(u.px, u.py, cx, cy);
  u.quieto = false;
}
// a quién dispara: el contacto que ve más cerca (de la escuadra, el del jefe si lo ve); si no ve a nadie pero hay un
// contacto reciente y su arma suprime, fuego de supresión a donde se le vio
function dispara(p, u) {
  u.espera -= DT;
  const moviendo = u.ruta.length > 0;
  if (!u.fuego || u.estado === 'acobardado' || u.sup >= R.supresion.fijado[0] || u.espera > 0 || (moviendo && u.modo !== 'andar')) return;
  const a = u.arma, C = p.contactos[u.lado];
  let best = null, bd = Infinity, area = null;
  for (const [id, c] of C) {
    const e = p.porId[id];
    if (e.tipo === 'carro' || !enPie(e)) continue;
    const d = Math.hypot(c.x - u.x, c.y - u.y);
    if (d > a.alcance) continue;
    if (c.ahora && seVe(p.m, p.humo, u.x, u.y, e.x, e.y, a.alcance)) { if (d < bd) { bd = d; best = e; } }
    else if (!area && (a.tipo === 'ametralladora' || a.tipo === 'automatico') && (p.t - c.t) * DT < 6) area = c;
  }
  if (!best && !area) { u.blanco = null; return; }
  u.espera = 1 / a.cadencia * p.rng.float(0.8, 1.2);
  u.disparo = p.t;
  const tx = best ? best.x : area.x, ty = best ? best.y : area.y;
  u.blanco = best ? best.id : null;
  u.rumbo = ang(u.x, u.y, tx, ty);
  fuego(p, u, a, tx, ty, best, moviendo);
}
// un disparo (o una ráfaga) de un arma ligera hacia (tx, ty); blanco: la unidad apuntada, o null (fuego de zona)
function fuego(p, u, a, tx, ty, blanco, moviendo) {
  const d = Math.hypot(tx - u.x, ty - u.y);
  let aciertos = 0;
  for (let b = 0; b < a.rafaga; b++) {
    let pa = a.precision * Math.exp(-d / a.caida) * (1 - 0.006 * (u.sup || 0)) * (moviendo ? 0.5 : 1) * (u.estado === 'suprimido' ? 0.7 : 1);
    if (blanco) pa *= (blanco.postura === 'tierra' ? 0.55 : 1) * (1 - cobertura(p, blanco, u)); else pa *= 0.25;
    const victima = blanco || cercano(p, u.lado, tx, ty, 1.5);
    if (victima && victima.tipo === 'soldado' && p.rng.chance(pa)) { aciertos++; baja(p, victima, a.letal, u); }
  }
  suprime(p, u.lado, tx, ty, a.supresion, a.radio);
  suceso(p, { tipo: 'disparo', de: u.id, arma: a.id, x0: u.x, y0: u.y, x1: tx, y1: ty, aciertos, rafaga: a.rafaga });
}
// cuánto cubre a e lo que tiene delante desde donde le disparan: su casilla o la de al lado hacia el tirador
function cobertura(p, e, desde) {
  const x = Math.floor(e.x), y = Math.floor(e.y), dx = Math.sign(Math.round(desde.x - e.x)), dy = Math.sign(Math.round(desde.y - e.y));
  return Math.max(p.m.cubre(x, y), p.m.cubre(x + dx, y + dy), p.m.cubre(x + dx, y), p.m.cubre(x, y + dy));
}
const cercano = (p, ladoTirador, x, y, r) => { let best = null, bd = r; for (const e of p.unidades) if (e.lado !== ladoTirador && e.tipo === 'soldado' && enPie(e)) { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } } return best; };
function suprime(p, ladoTirador, x, y, s, r) {
  for (const e of p.unidades) {
    if (e.lado === ladoTirador || e.tipo !== 'soldado' || !enPie(e)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d > r) continue;
    const cub = p.m.cubre(Math.floor(e.x), Math.floor(e.y)) > 0 || e.postura === 'tierra' ? 0.6 : 1;
    e.sup = Math.min(100, e.sup + s * (1 - (d / r) * 0.6) * cub);
  }
}
function baja(p, e, letal, de) {
  const muere = p.rng.chance(letal);
  e.estado = muere ? 'muerto' : 'herido';
  e.ruta = []; e.postura = 'tierra';
  suceso(p, { tipo: 'baja', id: e.id, como: e.estado, de: de ? de.id : null });
  const esc = p.escuadras.find((x) => x.id === e.esc);
  for (const f of p.unidades) {
    if (f.lado !== e.lado || f.tipo !== 'soldado' || !enPie(f)) continue;
    let k = 0;
    if (f.esc === e.esc) k += R.moral.bajaCompañero;
    if (Math.hypot(f.x - e.x, f.y - e.y) <= R.moral.cerca) k = Math.max(k, R.moral.bajaCerca);
    if (esc && e.puesto === 'jefe' && f.esc === e.esc) k += R.moral.jefe;
    f.moral = Math.max(0, f.moral - k);
  }
}

// ---------------------------------------------------------------- un carro
function carro(p, c) {
  if (c.estado !== 'forma') return;
  const d = c.def;
  // moverse: girar sobre las orugas hacia el siguiente punto y avanzar cuando mira hacia él
  if (c.ruta.length) {
    const [tx, ty] = c.ruta[0], cx = tx + 0.5, cy = ty + 0.5, dd = Math.hypot(cx - c.x, cy - c.y);
    const quiere = ang(c.x, c.y, cx, cy), df = difAng(c.rumbo, quiere), giro = (d.giroCasco * Math.PI / 180) * DT;
    c.rumbo += Math.max(-giro, Math.min(giro, df));
    if (Math.abs(df) < 0.35) {
      const v = (d.velocidad / Math.max(0.5, p.m.coste(Math.floor(c.x), Math.floor(c.y), 'carro'))) * DT;
      if (dd <= v) { c.x = cx; c.y = cy; c.ruta.shift(); } else { c.x += Math.cos(c.rumbo) * v; c.y += Math.sin(c.rumbo) * v; }
    }
  }
  // parado y con un rumbo pedido (mira): el casco, de frente hacia él
  if (!c.ruta.length && c.mira != null) { const giro = (d.giroCasco * Math.PI / 180) * DT; c.rumbo += Math.max(-giro, Math.min(giro, difAng(c.rumbo, c.mira))); }
  // blanco: un carro enemigo que se ve primero; si no, la infantería más cercana que se ve
  const C = p.contactos[c.lado];
  let best = null, bd = Infinity;
  for (const [id, k] of C) {
    const e = p.porId[id];
    if (!k.ahora || !(e.tipo === 'carro' ? e.estado === 'forma' : enPie(e))) continue;
    const dd = Math.hypot(e.x - c.x, e.y - c.y) - (e.tipo === 'carro' ? 1000 : 0);
    if (dd < bd && seVe(p.m, p.humo, c.x, c.y, e.x, e.y, ARMA[d.cañon].alcance)) { bd = dd; best = e; }
  }
  c.blanco = best ? best.id : null;
  c.espera -= DT; c.esperaCoax -= DT;
  // sin blanco, la torreta espera apuntada hacia donde se espera al enemigo
  if (!best && c.mira != null) { const giro = (d.giroTorreta * Math.PI / 180) * DT; c.torreta += Math.max(-giro, Math.min(giro, difAng(c.torreta, c.mira))); }
  if (!best) return;
  const quiere = ang(c.x, c.y, best.x, best.y), df = difAng(c.torreta, quiere), giro = (d.giroTorreta * Math.PI / 180) * DT;
  c.torreta += Math.max(-giro, Math.min(giro, df));
  const alineada = Math.abs(difAng(c.torreta, quiere));
  const distancia = Math.hypot(best.x - c.x, best.y - c.y);
  if (best.tipo === 'carro' && alineada < 0.04 && c.espera <= 0) disparaCañon(p, c, best, distancia);
  else if (best.tipo === 'soldado') {
    if (alineada < 0.06 && c.espera <= 0 && distancia > 8) disparaCañon(p, c, best, distancia);
    else if (alineada < 0.2 && c.esperaCoax <= 0) { const a = ARMA[d.coaxial]; if (distancia <= a.alcance) { c.esperaCoax = 1 / a.cadencia; c.disparo = p.t; fuego(p, c, a, best.x, best.y, best, c.ruta.length > 0); } }
  }
}
function disparaCañon(p, c, e, d) {
  const a = ARMA[c.def.cañon];
  c.espera = 1 / a.cadencia; c.disparo = p.t;
  const pa = a.precision * Math.exp(-d / a.caida) * (c.ruta.length ? 0.5 : 1) * (e.tipo === 'carro' && e.ruta.length ? 0.7 : 1);
  const acierta = p.rng.chance(pa);
  // donde cae si falla: cerca del blanco
  const x = acierta ? e.x : e.x + p.rng.float(-2, 2), y = acierta ? e.y : e.y + p.rng.float(-2, 2);
  suceso(p, { tipo: 'cañonazo', de: c.id, arma: a.id, x0: c.x, y0: c.y, x1: x, y1: y, acierta });
  if (e.tipo === 'carro') { if (acierta) impactoCarro(p, c, e, a, d); return; }
  // explosivo contra infantería
  suceso(p, { tipo: 'explosion', x, y, r: a.explosivo });
  for (const v of p.unidades) {
    if (v.tipo !== 'soldado' || !enPie(v) || v.lado === c.lado) continue;
    const dd = Math.hypot(v.x - x, v.y - y);
    if (dd <= a.explosivo && p.rng.chance(0.7 * (1 - dd / a.explosivo) * (v.postura === 'tierra' ? 0.5 : 1) * (1 - p.m.cubre(Math.floor(v.x), Math.floor(v.y))))) baja(p, v, a.letal, c);
  }
  suprime(p, c.lado, x, y, a.supresion, a.radio);
}
// el lado por donde entra el proyectil y si atraviesa el blindaje (espesor / cos del ángulo con la placa)
export function penetra(c, e, a, d) {
  const desde = ang(e.x, e.y, c.x, c.y), torreta = e.torretaGolpe;
  const phi = Math.abs(difAng(torreta ? e.torreta : e.rumbo, desde));
  const lado = phi < Math.PI / 4 ? 'frente' : phi > (3 * Math.PI) / 4 ? 'trasera' : 'lado';
  const delta = lado === 'frente' ? phi : lado === 'trasera' ? Math.PI - phi : Math.abs(Math.PI / 2 - phi);
  const espesor = e.def.blindaje[torreta ? 'torreta' : 'casco'][lado] / Math.cos(Math.min(delta, 1.4));
  const [p0, p1] = a.penetracion, pen = p0 + (p1 - p0) * Math.min(1, d / 250);
  return { lado, espesor: Math.round(espesor), pen: Math.round(pen), atraviesa: delta < 1.22 && pen > espesor };
}
function impactoCarro(p, c, e, a, d) {
  e.torretaGolpe = p.rng.chance(0.35);
  const r = penetra(c, e, a, d);
  suceso(p, { tipo: r.atraviesa ? 'penetra' : 'rebote', de: c.id, a: e.id, ...r });
  if (r.atraviesa) { e.estado = 'destruido'; e.ruta = []; suceso(p, { tipo: 'destruido', id: e.id }); }
}

// ---------------------------------------------------------------- moral
function moral(p) {
  const M = R.moral;
  for (const u of p.unidades) {
    if (u.tipo !== 'soldado' || !enPie(u)) continue;
    let dm = 0;
    if (u.sup < 10) dm += M.recupera + (p.m.cubre(Math.floor(u.x), Math.floor(u.y)) > 0 || u.postura === 'tierra' ? M.recuperaCubierto : 0);
    const esc = p.escuadras.find((e) => e.id === u.esc), jefe = jefeDe(p, esc);
    if (jefe && jefe !== u && dist(jefe, u) <= M.radioJefe) dm += M.jefeCerca;
    for (const [id, k] of p.contactos[u.lado]) { const e = p.porId[id]; if (e.tipo === 'carro' && e.estado === 'forma' && Math.hypot(k.x - u.x, k.y - u.y) <= M.radioCarro) { dm -= M.carro; break; } }
    for (const f of p.unidades) if (f !== u && f.lado === u.lado && f.estado === 'panico' && dist(f, u) <= M.radioContagio) { dm -= M.contagio; break; }
    u.moral = Math.max(0, Math.min(100, u.moral + dm * DT));
    // el estado, con histéresis
    const antes = u.estado, S = R.supresion;
    let e = u.estado;
    if (e === 'panico') { if (u.moral > M.panico[1] && u.huye <= 0) e = 'acobardado'; }
    else if (u.moral < M.panico[0]) e = 'panico';
    else if (e === 'acobardado') { if (u.moral > M.acobardado[1] && u.sup < S.fijado[1]) e = u.sup >= S.suprimido[1] ? 'suprimido' : 'forma'; }
    else if (u.moral < M.acobardado[0] || u.sup >= S.fijado[0]) e = 'acobardado';
    else if (e === 'suprimido') { if (u.sup < S.suprimido[1]) e = 'forma'; }
    else if (u.sup >= S.suprimido[0]) e = 'suprimido';
    if (e !== antes) { u.estado = e; if (e === 'panico') { u.ruta = []; u.huye = 0; } suceso(p, { tipo: 'estado', id: u.id, de: antes, a: e }); }
  }
}

// ---------------------------------------------------------------- humo por iniciativa propia
// una escuadra que avanza o se retira bajo fuego tira humo entre ella y el enemigo más cercano que conoce
function humoIA(p) {
  if (p.t % R.pensar) return;
  for (const esc of p.escuadras) {
    const o = esc.orden;
    if (!o || esc.humo <= 0 || !['mover', 'correr', 'retirada'].includes(o.tipo)) continue;
    const us = soldados(p, esc).filter(enPie);
    if (!us.length || !us.some((u) => u.ruta.length)) continue;
    const sup = us.reduce((s, u) => s + u.sup, 0) / us.length;
    if (sup < R.humo.umbralIA) continue;
    const cx = us.reduce((s, u) => s + u.x, 0) / us.length, cy = us.reduce((s, u) => s + u.y, 0) / us.length;
    if (p.humo.some((n) => Math.hypot(n.x - cx, n.y - cy) < R.humo.alcance + n.r) || p.lanzamientos.length) continue;
    let best = null, bd = Infinity;
    for (const [, c] of p.contactos[esc.lado]) { const d = Math.hypot(c.x - cx, c.y - cy); if (d < bd) { bd = d; best = c; } }
    if (!best) continue;
    const k = Math.min(R.humo.alcance, bd / 2) / bd;
    if (lanzaHumo(p, esc, cx + (best.x - cx) * k, cy + (best.y - cy) * k)) suceso(p, { tipo: 'humoIA', escuadra: esc.id });
  }
}

// ---------------------------------------------------------------- victoria
function victoria(p) {
  const V = R.victoria;
  for (const lado of ['us', 'de']) {
    const sus = p.unidades.filter((u) => u.tipo === 'soldado' && u.lado === lado);
    const fuera = sus.filter((u) => !enPie(u) || u.estado === 'panico').length;
    if (sus.length && fuera / sus.length >= V.roto) { p.fin = { ganador: lado === 'us' ? 'de' : 'us', motivo: 'roto', t: p.t }; suceso(p, { tipo: 'fin', ...p.fin }); return; }
  }
  if ((p.t + 1) * DT >= V.tiempo) {
    const o = p.def.objetivos[0], cuenta = (lado) => p.unidades.filter((u) => u.tipo === 'soldado' && u.lado === lado && enCondiciones(u) && Math.hypot(u.x - o.x - 0.5, u.y - o.y - 0.5) <= o.r).length;
    const us = cuenta('us'), de = cuenta('de');
    p.fin = { ganador: us > de ? 'us' : 'de', motivo: 'objetivo', us, de, t: p.t };
    suceso(p, { tipo: 'fin', ...p.fin });
  }
}

// ---------------------------------------------------------------- la huella: el estado entero en un número
export function huella(p) {
  let h = 0x811c9dc5;
  const mete = (v) => { const s = String(v); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0; };
  mete(p.t);
  for (const u of p.unidades) { mete(u.id); mete(u.x.toFixed(3)); mete(u.y.toFixed(3)); mete(u.estado); mete((u.sup || 0).toFixed(2)); mete((u.moral || 0).toFixed(2)); }
  return h.toString(16).padStart(8, '0');
}
