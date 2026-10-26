# Visión, supresión, moral, obediencia y coordinación

Las cifras de esta página son **puntos de partida** para razonar, no las del juego. Las del juego están en los datos y
se apuntan en `proyecto.md`.

## Visión y detección

- **Línea de visión** con `js/sim/fov.js` (sombreado recursivo por octantes). Las baldosas son cuadradas: `computeFOV`
  ya usa `k = 1` por defecto, pero `viewDist` (que acepta `k`) y `clampView` (que no) usan `VIEW_K` (1,8), que venía
  de un juego con casillas más altas que anchas. Cuando la simulación los use, `VIEW_K` pasa a 1 (con el code-expert).
- **Tapar a medias**: un seto bajo, un trigal o el humo no son opacos o transparentes, sino una **densidad**. La vista
  que cruza varias casillas así se va perdiendo, y a quien está tumbado detrás no se le ve.
- **La altura** cambia la vista: desde una loma se ve por encima de lo bajo; tras la cresta hay una zona muerta.
- **Ver no es detectar.** Un enemigo en la línea de visión no se descubre al instante: la detección **se acumula** con
  el tiempo, más deprisa si está cerca, de pie, moviéndose o disparando (el fogonazo delata), y más despacio si está
  tumbado, quieto o entre la vegetación. Un carro se oye antes de verse.
- **Contactos**: lo detectado pasa a ser un contacto del bando, con su última posición conocida, qué es (si se sabe) y
  su edad. Se comparte con la escuadra enseguida y con el resto del bando con retraso. Un contacto que no se vuelve a
  ver envejece y se olvida.

## Supresión

La supresión es **el miedo inmediato a las balas**, aparte del daño. Es la mecánica que hace funcionar el fuego y
movimiento.

- **Se acumula** con cada disparo que pasa cerca o impacta cerca de un soldado (un *casi*), aunque no le dé y aunque no
  vea al tirador: `supresión += k_arma × (1 − d / r_arma) × (cubierto ? 0,5 : 1)`.
  - Las ametralladoras tienen `k` alto. Los fusiles, bajo.
  - Los morteros y la artillería tienen `k` muy alto y un radio grande.
  - Un disparo de carro cerca, aún más.
- **Se va sola**: decae exponencialmente (vida media de pocos segundos), más deprisa a cubierto y con mando cerca.
- **Lo que hace**, por umbrales (con histéresis):
  - con poca, peor puntería;
  - con bastante, no avanza: se tumba o se queda en su cobertura;
  - con mucha, **fijado**: no se mueve ni devuelve el fuego (salvo a la desesperada), y pone a prueba su moral.
- **El fuego de supresión** es una orden: disparar a una zona (la última posición de un contacto, un seto sospechoso)
  sin ver a nadie. Gasta munición y suprime aunque no mate.

## Moral

- **De cada soldado**: un valor (0–100) con estados y **histéresis**:
  - **en forma**;
  - **nervioso**: peor puntería y obedece peor;
  - **acobardado**: no avanza;
  - **en pánico**: huye o se queda paralizado;
  - **roto**: se rinde o abandona el mapa;
  - y, rara vez, **heroico**: aguanta y contraataca.
- **Lo que la baja**:
  - bajas en su escuadra, sobre todo cerca;
  - una explosión cerca;
  - estar fijado mucho rato;
  - que le disparen por el flanco o por detrás;
  - **un carro enemigo cerca sin armas antitanque en la escuadra** (el miedo al carro);
  - perder al jefe;
  - quedarse solo.
- **Lo que la sube**:
  - el tiempo a cubierto sin fuego;
  - tener al jefe cerca (y su liderazgo);
  - la experiencia;
  - causar bajas;
  - tomar un objetivo;
  - tener carros propios cerca.
- **Contagio**: el pánico de uno baja la moral de los que están cerca, en proporción a la distancia y al vínculo (su
  escuadra más que otra). Con tope, o una escuadra rota rompe a todo el bando en cadena.
