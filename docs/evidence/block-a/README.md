# Evidencia Bloque A — 28/10/2026

- `engine-results.txt`: 121 tests Node, 121 pasan, 0 fallos. Incluye simulaciones completas de motor de 3–6 jugadores y protocolo aislado.
- `full-game-report.json`: partida real Chrome 3J, semilla 123, reglas V3 confirmadas; setup 60 territorios y victoria Libertos ronda 12, 233 acciones UI, 0 errores JavaScript. Solo PRNG/timers inyectados; ninguna mutación del estado del juego desde el conductor.
- `full-game-victory.png`: resultado final inspeccionado visualmente.
- `full-game-trace.zip`: traza compacta de Playwright (sin snapshots ni screenshots, captura final separada).

También ejecutadas integraciones Chrome a 1440×900 y 844×390, y dos clientes Chrome para combate humano/CPU e intercepción. Estas últimas preparan fixtures y usan transporte local, sin Firebase; no equivalen a partida online completa. Todas las pruebas bloquean peticiones externas y service workers.

No se publica ni se despliega. Límites y comandos en ../../TEST_STRATEGY.md.
