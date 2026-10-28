# Diferencial V3 → V4 y migración

PDF V4 original leído,13p; lore original54p. Base local/remota inicial a70a285,318 tests actuales (222 anteriores+96 V4). No se reescribe el mapa ni se añade infraestructura.

| Regla anterior V3 | V4 vigente | Código | Cobertura / estado |
|---|---|---|---|
| Setup sin origen obligatorio | Tres primeras en origen con reserva | setup/v4-game | claims6facciones, reparto3–6; implementado |
| Libertos3Pu+2mecas |5Pu+5soldados/sin bases | initGame adaptado/createPreset | setup3–6; implementado |
|2Pu/base |3/Prometeo4 | applyIncome V4 | facciones; implementado |
| Fondo global y colocación nuclear | Fondos por región + fronteras + bases3/Shinin5 | reinforcements/prepareRef | integración manual/CPU/base nueva; implementado |
| Avión3soldados | Avión1soldado1Pu | preset/applyUpgrade | costes/límites; implementado, costePu provisional |
| Movimiento propio y ataque adyacente | Cohabitación invasora y resolución posterior | move/groundPath/attackers | tropas combinadas/rangos2/4/transporte; implementado |
| Guarnición/selección/retirada | Compromiso completo, mejores dados obligatorios, sin retirada | round/V4Game.battle | tipos/minimos/empates/bajas; implementado |
| Sin mínimos y empate caras fuertes | D12min3/D20min5; igualdad caras menores primero | roll/compare | deterministas; implementado |
| MisilD6 impacto y objetivos por umbral | Hasta3soldados/1meca, automático tras intercepciones | staged missile API | RNG exacto/ledger/online/retry; implementado |
| Explosión local/superviviente elegible | Cadena real, mínimo dado obligatorio | explode | tipos/ciclo/wraparound/frames; implementado |
| Base atada a dado mantenimiento | Dados conjuntos y bases elegidas después | maintenance/adapter | selección/cadena/CPU; implementado |
| HabilidadLibertos propia2Pu+misil | Causa5Pu+meca por centro | explode causeFk | natural/atribuida/cadena; implementado |
| Sin recompensa por base capturada | Evento1Pu con reserva y pago único | rewards/baseCaptures | saldo/idempotencia; implementado |
| Culto2; Érebo7regiones nucleares; ShininAP | Culto1; Érebo mitad; Shinin5completas | objective | seis objetivos/cierre/cero/ceil; implementado |
| Ventanas con resultados | Escena2.5D, dados/miniaturas/efectos | battle-scene | Chrome escritorio/touch/reduced-motion; validación artística pendiente |
|NEXT_STEP agotado+END_PHASE previo | V4_STEP posterior y revisiones/cola | online/transition | regresión dos clientes; gate de publicación |

Decisiones provisionales documentadas:1Pu avión/escorpión; mayor resultado gana pese errata; mecas iniciales se despliegan; D12 nuclear del texto principal; bases destruidas después conservan recompensa; Libertos recibe por centros secundarios; cohabitación usa superviviente mínimo único. Objetivos duplicados conservados. Selección habitual de facciones por acuerdo en lobby, sin asistente de disputaD6.

V3 aislado por versión de reglas y fases; V4 usa esquema2 y módulos separados. Las suites antiguas navegan explícitamente con ?rules=v3. Los snapshots incluyen reglas, presencia invasora, ledger misil, recompensas y mantenimiento. Un cliente nuevo rechaza esquema futuro; no se certifica compatibilidad con ejecutables antiguos todavía abiertos sin actualizar SW.
