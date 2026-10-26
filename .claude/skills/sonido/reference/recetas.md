# Recetas de sonido

En todas: mide antes y después (`scripts/mide-sonido.mjs … --json antes.json`, luego `--antes antes.json`) y deja
las salidas fuera del repo. Dónde va cada cosa en este proyecto lo dice `proyecto.md`.

## Añadir grabaciones a una clave

1. Comprueba la licencia y apúntala en el archivo de créditos.
2. Formato: efectos MP3 mono 128 kbps, 44,1 kHz, pico a −1 dBFS y sin silencio delante; ambientes MP3 estéreo
   160 kbps en bucle sin costura. Con ffmpeg (aquí lo hay; en el ordenador del usuario, quizá no):
   - efecto: `ffmpeg -i in.wav -af "silenceremove=start_periods=1:start_threshold=-60dB,loudnorm=I=-16:TP=-1" -ac 1 -b:a 128k out.mp3`
     (o recorta y normaliza el pico a mano: lo que manda es el pico a −1 dB);
   - ambiente: `ffmpeg -i in.wav -ac 2 -b:a 160k out.mp3`, con el bucle ya cerrado en el original.
3. Ponlo en la carpeta de su clave y rehaz el índice del banco.
4. `mide-sonido.mjs <clave>`: la clave tiene sus variantes, sin avisos, y con el nivel en el juego parecido entre ellas
   y al de sus vecinas.

## Retocar el volumen de una clave (la mezcla)

- Por clave, en la tabla de mezcla; por tipo, el volumen del tipo (cambia todas las claves de ese tipo sin volumen
  propio).
- Decide con cifras: `mide-sonido.mjs shot step impact explosion` y compara el «en juego». Referencias razonables:
  - los pasos, 10–15 dB por debajo de los disparos;
  - la explosión, lo más fuerte;
  - las variantes de una clave, a menos de 6 dB entre sí;
  - los gritos, por encima de los disparos propios y por debajo de lo que amenaza.
- Una variante que salta (más fuerte o más floja que sus hermanas) se arregla en el archivo, no con la mezcla.

## El sonido de un arma

1. Con qué suena hoy: su clave, la que resuelve el banco y su síntesis de reserva.
2. Opciones, de menos a más:
   - otra clave de las que hay (otro tipo de arma);
   - un sonido propio: archivos en la clave del arma (`shot.<tipo>.<arma>`);
   - una síntesis propia, si no hay grabación que valga.
3. Que case con la animación: el disparo suena cuando sale el fogonazo; si el golpe llega tarde, un retardo en su
   clave. Que suene distinta de las de su clase: compara brillo y bandas con `mide-sonido.mjs`.
4. Si el arma necesita otra animación, pídesela al pixel-artist.

## El ambiente de un mapa

1. Qué suena hoy: el ambiente del mapa, sus capas (clima, combate lejano, noche) y los emisores de sus baldosas.
2. Para que un mapa suene propio sin tocar código: grabaciones en su clave de ambiente (`amb.<mapa>`, y `.noche`).
3. Comprueba la costura, el nivel al cerrar el bucle y que no sea todo siseo en las bandas.

## Una clave nueva que el juego pida

1. Llámala desde el código con el patrón de siempre: si el banco la tiene, suena; si no, la síntesis de reserva (o
   nada, si sin grabación no debe sonar).
2. Añádela a la lista de claves que el juego pide, en su grupo y con un comentario de qué es.
