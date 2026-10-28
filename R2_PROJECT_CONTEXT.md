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
