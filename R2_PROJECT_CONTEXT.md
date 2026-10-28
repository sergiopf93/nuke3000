# Estado vigente — miniaturas oficiales y dados comunes

Solicitud: `PROMPT_PARA_R2.md` y ZIP NUKE3000 de animaciones. Se sustituye solo presentación: recortes PNG oficiales, escena transparente sobre el mapa original y DiceSequence común a sorteo/desempates, combate, intercepciones, accidente y mantenimiento. Se retiran SVG genéricos y efectos ornamentales sobre el tablero. No se integra el fondo de la demo ni su motor ficticio.

Nuevos módulos: `js/dice-sequence.js`, `js/phase-visuals.js`; `battle-scene.js` sustituido. Hooks de presentación en setup/v4-game/combat/online. Estado lógico V4, preset V3, mapa y motor puro conservados. El resultado se decide/sincroniza antes de representar; promesas finitas y registros locales fuera de G impiden bloqueos o duplicados. Observadores no tiran dados.

337 tests Node; ocho escenas grabadas en escritorio/móvil, casos de intercepción/cadena/cancelación, regresiones V3/V4, dos clientes y partidas completas cuatro jugadores hasta Libertos ronda4/48 acciones. Comparación con a70a285: geometría/adyacencias/SVG exactos; cero píxeles distintos en las capturas finales de ambos tamaños. Evidencia en `docs/evidence/official-animations/`.

PWA V7: `nuke3000-v7-official-animation`, marca HTML `official-miniatures-v7`. Incluye los nueve PNG y módulos nuevos; actualización desde V6,35 hashes y arranque offline comprobados. Node22/Playwright1.63/Chrome; grabador gratuito de Playwright usado solo en QA, sin nuevas dependencias del juego.

Documentos vigentes: COMBAT_VISUAL_DESIGN y ASSET_INVENTORY. Las descripciones de miniaturas SVG del historial inferior ya no representan el producto actual. Pendientes Safari/iPhone físico, Firebase real/reconexión y fotografías de alta resolución para sustituir los recortes provisionales.

---

## Histórico anterior a las miniaturas oficiales

# Estado vigente — Reglamento V4 y combate cinematográfico (28/10/2026)

Fuente activa: `index.html`, JavaScript clásico, sin build. Desarrollo autorizado directamente en main y publicación tras verificaciones. PDFs originales V4 (13 páginas) y lore V1 (54 páginas) leídos mediante PDFKit; reporte `pruebas/v2.txt` leído. El tablero y sus 60 coordenadas/12 regiones/adyacencias no se modifican.

Nuevas partidas: V4 por defecto; `?rules=v3` conserva preset y recorridos anteriores. `js/rules-v4.js` es motor puro y devuelve estados nuevos; `js/v4-game.js` adapta los flujos existentes. Estado invasor: `territory.attackers[faction]`, sin cambiar owner hasta vencer. Motor y presentación separados: `js/battle-scene.js` recibe before/results autoritativos; nunca tira dados. CSS propio, sin dependencias nuevas.

Cambios: setup de origen con reservas; Libertos 5Pu+5 soldados/sin bases; producción3/Prometeo4; refuerzos regionales y fijos frontera/base3/Shinin5 tras construcción; rearme avión1soldado1Pu; movimiento terrestre2/Érebo4 y transporte; combate obligatorio tipado sin guarnición de invasores/retirada; misiles por etapas e idempotentes; cadenas nucleares BFS; mantenimiento dados sin asignación y elección posterior; recompensas por eventos; objetivos al cierre. Comparación/ambigüedades en RULES_V3_V4_DIFF y RULES_SPEC.

Online V4: V4_STEP con snapshot posterior a transición, cola de envío y snapshotRevision; invasores, eventos de misiles, recompensas y reglas viajan juntos. COMBAT_VIEW incluye before y result; V4_EFFECT no genera lógica. Esquema2 para V4, preset antiguo conservado. No confundir transporte de pruebas de dos Chrome con Firebase real/reconexión certificada.

