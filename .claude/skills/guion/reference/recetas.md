# Recetas

Antes de cualquiera:
- `git pull --no-rebase origin <rama actual>`;
- lee lo que hay alrededor del texto y dónde sale en pantalla.

Después de cualquiera:
- la comprobación de paridad del inglés (cuando exista) sin faltas nuevas;
- `eslint --quiet js tools`;
- la prueba de la zona.

## Retocar un texto

1. Busca la frase: `grep -rn -F "<un trozo>" js --include=*.js`. Saldrá en su sitio y, si se traduce por el texto, en
   su tabla inglesa.
2. Cambia el español.
3. Cambia su inglés (y su clave, si la clave es el propio español, letra a letra).
4. Si la frase sale en otro sitio (una prueba de `tests/`, otra pantalla), cámbiala allí o comprueba que no hace falta:
   `grep -rn -F "<la frase vieja>" js tests`.

## Añadir los gritos de una situación

1. La situación tiene que existir en la simulación (la decide el tactical-ai): si no existe, pídesela.
2. 3–6 variantes por situación, de 1–5 palabras, en los dos idiomas. Que no se parezcan entre sí en la primera palabra.
3. Si hay voces grabadas, avisa al sound-designer: el texto y la voz tienen que casar.

## Nombres de unidades y soldados

- Listas por país y época, con nombres y apellidos que existieran, sin personas reales conocidas.
- Sin repetir dentro de un bando en la misma batalla.
- Si los nombres salen del azar, del `RNG` con semilla de la partida: el mismo soldado se llama igual en la repetición.

## Traducir lo nuevo

1. La comprobación de paridad da la lista de lo que falta con `archivo:línea`.
2. Cada frase va a su tabla, con el inglés según `traduccion.md`.
3. Si un texto nuevo es una plantilla, el inglés lleva los mismos huecos.

## Una nota de prueba de tipo «texto»

Las notas de `notas/notas.md` de tipo `texto` son tuyas. Se trabajan y se cierran como dice CLAUDE.md, en el mismo
commit que el cambio.
