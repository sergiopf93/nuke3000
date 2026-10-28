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
