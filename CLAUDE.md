# Sin Retaguardia · notas para Claude

## El juego

**Sin Retaguardia** (*No Rear Line*) es un juego táctico en tiempo real en pixel art, al estilo de Close Combat:
Segunda Guerra Mundial, guerra de guerrillas, carros y bombardeos pequeños. El jugador manda escuadras y carros, no
soldados uno a uno. Cada soldado decide lo pequeño (cubrirse, tumbarse, si obedece) según su moral y lo que le pasa.
La guerrilla no tiene frente: el enemigo puede estar detrás de cualquier seto.

- **En el navegador**: HTML, módulos ES y canvas, **sin dependencias ni compilación**. Se sirve la carpeta tal cual.
- **Todo el arte es pixel art dibujado en código** (`js/ui/raster.js`): sin imágenes.
- **Estado**: arranque. Hay agentes, skills y herramientas (traídos de La Misión Topolev: `ORIGEN-TOPOLEV.md`), pero
  todavía no hay código del juego. El primer prototipo será un mapa hecho a mano con pocas baldosas, dos escuadras y
  un carro por bando, tiempo real con pausa, línea de visión, moral, supresión y sonido.

## Las reglas de arquitectura

Mandan sobre cualquier propuesta. Cambiarlas es una decisión del usuario.

1. **La simulación va en pasos fijos y no toca el DOM ni el canvas.** Avanza en pasos de duración fija (por ejemplo,
   10 por segundo) con un acumulador. Con la pausa no corre ningún paso. Las órdenes del jugador se encolan y entran al
   principio del paso siguiente. La simulación no importa nada del DOM, del canvas ni del audio: emite **sucesos**
   (disparo, impacto, unidad suprimida…) que el dibujo y el sonido leen después. Así corre en Node, en un worker o
   deprisa para el bot de playtest.
2. **Todo el azar sale de `js/util/rng.js` con semilla; nunca `Math.random`.** La partida tiene su semilla y su `RNG`.
   Lo que solo se ve (chispas, humo) lleva su propio `RNG` aparte, para que dibujar no cambie la partida. Tampoco la
   hora ni el orden de un `Set` que dependa de cómo se llenó. La misma semilla y las mismas órdenes dan la misma
   batalla: repeticiones gratis, pruebas que dan siempre lo mismo y un bot sin navegador. Ojo: `rng.js` usa
   `Math.random` para la semilla por defecto de `new RNG()`, y por eso los `rng` y `vrng` que exporta salen sin
   semilla, igual que `uid()`. La simulación crea su `new RNG(semilla)` y no usa ninguno de los tres.
3. **El dibujo interpola.** Cada fotograma pinta la posición `anterior + (actual − anterior) × alfa`, con `alfa` la
   fracción de paso que sobra. Los ángulos, por el camino corto.
4. **Los sprites se pintan una vez en hojas y se escalan en enteros, sin suavizado.** Cada dibujo se rasteriza una vez
   en una hoja (`OffscreenCanvas`) y cada fotograma solo la copia con `drawImage`. Se dibuja a una resolución fija y
   se amplía ×N entero, con `imageSmoothingEnabled = false`, `image-rendering: pixelated` y posiciones redondeadas al
   píxel de dibujo.
5. **Los datos llevan id y prueba de que están completos.** Unidades, armas, baldosas, efectos y sonidos: una ficha
   por cosa, con su id, en tablas de datos. Una prueba comprueba que cada una tiene todo lo que necesita (su dibujo,
   sus reglas, su texto en los dos idiomas). Lo que se guarda (partidas, repeticiones) usa los ids: no se renumeran.

## Quién lleva cada cosa

Cada oficio tiene su subagente (`.claude/agents/`) y su skill (`.claude/skills/`). Se delega en él todo lo de su
oficio, sea pregunta, propuesta o cambio. Cada skill tiene su `reference/proyecto.md` con el mapa de este proyecto,
que el agente rellena según aparece el código.

| Agente | Lleva | Skill |
|---|---|---|
| `pixel-artist` | todo el arte: el terreno en baldosas, los soldados con sus poses y direcciones, los carros (casco y torreta por separado), el humo, el fuego, las explosiones, las animaciones de disparo, los iconos, la interfaz y la paleta | `arte-raster` |
| `map-designer` | los mapas: qué baldosa va en cada casilla, que se lea qué tapa, qué cubre y qué frena, y el diseño jugable (rutas, terreno clave, objetivos, carros, despliegue, ritmo) | `mapas`, `diseno-juego` |
| `tactical-ai` | cómo se mueven y deciden soldados, escuadras y carros: rutas, formación, visión, moral, supresión, reacción al fuego, coordinación, obediencia filtrada por la moral, carros | `ia-tactica` |
| `game-designer` | el playtest, el equilibrio, la dificultad, el ritmo y la claridad (que se lea lo que pasa); los informes de `informes/playtest/` | `diseno-juego` |
| `sound-designer` | el sonido: qué suena y cuándo, armas, carros, artillería, gritos, ambiente, mezcla, espacio y síntesis. No puede oír: mide | `sonido` |
| `narrative-writer` | los textos y su inglés: gritos, órdenes, fichas de unidad, informes de batalla, campaña, interfaz | `guion` |
| `code-expert` | el código en sí: arquitectura y refactors, el bucle de simulación y el dibujo en hojas, rendimiento, fallos, pruebas y ESLint | `improve-codebase-architecture`, `codebase-design`, `grilling`, `domain-modeling` |

