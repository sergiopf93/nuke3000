# NUKE3000 — Análisis funcional y técnico

Fecha: 2026-10-28. Base analizada: `93eba1e36927a5811b4e391c1a147db5d7f0686f` (`main`, último commit 2026-09-26: “Add files via upload”). Repositorio: https://github.com/sergiopf93/nuke3000. Rama de documentación: `docs/r2-project-analysis`.

## 1. Alcance, método y grado de certeza

Se verificó el remoto con `git ls-remote --symref`, se buscó copia local en Desktop/Documents/Downloads/proyectos y se clonó en `/Users/sergiopardo/Desktop/nuke3000`. La copia estaba limpia. Se observó únicamente `origin/main` como rama remota; no se consultaron PR, issues, ajustes de Pages, permisos ni configuración de Firebase. El historial reciente utiliza mensajes genéricos de subida y no permite deducir una hoja de ruta fiable.

Se estudiaron la entrada activa, datos, setup, motor, combate, UI, SVG, online, PWA y diferencias con las variantes antiguas. Se aplicaron las skills Architecture y QA directamente, sin subagentes. No se cambió código ni configuración, no se añadieron dependencias y no se hicieron push, merge o despliegues.

Terminología usada:

- **C — comprobado en código:** relación o comportamiento deducible directamente de las fuentes citadas; no implica prueba E2E.
- **R — reproducido:** comprobación ejecutada en VM Node o navegador; se explicita el alcance.
- **D — documentado:** afirmación del README/textos/comentarios, no garantía de implementación.
- **Riesgo/inferencia:** consecuencia posible que requiere validación adicional.

El análisis distingue la versión servida de la standalone. Los PDF “NUKE LORE” y “NUKE REGLAMENTO”, incluyendo V3 citada por comentarios, no están incluidos. No se certifica concordancia con el reglamento físico.

## 2. Producto y estado de funcionalidades

NUKE3000 — Armageddon Protocol es un playtester digital de estrategia territorial posapocalíptica. El jugador elige una de seis facciones asimétricas, controla tropas y bases nucleares, obtiene plutonio/refuerzos, mejora unidades y conquista territorios. La interfaz está orientada a un tablero compartido y resolución por pasos/dados, con modo local contra CPU y código de multijugador por salas.

| Área | Estado comprobado | Límite |
|---|---|---|
| Lobby local, facciones, 3–6 participantes | Implementado; arranque 3J reproducido | No se probaron todas las combinaciones |
| Tiradas y desempates iniciales | Código con D6 y grupos de empate | La prueba de recorrido fijó el orden después del arranque |
| Reclamación y despliegue automático local | Recorrido reproducido | Despliegue manual mezcla flujo antiguo y nuevo |
| Ingresos y refuerzos | Reproducidos parcialmente | Distribución automática difiere de restricciones manuales |
| Mejoras, movimiento, ataques, misiles | Implementación inspeccionada | No hay partida completa validada; divergencias de reglas |
| Mantenimiento nuclear | Implementado | Supervivientes incorrectos en rama reproducida |
| Victoria/derrota | Condiciones escritas | Cierre roto; eliminación y rotación defectuosas |
| CPU | Reparto, ataque y mantenimiento | Sin estrategia de movimiento, misiles ni construcción |
| Salas y reconexión | Implementación Firebase presente | Fallos de protocolo; servicio real no probado |
| PWA | Manifest, SW e iconos presentes | Prefijo fijo, caché incompleta para uso plenamente offline |
| Standalone | HTML autónomo con código y assets | Versión distinta; solo carga inicial comprobada |

No existe navegación con router: `index.html` alterna lobby, sala de espera, cabecera y layout del juego mediante `display`. El tablero ocupa el centro; tarjetas de facción a la izquierda, acciones/objetivo/log a la derecha. Modales cubren reglas, combate, mantenimiento, misiles, contadores y objetivos. Hay controles de zoom y paneles colapsables; CSS responde a 900/680 px y la interacción incluye touch. La existencia de esos estilos no certifica accesibilidad o usabilidad móvil.

## 3. Arquitectura efectiva

### 3.1 Entrada, orden de carga y variantes

`index.html:21` carga Firebase app/auth/firestore compat 10.12.0. `index.html:484` carga secuencialmente:

```text
assets → data → setup → map → engine → combat → ui → online → firebase-config
                                                        ↓
                                 script inline de lobby/startGame/online/PWA
```

