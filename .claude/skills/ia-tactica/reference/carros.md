# Carros

Un carro es una unidad con dos rumbos, blindaje que depende del lado, poca vista y mucho ruido. Asusta a la infantería
y la necesita para no morir.

## Estado

- **Posición** y **rumbo del casco**, con su velocidad de giro (grados por segundo). Los de orugas giran sobre sí mismos
  (más despacio en terreno blando); los de ruedas necesitan radio.
- **Rumbo de la torreta**, guardado relativo al casco o absoluto (decídelo una vez y no lo mezcles), con su propia
  velocidad de giro, a menudo lenta. Algunos carros y cazacarros no tienen torreta: apuntan girando el casco.
- **Velocidad** por baldosa y marcha atrás (más lenta). Atascarse en el barro o en un seto alto puede ser una tirada
  del `RNG`.
- **Daños por componente**: motor u orugas (inmóvil), torreta atascada, cañón, óptica, tripulación herida (lo hace
  todo peor) y munición (arde o explota).
- **La moral de la tripulación**: un carro con impactos que no penetran se pone nervioso; con la tripulación rota, la
  tripulación **abandona el carro** (sale a pie y el carro queda vacío).
- Los dos rumbos se interpolan en el dibujo por el camino corto. El dibujo tiene casco y torreta en hojas separadas.

## Blindaje por lados

- **El lado del impacto** sale del ángulo entre el rumbo del casco (o de la torreta, si da en ella) y la dirección
  desde la que llega el disparo: frente, flanco y trasera, con sus sectores (por ejemplo, frente ±45°). Desde arriba
  (artillería, aviones), el techo.
- **Espesor efectivo** = espesor / cos θ, con θ el ángulo con la normal de la placa. Pasado un ángulo (70–75°), el
  proyectil rebota.
- **Penetración** del arma y su munición frente a la distancia (una tabla del arma: perforante, explosiva, carga hueca).
  Si la penetración supera el espesor efectivo, penetra y tira qué componente daña; si no, no penetra, pero asusta.
- **La explosiva** contra carros solo hace daño a lo blando (orugas, óptica, tripulación asomada). **El perforante**
  contra infantería casi no sirve.

## Cómo se mueve un carro con cabeza

- **El frente hacia la amenaza mayor**: un carro con contactos gira el casco hacia el más peligroso y retrocede en vez
  de dar la vuelta si tiene que alejarse.
- **Casco oculto**: tras una cresta o un muro, con solo la torreta asomando, si el mapa tiene altura.
- **Nunca solo cerca de lo que no ve**: bosques, pueblos y setos son donde la infantería antitanque lo espera. Sin
  escolta, entra despacio o no entra.
- **Los caminos lo canalizan**: el mapa lo sabe (`mapas`) y la IA del bando contrario también: ahí embosca.
- **Lo que aplasta y lo que no**: vallas y setos bajos, sí; muros, casas y bosque denso, no. Un carro destruido es
  obstáculo y cobertura.

## Vista y ruido

- **Escotillas cerradas**: vista estrecha y corta, sobre todo hacia los lados, detrás y muy cerca. Un soldado pegado
  al carro puede no verse.
- **Comandante asomado**: ve mucho más, pero se le puede matar. Se cierra cuando le disparan (la supresión del
  comandante es la del carro).
- **Ruido**: el motor y las cadenas se oyen de lejos. La infantería enemiga sabe que viene un carro antes de verlo, lo
  que alimenta su miedo. El sonido avisa también al jugador (`sonido`).

## Elegir blanco y arma

- **Armas**:
  - el cañón (perforante o explosiva, según el blanco);
  - la ametralladora coaxial, que apunta con la torreta;
  - la del casco, solo hacia delante;
  - la del techo, si la hay y el comandante está asomado.
- **Prioridad**:
  1. lo que puede matarlo (otro carro, un cañón antitanque, infantería antitanque cerca);
  2. lo que fija a su infantería (una ametralladora);
  3. lo demás.

  Al blanco más peligroso aunque esté más lejos.
- **La torreta tiene que llegar**: si el blanco está detrás y la torreta es lenta, quizá conviene girar el casco. El
  tiempo hasta poder disparar entra en la puntuación del blanco.
- **La munición se cuenta**: sin perforantes, un carro frente a otro carro se retira.

## Carros e infantería

- **El miedo al carro**: la infantería sin armas antitanque cerca de un carro enemigo pierde moral, más cuanto más
  cerca. Con un antitanque en la escuadra, mucho menos.
- **La infantería antitanque** busca el flanco y la trasera, de cerca y a cubierto, y espera a que el carro pase.
- **El carro protege y se deja proteger**: escolta a la infantería con su fuego y la infantería le limpia de
  antitanques el bosque y el pueblo. Una escuadra con un carro asignado avanza con él, a su lado o detrás, nunca
  delante de su cañón.
