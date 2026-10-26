---
name: ia-tactica
description: El oficio de la IA táctica de Sin Retaguardia, un juego táctico en tiempo real sin pausa al estilo de Close Combat. Cómo se mueven y deciden los soldados, las escuadras y los carros dentro de una simulación determinista en pasos fijos. Rutas en rejilla (A*, costes por terreno y por clase de unidad, rutas cubiertas, campos de flujo), formación, movimiento a cubierto, visión y detección, moral, supresión, reacción al fuego, coordinación de escuadra (fuego y movimiento, avance por saltos), obediencia filtrada por la moral, puntería, y carros (rumbo del casco y de la torreta, blindaje por lados y ángulo, vista, ruido, elección de blanco). Úsala ante cualquier petición sobre el comportamiento de las unidades o su depuración.
---

# IA táctica

La IA de este género no juega contra el jugador: **juega dentro de sus tropas**. Cada soldado decide lo pequeño
(cubrirse, tumbarse, a quién disparar, si obedece) según su moral y lo que le está pasando. Cada escuadra decide cómo
cumplir la orden del jugador (por dónde, en qué formación, quién cubre a quién). Y el bando enemigo decide lo grande.
Lo que hace buena esta IA es que sea **creíble y legible**: el jugador tiene que poder explicar por qué una escuadra
hizo lo que hizo.

- [reference/rutas.md](reference/rutas.md): rutas en rejilla, costes, rutas cubiertas, campos de flujo, formación y
  movimiento.
- [reference/moral.md](reference/moral.md): visión y detección, supresión, moral, reacción al fuego, obediencia,
  puntería y coordinación de escuadra.
- [reference/carros.md](reference/carros.md): rumbo del casco y de la torreta, blindaje por lados, vista, ruido, elección
  de blanco y la relación con la infantería.
- [reference/proyecto.md](reference/proyecto.md): **el mapa de este proyecto**: dónde vive cada sistema, sus cifras,
  los escenarios de prueba y la depuración. Si está vacío, aún no hay simulación.

## Las reglas de la simulación

Son las de CLAUDE.md, y la IA es donde más fácil es romperlas:

- **Pasos fijos.** La IA corre dentro del paso de la simulación (por ejemplo, 10 por segundo) y no toca el DOM, el
  canvas ni el audio. Lo que tiene que verse u oírse lo emite como **suceso** (disparo, grito, «suprimido», «se
  niega»), y el dibujo y el sonido lo leen después.
- **Determinista.** Todo el azar, del `RNG` de la partida (`js/util/rng.js`), recorriendo las unidades **en un orden
  fijo** (por id). Nunca `Math.random`, la hora ni el orden de un `Set` que dependa de cómo se llenó. Si hace falta que
  añadir una unidad no cambie las tiradas de las demás, cada una lleva su propio `RNG` sembrado con la semilla de la
  partida y su id. La prueba: la misma semilla y las mismas órdenes dan la misma huella.
- **Las órdenes entran al principio del paso.** No hay pausa táctica: las órdenes se encolan y se aplican en el
  siguiente. Como el jugador no puede parar el tiempo, la IA tiene que hacer bien lo pequeño sin que se lo pidan.
- **Pensar no es cada paso.** Las decisiones caras (elegir cobertura, replanificar, escoger blanco) se toman cada pocos
  pasos y **escalonadas** (cada unidad en su turno: `(paso + id) % k === 0`), con un presupuesto por paso para las rutas
  y la línea de visión. Lo urgente (una granada al lado, una bala que pasa) interrumpe.
- **Niebla de guerra.** Cada bando decide con lo que **sabe**: contactos vistos u oídos, con su última posición y su
  edad. La IA no mira la posición real de lo que no ve. Si alguna vez hace trampa (en una dificultad), se apunta en
  `proyecto.md` y se dice.
- **Los números, en los datos.** Umbrales, radios, velocidades y pesos van en tablas con id (por arma, por clase de
  unidad, por baldosa), no repartidos por el código. Así el game-designer puede ajustarlos y una prueba comprueba que
  están completos.

## Cómo se organiza la decisión

Tres niveles, cada uno con su reloj:

1. **El mando del bando** (segundos): qué objetivo atacar o defender y con qué escuadras. Es solo para el bando de la
   IA; el del jugador lo decide el jugador.
2. **La escuadra** (cada 0,5–1 s): cómo cumplir la orden. Elige la ruta, la formación y la maniobra (fuego y
   movimiento, avance por saltos, mantener, retirarse) y a qué blanco se dispara.
3. **El soldado** (cada paso lo urgente y cada pocos lo demás): su estado (moral, supresión, postura), su reacción al
   fuego, su sitio en la formación, su cobertura y su blanco.