Son scripts clásicos globales; no hay imports/exports, bundler ni contenedor de dependencias. Las funciones llaman a otras definidas en archivos posteriores, una vez completada la carga. `firebase-config.js` inicia Firebase y autenticación anónima al cargar la página, incluso antes de elegir modo online.

**Fuentes históricas:** `js/state.js` no se carga, pese a lo indicado por README; concatena lógica antigua y contiene declaraciones duplicadas que impiden su parseo. `/setup.js` tampoco se carga; mantiene cuatro fases de setup. `nuke3000-standalone.html` incluye su propio motor/reglas/CSS/assets, con nuclear a 5 Pu y mantenimiento D20. No es un bundle equivalente al index actual y no hay pipeline de regeneración. `js/ui.js:292` conserva `buildTerritoryData()` con otro mapa; no hay llamada en la entrada activa. `REGION_SIZES` y `SETUP` en data conservan constantes históricas, aunque SETUP sirve de fallback.

### 3.2 Responsabilidades y dependencias

| Archivo | Responsabilidades y conexiones |
|---|---|
| `js/data.js` | 59 definiciones territoriales, rejilla, regiones, facciones, reglas editables y G. Base de todos los módulos. |
| `js/map.js` | Inicializa facciones/territorios y crea SVG/hexágonos. Eventos llaman a engine y ui. |
| `js/setup.js` | Orden D6, reclamación, reservas y despliegue; usa mapa, DOM, reglas y ONLINE. Entrega al motor. |
| `js/engine.js` | Pasos, fase/facción activa, ingresos, IA, mantenimiento y condiciones de victoria. También renderiza mapa, controla selección y mejora/construcción. |
| `js/combat.js` | Contexto del combate, dados/bajas/conquista, movimiento, refuerzos, misiles; invoca motor/UI y modifica G directamente. |
| `js/ui.js` | Tarjetas, log, editor de reglas, tooltips, cámara/touch; contiene auxiliares históricos. |
| `js/online.js` | IIFE `ONLINE`, Auth/Firestore, salas, suscripciones, snapshots, acciones y restauración; llama directamente a setup/motor/UI. |
| `index.html` inline | Lobby local/online, selección, lanzamiento, desconexión, wrapper de victoria y registro SW. |
| `js/assets.js` | Constante ASSETS con base64 ya embebido, no un cargador/conversor en ejecución. |
| `css/game.css` | Tema oscuro, paneles, modales, responsive; también hay estilos inline en HTML y JS. |

No hay una capa de dominio independiente del DOM ni una única función de transición validada. La comunicación se hace por llamadas globales, callbacks, manejadores inline, temporizadores y mutación compartida. La resolución mezcla decisiones de reglas, efectos visuales y actualizaciones remotas; por eso las pruebas aisladas necesitan sustituir funciones de UI.

### 3.3 Modelo de datos

- `TERRITORIES_DEF`: `id`, `region`, `cx/cy`, `adj`; tres territorios antárticos añaden `cx2/cy2`. Es la fuente del grafo vigente.
- `G.territories`: copia de cada definición más `owner`, `soldiers`, `mechs`, `aircraft`, `scorpions`, `hasNuclear`. La propiedad y la ocupación son conceptos separados; el código puede producir territorios propios vacíos.
- `G.factions`: metadatos de FDATA, `plutonium`, `missiles`, reservas iniciales (`soldiers`, `mechs`, `nukes`), `alive`, `pendingSoldiers`, ingresos y contadores. `initGame()` crea seis facciones aunque solo participe un subconjunto de `G.setup.order`.
- `G.setup`: `order`, `orderIdx`, `deployIdx`, `rollResults`, grupos de desempate, reservas por facción, `_stepIdx`, `_inSetup` y `claimCallback`.
- `G_step`: índice y fase, `currentFk`, `isMyTurn`. Este es el control efectivo; `G.currentFaction` no se actualiza normalmente al avanzar turno.
- `G_combat`: origen/destino, atacante/defensor, pools elegidos, ronda, flags y callback.
- En G también viven cámara `vx/vy/vscale`, selección, modos, `Set` y callbacks. En `window` se almacenan popups y callbacks temporales.
- `RULES` es copia JSON de `DEFAULT_RULES`. `setRule()` modifica rutas sin validación de rango. Ni reglas ni avance G_step forman parte del snapshot online.

Los contadores de tropa en una facción no son el total en tablero; `armyPoints()` suma tropas territoriales con pesos 1/3/3/6. Mezclar ambos modelos explica, por ejemplo, el upgrade CPU inefectivo tras consumir reservas del setup.

## 4. Reconstrucción de una partida

### 4.1 Inicio y preparación del tablero

