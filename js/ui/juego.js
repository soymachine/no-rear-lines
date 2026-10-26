// El juego en pantalla: la simulación (js/sim) a paso fijo con un acumulador, y encima el dibujo, que interpola entre
// el paso anterior y el actual. La simulación no sabe que se dibuja: el dibujo lee su estado y sus sucesos.
// - Vistas: normal (×2), de cerca (×4, los mismos píxeles más grandes) y el mapa táctico (una casilla por píxel).
//   La resolución de dibujo es la mitad (o la cuarta parte) de la pantalla: con más pantalla se ve más mapa.
// - Niebla de guerra: del enemigo solo se ve lo que ven tus unidades; lo que se vio hace poco queda como una marca.
// - Mando: clic para elegir escuadra o carro, clic derecho para el menú de órdenes, atajos M C H (con un clic después)
//   y E R X; 1 2 3 eligen; la rueda cambia de vista; WASD, flechas, el borde o el botón central mueven la cámara;
//   B quita o pone las marcas de bando; Esc detiene la partida (sin órdenes mientras tanto).
// Parámetros (?…): escenario=granja · semilla=N · lang=en · prueba=1 (el tiempo no corre solo: lo avanzan las pruebas
// con window.__nrl.avanza(n), a pasos enteros, o tools/video.mjs con window.__nrl.fotograma(dt), como un fotograma real).
import { creaBatalla, aplicaGuion } from '../sim/escenario.js';
import { paso, ordena } from '../sim/partida.js';
import { ia } from '../sim/ia.js';
import { REGLAS } from '../data/reglas.js';
import { ARMA } from '../data/armas.js';
import { TEXTOS } from '../data/textos.js';
import { RNG } from '../util/rng.js';
import { T, BANDO, ESTADO, DIBUJO_CARRO } from '../arte/comun.js';
import { pintaTerreno, marcaCrater, COLOR_TACTICO } from '../arte/terreno.js';
import { hojasTropas, fila, S, B, DIRS, DIRS_CASCO, DIRS_TORRETA } from '../arte/tropas.js';
import { hojasEfectos, TIEMPOS_EXPLOSION } from '../arte/efectos.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'en' ? 'en' : 'es', tx = (o) => (o ? o[LANG] : '');
const PRUEBA = Q.get('prueba') === '1';
const semilla = Q.get('semilla') != null ? +Q.get('semilla') >>> 0 : Date.now() >>> 0; // (la semilla puede salir de la hora; el azar, no)
const p = creaBatalla(Q.get('escenario') || 'granja', semilla), yo = p.escenario.jugador, ias = p.escenario.ia;
const DT = REGLAS.paso, M = p.m;
const vrng = new RNG(semilla ^ 0x5bd1e995); // el azar de lo que solo se ve, aparte del de la partida

// ---------------------------------------------------------------- hojas y terreno (una vez)
const terreno = pintaTerreno(M), tropas = hojasTropas(), efx = hojasEfectos();

// ---------------------------------------------------------------- pantalla, vistas y cámara
const pant = document.getElementById('pantalla'), pg = pant.getContext('2d');
let W = 0, H = 0, vista = 'normal', back = null, bg = null;
const zoom = () => (vista === 'cerca' ? 4 : 2);
function ajusta() {
  W = innerWidth; H = innerHeight; pant.width = W; pant.height = H;
  back = new OffscreenCanvas(Math.ceil(W / zoom()), Math.ceil(H / zoom())); bg = back.getContext('2d');
  limitaCam();
  pg.imageSmoothingEnabled = false; bg.imageSmoothingEnabled = false;
}
const z0 = p.escenario.fuerzas.find((f) => f.lado === yo).escuadras[0];
const cam = { x: z0.x * T, y: z0.y * T }; // el centro de la vista, en píxeles del mundo
// la vista no se sale del mapa (si el mapa cabe entero, queda centrado)
function limitaCam() {
  const lim = (v, vista, total) => (vista >= total ? total / 2 : Math.max(vista / 2, Math.min(total - vista / 2, v)));
  if (!back) return;
  cam.x = lim(cam.x, back.width, M.w * T); cam.y = lim(cam.y, back.height, M.h * T);
}
const esquina = () => ({ x: Math.round(cam.x - back.width / 2), y: Math.round(cam.y - back.height / 2) });

