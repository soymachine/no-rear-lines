---
name: sonido
description: El oficio del sonido de Sin Retaguardia, un juego táctico en tiempo real de la Segunda Guerra Mundial, y cómo comprobarlo sin oír. Qué suena y qué calla, el sonido como información (de dónde viene el fuego, qué arma, si pasa cerca), las armas, los carros, la artillería, los gritos, el ambiente, la mezcla y los buses, la variedad, el espacio (distancia, paneo, oclusión, eco), la densidad con muchas armas a la vez, la síntesis WebAudio de reserva, los formatos y las licencias; y las medidas (nivel, golpe, bandas, costuras, silencios) con mide-sonido.mjs. Úsala ante cualquier petición o pregunta sobre el sonido del juego.
---

# Sonido

El sonido de un juego táctico en tiempo real **es información**: el jugador no puede mirar todo el mapa a la vez, y
lo que oye le dice dónde mirar. Una ráfaga a la izquierda, el chasquido de una bala que pasa cerca o el motor de un
carro que no se ve todavía cambian lo que decide. Todo lo demás (el ambiente, la música) está para que eso se oiga
mejor, no para taparlo.

El mapa del audio de este proyecto (dónde vive cada cosa, qué suceso suena con qué clave, los buses y los ajustes) va
en [reference/proyecto.md](reference/proyecto.md). Las recetas de oficio (formatos, mezcla, añadir y retocar) están en
[reference/recetas.md](reference/recetas.md).

## Qué tiene que sonar (y qué callar)

- **Lo que amenaza al jugador, primero**: el fuego que viene hacia sus unidades (chasquidos de balas que pasan, impactos
  cerca), los carros enemigos (motor, cadenas, torreta que gira), la artillería que llega (el silbido antes del
  golpe). Se oye aunque esté fuera de la pantalla, con su dirección.
- **Lo que hacen sus unidades**: sus disparos, sus gritos (¡suprimidos!, ¡carro!, ¡me han dado!), el motor de sus
  carros. Más bajo que lo que amenaza.
- **Lo lejano, como lejano**: un combate al otro lado del mapa es un rumor grave y apagado, no una ráfaga nítida.
- **Lo que no cambia nada, callado**: si veinte soldados disparan a la vez, no suenan veinte disparos enteros. Se
  limita cuántas voces de cada clave suenan a la vez, y las demás se juntan o se callan, por prioridad (lo cercano y lo
  que amenaza, antes).
- **El silencio también avisa**: antes de un asalto o cuando cesa el fuego, el ambiente sube y se oye el viento. Ese
  contraste es lo que hace que el siguiente disparo pese.

## Las reglas que funcionaron

Vienen de otro juego que ya las probó. Úsalas de partida y cámbialas si el juego pide otra cosa.

- **Claves con jerarquía.** Cada sonido es una **clave** con varias **variantes** (archivos): `shot.fusil`,
  `shot.ametralladora.mg42`, `step.barro`, `amb.bosque.noche`. Si una clave no tiene archivos, se prueba la más
  general (`shot.ametralladora.mg42` → `shot.ametralladora` → `shot`). Los ambientes no bajan de `amb.x`. Así se puede
  empezar con pocas grabaciones y afinar después sin tocar código.
- **La grabación manda; la síntesis es la red.** Cada sonido tiene una síntesis WebAudio de reserva (ruido y
  osciladores) que suena mientras carga el archivo, la primera vez y si falta. No se quita porque haya grabación.
- **Variedad sin cansar.** No repetir la variante anterior; variar ±5 % el tono y ±12 % el volumen. Una voz (un
  soldado) usa siempre las mismas 2–3 tomas y su propio tono: cada uno suena como sí mismo.
- **El espacio.**
  - Lo que suena en el mapa se atenúa con la distancia a la cámara o a lo que mira el jugador, por ejemplo
    `max(0,1; 1/(1 + d/14))`.
  - Se panea según dónde está en la pantalla (±0,85 como mucho).
  - Se apaga con un paso bajo si está lejos o detrás de algo grueso (una casa, una loma).
  - Lleva más o menos eco según el sitio: dentro de una casa, en el bosque o en campo abierto.
- **Lo fuerte agacha el ambiente.** Disparos y explosiones bajan un momento el bus del ambiente (*ducking*): 0,4 un
  disparo, 0,6–0,8 una explosión. Con silenciador o de lejos, mucho menos.
- **Buses separados**: efectos, ambiente, música y voces, cada uno con su volumen en los ajustes del jugador, y un
  maestro. El audio no se crea hasta el primer gesto del jugador (clic o tecla).
- **El sonido no es la mecánica.** Lo que las unidades oyen (un carro alerta a los que están cerca, los disparos
  suprimen) lo decide la simulación. Lo tuyo es que el jugador oiga bien lo que esa mecánica avisa.
- **Casa con la animación.** El disparo suena cuando sale el fogonazo. Si la grabación tiene una carga o el golpe llega
  tarde, un retardo por clave (en ms; negativo, se adelanta). Una grabación que es una ráfaga entera suena una vez por
  ráfaga, no una vez por bala: si no, se oyen ráfagas encimadas.

## Lo propio de este género

