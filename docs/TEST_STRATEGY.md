# Validación de miniaturas oficiales y dados comunes

- `npm test`:337 tests (318 anteriores+19 de eventos/representación). Contratos de dados, bruto/mínimo/bonificación, dirección ganadora/perdedora, bajas tipadas, eventos duplicados, error de renderizado y ausencia de RNG visual.
- `test:cinematic`: ocho vídeos y capturas normales de sorteo/desempate, batalla, misil y mantenimiento en escritorio y móvil horizontal. IDs persistentes tras degradaciones; elección de bases bloqueada durante la tirada. Casos adicionales de intercepción exitosa sin impacto, D12=1 y cadena, cancelación/visibilidad simulada y DOM limitado con ejércitos grandes. Comparativa automática contra a70a285: grafo/SVG exactos y cero diferencias significativas; las capturas finales dan cero píxeles distintos incluso antes de la tolerancia.
- `test:v4:browser`: mecánicas V4 sin regresiones; dos clientes autoritativos en escritorio y touch, cierre automático, intercepciones humanas, retry y transiciones. Sorteo y desempate online con velocidades distintas comprobados: se conserva el D6 futuro y no se cambia de pantalla antes de los dados locales. Las fixtures reglamentarias usan animación mínima o rápida; las grabaciones de presentación usan cinemática normal.
- `test:v4:e2e` / `:mobile`: partidas completas cuatro jugadores, solo semilla/aceleración/preferencia visual, sin escribir estado de partida desde el test. Victoria válida Libertos ronda4,48 acciones UI en ambos tamaños.
- `test:browser`: regresiones V3 explícitas y matriz responsive existente; SW V6→V7 con35 recursos SHA256, retirada de caché anterior y arranque offline60. Firebase-config se neutraliza en el servidor aislado de pruebas y no se compara con su archivo real en ese test.

Grabaciones y evidencia en `docs/evidence/official-animations`. Las escenas aisladas son fixtures explícitas, no partidas completas. No se declara Safari/iPhone físico ni Firebase real verificados. Se ejecutan también node --check de scripts activos e inline y git diff --check. No hay build/typecheck/linter configurados.

---

## Histórico anterior a las miniaturas oficiales

# Validación de la migración V4

Node22+, Playwright1.63/Chrome. Sin nuevas dependencias ni build/typecheck/lint inexistentes. `node --check` para JS activos; `git diff --check`. Suites V3 mantienen expectativas antiguas bajo ?rules=v3, no se borran tests para hacer pasar V4.

- `npm test`:318 deterministas,222 históricos+96V4. Matrices de claims3–6, recursos, facciones, refuerzos, movimiento, transporte, dados tipados/mínimos/bonos/empates, misiles RNG exacto/etapas/ledger/repetición, accidente/cadena/wraparound, objetivos/recompensas.
- `npm run test:browser`: fixtures V3 en escritorio/táctil, dos clientes con transporte controlado, matriz1440×900/844×390/667×375/932×430/390×844, comparación de mapa y SW real (actualización,11hashes, arranque offline60territorios).
- `npm run test:v4:browser`: integración V4 en escritorio/táctil; compromiso y dueño original→bloqueo de pasar→combate sin retirada→conquista; misiles interceptados/no interceptados; mantenimiento varios dados/selección/cadena; fondo regional; base construida después de ingresos recibe refuerzo una sola vez. Dos clientes con RNG solo autoritativo, humanos/CPU, intercepciones repetidas, recuperación sin segundo gasto y transiciones entre fases/turnos.
- `npm run test:v4:e2e` y `:mobile`: partida real4J hasta victoria válida, solo semilla/aceleración permitidas, sin escribir estado. Corrida3J Prometeo alcanza objetivo en primer cierre por poseer4/8bases; cobertura insuficiente por sí sola, por eso4J adicional. Trazas Playwright y capturas en /tmp, selección mantenida en docs/evidence/rules-v4.
- Piloto visual API y V4 integrado Chrome1440/844: resultado real con meca→soldado, aeronave eliminada, dados autoritativos, retorno, omisión, efectos finitos y reduced-motion. La apariencia se revisó en capturas; fidelidad artística necesita validación humana.

Límites: sin Safari físico, Firebase real ni medición de FPS/memoria de hardware. Las fixtures no se presentan como partidas completas; los dos clientes de pruebas no son validación del servicio externo.

---

## Histórico anterior a la migración V4

## Iteración combate/misiles (28/10/2026)

`npm test`: 222 tests de motor/protocolo; conserva 121 anteriores adaptados al comportamiento solicitado. `combat-regressions.test.cjs`: 80 composiciones de defensa, caras/límite configurable, seis caras de intercepción/impacto, elección de cada tipo con 6, ausencia de defensa/objetivos, duplicados y paso bloqueado.

