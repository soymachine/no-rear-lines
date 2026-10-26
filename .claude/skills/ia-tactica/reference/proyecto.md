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
  - la moral (`moral`): estados con histéresis, recuperación a cubierto y con el jefe cerca, miedo al carro, contagio
    del pánico;
  - el humo por iniciativa propia (`humoIA`) y la victoria (`victoria`).
- `js/sim/rutas.js`: A* con desempates fijos, `andableCerca`, `rectaLibre`, `suaviza`. Desde el 2026-10-26, el A*
  acepta un coste extra por casilla (`extra × peso`, el mapa de amenaza) y usa búferes por mapa con generación y un
  montículo en arrays tipados (mismas rutas que antes, comprobado en 584 peticiones; ~2× más rápido). `suaviza` con
  extra no acepta una recta que cueste más que el trozo de ruta que se salta (si no, la ruta cubierta se acorta por el
  campo a la vista).
- `js/sim/amenaza.js` (2026-10-26): el mapa de amenaza de un bando. `fuentesAmenaza(p, lado)`: sus contactos (soldado
  peso 1, carro 3), el despliegue enemigo solo mientras no hay contactos, y siempre la **llegada esperada** (las rutas
  a pie y en carro del despliegue enemigo al objetivo, un punto cada 8 casillas hasta el 60 % de su largo: sale del
  mapa, no es trampa), juntas por bloque de 4×4. `mapaAmenaza(m, fuentes)`: shadowcasting de `fov.js` desde cada
  fuente con la regla del seto (lo pegado a la fuente no tapa; lo pegado detrás de un seto o bosque iluminado se
  comprueba con `seVe`), Σ peso × (1 − 0,5·d/alcance), tope 3. Cifras en `REGLAS.amenaza`.
- `js/sim/vista.js`: `seVe` con la regla del seto (lo pegado a un extremo no tapa, salvo las casas) y el humo.
- `js/sim/ia.js`: el mando del bando que defiende (cifras en `REGLAS.ia`). Desde el 2026-10-26:
  - rehace su mapa de amenaza solo si cambia la firma de sus fuentes (bloques de 4) y lo deja en `p.amenaza[lado]`;
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
- Las cifras: `js/data/reglas.js` (paso, velocidades, vista, detección, supresión, moral, obediencia, humo, victoria),
  `js/data/armas.js` y `js/data/unidades.js`.
- Pruebas: `node tests/sim.mjs` (determinismo, obediencia, la regla del seto, el humo, la MG que clava a una escuadra
  al descubierto, el blindaje, el mapa de amenaza y la ruta cubierta en un mapa pequeño, el carro de la IA sin escolta
  y con ella, tres batallas enteras). Una batalla para mirarla: `node tools/batalla.mjs --semilla N`.
- Rendimiento (2026-10-26): 0,11–0,12 ms por paso de media con 40 soldados y 2 carros; picos de 7–10 ms en el paso en
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
- **No hay casco oculto de verdad**: sin alturas, un carro pegado a un seto se ve entero. La emboscada vale por ver de
  flanco, estar parado y con la torreta ya apuntada.
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
