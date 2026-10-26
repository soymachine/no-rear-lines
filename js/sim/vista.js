// La línea de visión entre dos puntos del mapa (en casillas, con decimales). La cortan las baldosas que tapan y el humo,
// con una excepción (el bocage): el seto o el bosque pegado a uno de los dos extremos no tapa, porque quien está en
// él ve y dispara por encima (es su posición de tiro). Las casas tapan siempre.
const PEGADO = 1; // casillas (en cada eje) alrededor de cada extremo donde el seto no tapa

// humo: lista de nubes { x, y, r } activas
export function tapaEn(m, humo, x, y) {
  for (const n of humo) if ((x + 0.5 - n.x) ** 2 + (y + 0.5 - n.y) ** 2 <= n.r * n.r) return true;
  return false;
}

export function seVe(m, humo, ax, ay, bx, by, alcance = Infinity) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  if (d > alcance) return false;
  const cax = Math.floor(ax), cay = Math.floor(ay), cbx = Math.floor(bx), cby = Math.floor(by);
  const n = Math.max(1, Math.ceil(d * 2));
  let px = -1, py = -1;
  for (let k = 0; k <= n; k++) {
    const x = Math.floor(ax + (dx * k) / n), y = Math.floor(ay + (dy * k) / n);
    if (x === px && y === py) continue;
    px = x; py = y;
    if (humo.length && tapaEn(m, humo, x, y)) return false;
    if ((x === cax && y === cay) || (x === cbx && y === cby)) continue;
    const b = m.baldosa(x, y);
    if (!b) return false;
    if (!b.tapa) continue;
    const pegado = b.id !== 'casa' && ((Math.abs(x - cax) <= PEGADO && Math.abs(y - cay) <= PEGADO) || (Math.abs(x - cbx) <= PEGADO && Math.abs(y - cby) <= PEGADO));
    if (!pegado) return false;
  }
  return true;
}