`npm run test:browser`: integración real Chrome con estados preparados (no partidas completas), matriz visual/táctil, dos clientes online con transporte local y upgrade SW real. `combat-flow.browser.cjs` usa pausas reales sin aceleración: ventanas humano/CPU, CPU/humano y CPU/CPU, 2 rondas, bajas/degradaciones, conquista, cierre y callback único; intercepción, impacto/elección y falta de objetivos.

`npm run test:e2e` / `test:e2e:mobile`: partidas completas por UI desde lobby y setup, semilla 123 y temporizadores acelerados; sin mutar estado de juego. El controlador observa ventanas CPU sin pulsarlas. Ambas terminan con Libertos en ronda 12, 121 acciones UI cada una.

`service-worker.browser.cjs`: servidor local bajo /nuke3000/, versión 19130f4 real, instalación v4, cambio a fuentes actuales, upgrade/recarga automática, hashes de caché y arranque offline. Comparación visual: se localizaron 16 píxeles del halo animado en x28–29/y126–137 fuera de la máscara previa; se ajustó solo el halo y se obtuvo cero diferencias del tablero. Se detectó y corrigió una dependencia circular al esperar la navegación dentro de activación. Externos bloqueados intencionadamente; mensajes de red por CDN bloqueados no son errores JS del juego.

[Pruebas, capturas y límites de esta iteración](evidence/combat-missiles/README.md). No certifica iPhone/Safari físico ni Firebase/reconexión.

# Revisión visual sobre main — 28/10/2026

Se conservan las 121 pruebas de motor/protocolo. La matriz de UI añade selector oscuro, fuentes locales, controles dentro del viewport y ausencia de scroll principal en preparación a 844×390; correspondencia entre pérdidas del motor y dados marcados, tirada mixta, refuerzos manuales y construcción nuclear. Se mantienen los recorridos de escritorio, táctiles, remotos y las partidas completas.

La evidencia actual se escribe en `evidence/visual-consistency`, conservando `evidence/mobile-ux` como referencia histórica. `NUKE_UX_EVIDENCE` permite elegir una carpeta temporal. La comparación de píxeles ahora contrasta la escena del tablero; el modal cambia intencionadamente y se verifica por geometría, controles y capturas. El comparador inicial excluía incompletamente el borde del código aleatorio de sala (24 píxeles variables); se localizó y corrigió ese borde antes de validar la base. No se ocultó un fallo de motor.

Se comprobó la integridad exacta de engine.js, battle.js, data.js, map.js, assets.js y game.css frente a cd5d921. [Sistema visual y compatibilidad](VISUAL_SYSTEM.md). No se pudo ejecutar WebKit: la versión de Playwright disponible no lo soporta en macOS12. No se certifica Safari real ni PWA/offline.

---

# UX/UI — ampliación 28/10/2026

Las 121 regresiones de motor del bloque A se conservan. `test:browser` añade matriz táctil de 667×375, 844×390, 932×430 y 390×844, escritorio 1440×900 y comparación visual frente a ec9a955. Se comprueban setup manual, selección, movimiento, mejoras, construcción/lanzamiento de misiles, ataque/defensa, conquista, continuación/retirada, gestos/cancelación, orientación, recursos y cierre de paneles/reglas. Los escenarios preparados no son partidas E2E completas.

El test multicliente admite `NUKE_TOUCH_ONLINE=1`: usa toques en dos páginas 844×390 y conserva las decisiones del humano remoto. Sigue sustituyendo Firestore por transporte local.

`npm run test:e2e:mobile` añade una partida completa UI real 3J a 844×390, `hasTouch` + `isMobile` y `tap()`, sin mutar dominio: Libertos ronda 12, 190 acciones UI; escritorio sigue completando Libertos ronda 12, 233 acciones. Setup, refuerzos, defensa humana, CPU y mantenimiento hasta ganador válido. El PRNG y timers son las únicas inyecciones del E2E.

[Diseño y límites](UX_MOBILE.md), [capturas/resultados](evidence/mobile-ux/README.md). No hay dispositivo físico/Safari ni Firebase real. Las comparaciones desktop excluyen tres zonas explícitas: código de sala, LED animado y tooltip corregido. Se conserva el tablero, datos y cálculo puro sin diff.

Comando nuevo: `npm run test:e2e:mobile`. `npm run test:all` incluye motor, matriz de navegador y ambas partidas completas. Node22 y Playwright existentes, sin nueva dependencia.

---

# Estado actual — bloque A, 28/10/2026

**121 pruebas Node pasan** (sin porcentaje de cobertura inventado): motor, combate puro, integración aislada, simulaciones de partidas completas 3–6J, mapa y validaciones básicas del editor.

