# Plantilla del informe de playtest

El informe va en `informes/playtest/AAAA-MM-DD-HHMM.md` (hora de Madrid) y se registra en
`informes/playtest/index.json`. Español, frases cortas, cada hallazgo con su `archivo:línea`.

Cada hallazgo lleva un id estable dentro del informe: `E1, E2…` (errores), `I1…` (inconsistencias), `M1…` (mejoras).
Si un hallazgo ya salió en un informe anterior, se dice («repetido desde 2026-10-20 · E2») en lugar de contarlo como
nuevo; si un informe anterior señalaba algo que ya no pasa, va en «Arreglado desde el último informe».

```markdown
# Playtest · AAAA-MM-DD · vX.Y.Z

> Una o dos frases: lo más importante (el error más grave, la tendencia más clara).

## Cómo se ha jugado

- Las batallas: mapa, bandos, quién jugaba cada bando (bot, persona), semillas, cuántas · versión del juego · duración
  real.
- El comando, para repetirlo.
- Qué se ha mirado a mano además (capturas, repeticiones, pruebas de `tests/`, código).

## Resumen

| | Nuevos | Repetidos |
|---|---|---|
| Errores | n | n |
| Inconsistencias | n | n |
| Mejoras | n | — |

Métricas clave frente al informe anterior: victorias por bando, duración, bajas por bando, órdenes obedecidas, primer
contacto, errores.

## Errores

### E1 · Título corto · gravedad alta|media|baja · nuevo|repetido desde …
- **Qué pasa**: lo observado, con cifras.
- **Cómo se reproduce**: mapa, semilla, órdenes, segundo de la batalla; o el script mínimo.
- **Dónde**: `js/…:línea` y por qué ese código lo produce.
- **Arreglo propuesto**: concreto.

## Inconsistencias de juego

### I1 · Título · nuevo|repetido
- **Qué choca con qué**: las dos partes (texto frente a regla, sistema frente a sistema, cifra frente a cifra).
- **Dónde**: `archivo:línea` de cada parte.
- **Propuesta**: cuál de las dos debería mandar y el cambio.

## Mejoras y sugerencias

### M1 · Título · área (combate, batalla, equilibrio, moral, claridad, campaña, fricción) · impacto alto|medio|bajo
- **Lo observado**: la situación y las cifras.
- **El problema de diseño**: qué decisión falta, qué domina, qué frustra o aburre.
- **Propuesta**: el cambio (la cifra y dónde, o la regla), con su riesgo.
- **Cómo comprobarlo**: qué partida o métrica diría si ha funcionado.

## Arreglado desde el último informe

- (hallazgos anteriores que ya no se reproducen)

## Limitaciones

- Lo que no se ha podido probar y por qué, y si conviene ampliar el bot.

## Métricas

(la salida del análisis de las partidas)
```

Y la entrada en `index.json` (el más nuevo primero; el archivo es una lista JSON):

```json
{ "file": "2026-10-24-0200.md", "date": "2026-10-24T02:00", "version": "0.1.0", "batallas": 12,
  "titular": "…", "errores": 2, "inconsistencias": 3, "mejoras": 6,
  "hallazgos": [{ "id": "E1", "tipo": "error", "gravedad": "alta", "titulo": "…", "donde": "js/…:123", "nuevo": true }],
  "metricas": { "victorias_a": 58, "duracion_s": 640, "bajas_a": 9, "bajas_b": 14, "obedecidas": 81, "errores_pagina": 0 } }
```

`hallazgos[].tipo` es `error`, `inconsistencia` o `mejora`. Los errores llevan `gravedad` y las mejoras `impacto`, con
los valores `alta`, `media` o `baja`. Las métricas se fijan cuando haya bot. Que sean siempre las mismas de un informe
a otro, para poder compararlas.
