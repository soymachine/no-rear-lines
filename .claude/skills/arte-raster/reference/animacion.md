# Animación y efectos

El oficio de mover el pixel art: cuántos fotogramas hacen falta, con qué tiempos, y cómo se hacen los disparos, el
humo, el fuego y las explosiones. Qué efecto lleva cada arma y dónde vive cada uno va en `proyecto.md`.

## Las reglas

- **La pose manda.** En un juego táctico se mira a veinte unidades a la vez: cada fotograma suelto tiene que decir qué
  hace la unidad (apunta, corre, cae). Mejor 3 fotogramas claros que 8 suaves que no se distinguen.
- **Los fotogramas, en función del tiempo**: `fotograma = floor(t / duración) % n` (o una tabla de tiempos por
  fotograma), con `t` desde que empezó la acción. Nunca «uno más cada vez que se pinta»: a 30 o a 144 fps tiene que
  verse igual, y la lámina de `captura-anim.mjs` tiene que salir igual cada vez.
- **La simulación dice qué pasa y el dibujo dice cómo se ve.** El dibujo lee los sucesos de la simulación (disparo,
  impacto, explosión, unidad que cae) y arranca la animación con su propio reloj. Si el juego se detiene (un menú), ese reloj se para. La
  simulación nunca espera a que acabe una animación.
- **Azar visual aparte**: chispas, humo y cascotes salen de un `RNG` propio con semilla (la del suceso, por ejemplo
  `strHash(id + ':' + paso)`), nunca de `Math.random` ni del azar de la simulación. Así dos repeticiones se ven igual y
  pintar más o menos fotogramas no cambia la partida.
- **Tiempos con intención**: anticipación corta, acción en 1–2 fotogramas y lo que queda más largo. Un fotograma
  «aguantado» (el fogonazo más brillante, el primer instante de la explosión) se nota más que muchos fotogramas
  intermedios.
- **Que no estorbe.** Lo que dura mucho (humo, polvo) tapa lo que importa: va encima del terreno pero se aparta de las
  unidades (más transparente o más fino justo encima de ellas) y se va antes de que el jugador lo eche de menos.

## Ciclos de las unidades

| Animación | Fotogramas | Por fotograma | Notas |
|---|---|---|---|
| andar | 4–6 | 100–150 ms | el punto de apoyo quieto; los pies se alternan |
| correr | 4 | 80–100 ms | más inclinado; se distingue de andar en un fotograma suelto |
| arrastrarse | 2–4 | 150–200 ms | cuerpo a tierra; avanza poco |
| disparar | 2–3 | fogonazo 40–60 ms | apunta · fogonazo · retroceso; la ráfaga repite fogonazo y retroceso |
| lanzar | 3–4 | 80–120 ms | brazo atrás · arriba · suelta |
| caer | 3–4 | 80–120 ms | acaba en la pose de muerto, que se queda |
| oruga de un carro | 2–3 | según la velocidad | se para cuando el carro se para |

Las transiciones entre posturas (de pie a cuerpo a tierra) pueden ser un solo fotograma intermedio, o ninguno: con un
cambio de silueta claro basta.

## Disparos

Cada disparo tiene tres partes, y cada una se tiene que leer sola:

1. **El fogonazo** en la boca del arma, girado con ella: una forma `glow` de 1–2 fotogramas (40–60 ms). Más grande en
   la primera bala de una ráfaga y más pequeño en las siguientes. Con silenciador o de lejos, apenas nada.
2. **El trayecto**: una trazadora (un trazo de 2–4 px que avanza, más claro en la punta) o nada (el impacto llega
   solo). Velocidad creíble pero visible: una bala de fusil cruza la pantalla en 2–3 fotogramas; un proyectil de
   cañón, en algunos más. Las ametralladoras, con trazadora cada pocas balas, como las de verdad.
3. **El impacto**: tierra que salta (marrones del suelo), chispas en el metal (amarillos), astillas en la madera. Si
   falla, un impacto más flojo en el suelo cerca del blanco: el jugador tiene que ver que le disparan aunque no le den.

