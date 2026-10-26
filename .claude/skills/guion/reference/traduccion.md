# Traducción al inglés

El mecanismo (cómo busca el juego el inglés de cada texto) va en `proyecto.md` cuando exista. Aquí, el oficio.

## Un mecanismo que funcionó

Si el juego traduce **por el propio texto español** (una función `tx('Texto en español {x}', { x })` que busca el
español tal cual en una tabla «español → inglés»), hay que saber dos cosas:
- **cambiar una coma de una frase española la deja sin inglés** hasta que se cambia también su clave en la tabla. La
  comprobación de paridad lo detecta;
- **una clave, un inglés**: si el mismo español significa dos cosas en dos pantallas, se separa la clave (con un hueco
  vacío, con una clave propia o con otro español), no con dos entradas en dos tablas.

Si el juego traduce por claves (`t('orden.mover')`), la regla es la misma al revés: cada clave, su texto en los dos
idiomas, y una prueba que lo compruebe.

## El estilo

- **Inglés británico o estadounidense**: es una decisión del proyecto; se apunta aquí y no se mezclan. Las
  abreviaturas y las fechas siguen esa decisión.
- **Comillas y apóstrofo tipográficos**: “…” por fuera, ‘…’ por dentro, y ’. Las «…» del español pasan a “…”.
- **Mayúsculas**: las órdenes y los botones siguen en MAYÚSCULAS si en español lo están; los títulos de batalla y de
  campaña, en *Title Case*.
- **Rangos, unidades y armas**: los nombres de cada ejército en su forma inglesa corriente (Sergeant, Corporal,
  Lieutenant; *platoon*, *squad*, *section* según el ejército). Los términos de otros ejércitos, como se conocen en
  inglés (Panzergrenadier, Feldwebel), sin traducirlos si así se conocen.
- **Los gritos** suenan a soldado de habla inglesa, no a traducción: cortos, con el registro del original.
- **Frases cortas**, tan secas como el original. No se explica lo que el español deja sin decir.

## Glosario

Lo que se fije aquí vale para todo el juego. Se añade cada término cuando se decide.

| Español | Inglés |
|---|---|
| (vacío por ahora) | |
