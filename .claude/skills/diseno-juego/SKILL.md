---
name: diseno-juego
description: Criterio de diseñador de juegos para Sin Retaguardia, un juego táctico en tiempo real con pausa al estilo de Close Combat (Segunda Guerra Mundial, guerrillas, carros y bombardeos pequeños). Cómo analizar el bucle de la batalla y de la campaña, la dificultad, el equilibrio entre bandos, armas y unidades, la moral, la supresión y la obediencia como mecánicas, el ritmo y la claridad (que se lea lo que pasa); cómo leer una partida simulada sin engañarse; y cómo convertir lo observado en hallazgos accionables (errores, inconsistencias y mejoras) con la plantilla del informe de playtest. Úsala al revisar mecánicas, equilibrio o ritmo, al leer una partida simulada o al escribir el informe de playtest.
---

# Diseño de juego

El juego es una **batalla táctica en tiempo real con pausa**: el jugador manda escuadras y carros, no soldados uno a
uno. Cada soldado decide lo suyo (cubrirse, devolver el fuego, no avanzar) según su moral y lo que le está pasando. Lo
que importa al revisarlo no es «qué me gustaría», sino **qué hace el jugador, qué siente y qué decisiones toma**,
medido cuando se pueda.

- `reference/marco.md`: las preguntas de diseño por área (bucle, dificultad, equilibrio, moral y obediencia, claridad,
  robustez) y las señales numéricas que las responden.
- `reference/informe.md`: la plantilla del informe de playtest y su entrada en el índice.
- `reference/proyecto.md`: **el mapa de este proyecto**: dónde vive cada sistema y cada cifra, para citar
  `archivo:línea`. Si está vacío, aún no hay juego.

## Los bucles (y dónde se rompen)

1. **El bucle corto, el combate (segundos)**: ver → disparar o suprimir → moverse a cubierto → flanquear o asaltar. Un
   ciclo de *fuego y movimiento*: una parte fija al enemigo con fuego mientras otra se mueve. Funciona si suprimir
   sirve de verdad (el suprimido no dispara bien ni avanza) y si moverse al descubierto bajo fuego se paga. Se rompe
   cuando una opción domina (el asalto de frente siempre sale bien, el carro lo gana solo), cuando las bajas llegan
   sin aviso o cuando el jugador no entiende qué ha pasado.
2. **El bucle medio, la batalla (minutos)**: desplegar → explorar → primer contacto → lucha por los objetivos →
   contraataque → resultado. Funciona si hay decisiones de maniobra (por dónde, cuándo, con qué) y la tensión sube.
   Se rompe con batallas que se deciden en el despliegue, que se estancan o que acaban siempre igual.
3. **El bucle largo, la campaña (horas)**: entre batallas, la tropa que sobrevive, su experiencia, los refuerzos, el
   material. Funciona si perder gente duele y ganar cuesta, y si cada batalla deja algo que decidir para la
   siguiente.

## Lo propio del género

- **La obediencia filtrada por la moral es el corazón.** Que una escuadra a veces no haga lo que le pides es lo que
  hace al género, pero tiene que tener **una causa visible** (está suprimida, ha perdido al cabo, está aterrada por
  un carro) y no puede ser la norma. Si el jugador lo vive como azar o como fallo del juego, es un hallazgo.
- **Que se lea lo que pasa.** Quién está suprimido, qué ve cada uno, de dónde viene el fuego, por qué alguien no
  obedece y qué tapa el terreno. El jugador debe poder explicar por qué ganó o perdió. En pixel art depende tanto del
  dibujo como de las reglas.
- **La pausa no es trampa**: el juego tiene que ser jugable sin pausa en lo pequeño y pedir pausa para lo grande. Si
  solo se puede jugar pausando cada segundo, el ritmo está mal.
- **Armas y unidades con un papel**: la ametralladora suprime y fija, el fusilero maniobra, el subfusil limpia de
  cerca, el antitanque caza carros, el carro rompe y da miedo, el mortero saca de la cobertura. Si una lo hace todo o
  una no sirve para nada, es un hallazgo.
