# La IA de Sin Retaguardia (mapa del proyecto)

Lo que es de este juego, y no del oficio.

## Dónde vive cada cosa (prototipo, 2026-10-26)

- `js/sim/partida.js`: la partida. `creaPartida({ mapa, semilla, fuerzas })`, `ordena(p, orden)`, `paso(p)`,
  `huella(p)` y `penetra(...)`. Dentro, por secciones:
  - órdenes y obediencia (`cumple`, `disposicion`): cada soldado decide; motivos `panico`, `fijado`, `acobardado`,
    `suprimido`. Retirarse, esconderse y parar se cumplen siempre (salvo el pánico);
  - detección por bando (`detecta`): cada soldado mira cada `REGLAS.pensar` pasos, escalonado por id; la detección se
    llena por segundo según la postura, si dispara y si es un carro; los contactos se olvidan a los `REGLAS.olvido` s;
  - el soldado (`soldado`, `mueve`, `dispara`, `fuego`): formación en cuña (o línea) en el destino, la ruta de cada
    uno con A*, arrastrarse si está suprimido, fuego apuntado al contacto que ve o de zona (ametralladoras y
    automáticas) al último sitio donde se vio;
  - la puntería: precisión × e^(−d/caída) × supresión del tirador × moverse × postura y cobertura del blanco (su casilla
    o la de delante hacia el tirador);
  - la supresión (`suprime`): cada disparo suma la del arma a los de cerca del punto de impacto; se va con vida media
    (más corta a cubierto o tumbado);
  - las bajas (`baja`): herido o muerto según la letalidad, y el golpe a la moral de los suyos;
  - el carro (`carro`, `disparaCañon`, `impactoCarro`, `penetra`): gira sobre las orugas, la torreta sigue al blanco,
    cañón contra carros (perforante, lado por el ángulo, espesor / cos) y explosivo o coaxial contra infantería;
  - **Al día (2026-10-26, cifras del game-designer)**: lo de abajo sobre «×0,6» y «todos los impactos a la torreta» es
    la regla vieja. Ahora solo cuenta con el carro **parado**, la puntería no baja y, de los tiros que le darían, llegan
    a la torreta del 85 % (a quemarropa) al 35 % (a 50 casillas o más); el resto se lo come el talud del seto (cañonazo
    con `talud: true`). Cifras y medidas en `diseno-juego/reference/proyecto.md`, «El casco oculto».
  - el **casco oculto** (`cascoOculto`, 2026-10-26): un carro con un seto pegado (las casillas que pisa la línea hacia
    el tirador hasta `REGLAS.casco.pegado` = 1 casilla de su centro, sin la suya) solo enseña la torreta: todos los
    impactos van a ella y la puntería del cañón contra él ×`REGLAS.casco.punteria` (0,6). Los sucesos `cañonazo`,
    `penetra` y `rebote` llevan `oculto` (y los dos últimos, `torreta`). Sin alturas: es la regla del bocage (el talud
    del seto tapa el casco). Un carro en el camino entre setos (`#==#`) está oculto para quien le tira por encima del
    seto: la IA no lo busca aún;
  - la moral (`moral`): estados con histéresis, recuperación a cubierto y con el jefe cerca, miedo al carro, contagio
    del pánico;
  - el humo por iniciativa propia (`humoIA`) y la victoria (`victoria`).
- `js/sim/rutas.js`: A* con desempates fijos, `andableCerca`, `rectaLibre`, `suaviza`. Desde el 2026-10-26, el A*
  acepta un coste extra por casilla (`extra × peso`, el mapa de amenaza) y usa búferes por mapa con generación y un
  montículo en arrays tipados (mismas rutas que antes, comprobado en 584 peticiones; ~2× más rápido). `suaviza` con
  extra no acepta una recta que cueste más que el trozo de ruta que se salta (si no, la ruta cubierta se acorta por el
  campo a la vista).