`index.html:startGame()` fija identidad y participantes, llama a `initGame()`, muestra el tablero, crea SVG, instala pan/zoom y ejecuta `startSetupPhase()`.

Recursos por participante (`data.js:110`, usados en `map.js:initGame`):

| Participantes | Soldados | Mechs | Misiles | Bases | Territorios nominales |
|---|---:|---:|---:|---:|---:|
| 3 | 60 | 4 | 2 | 4 | 20 |
| 4 | 45 | 3 | 2 | 3 | 15 |
| 5 | 36 | 2 | 2 | 2 | 12 |
| 6 | 30 | 2 | 2 | 2 | 10 |

Los territorios nominales suman 60, pero se reclaman **59** hasta agotarlos, sin cuota individual; por ello no todos reciben igual número. Libertos empieza sin bases, con +3 Pu y +2 mechs; el plutonio normal se inicializa a cero. Los límites editables de territorios no controlan el reparto real (`setup.js:397`).

`SETUP_STEPS` activo: `roll → claim → deploy`. D6 ordena de mayor a menor y los empates se vuelven a tirar por grupos (`resolveRollOrder`). En cada reclamación se asigna propietario, coloca un soldado y descuenta de reserva. CPU elige al azar; auto-reclamar humano conserva la rotación. Después se reparten unidades y bases por facción. `_autoDistributeFaction()` distribuye soldados y mechs circularmente; la colocación automática nuclear recorre territorios propios disponibles.

`endSetupPhase()` llama primero a `startPhaseProgress()` para G.pf y después a `startPhase()` para el primer jugador; puede aplicar ingresos antes del turno real y programar más de un flujo. `_incomeAppliedRound` evita duplicar el ingreso de una misma facción/ronda, pero no resuelve todos los efectos de inicialización. La pantalla GAME START llama luego a `runPrepPhase()`, que no reinicia si G_step ya existe.

El despliegue manual aún utiliza callbacks de `setupStep_Soldiers_*`, pertenecientes al flujo anterior; al finalizar pueden avanzar `_stepIdx` sin pasar por el despliegue nuclear combinado. Requiere prueba completa de variantes manuales y mixtas. En online, el deploy combinado omite mensajes de sincronización y no siempre restringe CPU al host (sección 7).

### 4.2 Turno efectivo

`engine.js:STEPS`, `runCurrentStep()`, `nextStep()` y `endPhaseForFaction()` realizan:

```text
PREP: income → reinf → upgrade → move → missile → nuclear
COMBAT: attack
END: regroup → maint
→ siguiente facción en order → nueva ronda al volver al índice 0
```

Los pasos opcionales se pueden saltar; el botón global SIGUIENTE también llama a `nextPhase()` → `nextStep()`. `STEPS` es fijo, no se deriva de arrays `RULES.*.phases`. CPU utiliza temporizadores; humanos usan botones. No hay salto de eliminados ni estado terminal robusto que detenga el motor.

Ingresos (`applyIncome`): 2 Pu por base; Prometheus +1 adicional/base. Soldados = suelo(territorios/2) + suma de suelo(tamaño regional/2) para regiones completamente propias + bases; Shinin suma otro por base. Se acumulan en pendingSoldiers; se reinician contadores de misiles. El guard de ronda es reproduciblemente idempotente.

Refuerzo manual (`combat.js:608`): en bases si existen; Erebus puede en cualquier territorio propio; sin bases se escoge el primer territorio propio de cada región como elegible. Esto no limita a un solo soldado por región. El automático y CPU solo eligen bases o todos los territorios, sin aplicar el mismo criterio.

Mejoras (`engine.js:1062`): 3 soldados+1 Pu → mech o aircraft, 2 mechs+1 Pu → scorpion. Máximo aircraft=5. A pesar del editor, se usan literales. La construcción de base sí consume `RULES.prep.nuclearBuildCost` (4 Pu).

### 4.3 Movimiento y combate

Movimiento (`getMovableTargets`, `showMoveUnitsPopup`, `mvConfirm`): BFS hasta `movementRange` (2 por defecto), atravesando y terminando en territorios del jugador local. Todas las unidades comparten destinos; no hay vuelo ilimitado implementado. El popup reserva una unidad barata y permite elegir cantidades. No hay historial de movimiento por unidad; encadenar movimientos puede superar un rango total por fase si esa fuera la intención del reglamento.