Comprobaciones: `npm test` (318 tests), `npm run test:browser` (V3 explícito), `npm run test:v4:browser`, `npm run test:v4:e2e` y `npm run test:v4:e2e:mobile`. Node22 obligatorio. Playwright1.63 reutilizable mediante PLAYWRIGHT_MODULE si no está instalado localmente. Nuevos tests tienen fixtures de integración separados de partidas reales con solo semilla/aceleración.

PWA: caché `nuke3000-v6-rules-v4`, marca HTML `rules-v4-v6`; incluye todos los módulos nuevos y CSS de escena. Validar SW tras última edición y comprobar hashes públicos tras push.

Pendiente de validación humana: dirección artística y Safari/iPhone físico. No hay sonido ni modelos3D. Miniaturas SVG originales esquemáticas, retratos originales existentes. Mantener el historial inferior como V3, no como especificación actual.

---

## Histórico anterior a la migración V4

## Correcciones de combate y misiles — 28/10/2026

El propietario autoriza trabajar directamente en `main`, hacer push remoto por SSH y publicar mediante GitHub Pages. Referencia de pruebas: https://sergiopf93.github.io/nuke3000/. Esta autorización sustituye las restricciones históricas de publicación indicadas más abajo.

- Defensa siempre automática: máximo de dados permitidos, por caras descendentes; en igualdad, mech antes de aircraft. El atacante conserva selección y guarnición. `Battle.round` ignora selecciones defensivas externas.
- Misil por etapas: lanzamiento/consumo inmediato → decisión e intercepción válida (D6≥4) → solo si pasa, impacto D6 → selección de baja entre los tipos presentes elegibles. Soldado con 1–6, mech/aircraft con 5–6, scorpion con 6. Sin objetivo válido no hay baja; última unidad protegida y construcción posterior al disparo bloqueada.
- Todos los combates abren ventana. CPU automática: 900 ms de preparación, 1600 ms de resultado entre rondas y 2200 ms de resultado final antes del callback. Cerrar el resultado no duplica el callback ni exige SIGUIENTE. Los observadores online reciben `COMBAT_VIEW`, sin tirar ni decidir defensa.
- SW `nuke3000-v5-combat-missiles`: caché nueva completa, retirada de anteriores y recarga automática única de ventanas antiguas. Marca HTML `combat-missiles-v5` verificable.

Validación: 222 tests Node (121 anteriores adaptados +101 regresiones); Chrome real 1440×900 y táctil 844×390 para humano/CPU, CPU/humano y CPU/CPU con pausas sin acelerar; dos clientes para humano/humano y CPU/humano, sin selección defensiva, con transporte local. Matriz adicional 667×375, 932×430, 390×844. Partidas completas desde lobby/setup hasta Libertos ronda 12, escritorio y horizontal, 121 acciones UI en cada una, sin mutar estado desde el test (solo semilla y aceleración de temporizadores). Prueba SW real desde `19130f4`: actualización sin intervención, SHA256 de siete recursos y arranque offline con 60 territorios.

La última conquista ganadora conserva la tirada 2200 ms antes de mostrar victoria, también en los clientes remotos; ganador y bloqueo de acciones inmediatos. GAME_FINISHED incluye la presentación final y evita snapshots redundantes posteriores.

Código publicado y probado en Pages (3c2f931): combate/misiles en escritorio y horizontal, upgrade público v4→v5 y hashes coincidentes. Se refuerza después la precarga SW con cache:reload (regresión SW pasa) para evitar también caché HTTP anterior; el último SHA y despliegue se verifican en la entrega.

Mapa, 60 territorios, costes y demás reglas V3 conservados. Pendientes: Safari/iPhone físico y Firebase real/reconexión/autoridad de servidor. Evidencia y resultados de publicación en [docs/evidence/combat-missiles/README.md](docs/evidence/combat-missiles/README.md). Las secciones siguientes son historial.

## Estado vigente — coherencia visual y main local, 28/10/2026

El propietario autoriza expresamente desarrollar, probar y hacer commits en **main local**, integrando dev/mobile-gameplay-ux por fast-forward. Se conservan las ramas dev/stabilization-gameplay (ec9a955) y dev/mobile-gameplay-ux (cd5d921); no hay autorización de push ni despliegue. Esa instrucción sustituye temporalmente el flujo de ramas anterior. La base completa se probó desde main antes del rediseño; se corrigió una comparación frágil por un píxel del borde variable del código de sala.