- **Estados con histéresis**: entrar en «acobardado» con supresión > 60 y salir con < 40, no en el mismo umbral; si
  no, parpadea.
- **Utilidad para elegir entre opciones** (qué cobertura, qué blanco, qué maniobra): cada opción con su puntuación de
  factores con pesos de los datos, y gana la mejor, con un pequeño premio a seguir con la actual para no cambiar a
  cada momento.
- **Cada decisión deja su motivo**: un código corto («suprimido», «sin mando», «miedo al carro», «sin línea de tiro»)
  que lee la interfaz (iconos, la respuesta de la escuadra) y la capa de depuración. Una desobediencia sin motivo
  visible es un fallo, no una característica.

## Cómo se comprueba

- **Escenarios de prueba deterministas, en Node**: un mapa pequeño, unas unidades, unas órdenes y una semilla. Cada
  escenario dice qué tiene que pasar, con cifras. Por ejemplo:
  - «una escuadra en forma cruza 150 m de campo abierto ante una ametralladora: queda suprimida antes de la mitad»;
  - «la misma escuadra, con humo o por el seto: llega»;
  - «un carro sin escolta ante infantería con antitanque en el bosque: pierde».

  Se corren con muchas semillas y dan porcentajes, no anécdotas.
- **La huella**: la misma semilla y las mismas órdenes dan la misma huella de la partida, antes y después de un
  refactor.
- **Métricas antes y después** de cada cambio de comportamiento: tiempo hasta el primer contacto y hasta suprimir,
  bajas, órdenes obedecidas, a medias y rechazadas (con su motivo), distancia media entre soldados de una escuadra
  (¿se amontonan?), tiempo en cobertura bajo fuego, ms por paso.
- **La capa de depuración** (en el dibujo, apagada por defecto): rutas, huecos de formación, conos de visión,
  contactos conocidos, supresión y moral de cada soldado, el motivo de su última decisión y el mapa de amenaza. Una
  captura con la capa encendida enseña qué pensaba cada uno.

Todo fuera del repo: registros, capturas y tablas de métricas, en el scratchpad o en `/tmp`.

## Lo aprendido

(Añade aquí, con fecha, lo que descubras del comportamiento de las unidades que le sirva al siguiente. Lo que sea de
este proyecto, en `reference/proyecto.md`.)

- 2026-10-26 · Con un coste de exposición, el suavizado «tirar de la cuerda» que solo mira el coste del terreno de los
  extremos deshace la ruta cubierta (cruza en recta el campo a la vista). La recta tiene que costar como mucho lo que
  el trozo de ruta que salta.
- 2026-10-26 · El mapa de amenaza solo con contactos llega tarde: el defensor ya ha cruzado lo expuesto cuando ve al
  enemigo. Añadir las fuentes de la **llegada esperada** (rutas del despliegue enemigo al objetivo, sacadas del mapa)
  bajó la exposición en ruta de 1,6 % a 0,7 % sin trampa.
- 2026-10-26 · Una emboscada de carro tiene que apuntar al **primer punto** por donde asomará el enemigo, no al centro
  de lo que ve: con la torreta lenta (14°/s), apuntar 50° de más perdía el duelo (de 3/7 a 9/10 ganados).
- 2026-10-26 · Al repartir posiciones entre escuadras, ordénalas por dónde están a lo ancho del frente: por índice
  se cruzan y atraviesan el campo la una delante de la otra.
- 2026-10-26 · El shadowcasting no sabe la regla del seto: lo pegado a la fuente se quita de lo opaco, y lo de detrás
  de un seto iluminado se comprueba con `seVe` (si no, los setos vistos de refilón hacen visible la fila de detrás).
- 2026-10-26 · Para medir un duelo de carros, que no empiecen los dos con la misma recarga: se recorren por id, dispara
  siempre primero el de id más bajo y el primer impacto suele decidir (salía 80/20 sin ninguna regla de por medio).
- 2026-10-26 · Esconder el casco manda todos los impactos a la torreta: al carro de torreta flaca (Panzer IV H, 50 mm
  contra 85 del casco) le puede salir peor. Mira el blindaje de cada carro antes de dar por hecho que ocultarse ayuda.
- 2026-10-26 · Para probar que un cambio del jugador no toca a la IA, apágalo por datos (p. ej.
  `REGLAS.amenaza.cubiertas = []`) y compara las huellas con las de antes: iguales en las 20 semillas.
- 2026-10-26 · El scratchpad de la sesión lo comparten otros agentes (me pisaron un `mide.mjs`): trabaja en una
  subcarpeta propia.
