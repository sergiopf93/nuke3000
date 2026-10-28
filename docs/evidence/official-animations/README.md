# Evidencias de miniaturas oficiales y dados comunes

[Abrir galería de capturas y vídeos](index.html).

- Ocho grabaciones normales: sorteo/desempate, batalla, misil y mantenimiento en escritorio1440×900 y móvil horizontal844×390. Vídeos silenciosos de9–43 segundos, sin maqueta ni resultados visuales inventados.
- Batalla: motor real RulesV4.round, comparación en ambas direcciones, escorpión→meca→soldado/baja y miniaturas persistentes. Son fixtures explícitas, no partidas completas.
- Misiles: dos intercepciones fallidas, impacto automático y D12; casos adicionales interceptado (sin impacto/D12) y D12=1 con cadena real. Nunca D6 de impacto.
- Mantenimiento: todos los dados juntos; opciones de bases aparecen solo después. Casos de aborto y visibilidad simulada conservan estado y callback único.
- map-comparison.json: comparación contra a70a285. Geometría/grafo/fondo/SVG idénticos; ambas capturas finales tienen cero píxeles distintos. El test documenta tolerancia de rasterizado1 y exclusión del control de sala, aunque estas capturas finales no necesitan ninguna tolerancia.
- game-desktop/mobile.json: partidas completas4J con preferencia mínima, semilla y aceleración; ninguna mutación del estado desde el test. Victoria Libertos ronda4/48acciones. PresetV3 completo escritorio también pasa hasta ronda12/121acciones.
- validation.json resume337 tests Node, regresiones V3/V4, dos clientes reales con transporte de pruebas, sorteo online a velocidades distintas y SW V6→V7 con35hashes/offline60.

Fuentes: nueve PNG idénticos a los entregados en el ZIP, extraídos de MATERIAL p.5 del PDF V4. No se incluye el fondo de demo. [Inventario y fotografías necesarias](../../ASSET_INVENTORY.md).

No se certifica Safari/iPhone físico ni Firebase real. Validación artística pendiente del propietario.
