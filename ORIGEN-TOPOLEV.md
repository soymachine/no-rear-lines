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

(Se completa al final del trabajo de arranque.)
