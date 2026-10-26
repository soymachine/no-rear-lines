# Lo que viene de La Misión Topolev

Sin Retaguardia arranca con los agentes de Claude, las skills y algunas herramientas de La Misión Topolev
(`soymachine/la-mision-topolev-4`). Este archivo dice de dónde sale cada cosa y cómo se trabajaba allí. Sirve para traer
mejoras de allí más adelante y para saber qué falta.

## La fuente

- **Rama:** `claude/nifty-archimedes-8vy5ms`, commit `b7fd7801` (26 de octubre de 2026).
- **Por qué esa rama.** La rama principal, `claude/zen-shannon-rlqxbz` (`3912309d`), solo tenía tres agentes
  (game-designer, map-designer y pixel-artist) y cuatro skills. Los otros tres agentes (code-expert, sound-designer y
  narrative-writer), las skills `sonido` y `guion`, las de Matt Pocock y el arnés de pruebas estaban en
  `nifty-archimedes`, que se estaba fusionando con la principal. La página de planificación de Topolev
  (`informes/nuevo-proyecto.html`) lo dice así. En lo común, `nifty-archimedes` es igual o más nueva: las pruebas
  levantan su propio servidor en vez de pedir `python3 -m http.server`.
- **Excepción:** `.githooks/pre-commit` sale de la principal. La de `nifty-archimedes` añade un paso para el admin →
  AGENTES IA (`tools/agentes.mjs`), y aquí no lo hay.

## Cómo trabajan allí (lectura del paso 1)

**Un agente por oficio, con su skill.** Cada agente (`.claude/agents/<nombre>.md`) tiene un frontmatter (`name`,
`description` con las frases que lo disparan, `tools` y `skills` precargadas) y un cuerpo con siempre las mismas partes:

1. **Quién es y qué domina**: el oficio, en una lista corta.
2. **El proyecto en breve**: dónde vive cada cosa en el código. Es lo único que depende del juego.
3. **Cómo trabajas**: tres casos fijos.
   - Una **pregunta** se responde leyendo el código, con `archivo:línea`, y sin tocar nada.
   - Una **previsualización** se hace así: medir o capturar el antes, cambiar, medir el después, restaurar con
     `git checkout` y enseñar la comparación, sin commit.
   - Un **cambio de verdad** va en este orden: pull, medir el antes, cambiar con lo que ya existe, medir el después,
     comparar y pasar las pruebas.
4. **Verificar sin fiarse del ojo**: capturas con Playwright y láminas de antes y después (`compara.py`) para el arte,
   medidas de nivel, bandas y costuras para el sonido (porque el agente no oye) y cifras de un script para los mapas.
   Las salidas siempre van fuera del repo.
5. **Con los otros agentes**: la frontera de cada oficio («el pixel-artist dibuja la baldosa, el map-designer decide
   dónde va»). Si el cambio cruza la frontera, se avisa al otro agente y no se hace.
6. **Reglas del repo**: CLAUDE.md manda, cada nota de prueba se cierra en el mismo commit que su arreglo, un commit por
   cambio con el mensaje en español, push solo a la rama de la sesión y nada de datos ajenos.
7. **Tus skills**: el agente amplía su skill con lo que aprende, en una sección «Lo aprendido» con fecha.
8. **Al terminar**: un resumen fijo con qué se cambió y dónde, las cifras de antes y después, las rutas de las capturas
   y lo que queda pendiente.

**Las skills** (`.claude/skills/<nombre>/SKILL.md`) son el manual del oficio. Cada una tiene sus referencias en
`reference/`, sus scripts en `scripts/` y «Lo aprendido» al final. Allí mezclaban el oficio y el mapa del juego. Aquí
se separan: el oficio va en `SKILL.md` y el mapa del proyecto en `reference/proyecto.md`.

**CLAUDE.md** reparte el trabajo («todo lo que sea arte se delega en el pixel-artist») y fija los flujos:
- las notas de prueba de `notas/notas.md`;
- la revisión de arquitectura del code-expert. Primero hace un informe HTML con los candidatos. Luego hay rondas de
  preguntas en formato `grilling`, que pasan por la sesión principal. Solo se implementa cuando el usuario lo pide.

**Las herramientas de la casa**:
- el gancho `pre-commit`, que pasa ESLint (solo errores reales) y sube la versión en cada commit;
- `rng.js`, el azar con semilla;
- `raster.js`, el motor de dibujo procedural. Sin imágenes: cada dibujo es código;
- el arnés de pruebas: servidor propio, azar fijo y la batería entera con repetición de lo que falla.

## Qué se ha traído

### Tal cual

| Aquí | De allí | Notas |
|---|---|---|
| `.claude/skills/improve-codebase-architecture`, `codebase-design`, `grilling`, `domain-modeling`, `ORIGEN-mattpocock.md` | lo mismo | de Matt Pocock, licencia MIT |
| `js/ui/raster.js`, `js/util/rng.js` | lo mismo | |
| `js/sim/fov.js` | `js/exp/fov.js` | otra carpeta, mismo contenido. Su `VIEW_K` (1,8) era para casillas más altas que anchas: pasa a 1 cuando la simulación lo use |
| `eslint.config.js`, `tools/version.mjs` | lo mismo | |
| `.githooks/pre-commit` | el de la rama principal | sin el paso de la precarga |
| `.claude/skills/arte-raster/scripts/compara.py`, `reference/raster-api.md` | lo mismo | la API, sin los nombres de los dibujos de allí |

