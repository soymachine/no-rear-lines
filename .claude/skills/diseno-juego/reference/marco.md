# Preguntas de diseño y cómo responderlas

Cada área: las preguntas que se hace un diseñador y la señal que las responde, sacada del registro de una partida
simulada (cuando haya bot) o de una partida mirada. Una señal fuera de rango no es un hallazgo todavía: hay que mirar el
porqué en el registro y en el código. Qué deja el registro de este juego y cómo se lee va en `proyecto.md`.

## El combate
- ¿Suprimir sirve? → tiempo que pasa una escuadra suprimida frente a la que no; su puntería y sus bajas causadas en ese
  tiempo. Si un suprimido dispara casi igual, la supresión no es una mecánica.
- ¿Moverse bajo fuego se paga? → bajas por escuadra que cruza terreno abierto con y sin apoyo de fuego o humo.
- ¿Las bajas se ven venir? → los segundos antes de cada baja: ¿hubo aviso (fuego que se oye, enemigo a la vista,
  silbido)? ¿Cuánto pasa del primer contacto a la primera baja?
- ¿Cada arma hace su papel? → bajas y supresión causadas por tipo de arma, por distancia.

## La batalla
- ¿Cuánto dura y cómo acaba? → duración, por qué acaba (objetivos, rendición, tiempo) y con qué bajas.
- ¿Cuándo es el primer contacto? → segundos desde el despliegue. Muy pronto, no hay maniobra; muy tarde, aburre.
- ¿Se decide pronto? → la diferencia de fuerzas o de moral a los 2, 5 y 10 minutos: si a los 2 ya se sabe quién gana,
  el resto sobra.
- ¿Se usan todos los objetivos y todo el mapa? → por dónde pasan las unidades (mapa de calor) y dónde mueren.

## Dificultad y equilibrio
- Victoria por bando y por mapa, con muchas semillas. Un bando que gana el 90 % con el mismo bot es un desequilibrio
  (o un mapa que lo favorece: compáralo en otro mapa).
- Por unidad: coste frente a bajas causadas y supervivencia. Una unidad que lo gana todo, o que nunca sirve.
- Los carros: cuánto duran frente a infantería con y sin antitanque; cuántas bajas hacen.

## Moral y obediencia
- ¿Cuántas órdenes se obedecen, se cumplen a medias o se rechazan, y por qué? → el registro de órdenes con el estado de
  cada soldado al recibirlas. Si se rechazan muchas sin supresión ni miedo visibles, algo falla.
- ¿La moral se recupera? → tiempo de un soldado acobardado hasta volver a estar en condiciones, a cubierto y al
  descubierto, con y sin mando cerca.
- ¿El pánico contagia demasiado? → cadenas de escuadras que se rompen una tras otra.
- ¿Se ve? → en la captura de un momento con órdenes rechazadas, ¿se entiende por qué?

## Claridad
- Errores de página y de la simulación: cualquier excepción es un error.
- Capturas de los momentos clave: ¿se ve quién está suprimido, qué ve cada unidad, de dónde viene el fuego? ¿Hay
  textos cortados o cifras raras (`NaN`, `undefined`, negativos)?

## Robustez (errores)
- Invariantes rotos: posiciones fuera del mapa, soldados dentro de un muro, munición o salud negativas, una unidad
  muerta que sigue disparando, ids repetidos, estado que no se puede guardar.
- Determinismo: la misma semilla y las mismas órdenes, ¿dan la misma huella? Si no, algo usa azar o tiempo de fuera.
- Batallas que no acaban o que se cuelgan.