Las fronteras:
- el **pixel-artist** dibuja la baldosa y el **map-designer** decide dónde va;
- el **tactical-ai** decide el comportamiento y el **game-designer** propone las cifras de equilibrio;
- el **code-expert** puede reorganizar el código de todos sin cambiar lo que hace.

Si un cambio cruza una frontera, el agente avisa del otro.

Las capturas, medidas, registros e informes de trabajo van al scratchpad de la sesión o a `/tmp`, nunca al repo.

### La revisión de arquitectura (agente `code-expert`)

«Mejora la arquitectura» o «revisa el código» va así:
1. El agente explora y devuelve la ruta de un informe HTML con los candidatos, que está fuera del repo. Se le enseña
   al usuario con SendUserFile (`display: render`) y se le pregunta cuál quiere explorar.
2. Con la respuesta, se reanuda **el mismo agente** con SendMessage. Cada ronda trae preguntas numeradas con la
   recomendación del agente (formato `grilling`). Se le pasan al usuario tal cual, y lo que conteste vuelve al agente.
   El agente no habla con el usuario directamente.
3. Se implementa solo cuando el usuario lo pida.

Las skills de arquitectura son de Matt Pocock (origen y licencia en `.claude/skills/ORIGEN-mattpocock.md`). El
vocabulario del dominio se apunta en `GLOSSARY.md` (raíz) y las decisiones en `docs/adr/`. Los dos se crean cuando
haga falta. `docs/adr/` es lo único de `docs/` que se sube.

### Las preguntas al usuario

Cuando un agente necesita una decisión del usuario (la vista, la paleta, el paso de la simulación…), la devuelve en
formato `grilling`: ❓ **P1** con la pregunta y ➡️ su recomendación, redactada para que un «sí» la acepte. La sesión
principal se las pasa al usuario tal cual. Los hechos los busca el agente; al usuario solo le llegan decisiones.

## Las notas de prueba (`notas/notas.md`)

El usuario apunta lo que ve jugando en `notas/notas.md`. Por ahora, a mano o pidiéndoselo a Claude; más adelante,
desde una pestaña NOTAS de un `admin.html` que hará un commit del archivo con la API de GitHub. Es un solo archivo,
compartido: el usuario (o el admin) y Claude trabajan sobre él. Cuando el usuario hable de «las notas», están ahí.

Flujo:
1. `git pull --no-rebase origin <rama>` antes de mirar (puede haber notas nuevas) y leer `notas/notas.md`. Cada nota
   pendiente es una tarea: `- [ ] **N-xxxxx** · tipo · prioridad · dónde · vX · fecha` y el texto sangrado debajo.
   Los tipos: `fallo`, `mejora`, `arte`, `mapa`, `ia`, `sonido`, `texto`. El tipo dice a qué agente va.
2. Al terminar una nota, en ese mismo archivo y en el mismo commit que el arreglo:
   - cambiarla a `- [x]`;
   - moverla a «Hechas», arriba del todo de esa sección;
   - añadir bajo su texto, sangrada,
     `  → hecho en v<versión que sale con ese commit> · AAAA-MM-DD: lo que se hizo`, en una línea; si hace falta más,
     las siguientes también sangradas;
   - actualizar los contadores `## Pendientes (n)` / `## Hechas (n)`.
3. No reescribir el formato ni reordenar las notas del usuario: las versiones se juntan nota a nota por el id. Una nota
   que vuelve a Pendientes sin el «→ hecho» es que no quedó bien.

«Revisa las notas» o «mira las notas» = este flujo.

## Commits, versión y ganchos

- **Los ganchos**, en cada clon nuevo (también en cada sesión de la nube): `git config core.hooksPath .githooks`. El
  `pre-commit` pasa ESLint (`eslint --quiet js tools`; con errores no hay commit) y sube la versión de `js/version.js`
  (+1 al último número; una versión puesta a mano se respeta).
- **Commits**: uno por cambio, con el mensaje en español (qué cambia y por qué). Push solo a la rama de trabajo de la
  sesión.
- **Pruebas**: `tests/arnes.cjs` (servidor propio, semilla fija) y `node tests/todas.mjs` (toda la batería), cuando
  haya una página que probar. Ver la cabecera de cada uno.

## Lo que no entra en este repo

- **Audio de pago de otros proyectos**: `sounds/pro/` de La Misión Topolev tiene licencia solo para aquel juego. Aquí
  solo entra audio con licencia clara para este, con su origen apuntado en un archivo de créditos.
- **El código de La Misión Topolev** (su juego por turnos, su dibujo con letras, sus datos): lo nuevo se escribe desde
  cero. Lo que se trajo, y por qué, está en `ORIGEN-TOPOLEV.md`.