### Adaptado

- **Los seis agentes** (`.claude/agents/`): el oficio y el método se quedan; lo de Topolev se va; cada uno tiene «El
  proyecto en breve» por rellenar. De «Lo aprendido» se quedan solo las líneas que valen para cualquier proyecto (el
  detalle está en el mensaje del commit del paso 3).
- **Las skills de oficio**: `SKILL.md` con el oficio y `reference/proyecto.md` vacío para el mapa del proyecto.
  - `arte-raster`, entera. `captura.mjs` mira una página `arte.html` (el contrato está en su cabecera).
    `captura-disparo.mjs` pasa a ser `captura-anim.mjs`: una lámina con una fila por dirección y los fotogramas en
    función del tiempo. Se amplía con `hojas.md`, `animacion.md` y `baldosas.md`. Las paletas de allí
    (`paletas.md`) y los disparos en ASCII (`disparos.md`) se van; su oficio (colores reservados, tiempos de una
    ráfaga, dirección legible en las ocho) pasa a `SKILL.md` y a `animacion.md`.
  - `sonido`: el oficio, reescrito para tiempo real. `mide-sonido.mjs` y `comun.mjs` miden archivos sueltos o un banco
    opcional, sin el banco de pago ni `soundkeys.js`.
  - `mapas`: la composición con baldosas y el diseño de niveles de una batalla táctica. `generacion.md`, sin el juego
    de allí.
  - `diseno-juego`: el criterio para tiempo real, `marco.md` y la plantilla del informe (`informe.md`, que allí estaba
    en `partida-simulada`).
  - `guion`: el oficio para gritos, órdenes, fichas e informes. `traduccion.md` con el mecanismo que funcionó y el
    glosario vacío.
- **`tests/arnes.cjs` y `tests/todas.mjs`**: con `NRL_URL` y `NRL_SEMILLA`; `empezar()` y `cerrarVentanas()` con un
  contrato nuevo (`index.html?semilla=&escenario=`, `window.__nrl.listo`).
- **CLAUDE.md**, nuevo, con el flujo de las notas de prueba de allí.

### Nuevo

- El agente `tactical-ai` y su skill `ia-tactica` (rutas, formación, moral, supresión, obediencia, carros).
- `ORIGEN-TOPOLEV.md` (este archivo), `notas/notas.md` vacío y `package.json` mínimo (`"type": "module"`).

### Mirado como referencia, sin copiar

`js/ui/weaponsprite2.js`, `js/ui/itemsprite.js`, `js/render/dither.js` y `js/ui/artworker.js`. Lo que se aprendió de
ellos está en las referencias de `arte-raster`:
- de `dither.js`: los materiales como funciones de (i, j, variante), la máscara de bordes abiertos para la luz del
  borde, la fase de la trama, la caché con tope y las variantes por hash;
- de `artworker.js`: el mismo código en el worker y en la página, los búferes transferibles y la carga perezosa;
- de `itemsprite.js` y `weaponsprite2.js`: una receta por id con piezas prestadas de un módulo base, la familia
  elegida por los datos y la caché por id y variante.

### No se ha traído

- `sounds/pro/`: audio de pago con licencia solo para Topolev. Tampoco el resto de `sounds/`.
- El código del juego: `js/exp`, `js/core`, `js/data` y `js/render/ascii.js`.
- La skill `partida-simulada` y su bot: el bot de playtest se rehará para tiempo real.

## Pendiente

- **Scripts que leían el juego de allí y se rehacen cuando haya algo que medir aquí**:
  - `sonido/banco.mjs` y `sonido/sintetiza.mjs`;
  - `mapas/mide-mapa.mjs`, `captura-mapa.mjs` y `tabla-casillas.mjs`;
  - `guion/paridad.mjs`, `historia.mjs` y `lineas.mjs`. El escáner de literales de `lib.mjs` se puede reutilizar.
- **No tienen sentido aquí**: `mapas/salidas-plano.mjs`, porque no hay plano fijo, y `tinta-letras.mjs`, porque no
  hay letras.
- **Las páginas que piden los contratos**: `arte.html`, para `captura.mjs` y `captura-anim.mjs`, e `index.html`, para
  el arnés.
- **Lo que la página de planificación de allí marcaba como «adaptar» y no entraba en este arranque**:
  - `js/audio.js` y `js/soundbank.js`: síntesis de reserva y banco por claves;
  - `js/i18n/tx.js`: la traducción por el texto español;
  - admin → NOTAS (`js/admin/notas.js`) y admin → AGENTES IA (`tools/agentes.mjs`, con su paso en el gancho);
  - `tools/precarga.mjs` y su paso en el gancho, cuando haya `index.html` con muchos módulos.
- **`rng.js`**: los `rng` y `vrng` que exporta salen sin semilla (`Math.random`). La simulación no los usa (CLAUDE.md).