// ---------------------------------------------------------------- efectos (salen de los sucesos)
const efectos = [], incendios = [], mensajes = [], vistos = new Set();
let reloj = 0; // segundos de dibujo
const aMundo = (x) => x * T;
function procesa(sucesos) {
  for (const s of sucesos) {
    if (s.tipo === 'disparo') {
      const a = ARMA[s.arma], de = p.porId[s.de];
      efectos.push({ tipo: 'fogonazo', x: aMundo(s.x0), y: aMundo(s.y0), ang: Math.atan2(s.y1 - s.y0, s.x1 - s.x0), grande: false, t0: reloj, dur: 0.06 });
      if (a.tipo === 'ametralladora' || a.tipo === 'automatico' || (de && de.tipo === 'carro')) for (let i = 0; i < Math.min(4, a.rafaga); i += 2) efectos.push({ tipo: 'traza', x0: aMundo(s.x0), y0: aMundo(s.y0), x1: aMundo(s.x1) + vrng.float(-4, 4), y1: aMundo(s.y1) + vrng.float(-4, 4), t0: reloj + i * 0.07, dur: 0.18 });
      if (!s.aciertos) efectos.push({ tipo: 'polvo', x: aMundo(s.x1) + vrng.float(-5, 5), y: aMundo(s.y1) + vrng.float(-5, 5), t0: reloj + 0.1, dur: 0.3 });
    } else if (s.tipo === 'cañonazo') {
      const c = p.porId[s.de], d = DIBUJO_CARRO[c.def.id], ang = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
      efectos.push({ tipo: 'fogonazo', x: aMundo(s.x0) + Math.cos(ang) * (d.cañon + 3), y: aMundo(s.y0) + Math.sin(ang) * (d.cañon + 3), ang, grande: true, t0: reloj, dur: 0.12 });
      efectos.push({ tipo: 'traza', x0: aMundo(s.x0), y0: aMundo(s.y0), x1: aMundo(s.x1), y1: aMundo(s.y1), t0: reloj, dur: 0.12, gruesa: true });
    } else if (s.tipo === 'explosion') {
      efectos.push({ tipo: 'explosion', x: aMundo(s.x), y: aMundo(s.y), t0: reloj + 0.1 });
      marcaCrater(terreno, aMundo(s.x), aMundo(s.y), 2.5);
    } else if (s.tipo === 'penetra' || s.tipo === 'rebote') {
      const e = p.porId[s.a];
      efectos.push({ tipo: 'explosion', x: aMundo(e.x), y: aMundo(e.y), t0: reloj + 0.1, chica: s.tipo === 'rebote' });
    } else if (s.tipo === 'destruido') {
      const e = p.porId[s.id];
      incendios.push({ x: aMundo(e.x), y: aMundo(e.y), proximo: reloj });
      if (e.lado === yo) avisa(`${e.def.nombre[LANG]} ${tx(TEXTOS.hud.destruido)}`, BANDO[yo].marca);
    } else if (s.tipo === 'orden' && s.escuadra && p.escuadras.find((e) => e.id === s.escuadra).lado === yo) {
      const r = TEXTOS.respuesta, txt = s.cumplen === s.total ? r.cumple : s.cumplen === 0 ? r[s.motivo] : r.aMedias;
      avisa(`${nombreEsc(s.escuadra)}: ${tx(txt)}${s.cumplen < s.total && s.cumplen > 0 ? ` (${s.cumplen}/${s.total})` : ''}`, s.cumplen === s.total ? '#d8d0b0' : ESTADO.suprimido);
    } else if (s.tipo === 'fin') fin(s);
  }
}
const nombreEsc = (id) => { const i = p.escuadras.filter((e) => e.lado === yo).findIndex((e) => e.id === id); return `${i + 1}·${p.escuadras.find((e) => e.id === id).def.nombre[LANG]}`; };
function avisa(texto, color) { mensajes.push({ texto, color, t0: reloj }); if (mensajes.length > 5) mensajes.shift(); }