Ataque humano: selección de origen propio → enemigo adyacente → botón ATACAR → `openDice()` → modal/pools → dados → `applyBattleResult()`. La adyacencia se filtra en el clic, no en openDice. Reserva la unidad más barata al construir el pool atacante. Valores: soldado D6, mech/aircraft D12, scorpion D20; hasta 5/4 dados. Se ordenan de mayor a menor, comparan parejas y empates favorecen defensa. Las bajas eliminan soldado, mech, aircraft y scorpion en ese orden, independientemente de qué unidad tiró.

La defensa interactiva puede elegir hasta 4 dados aunque ataque con menos: `defDiceCount()` existe pero no se usa. CPU silenciosa sí limita por dados atacantes. TAL-MAUT recibe +1 al dado mínimo en `resolveCombatRound()`, pero +1 a todos en `rollAttackerThenDefend()` y resolución silenciosa. Imperators recibe +1 a todos los dados defensivos en esas rutas activas.

En conquista, cambia owner, incrementa conquistados y traslada unidades dejando una barata en origen. Hay ramas que admiten destino vacío; AP no equivale a número de unidades. `checkElimination()` y `checkWinCondition()` se llaman tras conquistar. Puede repetirse el combate o retirarse según el modal; no se verificó una batalla completa con todas las combinaciones de selección.

CPU (`executeCpuStep/executeCpuAttack`): distribuye refuerzos, intenta mejorar reservas de facción (normalmente agotadas), omite movimiento/misiles/construcción y elige el primer origen apto y un vecino enemigo aleatorio. Solo inicia un ataque por paso. CPU contra jugador exige abrir el ataque señalado; CPU contra CPU ofrece observación y se resuelve tras 5 s, con tope interno de rondas. No hay búsqueda estratégica ni balance validado.

### 4.4 Misiles y mantenimiento

`doMissileBuild()`: coste 1 Pu, máximo 5; no fabricar después de disparar si `buildBeforeFire`. `doMissileFire()` permite enemigo remoto; defensor consume misil para interceptar D6≥4. El atacante tira otro D6 y escoge una baja alcanzable: soldado siempre; mech/aircraft ≥5; scorpion 6. Los dados de intercepción están fijados a D6 aunque el editor permita otro valor. Se pretende conservar la última unidad, pero se comprueba AP≤1: un único mech/aircraft/scorpion puede ser destruido y dejar el territorio vacío.

Mantenimiento vigente (`engine.js:683`): D12 por base, explosión en 1. El humano elige qué bases destruir según el número de explosiones; CPU usa los índices de dados. Con aircraft conserva aeronaves y elimina terrestres; sin aircraft hace `soldiers=Math.max(1,soldiers)`, conserva todos los soldados existentes y elimina mechs/scorpions. No equivale a dejar un único superviviente. El camino antiguo `combat.js:runEndPhase()` no es el utilizado y referencia además `fk` no definido al explotar.

La habilidad Libertos `applyLibertosScorchedEarth()` está definida (+1 misil, +1 mech, +2 Pu), pero no tiene llamadas en el flujo activo inspeccionado; no se dispara al destruir bases.

### 4.5 Victoria y derrota

`engine.js:794` codifica para todas las facciones participantes vivas:

| Facción | Condición evaluada |
|---|---|
| IMPERATORS | 5 regiones completas |
| LIBERTOS | Bases globales ≤ número de jugadores |
| TAL-MAUT | 2 ejércitos eliminados |
| EREBUS | Bases propias en 7 regiones distintas |
| PROMETHEUS | Al menos techo(bases globales/2), si hay alguna |
| SHININ | AP propios estrictamente superiores a cada rival en 7 regiones |
| General | Solo queda una facción viva |

No se evalúan en los momentos inicio/fin de turno que anuncian FDATA y textos: las llamadas activas encontradas son posteriores a conquistas. Una construcción o explosión puede satisfacer una condición sin comprobarla inmediatamente.

**No hay finalización funcional fiable:** todas llaman a `declareWin`, inexistente. Además, el wrapper `declareVictory` inline captura su propia declaración por hoisting y se llama recursivamente. No basta con renombrar una función: faltan ganador remoto/local, parada del motor, momento de comprobación y cierre online coherente. La facción sin territorios se marca muerta, pero la eliminación se acredita siempre a G.pf y el orden de turnos no la salta.

## 5. Mapa, SVG y UX

`map.js:80` crea un espacio 1400×787; background y capas residen en `world-g`. Hexágonos flat-top, radio nominal 44 y polígono visible 42. Las coordenadas ya están precalculadas en data; el motor usa `adj`, no proximidad visual. Antártida tiene tres polígonos dobles de diez vértices, cada uno es un único nodo/territorio. Se verificaron 59 IDs únicos, 12 regiones, ningún vecino inexistente, reciprocidad de todas las adyacencias y conectividad total.

