# Especificación vigente V4

Referencia: NUKE-REGLAMENTO-V4_20261028_173655_0000.pdf, páginas6–13, contrastado con el documento original. Petición del propietario prevalece en mantenimiento y discrepancias expresamente resueltas. El presetV3 sigue accesible por `?rules=v3`; no usar el historial inferior para nuevas partidas V4.

- Setup3–6: soldados60/45/36/30, mecas4/3/2/2, bases4/3/2/2, misiles2, Pu0. Libertos: Pu5, +5 soldados, mismas mecas ordinarias, sin bases. Los primeros3 territorios corresponden a la región de origen; se reservan para impedir que reclamaciones ajenas la agoten. Orígenes según lore: Europa/AméricaSur/África/Rusia/Oceanía/Asia. Las mecas de la tabla se despliegan junto al resto del material. La selección habitual del lobby/sala representa acuerdo de facciones; no se añade un asistente de disputa de selección por D6.
- Recursos:3Pu/base; Prometeo4. Construcción4Pu, territorio propio sin base. Se construye antes del refuerzo; una base nueva recibe sus soldados, sin ingreso retroactivo.
- Refuerzo: floor(propios/2) por región, fondo restringido a esa región. Control completo añade1 en cada territorio con arista real hacia otra región. Base añade3 en su territorio; Shinin5. Fijos automáticos, fondos manuales/CPU bajo las mismas restricciones.
- Rearme:3soldados+1Pu→meca;2mecas+1Pu→escorpión;1soldado+1Pu→aeronave;1Pu→misil. Máximos5 aviones/misiles. Los costes de avión y escorpión son PROVISIONALES por discrepancia texto/chuleta, configurables en prep.upgrades.
- Movimiento:2 saltos terrestres/Érebo4, origen/tránsito propios, destino propio o enemigo. Se conserva una unidad en origen inmediatamente y se impide remover las recién llegadas en esa fase. El destino enemigo conserva dueño y defensa, con atacantes agrupados por facción. Aviones: propios ilimitados/enemigos contiguos a propios. Cada avión transporta1meca o3soldados; no escorpiones en transporte aéreo.
- Combate: todos los destinos comprometidos deben resolverse, sin retirada. PrioridadD20>D12>D6,5 dados ataque/4defensa; D12 mínimo3/D20 mínimo5, después +1 atacanteCulto/+1 defensorImperators. Orden resultado descendente, igualdad menor caras primero y meca antes de avión. Valor mayor gana, empate pierde atacante. Baja sobre dado concreto: soldado/avión elimina; meca→soldado; escorpión→meca. Invasores sin guarnición adicional. Conquista solo al vaciar defensa; base conservable/destruible.
- Misil: objetivo previo hasta3soldados o1meca, lanzamiento consume1; intercepciones cada una1misil y D6>=4; repetición humana libre mientras stock, CPU hasta límite configurable (por defecto5). Sin D6 de impacto. Base alcanzada: D12=1 accidente (texto principal prevalece sobre chuleta abreviada). Ledger/revisión evita dobles gastos y daños en reintento.
- Recompensas: evento de conquista con dueño anterior/turno/ID;1Pu por base al cierre, paga enemigo hasta saldo disponible y resto reserva. Se conserva recompensa si la base se destruye después: decisión provisional. Un evento se paga una vez.
- Mantenimiento: muestra bases, botón único, dados independientes de ellas, cuenta unos y elige secuencialmente bases propias. Cadenas recalculan bases disponibles y reducen accidentes pendientes al máximo todavía aplicable. CPU elige menor número de unidades propias y después ID. No elige superviviente: se aplica unidad de menor dado obligatoria.
- Accidente: elimina base y terrestres sin degradaciones en centro/adyacentes; conserva aviones, si no hay ninguno conserva una unidad del dado menor entre tropas presentes. Nunca crea superviviente en vacío. Cadena BFS cada base/territorio una sola vez, con snapshots y pasos; conexión Rusia–Norteamérica incluida. Si cohabitan ejércitos se consideran todas las unidades presentes para el único superviviente (criterio provisional). Libertos recibe5Pu+1meca por centro causado, incluyendo cadena atribuida al iniciador, después de todos los daños. Naturales sin recompensa. Meca en territorio no propio queda como presencia Libertos, sin conquista artificial.
- Objetivos al cierre: Imperators/Shinin5regiones; Libertos bases totales<=jugadores iniciales; Culto última unidad de1enemigo atribuida; Érebo/Prometeo ceil(mitad bases), con total>0. Se mantiene victoria del último superviviente al cierre. Duplicaciones del PDF se conservan; no se inventan objetivos alternativos.

Ambigüedades: p11 dice “mejor número pierde”, tratado como errata frente al sistema/empates; p13 omite D12 del impacto nuclear; costes rearmado discrepantes; despliegue inicial omite mecas pese a tabla; recompensa tras destruir base; atribución Libertos en cadena/cohabitación. Ver comparación detallada.

---

## Histórico anterior a la migración V4

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
