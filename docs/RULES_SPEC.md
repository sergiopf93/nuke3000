# Especificación de reglas — referencia V3

## Fuentes y autoridad

Documentos facilitados por el propietario el 28/10/2026, páginas numeradas desde la primera hoja PDF:

- NUKE-REGLAMENTO-V3_20260915_114741_0000.pdf: 12 páginas. SHA256 `eb653d06dcbdb89826e6706db52338693e1ccac0512e88795faa3f5fdc104b7e`.
- NUKE-LORE-V1_20260910_215901_0000.pdf: 54 páginas. SHA256 `9bb61835652960d9125dd62244b3979f622f563f4d02814d1967e1d21d5056cc`.

Originales en Desktop; no se duplican los PDF (≈82 MB) en Git. El reglamento sirve para contrastar mecánicas; el lore aporta identidad narrativa y referencias visuales, sin sustituir reglas ni instrucciones de desarrollo. No se afirma que V3 sea el futuro reglamento definitivo.

**Decisión explícita del propietario:** prevalece el texto principal sobre el resumen: central por **4 Pu** y misil contra Aircraft con **D6≥5**. La página 12 indica 5 Pu y 6 respectivamente; no aplicar esos valores.

## Reglas verificadas y diferencias del motor

Fuentes efectivas: js/data.js (DEFAULT_RULES/RULES), js/setup.js, js/engine.js y js/combat.js, cargadas por index.html. Standalone, js/state.js y setup.js raíz siguen siendo variantes históricas intactas.

| Área / página PDF | Especificación | Estado de implementación |
|---|---|---|
| Mapa / 6 | 60 territorios; 12 regiones; 3 territorios antárticos dobles; conexión extremos Norteamérica–Rusia | Corregido: 06_07 en r06, centro (1136,136.2), vecinos 06_06 y 01_01 recíprocos; Rusia=7. Se conserva mapa original |
| Setup / 8 | 3–6J; un soldado por reclamación rotativa; recursos iniciales 60/45/36/30 soldados, 4/3/2/2 mechs, 2 misiles y 4/3/2/2 bases; Libertos cambia sus bases por 3 Pu y 2 mechs | Reservas existentes; corregida ruta manual y barrera de finalización. Reparto con 60: 20/15/12/10 territorios. Faltan E2E completos |
| Economía / 9 | 2 Pu/base; 1 soldado por dos territorios, por dos territorios regionales controlados y por base | applyIncome existente; comprobar distribución automática y límites |
| Refuerzos / 9 | En bases; sin bases, un territorio de elección por región; Erebus puede colocarlos en cualquier territorio propio | Manual y automático divergen; pendiente |
| Mejoras / 9 | 3 soldados + 1 Pu a mech/aircraft; 2 mechs + 1 Pu a scorpion; máximo 5 aircraft | Valores ejecutados coinciden por defecto; editor ignorado y confirmación pendientes |
| Movimiento / 9 y 11 | Terrestres hasta dos territorios propios; Aircraft a cualquier territorio propio y transporta 1 mech o hasta 3 soldados | BFS actual limita también Aircraft; transporte pendiente |
| Misiles / 9 | Coste 1 Pu, máximo 5; intercepción con misil y D6≥4; soldado automático, mech/aircraft ≥5, scorpion 6; última unidad protegida | Reparar contador, parámetros ignorados y protección por número de unidades; orden fabricar/disparar no está establecido explícitamente por V3 |
| Combate / 10 | Reservar al menos una unidad de elección; hasta 5 dados de ataque y 4 de defensa, uno por unidad; dados D6/D12/D12/D20; empate defensor | El motor limita defensa por dados atacantes y usa AP en comprobaciones de unidades. Pendiente |
| Emparejamiento / 10 | Orden descendente de resultado; en igualdad del mismo bando, más caras primero; mech antes que aircraft si ambos D12 | Tiradas numéricas pierden identidad de unidad. Pendiente |
| Bajas / 10 | Pierde la unidad del dado emparejado: scorpion→mech, mech→soldado, aircraft/soldado desaparecen | **Divergencia crítica confirmada**: applyLoss elimina primero unidades baratas sin degradaciones. Requiere resolver con dados tipados comunes en CPU/humano |
| Conquista / 10 | Ocupar con al menos una unidad atacante y conservar guarnición de origen; base cambia de dueño | Revisar movimiento automático y guard por AP; no certificado |
| Mantenimiento / 11 | D12 por base, explota en 1; elimina base/terrestres, sobreviven aircraft; sin aircraft, elegir un terrestre superviviente | Fórmula actual de soldados incorrecta, elección y flags pendientes |
| Habilidades / 7 | IMP +1 todos dados defensivos; TAL-MAUT +1 todos ofensivos; LIB gana misil/mech/2 Pu por base destruida; ERB distribución libre; PRM +1 Pu/base; SHN +1 soldado/base | TAL-MAUT diverge y LIB no se invoca. Pendiente resolver ubicación del mech LIB cuando el territorio no le pertenece |
| Victoria / 7 | IMP 5 regiones al inicio propio; LIB bases globales≤jugadores al final propio; TAL-MAUT elimina 2 enemigos al final propio; ERB base en 7 regiones al final propio; PRM mitad bases al final propio; SHN mayor AP en 7 regiones al final propio | Cierre idempotente corregido, momentos actuales tras conquista no respetan V3; falta reparar y probar |

## Dudas restantes

Orden de participantes tras determinar primer jugador (V3 dice horario, motor ordena tiradas); regla en empate de AP regional; redondeo de mitad de bases y caso cero; victoria simultánea; representación de un mech Libertos en territorio enemigo después de explosión; acumulación de movimiento por unidad/fase. Mantenerlas separadas de errores confirmados. No se necesita inventar balance para reparar dados tipados y degradaciones.

## Configuración y futuras versiones

Todavía no están implementados esquema versionado, validación completa, presets persistentes/importación/exportación ni copia estable de reglas por partida. La futura centralización deberá incluir dados, bajas tipadas, guarnición, movimiento/transporte, fases y momentos de victoria; no limitarse a parámetros numéricos. CPU, UI y online deben consumir la misma configuración.

## Lore y referencias visuales

Universo: pp.9–13. Facciones: Imperators pp.14–19, Libertos 20–25, Tal-Maut 26–31, Erebus 32–37, Prometheus 38–43, Shinin 44–49. Hay ilustraciones de soldados, mechs, scorpions y aircraft: usarlas como referencia visual en el bloque C; no inventar identidad definitiva ni sustituir mapa, paleta o assets en esta iteración.