// ---------------------------------------------------------------- dibujar
const lerp = (a, b, t) => a + (b - a) * t;
const lerpAng = (a, b, t) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };
const veo = (u) => u.lado === yo || (p.contactos[yo].get(u.id) || {}).ahora;
let marcas = true, sel = null;
function dibuja(alfa) {
  if (vista === 'tactico') return dibujaTactico();
  const o = esquina(), g = bg, X = (x) => Math.round(x - o.x), Y = (y) => Math.round(y - o.y);
  g.fillStyle = '#050302'; g.fillRect(0, 0, back.width, back.height);
  g.drawImage(terreno, o.x, o.y, back.width, back.height, 0, 0, back.width, back.height);
  const pos = (u) => ({ x: lerp(u.px, u.x, alfa) * T, y: lerp(u.py, u.y, alfa) * T, a: lerpAng(u.prumbo, u.rumbo, alfa) });
  // los caídos, debajo de todo
  for (const u of p.unidades) {
    if (u.tipo !== 'soldado' || (u.estado !== 'muerto' && u.estado !== 'herido')) continue;
    if (u.lado !== yo && !vistos.has(u.id)) continue;
    const q = pos(u), h = tropas.soldado[u.lado].caido[fila(u.rumbo, DIRS)];
    g.drawImage(h.cv, X(q.x) - S / 2, Y(q.y) - S / 2);
  }
  // los carros: sombra, casco, torreta
  for (const u of p.unidades) {
    if (u.tipo !== 'carro' || !(veo(u) || u.estado === 'destruido' && vistos.has(u.id))) continue;
    if (u.lado !== yo) vistos.add(u.id);
    const q = pos(u), hc = tropas.carro[u.def.id], roto = u.estado === 'destruido', d = DIBUJO_CARRO[u.def.id];
    const ta = lerpAng(u.ptorreta ?? u.torreta, u.torreta, alfa), ca = q.a, hh = (roto ? hc.roto : hc.casco)[fila(ca, DIRS_CASCO)];
    g.globalAlpha = 0.4; g.drawImage(hh.sombra, X(q.x) - B / 2 + 2, Y(q.y) - B / 2 + 2); g.globalAlpha = 1;
    g.drawImage(hh.cv, X(q.x) - B / 2, Y(q.y) - B / 2);
    g.drawImage((roto ? hc.torretaRota : hc.torreta)[fila(ta, DIRS_TORRETA)], X(q.x + Math.cos(ca) * d.aro) - B / 2, Y(q.y + Math.sin(ca) * d.aro) - B / 2);
    if (!roto && marcas) { g.fillStyle = BANDO[u.lado].marca; g.fillRect(X(q.x) - 3, Y(q.y) + 9, 6, 1); }
    if (sel && sel.carro === u.id) esquinas(g, X(q.x), Y(q.y), 14);
  }
  // los soldados, de arriba abajo
  const vivos = p.unidades.filter((u) => u.tipo === 'soldado' && u.estado !== 'muerto' && u.estado !== 'herido' && veo(u)).map((u) => ({ u, q: pos(u) })).sort((a, b) => a.q.y - b.q.y || a.u.id - b.u.id);
  for (const { u, q } of vivos) {
    if (u.lado !== yo) vistos.add(u.id);
    const h = tropas.soldado[u.lado][u.postura === 'tierra' ? 'tierra' : 'pie'][fila(q.a, DIRS)];
    g.globalAlpha = 0.4; g.drawImage(h.sombra, X(q.x) - S / 2 + 1, Y(q.y) - S / 2 + 1); g.globalAlpha = 1;
    g.drawImage(h.cv, X(q.x) - S / 2, Y(q.y) - S / 2);
    if (marcas) { g.fillStyle = BANDO[u.lado].marca; g.fillRect(X(q.x) - 1, Y(q.y) + 5, 2, 1); }
    if (u.lado === yo && ESTADO[u.estado] && (u.estado !== 'panico' || Math.floor(reloj * 4) % 2)) { g.fillStyle = ESTADO[u.estado]; g.fillRect(X(q.x), Y(q.y) - 6, 1, 2); }
    if (sel && sel.escuadra === u.esc) esquinas(g, X(q.x), Y(q.y), 5);
  }
  // lo que se vio hace poco y ya no se ve: una marca hueca donde estaba
  g.globalAlpha = 0.5; g.strokeStyle = BANDO[yo === 'us' ? 'de' : 'us'].marca;
  for (const [id, c] of p.contactos[yo]) if (!c.ahora && p.porId[id].estado !== 'muerto') g.strokeRect(X(c.x * T) - 2.5, Y(c.y * T) - 2.5, 5, 5);
  g.globalAlpha = 1;
  // efectos
  for (let i = efectos.length - 1; i >= 0; i--) {
    const e = efectos[i], t = reloj - e.t0;
    if (t < 0) continue;
    if (e.tipo === 'explosion') {
      let acc = 0, f = -1;
      for (let k = 0; k < TIEMPOS_EXPLOSION.length; k++) { acc += TIEMPOS_EXPLOSION[k]; if (t < acc) { f = k; break; } }
      if (f < 0) { efectos.splice(i, 1); continue; }
      const im = efx.explosion[f], k = e.chica ? 0.6 : 1;
      g.globalAlpha = f === 3 ? 0.7 : 1; g.drawImage(im, X(e.x - (im.width * k) / 2), Y(e.y - (im.height * k) / 2), Math.round(im.width * k), Math.round(im.height * k)); g.globalAlpha = 1;
      continue;
    }
    if (t > e.dur) { efectos.splice(i, 1); continue; }
    if (e.tipo === 'fogonazo') { const im = e.grande ? efx.fogonazo.grande : efx.fogonazo.chico; g.drawImage(im, X(e.x) - im.width / 2, Y(e.y) - im.height / 2); }
    else if (e.tipo === 'polvo') { g.fillStyle = '#a08a62'; g.fillRect(X(e.x), Y(e.y) - Math.round(t * 6), 1, 1); g.fillRect(X(e.x) + 1, Y(e.y), 1, 1); }
    else if (e.tipo === 'traza') {
      const f = t / e.dur, n = e.gruesa ? 7 : 5, dx = e.x1 - e.x0, dy = e.y1 - e.y0, d = Math.hypot(dx, dy) || 1;
      for (let k = 0; k < n; k++) { const ff = f - k / d; if (ff < 0 || ff > 1) continue; g.fillStyle = k === 0 ? '#fff6c8' : '#ffc860'; g.fillRect(X(e.x0 + dx * ff), Y(e.y0 + dy * ff), e.gruesa ? 2 : 1, e.gruesa ? 2 : 1); }
    }
  }
  // el humo de las granadas: bocanadas fijas por nube, que se aclaran al final
  for (const n of p.humo) {
    const r = new RNG(Math.floor(n.x * 97) ^ Math.floor(n.y * 131)), vida = (n.hasta - p.t) * DT, k = Math.min(1, vida / 8), crece = Math.min(1, (REGLAS.humo.vida - vida) / 2.5);
    for (let i = 0; i < 18; i++) {
      const a = r.float(0, 6.283), d = r.float(0, n.r * T) * crece, im = efx.humo[r.int(0, 2)];
      g.globalAlpha = (d > n.r * T * 0.6 ? 0.55 : 0.8) * k;
      g.drawImage(im, X(n.x * T + Math.cos(a) * d) - im.width / 2, Y(n.y * T + Math.sin(a) * d * 0.85) - im.height / 2);
    }
  }
  g.globalAlpha = 1;
  // los carros que arden: humo negro que sube
  for (const f of incendios) {
    if (reloj >= f.proximo) { f.proximo = reloj + 0.35; efectos.push({ tipo: 'humoNegro', x: f.x + vrng.float(-3, 3), y: f.y, t0: reloj, dur: 4 }); }
  }
  for (const e of efectos) if (e.tipo === 'humoNegro') { const t = reloj - e.t0, im = efx.humo[t < 1.5 ? 0 : 1]; g.globalAlpha = Math.max(0, 0.6 * (1 - t / e.dur)); g.filter = 'brightness(0.35)'; g.drawImage(im, X(e.x + t * 3) - im.width / 2, Y(e.y - t * 8) - im.height / 2); g.filter = 'none'; }
  g.globalAlpha = 1;
  if (pendiente) { g.fillStyle = '#fff6c8'; g.fillRect(raton.bx - 2, raton.by, 5, 1); g.fillRect(raton.bx, raton.by - 2, 1, 5); }
  pg.drawImage(back, 0, 0, back.width * zoom(), back.height * zoom());
}
function esquinas(g, x, y, r) { g.fillStyle = '#f4ecda'; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillRect(x + sx * r - (sx > 0 ? 1 : 0), y + sy * r - (sy > 0 ? 1 : 0), 1, 1); } }
// el mapa táctico: una casilla por píxel, ampliado lo que quepa
let tactico = null;
const escalaT = () => Math.max(1, Math.floor(Math.min(W / M.w, H / M.h)));
const origenT = () => ({ x: Math.floor((W - M.w * escalaT()) / 2), y: Math.floor((H - M.h * escalaT()) / 2) });
function dibujaTactico() {
  if (!tactico) {
    tactico = new OffscreenCanvas(M.w, M.h); const tg = tactico.getContext('2d'), img = tg.createImageData(M.w, M.h);
    for (let i = 0; i < M.w * M.h; i++) { const c = COLOR_TACTICO[M.baldosa(i % M.w, Math.floor(i / M.w)).id]; img.data.set([c[0], c[1], c[2], 255], i * 4); }
    tg.putImageData(img, 0, 0);
  }
  const k = escalaT(), o = origenT();
  pg.fillStyle = '#050302'; pg.fillRect(0, 0, W, H);
  pg.drawImage(tactico, o.x, o.y, M.w * k, M.h * k);
  for (const u of p.unidades) {
    if (!veo(u) || u.estado === 'muerto' || u.estado === 'herido') continue;
    const elegido = sel && (sel.escuadra === u.esc || sel.carro === u.id);
    pg.fillStyle = elegido ? '#f4ecda' : u.estado === 'destruido' ? '#333' : BANDO[u.lado].marca;
    const r = u.tipo === 'carro' ? k * 2 : Math.max(2, k);
    pg.fillRect(o.x + Math.floor(u.x * k - r / 2), o.y + Math.floor(u.y * k - r / 2), r, r);
  }
  const ob = p.def.objetivos[0];
  pg.strokeStyle = '#f4ecda'; pg.strokeRect(o.x + (ob.x - ob.r) * k + 0.5, o.y + (ob.y - ob.r) * k + 0.5, (2 * ob.r + 1) * k, (2 * ob.r + 1) * k);
}

