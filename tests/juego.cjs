// El juego en el navegador: carga la granja sin errores, la batalla avanza (el bando del jugador por su guion de
// prueba), se dibujan las tres vistas y las órdenes del menú llegan a la simulación. Deja capturas fuera del repo
// (NRL_CAPTURAS=carpeta; por defecto, en el temporal).
// Uso: node tests/juego.cjs
const H = require('./arnes.cjs');
const os = require('node:os'), path = require('node:path'), fs = require('node:fs');
const SAL = process.env.NRL_CAPTURAS || path.join(os.tmpdir(), 'nrl-juego');
fs.mkdirSync(SAL, { recursive: true });
(async () => {
  const { b, p, errs } = await H.partida({ escenario: 'granja', viewport: { width: 1920, height: 1080 } });
  const info = await p.evaluate(() => ({ unidades: window.__nrl.p.unidades.length, w: document.getElementById('pantalla').width }));
  H.ok(info.unidades === 42 && info.w === 1920, `la granja carga: ${info.unidades} unidades, lienzo de ${info.w} px`);
  // el guion de prueba del jugador, a mano, y unos minutos de batalla
  const avanza = async (seg) => p.evaluate((n) => window.__nrl.avanza(n, true), seg * 10);
  let r = await avanza(80);
  H.ok(r.t >= 800, `la batalla avanza (${r.t / 10} s${r.fin ? ', ha acabado: ' + r.fin.ganador : ''})`);
  // una granada de humo de la escuadra 1, para ver la cortina
  const humo = await p.evaluate(() => { window.__nrl.ordena({ tipo: 'humo', escuadra: 'us0', x: 52, y: 27 }); window.__nrl.avanza(40); return window.__nrl.p.humo.length; });
  H.ok(humo > 0, `la granada de humo hace su cortina (${humo})`);
  await p.evaluate(() => { window.__nrl.camara(40, 34); window.__nrl.elige({ escuadra: 'us0' }); window.__nrl.avanza(1); });
  await p.screenshot({ path: path.join(SAL, 'normal.png') });
  await p.evaluate(() => window.__nrl.vista('cerca'));
  await p.screenshot({ path: path.join(SAL, 'cerca.png') });
  await p.evaluate(() => window.__nrl.vista('tactico'));
  await p.screenshot({ path: path.join(SAL, 'tactico.png') });
  await p.evaluate(() => window.__nrl.vista('normal'));
  // una orden por el menú del clic derecho: la escuadra elegida se esconde
  await p.mouse.click(960, 540, { button: 'right' });
  const botones = await p.$$eval('#menu button', (bs) => bs.map((x) => x.textContent));
  H.ok(botones.includes('ESCONDERSE') && botones.length === 6, `el menú de órdenes: ${botones.join(', ')}`);
  await p.click('#menu button:has-text("ESCONDERSE")');
  const orden = await p.evaluate(() => { window.__nrl.avanza(1); return window.__nrl.p.escuadras.find((e) => e.id === 'us0').orden; });
  H.ok(orden && orden.tipo === 'esconderse', 'la orden del menú llega a la simulación');
  r = await avanza(400);
  await p.screenshot({ path: path.join(SAL, 'final.png') });
  H.ok(true, `capturas en ${SAL} (la batalla ${r.fin ? `acabó: ${r.fin.ganador}, ${r.fin.motivo}` : `sigue a los ${r.t / 10} s`})`);
  await H.fin(b, errs);
})();