- `js/sim/amenaza.js` (2026-10-26): el mapa de amenaza de un bando. `amenazaAlDia(p, lado)` lo rehace solo si cambia
  la firma de sus fuentes y lo deja en `p.amenaza[lado]` (versión en `p.amenazaVersion[lado]`): lo llaman `paso` (cada
  `REGLAS.amenaza.cada` = 30 pasos, los dos bandos, el del jugador también), `cumple` (cada orden cubierta, para que salga
  con lo último que se sabe) y la IA del mando. `fuentesAmenaza(p, lado)`: sus contactos (soldado
  peso 1, carro 3), el despliegue enemigo solo mientras no hay contactos, y siempre la **llegada esperada** (las rutas
  a pie y en carro del despliegue enemigo al objetivo, un punto cada 8 casillas hasta el 60 % de su largo: sale del
  mapa, no es trampa), juntas por bloque de 4×4. `mapaAmenaza(m, fuentes)`: shadowcasting de `fov.js` desde cada
  fuente con la regla del seto (lo pegado a la fuente no tapa; lo pegado detrás de un seto o bosque iluminado se
  comprueba con `seVe`), Σ peso × (1 − 0,5·d/alcance), tope 3. Cifras en `REGLAS.amenaza`.
- `js/sim/vista.js`: `seVe` con la regla del seto (lo pegado a un extremo no tapa, salvo las casas) y el humo.
- `js/sim/ia.js`: el mando del bando que defiende (cifras en `REGLAS.ia`). Desde el 2026-10-26:
  - usa el mapa de amenaza del bando (`amenazaAlDia`; su versión le dice si lo que sabe ha cambiado);
  - sus órdenes llevan `cubierta: true`: `cumple` (partida.js) suma a cada casilla `REGLAS.amenaza.peso[orden] ×
    amenaza` (correr 3, mover 4, carro 4) y corre el hueco de formación hasta 2 casillas a la menos vista;
  - cada escuadra, al seto de su lado (ordenadas por su posición a lo ancho del frente: antes se cruzaban), en la
    posición de tiro que menos se ve de lejos (`exponeTiro` casillas² por unidad de amenaza);
  - si cambia lo que sabe y la escuadra va de camino toda en forma, rehace la ruta (como mucho cada 10 s);
  - el carro: `emboscada()` busca, a ≤ 14 casillas del objetivo y no más de 6 por delante, fuera del camino y junto a un
    seto o una casa, la casilla que más ve (de 4 a 40 casillas, el flanco vale más) de la llegada esperada del carro
    enemigo (A* de carro desde su último contacto o su despliegue), menos lo que se la ve de lejos; `mira` hacia el
    primer punto de la llegada que ve. Va solo con escolta (una escuadra con la mitad en condiciones a ≤ 12 casillas;
    se va a > 18); sin ella espera 8 casillas detrás del objetivo. En la granja: emboscada (71, 33), reserva (80, 25);
  - las órdenes salen de una cola, una por paso (las 10 rutas cubiertas de una escuadra cuestan 7–10 ms);
  - repliegue a la granja de la escuadra que se rompe (≥ 50 % fuera), por la ruta cubierta.
- `partida.js`, carros: una orden con `mira` deja al carro, parado, con el casco y (sin blanco) la torreta hacia ese
  rumbo. Solo la usa la IA; las órdenes del jugador no la llevan.
- **Las órdenes del jugador** (2026-10-26): las que no dicen `cubierta` la llevan si su tipo está en
  `REGLAS.amenaza.cubiertas` (`['mover']`): MOVER (escuadra o carro) va por lo cubierto con el mapa de amenaza de su
  bando (sus contactos, la llegada esperada y, sin contactos, el despliegue enemigo: nada que no sepa) y CORRER por lo
  rápido. Lo decide `rutaCubierta` en `cumple`, así que vale igual para el menú y los atajos de `js/ui/juego.js`, para
  `window.__nrl.ordena`, para el guion (`aplicaGuion`, el que hace de jugador en las pruebas y en `tools/batalla.mjs`) y
  para el bot. RETIRADA no va cubierta (no tiene peso en `REGLAS.amenaza.peso`).
- Las cifras: `js/data/reglas.js` (paso, velocidades, vista, detección, supresión, moral, obediencia, humo, victoria),
  `js/data/armas.js` y `js/data/unidades.js`.