Revisión visual: css/visual-system.css, fuentes originales Orbitron/Rajdhani locales con alias limitados a la UI, controles oscuros, jerarquía semántica de botones y combate dividido en bandos con dados/perdidas y acciones fijas. No se modifican engine.js, battle.js, data.js, map.js, assets.js ni game.css. Los únicos cambios de combat.js son representación/inserción de selectores; las reglas y resultados se conservan. [Sistema visual](docs/VISUAL_SYSTEM.md), [evidencia](docs/evidence/visual-consistency/README.md). Safari real pendiente: Playwright no soporta WebKit en el macOS12 disponible. Validación actual: 121 tests pasan, matriz visual completa y dos E2E desde main hasta Libertos ronda12 (233/190 acciones, sin errores JS). Se corrigió y probó una prioridad CSS de acciones principales detectada al inspeccionar las capturas. El contexto previo se conserva como historial debajo.

## UX/UI actual — 28/10/2026

Rama `dev/mobile-gameplay-ux` desde `ec9a955`; estabilización y main preservadas. Primera iteración horizontal: nuevo adaptador js/mobile-ux.js y css/mobile-ux.css, inspector de territorios, recursos/panel contextual, jugadores/registro bajo demanda, ataque origen→destino, movimiento sin modo previo, combate rápido con detalle opcional y gestos Pointer Events. Tablero/datos/paleta/fondo/Battle intactos. Se conservan las 121 regresiones y todas las decisiones V3. Pruebas táctiles emuladas a 667×375, 844×390, 932×430 y 390×844; escritorio 1440×900. Dos clientes Chrome con transporte local; E2E completo 3J: Libertos ronda12 en escritorio (233 acciones) y horizontal touch (190). Comparación visual desktop sin diferencias fuera de zonas dinámicas documentadas. [UX y conteos](docs/UX_MOBILE.md), [evidencia](docs/evidence/mobile-ux/README.md). Pendientes validación del propietario, dispositivo físico/Safari y Firebase real; sin push/merge/despliegue. npm run test:browser incorpora la nueva matriz; npm run test:e2e:mobile ejecuta la partida táctil. Node22/Playwright existentes. El contexto anterior se conserva debajo como historial.

## Desarrollo posterior — 28/10/2026

Rama `dev/stabilization-gameplay`, main `93eba1e`. Bloque A: estabilización local implementada y validada, lista para validación del propietario; sin avanzar al rediseño móvil. Motor común js/battle.js, bajas/degradaciones V3, combates CPU automáticos, seis objetivos en su momento, turnos vivos, setup de 60 territorios, mantenimiento, mejoras, misiles, refuerzos y transporte. 121 tests Node, simulaciones completas 3–6J; integración Chrome, dos clientes Chrome con transporte local y E2E real 3J hasta Libertos ronda 12, 233 acciones UI, sin mutar estado desde el test. Evidencia en docs/evidence/block-a. Todas las discrepancias detectadas resueltas por el propietario: 4 Pu, Aircraft ≥5, Libertos solo nuclear propia/mech inmediato, Shinin superioridad estricta, una vez por fase y construir misiles antes de disparar. Mapa intacto 60/7 Rusia. [Plan](docs/IMPROVEMENT_PLAN.md), [incidencias](docs/KNOWN_ISSUES.md), [reglas](docs/RULES_SPEC.md), [pruebas](docs/TEST_STRATEGY.md). Node22 y Playwright; Firebase real/reconexión, E2E amplio y móvil pendientes. Sin push/merge/despliegue. Resto del archivo: contexto histórico inicial.

# R2 — Contexto de NUKE3000

## Alcance y referencia

Análisis: 2026-10-28. Repositorio verificado: https://github.com/sergiopf93/nuke3000 (origin). Base: `main`, commit `93eba1e36927a5811b4e391c1a147db5d7f0686f`, 2026-09-26. Copia local: `/Users/sergiopardo/Desktop/nuke3000`. Rama del análisis: `docs/r2-project-analysis`.