Cada territorio crea grupos/polígonos/texto con IDs `tg-/tc-/tr-/uig-/tu-/tn-`. `onTerritoryClick()` prioriza callbacks de setup/refuerzo, ataque pendiente y modos nuclear/misil/movimiento; termina en selección o ataque. La selección actualiza panel y botones. Algunos botones conservan IDs repetidos entre HTML oculto y acciones dinámicas, por lo que cambios futuros requieren revisar el DOM efectivo.

`updateMap()` está en engine, no en map: recorre territorios, cambia color/borde, vacía/recrea etiquetas de tropas y aplica transformaciones. Cámara (`ui.js:131`) usa arrastre, rueda, touch pan/pinch y ajuste al redimensionar. Incluso un pan llama al redibujado completo: riesgo de trabajo DOM innecesario, no un problema de FPS medido. El log no tiene límite de entradas. `drawAdjLines()` inserta líneas antes del primer hijo de world-g, quedando bajo el fondo: su visibilidad requiere revisión.

Assets están duplicados en archivos y base64 (`assets.js` ~428 KiB, standalone ~620 KiB en disco). El README describe conversión dinámica, pero no existe en el archivo activo. La revisión visual de captura 1440×900 confirmó tablero y paneles; mostró textos muy pequeños y densidad alta. No se midieron contraste, navegación por teclado, lectores de pantalla ni móviles reales. No se propone rediseño en esta fase.

## 6. Reglas y documentación: diferencias relevantes

| Tema | README/textos heredados | Entrada activa |
|---|---|---|
| Online | Planificado | Código Auth/Firestore/salas/reconexión presente |
| Estado | `js/state.js` como fuente | G en data y G_step en engine; state no cargado |
| Nuclear | 5 Pu | Regla/acción 4 Pu; algunos controles aún usan 5 |
| Mantenimiento | D20 | D12; descripción STEPS todavía D20 |
| Movimiento | 3 saltos; texto permite vuelo libre | BFS 2 para todas las unidades |
| Combate | Ataque y movimiento posterior | Solo ataque en STEPS.combat |
| Habilidades/objetivos | Reglas antiguas del README/lobby/VICTORY_DETAIL | FDATA y checkWinCondition contienen otra versión; TAL-MAUT diverge entre rutas |
| Assets | Cargador que convierte imágenes | Constante base64 generada previamente |
| Online previsto | Transacciones, deltas, Cloud Functions | Writes separados, snapshots completos y decisiones cliente |
| Territorios | Comentarios/recursos nominales de 60 | 59 reales, tamaños REGIONS coherentes |

El editor presenta parámetros que no gobiernan todos los caminos. Por ejemplo, coste de mejoras, límite aircraft, dado de intercepción y orden de fases. Flags como `maintenanceEnabled` no se consultan en la ruta de mantenimiento activa. La interfaz permite cambios durante partida y no comparte RULES online. Antes de corregir, el propietario debe validar qué reglamento constituye la especificación; comentarios “PDF” no bastan.

## 7. Persistencia y multijugador

### 7.1 Esquema y ciclo de sala

`ONLINE` encapsula db/auth, userId/roomId, flags y desuscripciones. `init()` usa Auth anónima; localStorage guarda `nuke_userId`, `nuke_roomId`, `nuke_roomCode`. No hay guardado local de partida.

```text
rooms/{roomId}
  meta: code, host, status, createdAt, players[uid]{name,faction}, playerOrder,
        totalPlayerCount (al iniciar)
  state: snapshot parcial de G
  actionSeq: 0 (no se incrementa ni ordena con él)
  actions/{autoId}: type, payload, playerId, ts
```

Host crea código de seis caracteres. Invitado busca código con estado waiting/setup. El lobby permite inicio con ≥2 humanos y facción seleccionada, rellenando CPU hasta el total elegido 3–6. No hay comprobación transaccional de unicidad de facciones ni límite robusto de humanos frente al total; la UI bloquea elecciones ya tomadas solo según su snapshot.

Inicio escribe status playing y GAME_START; cliente llama a `_launchOnlineGame`, crea conjunto `_onlinePlayerFactions` y arranca setup. Las dos señales de inicio están protegidas parcialmente por `_gameAlreadyLaunched`.

### 7.2 Sincronización y reconexión

`pushActionWithState()` serializa round/phase/currentFaction/territories/factions/setup/playerCount/eliminatedArmies; escribe `state` en room y después añade evento con `_G`. No es transacción. Los errores de escritura de snapshot se silencian y los de acciones se registran sin propagación fiable.