- Pruebas: `node tests/sim.mjs` (determinismo, obediencia, la regla del seto, el humo, la MG que clava a una escuadra
  al descubierto, el blindaje, el casco oculto (geometría y duelo), el mapa de amenaza y la ruta cubierta en un mapa
  pequeño, MOVER cubierto y CORRER directo sin decirlo, la niebla en el mapa del jugador, el carro de la IA sin escolta
  y con ella, tres batallas enteras). Una batalla para mirarla: `node tools/batalla.mjs --semilla N`.
- **El duelo de carros** (`tools/duelo.mjs`, 2026-10-26): un carro parado y pegado a un seto (el oculto) contra el otro,
  con la regla del casco oculto y sin ella (la misma batalla con `REGLAS.casco.baldosas = []`), muchas semillas por caso:
  `node tools/duelo.mjs [--n 400] [--d 15,30,50] [--geo frente,flanco,cruza] [--oculto panzer4,sherman]` (~1 min con
  400). `frente`/`flanco`: los dos parados y apuntados, cada uno en un punto de su recarga (azar aparte, con la semilla;
  si no, dispara primero el de id más bajo y el primer tiro decide); `cruza`: el otro pasa corriendo de lado a d
  casillas, con la torreta hacia delante (la emboscada). `duelos(caso, n)` se exporta para las pruebas.
- Rendimiento, con la ruta cubierta del jugador (2026-10-26): 0,13 ms por paso de media (antes 0,10), 61 pasos de más
  de 5 ms de 36 000 (antes 43 de 50 000), pico ~23 ms; el mapa del jugador se rehace cuando cambian sus contactos.
- Rendimiento (2026-10-26, antes de lo anterior): 0,11–0,12 ms por paso de media con 40 soldados y 2 carros; picos de 7–10 ms en el paso en
  que sale la orden cubierta de una escuadra (10 A* con coste de exposición, ~0,65 ms cada uno: el contorno de coste
  abre casi todo el mapa) y de 2–15 ms al rehacer el mapa de amenaza o la emboscada. El arreglo de fondo (una ruta por
  escuadra o un campo de flujo por orden) es del code-expert.

## Medidas de referencia (granja, guion de `escenarios.js`, semillas 1–20, 2026-10-26)

| | antes | después |
|---|---|---|
| duración media | 106 s | 250 s |
| gana EE. UU. / Alemania | 17 / 3 | 8 / 12 |
| bajas EE. UU. / Alemania | 3,4 / 10,9 | 10,1 / 9,4 |
| primer contacto | 11 s | 78 s |
| alemanes en ruta vistos por el americano | 2,6 % | 0,7 % |
| duelo de carros | a los 11–33 s, de frente, a 34–52 casillas | no hay, salvo que el Sherman entre en la granja |
| Sherman que entra solo en la granja (a los 200 s) | — | el Panzer gana 9 de 10, de flanco, a 7 casillas |

El guion de prueba manda al americano contra la línea alemana a los 120 y 240 s: casi todas las batallas acaban
entonces. Con solo la primera orden (`tests/sim.mjs`) llegan a los 900 s.

### MOVER cubierto para el jugador y casco oculto (2026-10-26, `tools/batalla.mjs`, semillas 1–20 y 1–60)

| | antes | después |
|---|---|---|
| duración media (1–20 / 1–60) | 250 s / 208 s | 180 s / 169 s |
| gana EE. UU. / Alemania (1–20) | 8 / 12 | 10 / 10 |
| gana EE. UU. / Alemania (1–60) | 31 / 29 | 34 / 26 |
| bajas EE. UU. / Alemania (1–20) | 10,1 / 9,4 | 8,6 / 9,7 |
| orden de los 120 s, escuadra us0: amenaza media por casilla de su ruta (en su mapa) | 1,73 | 0,67 (ruta un 22 % más larga) |
| orden de los 120 s, us0: tiempo en ruta a la vista del alemán | 24 % | 7 % |
| orden de los 240 s, us0: amenaza media por casilla | 0,51 | 0,06 |
| primer contacto | 78 s | 78 s |

- Con `REGLAS.amenaza.cubiertas = []` las 20 huellas son las de antes: la IA alemana no cambia nada (el mapa al día en
  `paso` y en `cumple` le da lo mismo) y todo lo de la tabla es la ruta cubierta del jugador.