Este documento es el punto de entrada. El [análisis detallado](docs/PROJECT_ANALYSIS.md) contiene evidencias, reproducciones, prioridades y límites de validación. No cargarlo entero por defecto. Las conclusiones describen esta revisión, no certifican versiones posteriores.

## Producto y estado real

Playtester web de un juego de estrategia posapocalíptico: 3–6 facciones, 12 regiones, **59 territorios**, conquista, ejércitos, plutonio, misiles y bases nucleares. Permite un humano contra CPU y contiene salas multijugador con Firebase. Es un prototipo funcional parcial, no una versión estable validada de principio a fin.

El README se presenta como v0.3, pero sus reglas y su descripción del online están desactualizadas. Los comentarios mencionan un reglamento PDF V3 que no está en el repositorio. No asumir que los textos del lobby reflejan las reglas ejecutadas.

## Stack y ejecución

HTML/CSS/JavaScript clásico, sin framework, módulos ES, npm, build, TypeScript ni suite de tests. SVG generado con DOM. Firebase compat **10.12.0** desde CDN: Auth anónima y Firestore. Google Fonts. PWA con `sw.js` y `manifest.json`; rutas fijadas a `/nuke3000/`.

Desde el repositorio:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
# Abrir http://127.0.0.1:8080/ (el SW no coincide con esta ruta)
```

Para servir también bajo el prefijo previsto, desde su carpeta padre:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
# Abrir http://127.0.0.1:8080/nuke3000/
```

No hace falta instalar dependencias. Para sintaxis: `node --check js/engine.js` y equivalentes, con Node moderno; en este entorno se usó Node 22.23.3 de `~/.nvm/versions/node/`. El `node` del PATH era 13.5.0. No existen comandos propios de lint/tests/build. `js/state.js` falla por declaraciones duplicadas, pero no está cargado por la aplicación.

## Arquitectura y archivos a consultar

`index.html` es la entrada vigente. Orden: assets → data → setup → map → engine → combat → ui → online → firebase-config → script inline del lobby. Todo comparte el ámbito global y el orden importa.

| Área | Fuente efectiva y responsabilidad |
|---|---|
| Datos/reglas | `js/data.js`: `TERRITORIES_DEF`, `REGIONS`, `FDATA`, `DEFAULT_RULES`, `RULES`, `G` |
| Inicialización/mapa | `js/map.js`: `initGame`, `buildMap`, hexágonos, enlaces SVG |
| Preparación | `js/setup.js`: tiradas/desempates, reclamación rotativa, despliegue |
| Motor | `js/engine.js`: `STEPS`, `G_step`, ingresos, CPU, mantenimiento, victorias; también `updateMap`, clics y mejoras |
| Combate | `js/combat.js`: dados, bajas, conquista, movimiento, refuerzos, misiles |
| Interfaz | `js/ui.js`, `css/game.css`: tarjetas, reglas, log, pan/zoom/touch |
| Online | `index.html` inline + `js/online.js` + `js/firebase-config.js`: salas, usuarios, snapshots y acciones |
| Recursos | `js/assets.js` contiene base64; `assets/` conserva imágenes; `icons/` contiene iconos PWA |
| Variantes antiguas | `nuke3000-standalone.html` ejecuta su propia copia; `js/state.js` y `/setup.js` no son cargados por index |

No editar las copias antiguas creyendo que son la fuente activa. `buildTerritoryData()` y `REGION_SIZES` también conservan datos antiguos sin uso en el flujo actual. No hay generador de standalone/assets documentado en el árbol.

## Estado y flujo

`G.territories[id]`: región, centros SVG, adyacencias, propietario, soldados/mechs/aircraft/scorpions y `hasNuclear`. `G.factions[fk]`: recursos, reservas de setup, estado alive, refuerzos pendientes y contadores. Las tropas en el tablero viven en territorios; no confundirlas con las reservas de facción.