La suscripción escucha todos los eventos ordenados por ts; ignora los del propio UID, pero no usa cursor, secuencia aplicada ni deduplicación. `_applyRemoteG()` mezcla snapshot preservando cámara; los eventos llaman directamente a pasos locales. Eventos: GAME_START, SETUP_ROLL/NEXT_STEP/SYNC, GAME_PHASE_START, END_PHASE, NEXT_STEP, FULL_SYNC.

Reconexión lee room, restaura identidad/estado, vuelve a escuchar todo el historial y reconstruye UI. Reinicia G_step.idx a cero y usa G.currentFaction, que permanece desactualizado después del inicio. El conjunto de humanos solo se reconstruye si ya existía `_onlinePlayerFactions`, condición que no se cumple en una carga fresca del index. También sustituye playerCount por número de humanos, perdiendo CPU. No hay persistencia de reglas, contexto de combate, callbacks o acciones en curso.

### 7.3 Problemas comprobados y límites de seguridad

- **R:** receptor NEXT_STEP asigna idx enviado y llama a nextStep, que incrementa otra vez; idx=1 termina en 2.
- **R:** cliente invitado ejecuta CPU en `runCurrentStep()`; falta guard de host. Esto permite simulaciones aleatorias independientes.
- **C:** deploy combinado no emite sync en botones automáticos/colocación nuclear; también procesa CPU sin `_amHost`. Los handlers remotos siguen el flujo soldiers/nuclear antiguo.
- **C:** snapshots no incluyen G_step/RULES y reconexión reproduce acciones históricas. Riesgo alto de divergencia, pérdida de progreso y reinicio.
- **C:** los nombres remotos se insertan mediante innerHTML en `_renderWaitingRoom`/`_buildWrFactionGrid` sin escape. Riesgo de inyección HTML/XSS; no se ejecutó payload contra servicio alguno.
- **C:** no se incluyen reglas Firestore, índices, emuladores ni Cloud Functions. No se puede concluir si el servicio permite accesos indebidos. La configuración web Firebase está versionada; su presencia no demuestra por sí misma exposición de una credencial privada. No se reprodujeron sus valores en estos documentos.
- **C:** no hay validación autoritativa de turnos, estados o resultados en el código de este repositorio. El cliente acepta snapshots remotos.
- **C:** desconexión puede llamar a `localStorage.clear()`, con alcance a todo el origen. El SW también elimina cachés de otros nombres del origen.

No se contactó el proyecto Firebase ni se crearon salas. Disponibilidad, cuotas/costes, reglas reales y comportamiento de varios navegadores quedan sin verificar.

## 8. Hallazgos priorizados y reproducciones

P0: bloquea cierre/coherencia básica. P1: compromete reglas o progreso. P2: mantenibilidad/operación. Las prioridades son recomendaciones para trabajo posterior, no cambios realizados.