- El casco oculto no cambia ninguna de esas 20 batallas (huellas iguales con la regla y sin ella): en el guion no hay
  duelo de carros. Con el Sherman metido en la granja a los 200 s (sin fin por rotura), el Panzer gana 6 de 20 (sin la
  regla, 7) y sus 12 cañonazos al Sherman van todos contra casco oculto: el Sherman entra por el camino entre setos.

### El duelo de carros con casco oculto (`node tools/duelo.mjs --n 400`, puntería ×0,6, 2026-10-26)

Gana el oculto, con la regla / sin ella (de frente y de flanco salen iguales: con el casco oculto, solo cuenta la
torreta, que ya apunta al enemigo):

| oculto | geometría | 15 casillas | 30 | 50 |
|---|---|---|---|---|
| Panzer IV | frente o flanco | 70 % / 51 % | 68 % / 52 % | 67 % / 79 % (frente), 51 % (flanco) |
| Panzer IV | cruza (le pasa el Sherman de lado) | 66 % / 69 % | 61 % / 59 % | 57 % / 59 % |
| Sherman | frente o flanco | 74 % / 56 % | 71 % / 55 % | 34 % / 23 % |
| Sherman | cruza | 64 % / 61 % | 59 % / 56 % | 55 % / 53 % |

- En el duelo igualado (los dos apuntados), la regla sube al oculto de ~53 % a ~70 %.
- **El Panzer IV oculto pierde a 50 casillas de frente** (79 % → 67 %): con el casco oculto todos los impactos van a la
  torreta (50 mm de frente), que el 75 mm del Sherman perfora, y no al casco (85 mm), que a 200 m ya no. Es histórico (la
  torreta era el punto flaco del IV H), pero el jugador lo verá al revés de lo que espera.
- En `cruza`, el emboscado gana casi lo mismo con la regla y sin ella: decide estar parado y ya apuntado; la regla le
  quita al que pasa un tercio de sus victorias contra el Sherman (19 % → 12 %) y para el Panzer va y viene (7 → 15 % a
  15 casillas, 19 → 15 % a 30) por lo mismo de su torreta.
- Los duelos se deciden en 1–2 disparos (7–16 s): el primer impacto suele matar.

## Lo que falta o no convence (2026-10-26)

- ~~El alemán se mete en el pasillo del camino~~ y ~~el duelo de carros se decide en 12–20 s~~: arreglado el
  2026-10-26 (ruta cubierta, emboscada con escolta).
- **El encuentro de frente**: en 3 de 20 semillas los dos bandos llegan a la vez a la línea x = 38 / x = 63 (~80 s) y el
  americano, ya apostado, rompe al alemán que llega corriendo y de pie. Falta el último tramo a cubierto (arrastrarse o
  por saltos al acercarse a la posición si hay contactos).
- **La línea de 20 casillas** (`LINEA` de partida.js) de la escuadra alemana en la columna del camino (x = 63) pisa los
  huecos del seto (filas 15–16 y 25–27); el hueco cubierto solo se corre 2 casillas.
- **El mapa de amenaza usa la última posición de los contactos** (niebla): un americano que avanza sin que se le vea
  no cuenta hasta que se le ve. La llegada esperada lo suaviza, sin hacer trampa.
- ~~No hay casco oculto~~: desde el 2026-10-26, la regla del seto pegado (`REGLAS.casco`). Cifras provisionales para el
  game-designer: puntería ×0,6 constante (quizá debería depender de la distancia: cerca, el blanco pequeño casi no
  importa) y sin efecto en la detección (un casco oculto se ve igual de pronto).
- **La emboscada del Panzer no busca el casco oculto** (en (71, 33) no tiene el seto entre él y la llegada); el Sherman,
  en cambio, lo tiene gratis en el camino entre setos. Y para el Panzer IV el casco oculto es arma de doble filo (su
  torreta de 50 mm).
- **La ruta cubierta del jugador depende de que recuerde**: los contactos se olvidan a los 30 s, y en la orden de los
  120 s del guion el americano a menudo ya no recuerda la MG que vio a los 78 s: su mapa vuelve al despliegue y la
  llegada esperada del alemán.