// ---------------------------------------------------------------- mando: ratón, teclado y menú
const raton = { x: 0, y: 0, bx: 0, by: 0, dentro: false };
let pendiente = null, arrastre = null, detenido = false;
const menu = document.getElementById('menu');
// de la pantalla a la casilla (con decimales)
function aCasilla(sx, sy) {
  if (vista === 'tactico') { const k = escalaT(), o = origenT(); return { x: (sx - o.x) / k, y: (sy - o.y) / k }; }
  const o = esquina(), z = zoom();
  return { x: (sx / z + o.x) / T, y: (sy / z + o.y) / T };
}
function elige(c) {
  let best = null, bd = vista === 'tactico' ? 3 : 1.5;
  for (const u of p.unidades) {
    if (u.lado !== yo || u.estado === 'muerto' || u.estado === 'herido' || u.estado === 'destruido') continue;
    const d = Math.hypot(u.x - c.x, u.y - c.y) - (u.tipo === 'carro' ? 1.5 : 0);
    if (d < bd) { bd = d; best = u; }
  }
  sel = best ? (best.tipo === 'carro' ? { carro: best.id } : { escuadra: best.esc }) : null;
}
function manda(tipo, c) {
  if (!sel || detenido || p.fin) return;
  const x = Math.floor(c.x), y = Math.floor(c.y);
  if (sel.carro != null) { if (tipo === 'mover' || tipo === 'correr' || tipo === 'alto') ordena(p, { tipo, carro: sel.carro, x, y }); return; }
  ordena(p, { tipo, escuadra: sel.escuadra, x, y });
}
function abreMenu(sx, sy) {
  if (!sel || detenido || p.fin) return;
  const c = aCasilla(sx, sy), lista = sel.carro != null ? ['mover', 'alto'] : ['mover', 'correr', 'esconderse', 'humo', 'retirada', 'alto'];
  menu.innerHTML = '';
  for (const t of lista) { const b = document.createElement('button'); b.textContent = tx(TEXTOS.orden[t]); b.onclick = () => { manda(t, c); cierraMenu(); }; menu.append(b); }
  menu.style.left = Math.min(sx, W - 140) + 'px'; menu.style.top = Math.min(sy, H - lista.length * 26 - 10) + 'px'; menu.hidden = false;
}
const cierraMenu = () => { menu.hidden = true; };
pant.addEventListener('contextmenu', (e) => { e.preventDefault(); pendiente = null; abreMenu(e.clientX, e.clientY); });
pant.addEventListener('mousedown', (e) => {
  if (e.button === 1) { arrastre = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; e.preventDefault(); return; }
  if (e.button !== 0) return;
  cierraMenu();
  const c = aCasilla(e.clientX, e.clientY);
  if (pendiente) { manda(pendiente, c); pendiente = null; return; }
  elige(c);
});
addEventListener('mouseup', (e) => { if (e.button === 1) arrastre = null; });
addEventListener('mousemove', (e) => {
  raton.x = e.clientX; raton.y = e.clientY; raton.dentro = true; raton.bx = Math.floor(e.clientX / zoom()); raton.by = Math.floor(e.clientY / zoom());
  if (arrastre) { cam.x = arrastre.cx - (e.clientX - arrastre.x) / zoom(); cam.y = arrastre.cy - (e.clientY - arrastre.y) / zoom(); limitaCam(); }
});
document.addEventListener('mouseleave', () => { raton.dentro = false; });
pant.addEventListener('wheel', (e) => {
  e.preventDefault();
  const orden = ['cerca', 'normal', 'tactico'], i = orden.indexOf(vista), j = Math.max(0, Math.min(2, i + (e.deltaY > 0 ? 1 : -1)));
  if (j === i) return;
  if (vista === 'tactico') { const c = aCasilla(e.clientX, e.clientY); cam.x = c.x * T; cam.y = c.y * T; limitaCam(); }
  vista = orden[j]; ajusta();
}, { passive: false });
const teclas = new Set();
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (!menu.hidden) { cierraMenu(); return; } detenido = !detenido; pendiente = null; document.getElementById('detenido').hidden = !detenido; return; }
  teclas.add(k);
  if (detenido) return;
  if (k === '1' || k === '2') { const e2 = p.escuadras.filter((x) => x.lado === yo)[+k - 1]; if (e2) sel = { escuadra: e2.id }; }
  if (k === '3') { const c = p.unidades.find((u) => u.tipo === 'carro' && u.lado === yo); if (c) sel = { carro: c.id }; }
  if (k === 'b') marcas = !marcas;
  if (k === 'm' || k === 'c' || k === 'h') pendiente = { m: 'mover', c: 'correr', h: 'humo' }[k];
  if (k === 'e' || k === 'r' || k === 'x') manda({ e: 'esconderse', r: 'retirada', x: 'alto' }[k], aCasilla(raton.x, raton.y));
});
addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
function mueveCam(dt) {
  if (vista === 'tactico') return;
  const v = 360 * dt / (zoom() / 2);
  let dx = 0, dy = 0;
  if (teclas.has('w') || teclas.has('arrowup')) dy -= v; if (teclas.has('s') || teclas.has('arrowdown')) dy += v;
  if (teclas.has('a') || teclas.has('arrowleft')) dx -= v; if (teclas.has('d') || teclas.has('arrowright')) dx += v;
  if (raton.dentro && menu.hidden && !arrastre) { if (raton.x < 6) dx -= v; if (raton.x > W - 7) dx += v; if (raton.y < 6) dy -= v; if (raton.y > H - 7) dy += v; }
  cam.x += dx; cam.y += dy; limitaCam();
}