| ID | Prioridad / evidencia | Hallazgo, reproducción y resultado |
|---|---|---|
| H01 | P0, R VM | `engine.js:checkWinCondition`: fijar order=['imp'] y llamar; esperado declarar ganador, obtenido `ReferenceError: declareWin is not defined`. |
| H02 | P0, R Chrome | `index.html:declareVictory`: llamar con un objetivo; esperado overlay, obtenido `RangeError: Maximum call stack size exceeded`. Captura recursiva por hoisting. |
| H03 | P0 online, R VM | `engine.js:nextStep` + `online.js:NEXT_STEP`: recibir payload idx=1; esperado índice 1, obtenido 2. |
| H04 | P0 online, R VM/C | `engine.js:runCurrentStep`: invitado online, turno CPU clt, idx reinf; ejecuta executeCpuStep aunque isHost=false. Deploy tampoco centraliza CPU. |
| H05 | P1, R VM | `checkElimination`: pf=imp, atacante/turno clt, erb sin territorios; se acredita imp=1/clt=0. No comprueba si ya fue eliminado. |
| H06 | P1, R VM | `endPhaseForFaction`: order imp/lib/clt, lib.alive=false; fin de imp sigue a lib. Esperado saltarla. |
| H07 | P1, R VM | `confirmNukeDestroy`: territorio con 5 soldados, 1 mech, sin aircraft; quedan 5 soldados. Esperado según intención escrita un terrestre superviviente. La misma fórmula está en applyExplosions. |
| H08 | P1, R VM/C | `doUpgrade`: configurar mech 9 soldados/8 Pu, empezar 10/20; queda 7/19 con un mech: ignora configuración. Costes/límites y dado de misil hardcodeados. |
| H09 | P1, C | `combat.js:doMissileFire`: único mech tiene AP=3, supera guard AP≤1 y puede eliminarse. Afecta ocupación y reglas de última unidad. No E2E. |
| H10 | P1, C | `setup.js:doPlaceSoldier` retorna a flujo soldiers antiguo y puede finalizar deploy sin nucleares; popup no abre con soldados=0 aunque queden mechs. Probar manual/mixto. |
| H11 | P1 online, C | `setupStep_Deploy_ForFaction`/`activateNuclearMode_Setup`: faltan sync y espera de humanos; pueden divergir tableros o quedar bucles de espera. No se probó red real. |
| H12 | P1 online, C | `online.js:_reconnectToRoom/_restoreGameUI/_subscribeToRoom`: pierde paso/CPU, humanos no restaurados en carga fresca y replay sin cursor. No reconexión real probada. |
| H13 | P1 reglas, C | Solo se evalúa victoria tras conquista; habilidad Libertos sin llamadas; TAL-MAUT y número de dados defensivos dependen de ruta. Requiere reglamento acordado. |
| H14 | P1 seguridad, C/riesgo | Nombres remotos en innerHTML; falta escape comprobada, explotación no probada. Reglas/autoridad remota no auditables con este árbol. |
| H15 | P2, R parseo/C | `js/state.js`: redeclaración G_combat (y duplicados adicionales); no rompe index porque no se carga. No debe importarse como módulo de estado. |
| H16 | P2, C | SW con rutas fijas y cache-first versión v1; faltan fuentes/SDK/iconos para autonomía completa, no cachea dinámicamente recursos. Registro falla si se sirve raíz sin /nuke3000/. |
| H17 | P2, C/riesgo | Redibujado de tropas durante pan, log ilimitado, duplicados y globals. No rendimiento medido ni justificación para refactor amplio inmediato. |

Otros límites observados: `jumpToStep` se invoca desde puntos de progreso completados pero no está definido; controles dinámicos y ocultos pueden compartir ID; modos de acción no se limpian sistemáticamente al avanzar; CPU no desarrolla economía ni movimiento. No convertir automáticamente estas observaciones en nuevas funcionalidades sin priorización.

## 9. Verificaciones realizadas

### Herramientas y aislamiento

Se reutilizaron Node **22.23.3**, Python **3.9.6**, Google Chrome instalado y Playwright ya existente en el proyecto vecino `language-trainer`. No se instaló ni modificó ninguna dependencia. Scripts temporales fuera del repositorio: `/tmp/nuke3000-audit.cjs` y `/tmp/nuke3000-browser.cjs`. Son artefactos de auditoría, no una suite mantenida. Las reproducciones esenciales también quedan descritas arriba para que no dependan de conservar /tmp.

La prueba del navegador utilizó servidor HTTP en loopback y un contexto limpio. Bloqueó **todas las peticiones externas** y los service workers: no autenticó ni escribió en Firebase. Por ese bloqueo se observó `firebase is not defined` en la carga de firebase-config; es una limitación deliberada de la prueba, no un diagnóstico de caída del servicio. El resto del recorrido local continuó.

El sandbox inicialmente impidió escuchar un puerto local (EPERM); se ejecutó después con permiso de entorno. Un error en el script temporal al obtener el puerto se corrigió antes de obtener los resultados siguientes; no afectó al código del proyecto.

### Resultados

| Comprobación | Resultado y alcance |
|---|---|
| Git remoto/copia | Remoto válido, HEAD/base identificados, clon inicial limpio; rama documental separada |
| Parseo JS | 11 de 12 archivos JS inspeccionados pasan; falla solo state.js no cargado. Incluye scripts raíz y todos los de js/ |
| Scripts inline | Dos bloques de index y dos de standalone pasan parseo |
| Grafo | 59 únicos, 12 regiones con tamaños correctos, 3 dobles antárticos, 0 vecinos ausentes/asimetrías, todos alcanzables |
| Ingresos idempotentes | Prometheus con una base: dos llamadas en ronda dejan 3 Pu y 1 refuerzo; no duplicación |
| Reproducciones de fallos | H01, H03–H08 y guard CPU reproducidos con VM y UI sustituida; H02 en Chrome real |
| Arranque HTTP/Chrome | Lobby visible, startGame crea 59 territorios y 59 grupos SVG, activa setup 3J |
| Recorrido local parcial | Se fijó orden imp/lib/clt después de iniciar, evitando animación/tiradas; reclamación automática de 59 y despliegue real por botones completan setup |
| Recursos de setup | 60 soldados por participante; mechs IMP=4, LIB=6, CLT=4; primera fase prep, imp, índice 0 |
| Refuerzos | Botones COLOCAR REFUERZOS y AUTO-DISTRIBUIR llevan al índice 2, pendientes=0 |
| Visual escritorio | Captura de juego 1440×900 inspeccionada: tablero, tres facciones y panel de mejoras visibles |
| Standalone | Carga HTTP sin pageerror en prueba aislada; startGame definido, 59 territorios. No recorrido completo |