- RETIRADA no va cubierta (ni la del jugador ni la de la IA, que se repliega con MOVER).
- **Las batallas del guion siguen acabando antes de los 15 min**, porque el guion empuja al americano contra la MG.
- El mapa de amenaza no tiene en cuenta el humo.
- Fallo visto (no arreglado): en `fuego()` una ráfaga sigue tirando contra un blanco que ya cayó en esa misma ráfaga,
  y le vuelve a llamar `baja` (sale «herido» dos veces y la moral de los suyos baja dos veces).
- Aún no hay: capa de depuración (el mapa de amenaza, la emboscada y las rutas cubiertas se ven hoy con un volcado en
  texto fuera del repo), fuego de zona del jugador, rendirse ni heroísmo, ni munición.

## Decisiones (2026-10-26)

- **Tiempo real sin pausa**: 10 pasos por segundo. El tiempo no se para para dar órdenes.
- **Línea de visión** con `fov.js`, baldosas opacas o no (lo que tapa a medias, más adelante); **niebla de guerra**:
  el jugador solo ve lo que ven sus unidades; **detección** en un segundo, más lenta si el enemigo está tumbado.
- **Moral**: cuatro estados (en forma, suprimido, acobardado, pánico). Avanzar se puede negar, siempre con su motivo a
  la vista; retirarse y esconderse, casi nunca. Heroico y rendirse, más adelante. **Se tiene que sentir realista.**
- **Granadas de humo** en el prototipo: tapan la vista mientras dura la cortina.
- Prototipo: dos escuadras y un carro por bando, EE. UU. contra Alemania.

## Decisiones (segunda ronda, 2026-10-26)

- **El tiempo va siempre a 1:1**: ni se acelera ni se ralentiza.
- **El menú (Esc) detiene la partida** para salir o guardar, pero con él abierto no se pueden dar órdenes: no es una
  pausa táctica.
- **Granadas de humo**: las lanza el jugador con la orden HUMO, y también la IA por su cuenta en lo obvio, cuando una
  escuadra se retira o tiene que cruzar al descubierto bajo fuego.

## Decisiones (tercera ronda, 2026-10-26)

- **El prototipo empieza por la simulación en Node**: mapa, unidades, pasos fijos, línea de visión, supresión y moral,
  con pruebas deterministas. Enseguida, un dibujo mínimo encima para verla moverse.

## Decisiones (quinta ronda, 2026-10-26)

- **P32**: la llegada esperada del enemigo cuenta **siempre** en el mapa de amenaza, haya o no contactos (sale del mapa:
  no es trampa).
- **P33**: **casco oculto**. Con un seto pegado entre el carro y quien le dispara, los impactos van solo a la torreta y
  la puntería contra él baja (`REGLAS.casco`). Las cifras son provisionales: las revisa el game-designer con
  `tools/duelo.mjs`.
- **P34**: el Panzer emboscado **se queda así de duro** por ahora; el game-designer lo revisará cuando el jugador pueda
  escoltar su carro.
- **P35**: las órdenes del jugador usan la ruta cubierta: **MOVER por lo cubierto** (con el mapa de amenaza de sus
  propios contactos, niebla de guerra) y **CORRER por lo rápido**. El bando del jugador tiene su `p.amenaza` al día igual
  que el de la IA, rehecho solo cuando cambian sus contactos.

## Decisiones (cuarta ronda, 2026-10-26)

- **El seto tapa la vista del todo, salvo para quien está pegado a él**: un soldado en el seto (o junto a él) ve y
  dispara al campo de al lado, como en el bocage real. Los setos son posiciones de tiro, no solo paredes.
- **Escuadras del prototipo**: EE. UU., 10 hombres (jefe con Thompson, un BAR y 8 M1 Garand); Alemania, 10 hombres
  (jefe con MP 40, la MG 42 con su tirador y dos sirvientes, y fusileros con Kar 98k). Carros: M4 Sherman (75 mm)
  contra Panzer IV H.
- **Bajas**: herido (fuera de combate, se queda y asusta a los suyos) y muerto; sin curación en el prototipo.
- **Victoria**: quien controle el patio de la granja a los 15 minutos (más soldados en condiciones dentro), o antes si
  el otro bando se rompe.
- **El jugador lleva a EE. UU. (ataca)** y la IA a Alemania (llega antes y defiende la granja).