- **La escuadra tiene su moral**: la media de sus soldados, pesada por su jefe. Es la que se enseña al jugador.

## Reacción al fuego

En orden de prioridad, cada vez que algo le pasa al soldado (con temporizadores para que no cambie a cada paso):
1. **Una granada o un proyectil que va a caer al lado**: apartarse o tirarse al suelo, ya.
2. **Mucha supresión**: tumbarse en su sitio si tiene cobertura. Si no la tiene, arrastrarse a la cobertura más
   cercana **que quede entre él y la amenaza**: la cobertura es direccional (un muro cubre por un lado, no por el otro).
3. **Ve al tirador y no está fijado**: devolver el fuego. Si no lo ve, fuego de supresión hacia la última posición
   conocida, si su arma sirve para eso.
4. **Avisar**: el contacto pasa a la escuadra (y el soldado lo grita).
5. **Seguir con la orden** cuando la supresión baja.

## Obediencia filtrada por la moral

Es el corazón del género: el jugador manda, y cada soldado decide si puede.

- Al recibir una orden, cada soldado calcula su **disposición** a partir de:
  - su estado de moral;
  - su supresión;
  - si tiene al jefe cerca;
  - si tiene cobertura a mano;
  - el **riesgo de la orden**: avanzar por campo abierto es más que moverse a una cobertura, y eso más que retirarse
    o esconderse.
- **El resultado**, con el `RNG` de la simulación:
  - **obedece**;
  - **obedece tarde**: unos segundos de duda;
  - **a medias**: va, pero se para en la primera cobertura;
  - **se niega**: se queda y lo dice, con su motivo;
  - **hace lo suyo**: en pánico, huye.
- **Reglas de sentido común**:
  - retirarse y esconderse casi siempre se obedecen;
  - la desobediencia está en avanzar y asaltar;
  - una escuadra en forma y sin supresión obedece siempre o casi (más del 95 %).

  Si el jugador ve negarse a una escuadra sin un motivo visible, el juego parece roto.
- **Siempre con motivo**: la respuesta de la escuadra («¡Nos están machacando!») y el icono salen del motivo de la
  decisión, no de un texto al azar.

## Puntería

- **Probabilidad de impacto** = base del arma a esa distancia × lo que le resta al tirador × lo que le resta al blanco:
  - al tirador: su supresión, si se mueve, su postura, su experiencia y su fatiga;
  - al blanco: lo que se le ve (postura, vegetación) y su cobertura **desde ese lado**.
- **Fuego apuntado frente a fuego de supresión**: el apuntado busca la baja; el de supresión gasta munición en una zona
  y suprime. Las ametralladoras disparan ráfagas: cada bala tira, o la ráfaga se resuelve por tandas con su dispersión.
- Cada tirada, del `RNG` de la simulación, y cada disparo emite su suceso (para el dibujo y el sonido), acierte o no.

## Coordinación de escuadra

El jefe de escuadra (la IA de la escuadra), cada poco:
1. **Mira**: contactos, supresión y moral de los suyos, la orden y el terreno.
2. **Elige la maniobra**:
   - **mantener y devolver el fuego**;
   - **fuego y movimiento**: una parte (la ametralladora) fija al enemigo mientras la otra se mueve a cubierto hacia el
     flanco;
   - **avance por saltos**: un equipo avanza mientras el otro cubre, y se turnan;
   - **asaltar**: solo si el enemigo está suprimido y cerca;
   - **retirarse** por la ruta cubierta.
3. **Reparte el fuego**: al contacto más peligroso primero (la ametralladora que los fija; el antitanque si hay un
   carro propio cerca), sin que todos disparen al mismo mientras otro les flanquea.
4. **Pide apoyo** si lo hay (mortero, artillería, humo) y mira la munición.
5. **Dice lo que hace**: la maniobra y su motivo quedan para la interfaz y la depuración.

Las órdenes del jefe tardan en llegar a los suyos (más si están lejos o sin radio). Fuera del radio de mando, cada
soldado actúa por su cuenta con su reacción al fuego.