`G.setup`: orden, tiradas, índices, reservas, callback de clic y `_inSetup`. `G_step`: fase, índice, facción activa y `isMyTurn`. `G_combat`: contexto temporal y callbacks. `G` mezcla además selección, modos, cámara y callbacks; no es un estado de dominio puro.

Flujo: lobby → `startGame()` → `initGame()`/mapa → `startSetupPhase()` → D6 con desempates → reclamar hasta agotar 59 territorios (un soldado por reclamación) → desplegar unidades y nucleares → fases por facción → siguiente facción/ronda.

Fases activas: preparación (ingresos, refuerzos, mejoras, movimiento, misiles, nuclear), combate (**solo ataque**), final (reagrupar, mantenimiento). El antiguo paso `cmove` tiene código pero no está en `STEPS.combat`.

## Mecánicas efectivas

- Ingresos: 2 Pu/base; refuerzos = suelo(territorios/2) + suelo(tamaño/2) por región completa + bases. Prometheus suma 1 Pu/base; Shinin suma 1 soldado/base. Guard contra ingreso duplicado por ronda.
- Refuerzo manual en bases, Erebus en cualquier territorio propio; sin bases, un territorio elegible por región. El automático no aplica todas estas restricciones.
- AP: soldado 1, mech/aircraft 3, scorpion 6. Mejora: 3 soldados + 1 Pu → mech/aircraft; 2 mechs + 1 Pu → scorpion; máximo 5 aircraft. Estos costes están hardcodeados aunque el editor los ofrece.
- Movimiento BFS por territorios propios, rango por defecto **2**, también para aircraft. El popup reserva una unidad. No se registra movimiento acumulado por unidad.
- Ataque adyacente desde UI; dados D6/D12/D12/D20, máximo 5 ataque/4 defensa, empates a defensa, bajas más baratas primero. Hay divergencias entre resolución interactiva y CPU.
- Misiles: 1 Pu, máximo 5, fabricar antes de disparar; objetivo enemigo sin exigir adyacencia; intercepción D6≥4; soldado alcanzable siempre, mech/aircraft ≥5 y scorpion 6. Protección de última unidad defectuosa por usar AP.
- Base nuclear: **4 Pu**. Mantenimiento **D12**, 1 explota. La resolución de supervivientes es defectuosa.
- Objetivos codificados: IMP 5 regiones; LIB bases globales ≤ jugadores; CLT 2 eliminaciones; ERB bases en 7 regiones; PRM al menos mitad de bases; SHN superioridad AP estricta en 7 regiones. Su cierre falla: no presentar estas victorias como funcionalmente validadas.

## Persistencia, límites y prioridades

Local: partida/reglas en memoria, sin guardado. Online: `rooms/{id}` con meta/state y subcolección actions; localStorage guarda identidad/sala. Se publican snapshots completos parciales de G y eventos; no hay transacciones ni autoridad de servidor en el código. No se guardan RULES ni G_step. Reglas Firestore/Cloud Functions no incluidas; no inferir su configuración remota.

Prioridad antes de nuevas funciones: cierre de victoria (`declareWin` inexistente y wrapper recursivo), atribución de bajas/rotación, divergencias de pasos online, despliegue online y reconexión. Después: coherencia reglamento–UI–motor, supervivientes/AP, CPU, duplicados y rendimiento. Detalle y reproducciones: análisis, secciones 8–10.

Verificación: sintaxis de entrada activa, grafo, pruebas aisladas y recorrido local parcial en Chrome; no se certifica partida completa ni multijugador real. No se contactó Firebase durante QA. El informe detalla resultados exactos.

## Retomar eficientemente

1. Leer este archivo y `git status`; confirmar HEAD y cambios del usuario.
2. Elegir el módulo en la tabla; consultar solo la sección pertinente del análisis.
3. Acordar la versión del reglamento antes de corregir diferencias de reglas.
4. Conservar alcance: esta fase solo añade documentación. No hubo cambios funcionales, dependencias, push, merge ni despliegue.
5. Para desarrollo posterior, respetar instrucciones R2: rama desde main actual, pruebas proporcionales, diff revisado y autorización explícita antes de merge. Actualizar README antes de un merge autorizado; mantener este contexto con cambios relevantes.