// ---------------------------------------------------------------- marcador y final
const hud = document.getElementById('hud'), avisos = document.getElementById('avisos'), ficha = document.getElementById('ficha');
function pintaHud() {
  const queda = Math.max(0, REGLAS.victoria.tiempo - p.t * DT), mm = String(Math.floor(queda / 60)).padStart(2, '0'), ss = String(Math.floor(queda % 60)).padStart(2, '0');
  const mios = p.unidades.filter((u) => u.tipo === 'soldado' && u.lado === yo), bien = mios.filter((u) => u.estado === 'forma' || u.estado === 'suprimido').length;
  hud.textContent = `${tx(p.escenario.nombre)} · ${mm}:${ss} ${tx(TEXTOS.hud.quedan)} · ${bien}/${mios.length} · ${tx(TEXTOS.hud.ayuda)}`;
  avisos.innerHTML = mensajes.filter((m) => reloj - m.t0 < 8).map((m) => `<div style="color:${m.color}">${m.texto}</div>`).join('');
  if (!sel) { ficha.textContent = ''; return; }
  if (sel.carro != null) { const c = p.porId[sel.carro]; ficha.textContent = `3·${c.def.nombre[LANG]}${c.estado === 'destruido' ? ' · ' + tx(TEXTOS.hud.destruido) : ''}`; return; }
  const esc = p.escuadras.find((e) => e.id === sel.escuadra), us = esc.soldados.map((id) => p.porId[id]), cuenta = {};
  for (const u of us) cuenta[u.estado] = (cuenta[u.estado] || 0) + 1;
  const enPie = us.filter((u) => u.estado !== 'muerto' && u.estado !== 'herido'), moral = enPie.length ? Math.round(enPie.reduce((s, u) => s + u.moral, 0) / enPie.length) : 0;
  ficha.textContent = `${nombreEsc(esc.id)} · ${Object.entries(cuenta).map(([k, n]) => `${n} ${tx(TEXTOS.estado[k])}`).join(', ')} · ${tx(TEXTOS.hud.moral)} ${moral} · ${tx(TEXTOS.hud.humo)} ${esc.humo}`;
}
function fin(s) {
  const el = document.getElementById('fin'), gano = s.ganador === yo;
  el.textContent = `${tx(gano ? TEXTOS.hud.gana : TEXTOS.hud.pierde)} · ${s.motivo === 'roto' ? tx(gano ? TEXTOS.hud.roto : TEXTOS.hud.rotos) : `${tx(TEXTOS.hud.objetivo)} (${s.us}–${s.de})`}`;
  el.hidden = false;
}

