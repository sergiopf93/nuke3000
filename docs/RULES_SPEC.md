# Especificación de reglas — referencia V3

## Fuentes y autoridad

Documentos facilitados por el propietario el 28/10/2026, páginas numeradas desde la primera hoja PDF:

- NUKE-REGLAMENTO-V3_20260915_114741_0000.pdf: 12 páginas. SHA256 `eb653d06dcbdb89826e6706db52338693e1ccac0512e88795faa3f5fdc104b7e`.
- NUKE-LORE-V1_20260910_215901_0000.pdf: 54 páginas. SHA256 `9bb61835652960d9125dd62244b3979f622f563f4d02814d1967e1d21d5056cc`.

Originales en Desktop; no se duplican los PDF (≈82 MB) en Git. El reglamento sirve para contrastar mecánicas; el lore aporta identidad narrativa y referencias visuales, sin sustituir reglas ni instrucciones de desarrollo. No se afirma que V3 sea el futuro reglamento definitivo.

**Decisión explícita del propietario:** prevalece el texto principal sobre el resumen: central por **4 Pu** y misil contra Aircraft con **D6≥5**. La página 12 indica 5 Pu y 6 respectivamente; no aplicar esos valores.

## Implementación del bloque A

| Referencia V3 | Estado actual |
|---|---|
| Mapa p.6 | 60 territorios/7 Rusia, sin cambios en esta iteración |
| Setup p.8 | Reparto circular, reservas y centrales; primer jugador conserva orden de asientos; salida única tras COMENZAR. Pruebas con 60 territorios en 3–6J |
| Economía/refuerzos p.9 | applyIncome idempotente por ronda; elegibilidad compartida por humano/automático/CPU, Erebus y fallback regional |
| Mejoras p.9 | applyUpgrade usa costes de RULES y tropas del tablero; humano confirma con coste/resultado; CPU aplica la misma conversión |
| Movimiento pp.9/11 | BFS propio terrestre hasta RULES.prep.movementRange; aircraft a cualquier destino propio, transporta un mech o hasta tres soldados por avión; guarnición por número de unidades. Cada unidad mueve una vez por fase y vuelve a estar disponible en reagrupamiento, confirmado por propietario |
| Misiles p.9 | launchMissile protege última unidad, consume/refresca recursos y usa dado configurable de intercepción. Elegir tipo presente elegible después del D6 de impacto; soldado con 1–6, mech/aircraft con 5–6, scorpion con 6. Intercepción válida D6≥4 termina sin impacto; ambas reservas se consumen una sola vez. Aircraft ≥5 y central 4 Pu confirmados por propietario |
| Combate p.10 | js/battle.js puro: dados con tipo, caras, valor bruto y bonus; orden por resultado/caras/tipo, mech antes que aircraft; empate defensor; pérdidas simultáneas y degradaciones. CPU y humano usan el mismo cálculo. Hasta 5 dados ataque/4 defensa independientes; elegir guarnición y mantener ocupación |
| Mantenimiento p.11 | Dado individual por base; explosión en la base correspondiente; aircraft sobreviven, o se escoge un terrestre existente. Callback único. CPU automática |
| Habilidades p.7 | IMP/TAL-MAUT +1 a todos los dados de su lado; PRM/SHN ingreso por base; Erebus distribución libre. Libertos recibe recompensa solo al destruir una base propia; mech inmediato en ese territorio, confirmado por propietario |
| Victorias p.7 | checkWinCondition(moment,fk): IMP al inicio propio antes de ingresos; LIB/CLT/ERB/PRM/SHN al final propio tras mantenimiento. Extinción inmediata. Sin evaluar objetivos de otra facción tras una conquista |

API de combate: Battle.round devuelve copias, tiradas tipadas, comparaciones, pérdidas y estado; Battle.fight itera con cota derivada del daño restante. Battle.occupy conserva la guarnición elegida. No usa DOM ni temporizadores. El adaptador en combat.js representa el resultado; CPU–CPU usa las mismas rondas visibles y avanza automáticamente con pausas. No requiere clics; el resultado final se puede cerrar.

Los textos de lobby y objetivos se corrigen sin rediseño visual. El editor existente queda de solo lectura al iniciar; setRule hace validación básica, pero aún no es el sistema versionado/persistente del bloque D. Defensa siempre automática, con el máximo de dados disponibles y caras más fuertes (a igualdad, mech antes de aircraft), sin intervención humana ni selección remota. Online transmite presentación de rondas e intercepción: solo esta última requiere decisión humana remota; resuelve el actor activo (host si CPU). Probado con transporte local; no se certifica Firebase real ni reconexión.

## Dudas restantes

Sin decisiones pendientes entre las discrepancias detectadas. El propietario confirma: Shinin debe superar a todos (empate no vale); Libertos solo obtiene recompensa por nuclear propia, con mech inmediato; una vez por unidad/fase, con nueva disponibilidad al reagrupar; construir misiles antes de disparar, sin construcción posterior al primer disparo. Estas decisiones tienen regresiones deterministas. Mitad de bases se interpreta matemáticamente como al menos ceil(total/2), exigiendo total>0; no se concede victoria vacía por cero bases. Al evaluar solo la facción activa en su momento desaparece la competencia entre objetivos simultáneos de distintos turnos. Mantenerlas separadas de errores confirmados. No se necesita inventar balance para reparar dados tipados y degradaciones.

## Configuración y futuras versiones

Todavía no están implementados esquema versionado, validación completa, presets persistentes/importación/exportación ni copia estable de reglas por partida. La futura centralización deberá incluir dados, bajas tipadas, guarnición, movimiento/transporte, fases y momentos de victoria; no limitarse a parámetros numéricos. CPU, UI y online deben consumir la misma configuración.

## Lore y referencias visuales

Universo: pp.9–13. Facciones: Imperators pp.14–19, Libertos 20–25, Tal-Maut 26–31, Erebus 32–37, Prometheus 38–43, Shinin 44–49. Hay ilustraciones de soldados, mechs, scorpions y aircraft: usarlas como referencia visual en el bloque C; no inventar identidad definitiva ni sustituir mapa, paleta o assets en esta iteración.
