# Especificación provisional de reglas

Fuente actual: js/data.js, DEFAULT_RULES/RULES. Implementación vigente: index.html con js/setup.js, js/engine.js y js/combat.js. Standalone, js/state.js y setup.js raíz son históricos, no equivalentes ni modificados por esta iteración.

## Mecánicas actuales que deben preservarse provisionalmente

- Setup: 3–6 participantes; startingAssets por cantidad y libertosSwap. Grafo actual de 59 territorios, 6 en Rusia. Reservas/centrales y despliegue manual requieren corrección.
- Economía: 2 Pu/base; refuerzos territoriales/regionales y por base; bonificaciones Prometheus/Shinin. Ingreso protegido por ronda.
- Unidades/AP: soldado 1, mech/aircraft 3, scorpion 6. Mejoras ejecutadas actualmente: 3 soldados + 1 Pu a mech/aircraft; 2 mechs + 1 Pu a scorpion; límite aircraft 5. El editor puede divergir.
- Movimiento: BFS propio, rango actual 2.
- Combate: D6/D12/D12/D20, máximos 5 ataque/4 defensa, empate defensor, bajas baratas primero. Bonificación TAL-MAUT y límite defensivo divergen entre rutas; pendientes de unificación y regresiones.
- Misiles: coste 1 Pu, límite 5, fabricación antes de disparo, intercepción D6≥4; restricciones configuradas no siempre aplicadas.
- Nuclear: coste 4 Pu, mantenimiento D12, explosión en 1; supervivientes y bandera maintenanceEnabled requieren corrección.
- Victoria: checkWinCondition en engine; IMP 5 regiones, LIB bases globales≤jugadores, CLT 2 eliminaciones, ERB nuclear en 7 regiones, PRM mitad de bases, SHN superioridad AP en 7 regiones; última facción viva. Primera condición encontrada conserva orden actual; momentos y simultaneidad requieren reglamento.

## Cambios de esta iteración

La condición detectada pasa a declareWin(facción, motivo), que conserva vencedor/ronda/motivo en G.result y finaliza idempotentemente. No se cambian umbrales ni balance. Se conserva el resultado en snapshots online.

## Diseño pendiente (no implementado)

Esquema versionado, validación de rangos y combinaciones, presets con nombre, persistencia/importación/exportación y copia inmutable al iniciar cada partida. El editor solo deberá mostrar controles realmente aplicados por motor/CPU/online. No existe todavía garantía de fuente única efectiva ni reglas estables por partida.

## Decisiones pendientes

Reglamento actualizado para tiempos de victoria, efectos nucleares/habilidades y bonificación TAL-MAUT; referencia física para Rusia; estrategia del standalone. No inventar reglas para rellenar estos huecos.