// ---------------------------------------------------------------- el bucle
function unPaso() { for (const l of ias) ia(p, l); paso(p); procesa(p.sucesos); }
let acc = 0, antes = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.25, (ahora - antes) / 1000); antes = ahora;
  if (!detenido && !PRUEBA) { reloj += dt; acc += dt; while (acc >= DT && !p.fin) { unPaso(); acc -= DT; } }
  mueveCam(dt);
  dibuja(PRUEBA ? 1 : acc / DT);
  pintaHud();
  requestAnimationFrame(bucle);
}
document.getElementById('detenido').textContent = tx(TEXTOS.hud.menu);
ajusta();
addEventListener('resize', ajusta);
requestAnimationFrame(bucle);
// para las pruebas (tests/arnes.cjs)
window.__nrl = {
  p, listo: true,
  // n pasos (con el guion de prueba del jugador si guion), y un dibujo al final
  avanza(n, guion = false) { for (let i = 0; i < n && !p.fin; i++) { reloj += DT; if (guion) aplicaGuion(p); unPaso(); } dibuja(1); pintaHud(); return { t: p.t, fin: p.fin }; },
  // un fotograma de verdad de dt segundos (para grabar: tools/video.mjs): el reloj y el acumulador avanzan dt, corren los
  // pasos que toquen (con el guion si guion) y se dibuja interpolado (alfa = lo que sobra de paso) con el marcador.
  // Devuelve los sucesos de esos pasos. Con ?prueba=1 el bucle de la página no avanza el tiempo, pero sí dibuja (alfa 1):
  // quien grabe tiene que pararlo (tools/video.mjs deja requestAnimationFrame sin efecto).
  fotograma(dt, guion = false) {
    const sucesos = [];
    reloj += dt; acc += dt;
    while (acc >= DT && !p.fin) { if (guion) aplicaGuion(p); unPaso(); sucesos.push(...p.sucesos); acc -= DT; }
    dibuja(p.fin ? 1 : acc / DT); pintaHud();
    return { t: p.t, fin: p.fin, sucesos };
  },
  ordena: (o) => ordena(p, o),
  vista(v) { vista = v; ajusta(); dibuja(1); },
  camara(x, y) { cam.x = x * T; cam.y = y * T; limitaCam(); dibuja(1); return { x: cam.x / T, y: cam.y / T }; }, // (devuelve dónde queda, recortada al mapa)
  elige(s) { sel = s; },
};