Las pruebas VM cargan las fuentes reales y sustituyen funciones de UI/temporizadores para aislar lógica. Para NEXT_STEP se expuso temporalmente el handler privado en la copia en memoria; el archivo del repositorio quedó intacto. No equivalen a integración con Firestore.

**No aplicable:** instalación npm, build, lint o typecheck propios, porque no existen manifiesto ni configuración. **No verificado:** partida completa, balance, todas las facciones/3–6J, dados/desempates E2E, deploy manual completo, todas las rutas de batalla/misiles, móvil real/accesibilidad, persistencia PWA/offline, despliegue público y salas/reconexión Firebase reales. No se declara que estas áreas pasen QA.

## 10. Fortalezas y mejoras potenciales

Fortalezas comprobadas: despliegue estático sencillo, sin dependencias locales de build; grafo coherente; datos/reglas centralizados parcialmente; recorrido local inicial ejecutable; unidades y bases visibles sobre SVG; protección contra ingreso duplicado; interfaz de edición útil para playtesting. Los fallos de cierre/sincronización impiden considerar el conjunto estable.

Orden recomendado, **sin implementación en esta fase**:

1. Validar reglamento vigente y acordar la fuente canónica (index frente a standalone). Convertir H01/H02/H05/H06 en regresiones antes de reparar cierre, ganador y turnos.
2. Unificar autoridad y secuencia online: CPU solo host, avance exactamente una vez, deploy sincronizado, snapshots con fase/paso/reglas y reconexión sin replay completo. Revisar reglas Firestore con acceso explícito a su configuración.
3. Consolidar invariantes de reglas: cantidad de unidades frente a AP, supervivencia, mejoras configurables, bonificaciones, momento de victoria y refuerzos manuales/automáticos.
4. Probar preparación manual/mixta y añadir cobertura pequeña de dominio más un recorrido local y otro de dos clientes. No hace falta introducir infraestructura de pago.
5. Escapar nombres, validar acciones/entradas y limitar el alcance de limpieza de storage/cachés.
6. Actualizar textos/README; decidir retirada o generación de variantes antiguas con autorización. Evitar refactor general hasta tener reglas y regresiones claras.
7. Medir DOM/FPS y móvil antes de optimizar renderer o rediseñar UI. Mejorar CPU solo después de asegurar reglas y motor.

Preguntas de validación funcional: ¿qué versión del reglamento manda? ¿cuándo gana cada facción y cómo se resuelven victorias simultáneas? ¿qué significa dejar una unidad, qué sobrevive a explosión y cómo funciona Libertos? ¿el rango es por acción o por fase y los aircraft vuelan libremente? ¿se mantiene standalone como producto soportado? ¿online es prioritario y con qué política de host/reconexión?

## 11. Documentación y entrega Git

Archivos nuevos autorizados: `R2_PROJECT_CONTEXT.md` (entrada compacta, mapa de fuentes, comandos y advertencias para retomar) y `docs/PROJECT_ANALYSIS.md` (este informe). No se modificó README ni código durante el análisis. No se hizo commit, push, merge ni despliegue; los documentos quedan como cambios locales revisables en `docs/r2-project-analysis`, basada en main verificada.

Comprobación de continuidad: el contexto identifica commit, entrada activa, copias no usadas, G/G_step, mecánicas actuales, comandos sin instalación, fallos prioritarios y dónde ampliar cada tema. Una nueva sesión puede seleccionar archivos por tarea sin repetir el análisis completo. Mantenerlo actualizado tras cambios validados; no cargar automáticamente todas las fuentes ni este informe entero.

## 12. Desarrollo posterior — 28/10/2026

Comenzada estabilización en dev/stabilization-gameplay. Diagnóstico histórico intacto; estado actualizado en KNOWN_ISSUES.md y plan en IMPROVEMENT_PLAN.md. Se implementan regresiones y correcciones parciales del bloque A. No se certifica partida completa ni se cierran los bloques B–E.