- Bajas/degradaciones: matriz 4×4 de atacantes contra defensores y 4×4 inversa; empates por caras/tipo, bonos de todos los dados, guarnición, selección inválida, simultaneidad y combates hasta terminar.
- Victorias: seis facciones, positivos/negativos, momentos propios/ajenos, facciones eliminadas y hooks de transición; fin inmutable.
- Turnos/CPU: turno completo automático, callback único CPU–CPU, timers obsoletos, pasos repetidos, eliminación/rotación/ronda y simulaciones hasta victoria real con semillas 103–106.
- Setup/economía: reservas 3–6J, barrera de pendientes, callbacks viejos, despliegue manual; refuerzos de base/Erebus/fallback, costes y límites.
- Reglas confirmadas: Libertos recompensa propia/mech inmediato, Shinin sin empate, una vez por fase/reagrupamiento y construir misiles antes de disparar.
- Protocolo remoto: siete casos de espera humana, duplicados, remitente incorrecto, cancelación, historial obsoleto, CPU del host y fallo de red sin defensa inventada.
- Nuclear/misiles: elección de todos los tipos terrestres, aircraft, tiradas por base, una resolución por paso; intercepción/dado configurable, impacto Aircraft en 5 y última unidad blindada.

## Navegador y evidencia

`test:browser`: Chrome 1440×900 y 844×390. Incluye fixtures controlados de setup manual soldado→solo mech→central, conquista con guarnición elegida, cancelar/confirmar mejora y contador de misil actualizado mientras su modal permanece abierto; defensa/intercepción remotas por clics. **Son integraciones con estado preparado, no partidas completas.** El viewport horizontal no certifica usabilidad móvil ni dispositivo físico.

`test:e2e`: Chrome real, 3J y valores predeterminados V3; lobby/facción/nombre, tiradas/desempates, auto-reclamación mediante botón, reparto 60, despliegue de unidades/centrales, COMENZAR, refuerzos y turnos, defensas humanas y mantenimiento hasta un ganador real. El test solo inyecta PRNG con semilla y aceleración de timers; observa G, pero no modifica territorios, recursos, fases, reglas ni resultado. Todas las acciones de partida usan clics de navegador. Se acepta cualquier ganador cuyo objetivo se cumple en el estado final.

Recorrido final, con todas las decisiones confirmadas: Libertos ronda 12 (233 acciones UI), semilla 123, cero errores JS. Es la evidencia actual guardada en `evidence/block-a/`: informe JSON, captura final y traza Playwright compacta. Primeros intentos de desarrollo se interrumpieron para corregir selectores del conductor (CONFIRMAR defensa y botones desactivados); no se contabilizan como partidas superadas.

`test:browser` también ejecuta `online-combat.browser.cjs`: dos páginas Chrome, ataque humano contra humano, CPU contra humano en dos rondas, intercepción humana, callback único y estados/recursos coincidentes. Se prepara el estado inicial y se sustituye Firestore por una cola local: integración de navegador, no partida online E2E.

Firebase/configuración externa, fuentes y service workers bloqueados en navegador: ninguna escritura de producción. La traza no equivale a una prueba de Firebase.

```sh
# Node >=22; Playwright 1.63.0 y Chrome instalado
npm test
npm run test:engine
npm run test:browser
npm run test:e2e
npm run test:all
# En esta máquina se reutiliza Playwright ya instalado, sin modificar el proyecto vecino:
PLAYWRIGHT_MODULE=/Users/sergiopardo/Desktop/language-trainer/node_modules/playwright npm run test:e2e
# Abrir evidencia
npx playwright show-trace docs/evidence/block-a/full-game-trace.zip
```

El PATH original tiene Node 13: activar Node 22 con nvm o ejecutar los scripts con `/Users/sergiopardo/.nvm/versions/node/v22.23.3/bin/node`. No se ha ejecutado instalación limpia ni generado lockfile. Se añade únicamente código JS clásico y pruebas, sin framework ni dependencia de producción.

## Cobertura pendiente

Firebase real/emulador, reconexión y recuperación de decisiones en vuelo; E2E de victorias de todas las facciones y partidas navegador 4/5/6J; más escenarios manuales de movimiento/transporte y elección de superviviente nuclear; dispositivos reales; service worker/offline y reconexión. Las simulaciones 3–6J no sustituyen esos E2E. No hay build/lint/typecheck configurados; se comprueba sintaxis de scripts activos e inline, más git diff --check.

## Evidencia previa de Rusia

Fingerprint de los 59 originales y grafo con 60 se mantienen. Capturas originales/completadas en evidence/russia. El mapa, fondo, coordenadas y paleta no se modifican en la estabilización actual; map.js solo cambia inicialización de estado/recursos.
