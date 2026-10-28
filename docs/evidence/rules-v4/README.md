# Evidencias V4 — 28/10/2026

- combat-desktop/mobile.png: piloto integrado V4Game.battle/RulesV4.round, RNG determinista, resultados reales con degradación de meca y eliminación de aeronave. No son una partida completa.
- victory-desktop/mobile.png y game-desktop/mobile.json: partida completa real 4J, jugador Imperators, victoria válida Libertos ronda 4, 48 acciones UI; únicamente semilla y aceleración de temporizadores, sin modificar estado.
- Suites mantenidas: tests/rules-v4.test.cjs, v4-game.browser.cjs, v4-online.browser.cjs y full-game-v4.e2e.cjs.
- Traces Playwright completas quedan en /tmp/nuke-full-game-v4-4j-trace.zip y /tmp/nuke-full-game-v4-4j-touch-trace.zip; no se añaden binarios grandes innecesarios.
- Dos Chrome reales con transporte Firestore sustituido verifican combate, intercepciones múltiples, retry sin doble consumo y transición autoritativa con ingreso único. No equivalen a Firebase real.
- SW v6: actualización desde versión anterior, caché antigua retirada, SHA256 de 11 recursos y arranque offline con 60 territorios.

Safari/iPhone físico y aceptación artística pendientes del propietario. La documentación de fuente y assets distingue SVG originales de ilustraciones del lore.