- **Armas que se distinguen a ciegas.** Fusil de cerrojo (un golpe seco y una pausa), subfusil (ráfaga ligera y
  rápida), ametralladora (la cadencia de cada una es su firma: la MG 42 no suena como la Browning), cañón de carro
  (golpe grave y cola larga), mortero (el *plop* de salida y el silbido de llegada), granada (golpe corto y sordo).
  Compáralas con el brillo y las bandas de `mide-sonido.mjs`.
- **Cerca o lejos, desde el oído**: el chasquido supersónico de una bala que pasa cerca dice «te disparan a ti»; el
  estampido lejano dice «hay combate allí». Con dos capas (el disparo y el chasquido) se dicen las dos cosas.
- **Los carros**: motor al ralentí y en marcha (tono que sube con la velocidad), cadenas (chirrido que se para al
  pararse), torreta que gira (zumbido o manivela), el cañón y la recarga. El motor en bucle, con su emisor que se mueve
  con el carro.
- **La artillería y los aviones**: el silbido que baja de tono antes del impacto da tiempo a reaccionar; el zumbido del
  avión, antes de verlo.
- **Las voces**: cortas y por situación (orden recibida, suprimidos, herido, carro a la vista, retirada), con
  prioridad y sin pisarse. Pocas: veinte soldados gritando a la vez es ruido.
- **El ambiente del mapa**: campo, bosque, pueblo, lluvia, viento, noche; una capa de combate lejano cuando la batalla
  está viva; emisores en las baldosas (un río, un molino, una casa ardiendo) que suben al acercarse.

## Formatos y licencias

- **Efectos**: MP3 (u OGG) mono, 128 kbps, 44,1 kHz, pico a −1 dBFS y sin silencio delante; 3–6 variantes en disparos,
  impactos y pasos.
- **Ambientes**: estéreo, 160 kbps, en bucle sin costura, mejor de 60–120 s (los de 8 s se notan al repetirse).
  Detalles sueltos (un perro, un trueno): estéreo, sin bucle.
- **Licencias**: cada archivo que entra, con su origen y su licencia apuntados en un archivo de créditos. Sin licencia
  clara, no entra. El audio de pago de otros proyectos no se trae: su licencia es de ese proyecto.
- Al repo solo van archivos comprimidos. Los `.wav`, `.aif` y `.flac` originales no se suben.

## Comprobar sin oídos

No puedes escuchar: mide. Los scripts dejan sus salidas en el scratchpad o en `/tmp`, nunca en el repo.

| Script | Para qué |
|---|---|
| `scripts/mide-sonido.mjs <clave\|prefijo\|archivo>…` | Medidas de cada variante: duración, canales, pico, RMS, golpe (50 ms), sonoridad (400 ms), silencio delante y detrás, recortes, brillo y bandas, costura de los bucles, volumen de la clave y **nivel en el juego**. Avisos de formato. `--png` dibuja la onda; `--json` y `--antes` comparan antes y después. Sin banco (`sounds/bank.json`), mide archivos sueltos. |

`scripts/comun.mjs` es lo común: el índice del banco (`sounds/bank.json` y `sounds/mix.json`, si existen: su forma está
en su cabecera), resolver una clave y su volumen, Playwright y las medidas. Si el juego guarda el banco de otra forma,
se cambia ahí y nada más.

Cómo leer las medidas:
- **Nivel en el juego** = golpe + 20·log10(volumen de la clave × bus × maestro), con los ajustes por defecto. Es lo que
  se compara entre claves (¿el disparo tapa los pasos?, ¿esta variante salta?).
- **Variantes desiguales**: más de 6 dB entre la más floja y la más fuerte de una clave se nota como un fallo.
- **Brillo y bandas** (graves < 250 Hz / medios < 2 kHz / agudos < 8 kHz / por encima): para saber si dos armas suenan
  distintas o si un ambiente es todo siseo.
- **Silencio delante**: los MP3 llevan ~25 ms casi en silencio (el retardo del codificador); eso no es del archivo.
- **Costura**: un salto de más de −30 dBFS entre el final y el principio del bucle es un clic cada vuelta.
- Mira las ondas (`--png`) con Read: se ve si un disparo no tiene ataque, si un paso trae dos golpes o si algo está
  recortado.

Cuando el cambio es de código, pasa también las pruebas de audio que haya y `eslint --quiet js tools`.

**Pendientes** (se escriben cuando haya audio aquí):
- `banco.mjs`: qué claves pide el juego y cuáles tienen grabación propia, general o solo síntesis;
- `sintetiza.mjs`: renderizar la síntesis de reserva a WAV, con semilla, y medirla igual que una grabación.

## Lo aprendido

- 2026-10-25: una grabación que es una ráfaga entera, tocada una vez por bala, suena a ráfagas encimadas. O se toca una
  vez por ráfaga, o se graban disparos sueltos.
- 2026-10-25: lo primero que mirar al mezclar es si cada clave tiene su volumen o todas van con el de su tipo: con todo
  por defecto, las variantes que saltan se arreglan en el archivo, no con la mezcla.
- 2026-10-25: las pruebas de audio se quedan viejas cuando el banco crece (dan por hecho que algo no tiene sonido
  propio y ya lo tiene): antes de culpar al código, mira la prueba.