- **Una ráfaga**: una bala cada 60–100 ms según el arma. Un disparo normal dura 0,1–0,5 s en pantalla; lo grande
  (cañón, mortero), hasta ~1 s con lo que queda. Más largo estorba en una ráfaga.
- **Se distinguen las armas por el ritmo y el tamaño**, no solo por el color: el fusil, un fogonazo y una pausa; el
  subfusil, fogonazos pequeños y seguidos; la ametralladora, ráfagas largas con trazadoras; el cañón, un fogonazo
  grande, humo y el retroceso del carro.
- **La dirección se lee en las ocho**: mira la lámina en diagonal también.
- **Colores**: cálidos para la pólvora (`#ffe9a0`, `#ffd27a`, `#ffd23f`, `#ff6a3d`); lo que se enfría pasa de blanco a
  amarillo, naranja y rojo. Los colores reservados de `proyecto.md` no se usan para otra cosa.
- **El casquillo** que salta a un lado: 1 px que vuela y desaparece. Solo si se lee y no ensucia.

## Humo

- **Partículas** con posición, velocidad, vida, tamaño y tono. Crecen, suben (o van con el viento) y se aclaran o se
  hacen transparentes al final de su vida.
- **Cada bocanada es un grupo de 3–6 discos solapados** con 2–3 tonos y trama en la costura, no un círculo liso. Los
  discos se pintan una vez en una hoja pequeña (tamaños × tonos) y se copian.
- **Tipos**: el del disparo (poco y corto), el del tubo de escape (gris oscuro, a tirones), el de lo que arde (negro,
  columna que sube), el de las granadas de humo (blanco, denso, que **tapa la vista**: si la simulación dice que tapa,
  el dibujo tiene que decirlo también) y el polvo de un impacto o de un carro (color del suelo).
- **Los límites**: un número máximo de partículas, con las más viejas fuera primero, para que una batalla grande no se
  hunda.

## Fuego

- Llamas de 2–4 fotogramas en bucle (glow con escalones de brillo), con el desfase al azar por llama para que no
  parpadeen todas a la vez. Debajo, brasas que respiran (una ranura `slot` re-teñida). Encima, humo negro.
- Lo que arde se ve de lejos y de noche: si hay noche, el fuego ilumina a su alrededor (un tinte suave, no un círculo
  duro).

## Explosiones

Por orden, todo en menos de un segundo salvo lo que queda:
1. **Destello**: 1–2 fotogramas casi blancos, del tamaño del radio de daño o algo menor.
2. **Bola de fuego**: 2–3 fotogramas que crecen y pasan de amarillo a naranja y rojo.
3. **Tierra y cascotes** que saltan en arco (con su sombra en el suelo) y caen. Lo que queda posado sale del mismo plano
   determinista que lo que vuela (ver «Lo aprendido» de la skill).
4. **Humo y polvo** que se quedan unos segundos.
5. **El cráter o la mancha quemada** en el suelo, que se queda para siempre: una calcomanía sobre la baldosa (en la
   capa de marcas del terreno, no en la baldosa).

- **El tamaño cuenta la amenaza**: una granada, un mortero y una bomba de avión se distinguen por el tamaño del
  destello y por lo que dura el humo. El radio que se ve tiene que parecerse al radio que hace daño.
- **El temblor de pantalla**, solo para lo grande y cerca de la cámara, de 1–3 px y breve. Que se pueda quitar en los
  ajustes.

## Verlo: la lámina de fotogramas

```sh
node .claude/skills/arte-raster/scripts/captura-anim.mjs <id[,id…]> <scratch>/anim [--dirs 8] [--cada 40] [--dur 900] [--op '{"acierta":false}']
```

La lámina saca una fila por dirección y una columna cada `--cada` ms, cada fotograma con su tiempo. Mírala con Read:
- ¿cuándo sale el fogonazo?;
- ¿la trazadora se ve en el camino o solo llega?;
- ¿el ciclo cierra sin salto?;
- ¿el punto de apoyo se queda quieto?;
- ¿qué queda al final y cuánto dura?

Para comparar antes y después, saca la lámina antes de tocar y después, y júntalas con `compara.py`.