- **El terreno decide**: cobertura, vista y terreno para carros pesan más que la cifra de un arma. Antes de culpar al
  equilibrio de una unidad, mira el mapa.

## Cómo trabaja un buen diseñador aquí

- **Del síntoma a la causa**: «los ataques siempre fracasan» no es un hallazgo. Esto sí: «el 80 % de las escuadras
  que cruzan el campo de la granja quedan suprimidas en los primeros 10 s, porque la MG del molino ve todo el campo y
  no hay zona muerta en 200 m». Busca la cifra en el código y cítala.
- **Separa** siempre:
  - *error*: el código no hace lo que dice;
  - *inconsistencia*: dos partes del juego se contradicen. Un texto frente a una regla, un sistema que anula a otro
    o una cifra que no encaja con su vecina;
  - *mejora*: funciona y es coherente, pero el juego sería mejor de otra forma.
- **Cada propuesta, con su precio**: qué cambia, qué número tocar (y dónde), qué riesgo tiene y cómo se comprobaría con
  otra partida. Prefiere tocar una cifra a añadir un sistema.
- **Respeta la intención**: lee el comentario o el plan del sistema antes de proponer cambiarlo. Si algo es deliberado
  (que las bajas duelan, que un carro asuste), la propuesta discute el grado, no la idea.
- **Prioriza** por impacto en la experiencia: lo que rompe la batalla o los primeros minutos va antes que el detalle
  de un sistema tardío.
- **Sin humo**: nada de «mejorar la experiencia del usuario» en abstracto. Situación concreta → problema → propuesta.

## El oficio, en corto

- **Riesgo y recompensa**: avanzar al descubierto tiene que poder pagar (llegar antes al objetivo, flanquear) y poder
  costar caro. El riesgo tiene que ser legible: se ve qué enemigo cubre qué campo.
- **Curva de dificultad**: escalones claros, con batallas para dominar cada cosa nueva. Un muro (todo muere) o un llano
  (nada amenaza) son señales.
- **Agencia e información**: lo que mata tiene que haberse visto venir (fuego que se oye, un carro que se ve, el silbido
  de la artillería) o ser evitable con preparación (explorar, humo, mantenerse a cubierto).
- **Asimetría con sentido**: bandos distintos (la guerrilla con poco material y mucho terreno, el ejército regular con
  carros y artillería) pueden estar equilibrados sin ser iguales, si cada uno tiene su manera de ganar.
- **Variedad con sentido**: un mapa, un clima o una unidad nueva valen si cambian decisiones, no solo el aspecto.
- **La primera batalla**: cada sistema se presenta cuando hace falta, y se puede ganar entendiendo por qué.
- **Fricción**: microgestión repetida que no aporta decisión (ordenar a cada soldado que se tumbe) es candidata a
  automatizarse: eso ya lo deciden ellos.

## Leer una partida simulada sin engañarse

- **El bot no es un jugador.** Sus reglas son sencillas. Si pierde mucho, mira primero qué hizo: ¿perdió por el juego
  (una posición imposible, una cifra desproporcionada) o por el bot (se quedó quieto, avanzó por campo abierto sin
  apoyo)? Lo segundo va a «Limitaciones», no a dificultad.
- **Compara partidas, no momentos sueltos.** Con la simulación determinista, la misma semilla y las mismas órdenes dan
  la misma batalla: para una regresión, la misma semilla que el informe anterior; para una conclusión de equilibrio,
  muchas semillas y los dos bandos.
- **Lo que sí mide bien**: que todo funcione sin errores, que la batalla acabe, cuánto dura, cómo evolucionan las bajas
  y la moral de cada bando, qué unidades hacen las bajas y cuáles mueren, cuántas órdenes se obedecen y por qué no.
- **Las tácticas, forzadas**: para comparar dos maneras de jugar (asalto frente a flanqueo), varias partidas con la
  misma semilla y la táctica forzada, no una partida mixta.
