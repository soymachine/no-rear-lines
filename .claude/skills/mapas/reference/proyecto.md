# Los mapas de Sin Retaguardia (mapa del proyecto)

Lo que es de este juego, y no del oficio.

## Dónde vive cada cosa

- `js/data/baldosas.js`: la tabla de baldosas (`BALDOSAS`): id, número (el que se guarda; las nuevas, al final), letra
  de los mapas de texto, nombre en los dos idiomas y reglas: `anda` (coste por clase de movimiento, `pie` y `carro`;
  `null` = no se puede), `tapa` (corta la vista) y `cubre` (0–1). Cada casilla mide 4 m (`METROS`).
- `js/data/mapas/<id>.js`: cada mapa, una rejilla de texto (`filas`, una letra por casilla) con `ancho`, `alto`,
  `nombre`, `despliegues` (un rectángulo por bando) y `objetivos` (`x`, `y`, `r` en casillas). Las casas son bloques
  de `C`. `js/data/mapas/index.js` los junta (`MAPAS`, `MAPA`).
- `js/sim/mapa.js`: `cargaMapa(def)` → la rejilla de números (`t`) con `baldosa(x, y)`, `coste(x, y, clase)`,
  `tapa(x, y)`, `cubre(x, y)` y `casas` (rectángulos). Lo usa la simulación y lo usan las herramientas.

## Las baldosas

(`node .claude/skills/mapas/scripts/mide-mapa.mjs --baldosas`)

| n.º | id | letra | nombre | a pie | carro | tapa | cubre |
|---|---|---|---|---|---|---|---|
| 0 | campo | `.` | Campo | 1 | 1 |  | 0 |
| 1 | seto | `#` | Seto | 2.5 | 4 | sí | 0.25 |
| 2 | camino | `=` | Camino | 0.8 | 0.6 |  | 0 |
| 3 | casa | `C` | Casa | — | — | sí | 0.8 |
| 4 | bosque | `B` | Bosque | 1.6 | — | sí | 0.4 |

## Los mapas

- `granja`: la granja del cruce, el mapa del prototipo. Se compuso con un script de diseño por piezas (setos por
  franjas desplazados, portillas en mitad de los tramos, dos caminos con setos a los lados y entradas, tres bosques, la
  granja con su patio y un caserío) y desde ahora se edita a mano.

  ```
  granja · 128×72 (512×288 m) · abierto 41 % · vistaLarga 42 % · zonaMuerta 96 % · carro 96 % · contacto 414 m
  us: alcanzable 100 % · a pie 223 m (coste 46.8) · otraRuta ×1.18 · en carro 223 m (coste 37.7)
  de: alcanzable 100 % · a pie 151 m (coste 32.2) · otraRuta ×1.21 · en carro 163 m (coste 25.5)
  ```

## Herramientas y pruebas

- `node tests/datos.mjs`: cada baldosa completa y cada mapa que carga, con sus despliegues y objetivos dentro y el
  objetivo alcanzable a pie y en carro desde cada despliegue.
- `node .claude/skills/mapas/scripts/mide-mapa.mjs <id|todos> [--texto archivo]`: las cifras de
  `diseno-niveles.md` y, con `--texto`, el mapa en letras con las rutas y lo que no se ve desde el objetivo.
- `prototipos/escala/?mapa=<id>`: el mapa con el arte de la prueba de escala
  (`node prototipos/escala/captura.mjs <carpeta> "nombre|mapa=granja&res=960x540"`).

## Decisiones (2026-10-26)

- **Mapas grandes**, hechos a mano, que se recorren con desplazamiento: el objetivo es **1×1 km** (250×250 casillas),
  como el de `prototipos/escala/`. En la vista normal (960×540 ×2) se ven 480×270 m, unas 2×4 pantallas por mapa.
- **El mapa del prototipo** (el primero): 128×72 casillas de 4 m (512×288 m) con cinco baldosas:
  - campo;
  - seto: tapa la vista, cubre poco y frena al carro;
  - camino;
  - casa: tapa y cubre; en el prototipo no se entra;
  - bosque: tapa, frena y el carro no pasa.

  Un objetivo en el cruce de la granja, dos rutas hacia él (los setos o el camino) y un despliegue en cada extremo.
- Teatro: Normandía, verano de 1944 (bocage).

## Decisiones (tercera ronda, 2026-10-26)

- **Los mapas son rejillas de texto** en un archivo de datos (una letra por casilla, con su leyenda), dibujadas por el
  map-designer. El editor visual, más adelante, en el admin.
