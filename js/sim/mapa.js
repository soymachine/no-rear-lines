// El mapa en la simulación: la rejilla de texto de un mapa (js/data/mapas/) pasa a una rejilla de números de baldosa,
// con lo que la simulación pregunta de cada casilla (si se anda y a qué coste, si tapa la vista, cuánto cubre) y las
// casas como bloques. Sin DOM ni azar: se carga igual en Node y en el navegador.
import { BALDOSAS, POR_LETRA, CLASES } from '../data/baldosas.js';

// def: { id, ancho, alto, filas: [cadenas], despliegues, objetivos } → mapa listo para la simulación.
// Lanza un error con la fila y la columna si una letra no es de ninguna baldosa o si una fila no mide lo que dice.
export function cargaMapa(def) {
  const { ancho: w, alto: h, filas } = def;
  if (filas.length !== h) throw new Error(`mapa ${def.id}: ${filas.length} filas, y dice ${h}`);
  const t = new Uint8Array(w * h);
  filas.forEach((fila, y) => {
    if (fila.length !== w) throw new Error(`mapa ${def.id}: la fila ${y} mide ${fila.length}, y dice ${w}`);
    for (let x = 0; x < w; x++) {
      const b = POR_LETRA[fila[x]];
      if (!b) throw new Error(`mapa ${def.id}: letra «${fila[x]}» desconocida en (${x}, ${y})`);
      t[y * w + x] = b.n;
    }
  });
  const B = [];
  for (const b of BALDOSAS) B[b.n] = b;
  const dentro = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const baldosa = (x, y) => (dentro(x, y) ? B[t[y * w + x]] : null);
  return {
    id: def.id, w, h, t, def,
    dentro,
    baldosa,
    // coste de entrar en la casilla para una clase de movimiento (pie, carro); Infinity si no se puede
    coste: (x, y, clase) => { const b = baldosa(x, y); const c = b && b.anda[clase]; return c == null ? Infinity : c; },
    tapa: (x, y) => { const b = baldosa(x, y); return !b || b.tapa; },
    cubre: (x, y) => { const b = baldosa(x, y); return b ? b.cubre : 0; },
    casas: bloques(t, w, h, B.findIndex((b) => b && b.id === 'casa')),
    clases: CLASES,
  };
}

// los bloques de casillas de una baldosa (cada casa, con su rectángulo), recorridos en orden fijo
function bloques(t, w, h, n) {
  const visto = new Uint8Array(w * h), out = [];
  for (let i = 0; i < w * h; i++) {
    if (t[i] !== n || visto[i]) continue;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    const pila = [i];
    visto[i] = 1;
    while (pila.length) {
      const j = pila.pop(), x = j % w, y = (j - x) / w;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (const k of [j - w, j + w, x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1]) if (k >= 0 && k < w * h && !visto[k] && t[k] === n) { visto[k] = 1; pila.push(k); }
    }
    out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return out;
}
