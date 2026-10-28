# Estado actual — combate y misiles, 28/10/2026

BUG 1 corregido: no hay selección ni confirmación defensiva humana. BUG 2 corregido: impacto siempre posterior a intercepción; objetivo posterior a D6, soldado siempre elegible. BUG 3 corregido: sin resolutor silencioso CPU–CPU, presentación por rondas y callback único. El cierre de resultados y los temporizadores obsoletos no repiten bajas. Se diferencia ejército defensor derrotado de ocupación posterior.

222 tests Node y pruebas reales Chrome separadas, incluida partida completa en escritorio/horizontal y upgrade SW real. [Evidencia de esta iteración](evidence/combat-missiles/README.md). Sin nuevas discrepancias reglamentarias. Límites: no se certifica Safari/iPhone físico ni Firebase real.

# Incidencias — estabilización del motor

Actualizado 28/10/2026. Diagnóstico original en PROJECT_ANALYSIS.md. **Estabilización local del Bloque A validada**, pendiente de aceptación del propietario. No confundir transporte simulado con Firebase real.

## Correcciones verificadas

| Incidencia | Causa y corrección | Evidencia |
|---|---|---|
| BUG-05: bajas y degradaciones | Se perdía el tipo del dado y se eliminaba la unidad más barata. Battle resuelve dados tipados, desempata caras/tipo y aplica bajas simultáneas: scorpion→mech, mech→soldado; aircraft/soldado desaparecen | Matriz 4×4 por ambos bandos, orden de empate, bonificaciones, guarnición y combates completos |
| BUG-05: diferencias CPU/humano | Resolutores distintos, +1 TAL-MAUT parcial y defensa limitada por ataque. Ambos usan Battle.round/Battle.fight; +1 en todos los dados correspondientes; hasta 4 defensivos independientemente del atacante | Motor determinista y combate real por clics con guarnición escogida |
| BUG-06 | Resultado ahora enumera comparaciones tipadas, bajas/degradaciones, iniciales y restantes | Integración Chrome y trazas de partida |
| BUG-07/08 | CPU–CPU dependía de observar modal y pulsar siguiente; callbacks de rondas podían seguir tras agotamiento. Resolución automática acotada por niveles de daño, final idempotente y callback único. Defensa automática para todos; CPU muestra cada ronda con pausas | Simulaciones completas 3–6J; E2E completo con reglas finales; regresiones de callback/guarnición |
| BUG-09/H01/H02/H05/H06 | Cierre recursivo/inexistente, eliminación atribuida a pf, turnos muertos y victorias fuera de momento. Ganador explícito/idempotente, atacante correcto y rotación viva; IMP al inicio propio, resto al final propio; extinción inmediata | Seis facciones con casos positivos/negativos, hooks reales, eliminados y estado final bloqueado |
| Setup/H10/H11 | Ruta antigua omite centrales, popup rechaza solo mechs, arranque duplicado y tiradas/callbacks obsoletos. Despliegue combinado, guard de reservas, una única salida tras COMENZAR, primer jugador correcto y orden circular; callbacks por generación | Reservas 3–6J, setup manual Chrome y setup completo E2E |
| H07 nuclear | Se conservaban todos los soldados o se creaba un soldado; humano elegía otra base distinta a su dado. Ahora cada base usa su propia tirada, conserva aircraft o un terrestre existente de elección; CPU termina sin modal | Todos tipos de superviviente, bases seguras/explosivas y callback único |
| BUG-03/H08 | Mejora inmediata con costes fijos; CPU mejoraba reservas de setup. Confirmación/cancelación con estado final, costes de RULES y tropas reales del tablero; CPU reutiliza applyUpgrade | Cancelar/confirmar Chrome y reglas de coste modificadas en motor |
| BUG-04/H09 | Contador obsoleto y protección por AP. Misil protege una unidad de cualquier tipo, elige objetivo válido después del impacto y refresca contador al consumir/interceptar; dado de intercepción configurable | Pruebas de impacto/intercepción y contador Chrome con modal abierto |
| Refuerzos | Caminos automáticos ignoraban Erebus y fallback regional. Selección/automático/CPU comparten elegibilidad; no se omiten pendientes por SIGUIENTE | Motor y E2E con colocación automática real |
| Movimiento | AP permitía vaciar origen; aircraft tenía BFS terrestre y no transporte. Cantidades enteras, guarnición por unidades, ruta propia y transporte a destino propio con capacidad V3 | Pruebas de alcance/capacidad y ocupación; una vez por unidad/fase, disponible de nuevo al reagrupar |
| Reglas/caché | Editor alteraba partida activa y dados/costes inválidos podían bloquear CPU. Editor solo lectura tras empezar; validación básica. SW incluye battle.js y elimina solo cachés NUKE3000 antiguas | Test de editor/valores; sintaxis SW. Offline/PWA no validado |

## Discrepancias resueltas por el propietario

Central 4 Pu y Aircraft D6≥5 prevalecen sobre el resumen p.12. Libertos recibe recompensa solo por destrucción de una nuclear propia, con mech inmediato. Shinin debe superar a todos en AP regional. Cada unidad mueve una vez por fase y puede mover de nuevo al reagrupar. Se mantiene construir misiles antes de disparar. Todas tienen pruebas; ninguna decisión reglamentaria detectada queda pendiente.

## Online — límites de certificación

Se conserva protocolo de solicitud/respuesta para intercepción humana remota; defensa automática y sin snapshot enviado por el defensor. El actor activo resuelve; el host dirige CPU. IDs, remitente, turno, cancelación y duplicados protegen las decisiones. Siete tests aislados y dos páginas Chrome prueban ataque humano, ataque CPU de varias rondas e intercepción con recursos y estado coincidentes.

No hay E2E Firebase ni Emulator en esta iteración. Reconexión, replay/deduplicación general de acciones, autoridad de servidor y nombres remotos inseguros (H12/H14) siguen pendientes del bloque E. El estado de paso y reglas ahora se transmite, pero restaurar una sala y recuperar una decisión en vuelo no está certificado. Las pruebas del protocolo no sustituyen esas comprobaciones ni certifican el juego online completo.

## Fuera de esta iteración

Mapa actual intacto (60/7 Rusia); fingerprint y grafo pasan. UX móvil, balance, estrategia CPU avanzada, presets/versionado/importación, dispositivos físicos y standalone pendientes. Publicación directa en main/Pages autorizada en la iteración de combate y misiles.
