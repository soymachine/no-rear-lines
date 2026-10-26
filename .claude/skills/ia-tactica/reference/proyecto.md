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
- `js/sim/rutas.js`: A* con desempates fijos, `andableCerca`, `rectaLibre`, `suaviza`.
- `js/sim/vista.js`: `seVe` con la regla del seto (lo pegado a un extremo no tapa, salvo las casas) y el humo.
- `js/sim/ia.js`: el mando del bando que defiende: posiciones de tiro en el seto que mira al enemigo por delante del
  objetivo, el carro junto al objetivo, y repliegue a la granja de la escuadra que se rompe.
- Las cifras: `js/data/reglas.js` (paso, velocidades, vista, detección, supresión, moral, obediencia, humo, victoria),
  `js/data/armas.js` y `js/data/unidades.js`.
- Pruebas: `node tests/sim.mjs` (determinismo, obediencia, la regla del seto, el humo, la MG que clava a una escuadra
  al descubierto, el blindaje, tres batallas enteras). Una batalla para mirarla: `node tools/batalla.mjs --semilla N`.
- Rendimiento: 0,1–0,4 ms por paso con 40 soldados y 2 carros.

## Lo que falta o no convence (2026-10-26)

- **El alemán se mete en el pasillo del camino**: va corriendo a sus setos por la ruta más barata, que es el camino,
  y el Sherman lo barre desde el oeste. Le falta la ruta cubierta (el mapa de amenaza de `rutas.md`).
- **El duelo de carros se decide en 12–20 s**: los dos van por el camino de frente y el que dispara primero gana.
  Le falta al carro no meterse solo en un pasillo largo, el casco oculto y la escolta.
- **Las batallas acaban en 1–5 minutos** porque el que llega mal se rompe enseguida; con las dos cosas de arriba
  deberían durar más. La cifra de rotura (60 %) es del game-designer.
- Aún no hay: capa de depuración, fuego de zona del jugador, rendirse ni heroísmo, ni munición.

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
