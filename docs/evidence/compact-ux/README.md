# UX compacta V8 — 29/10/2026

Base: `7bc0cb1`. Aplicación real V4, sin importar el motor ni el mapa de la demo V2. No se modifican `rules-v4.js`, `battle.js`, `engine.js`, `data.js` ni `map.js`.

## Evidencia inspeccionada

| Vista | Captura | Vídeo |
| --- | --- | --- |
| Escritorio 1440×900 | [Batalla](battle-1440.png) | [Escena y comprobaciones](compact-1440.webm) |
| Horizontal 844×390 | [Batalla](battle-844.png) | [Escena y comprobaciones](compact-844.webm) |
| Horizontal estrecho 667×375 | [Batalla](battle-667.png) | [Escena y comprobaciones](compact-667.webm) |
| Vertical 390×844 | [Batalla](battle-390.png) | [Escena y comprobaciones](compact-390.webm) |

Los vídeos usan eventos de combate del motor con fixtures explícitos y velocidad rápida. No representan partidas completas. Los E2E independientes sí recorren partidas por interfaz, con semilla y temporizadores acelerados, sin inyectar cambios de estado.

## Resultado de QA

- 337 tests Node pasan; sintaxis y revisión de diff correctas.
- Navegador: arranque, combate, misiles, decisiones, movimientos y UI móvil; V3/V4, humanos/CPU, dos clientes de escritorio y táctiles con transporte local.
- Cuatro partidas completas: V3 hasta victoria de Libertos en ronda 12/121 acciones, y V4 de cuatro jugadores hasta Libertos en ronda 4/48 acciones; escritorio y 844×390.
- Ocho escenas de sorteo/desempate, batalla, misil y mantenimiento; disparos en ambas direcciones, degradaciones y callback único. Casos adicionales de intercepción, cadena nuclear, cancelación/visibilidad y omisión sin saltar la elección de bases.
- La nueva matriz verifica caras SVG con un solo texto, animaciones 2D, detalle cerrado por defecto, ningún selector de modo en escena, herencia de preferencia, reducción de movimiento y disparos de 520 ms (antes 600, −13%).
- Supervivientes conservan nodos, visibilidad y posiciones entre rondas/degradaciones. Ejércitos grandes: hasta 18 representantes, contadores exactos de 400 unidades por bando en la prueba. Dados y figuras no se solapan.
- [Comparación del mapa](map-comparison.json): 60 territorios, geometría/SVG idénticos y cero diferencias significativas en escritorio y horizontal. [Comparación de escritorio](desktop-visual-comparison.json): se excluyen la cabecera con el nuevo acceso a AJUSTES y los overlays variables existentes (sala, tooltip y LED), no el tablero.
- PWA: actualización real local desde V7, eliminación de caché anterior, SHA256 de 35 recursos y arranque offline con 60 territorios.

La suite agregada se ejecutó por tramos: se corrigieron y repitieron las comprobaciones afectadas antes de continuar. Se detectaron solapamientos en vertical y una variación de 2 px en el encuadre móvil; ambos corregidos. Las máscaras de la comparación histórica de escritorio se ajustaron al nuevo botón y a los límites inspeccionados del tooltip.

[Resultados de comandos](verification.txt) · [Medidas, persistencia y resultados de la matriz](report.json).

## Límites

Chrome real con emulación táctil; no certifica Safari/iPhone físico, sus barras ni safe areas reales. Firebase real/reconexión y aprobación artística siguen pendientes. Los recortes oficiales existentes son provisionales. No se conectaron cuentas ni se escribieron salas reales.
