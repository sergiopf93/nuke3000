# Evidencia UX/UI — 28/10/2026

Base: ec9a955, rama dev/mobile-gameplay-ux. Capturas `before` recogidas antes de modificar la UI; `after` obtenidas con los mismos escenarios preparados. Los originales se conservan completos, sin recortar ni enmascarar. Fuentes y Firebase bloqueados en todas las pruebas; no se escribe en producción.

## Comparaciones

| Viewport | Mapa antes | Mapa después | Combate antes | Combate después |
|---|---|---|---|---|
| 844x390 | [Ver](before-844x390-map.png) | [Ver](after-844x390-map.png) | [Ver](before-844x390-combat.png) | [Ver](after-844x390-combat.png) |
| 667x375 | [Ver](before-667x375-map.png) | [Ver](after-667x375-map.png) | [Ver](before-667x375-combat.png) | [Ver](after-667x375-combat.png) |
| 932x430 | [Ver](before-932x430-map.png) | [Ver](after-932x430-map.png) | [Ver](before-932x430-combat.png) | [Ver](after-932x430-combat.png) |
| 1440x900 | [Ver](before-1440x900-map.png) | [Ver](after-1440x900-map.png) | [Ver](before-1440x900-combat.png) | [Ver](after-1440x900-combat.png) |
| 390x844 | [Ver](before-390x844-map.png) | [Ver](after-390x844-map.png) | [Ver](before-390x844-combat.png) | [Ver](after-390x844-combat.png) |

## Flujos preparados — controles reales

| Flujo | Horizontal 844×390 | Escritorio 1440×900 |
|---|---|---|
| Seleccionar origen e información | [Ver](after-844x390-selection.png) | [Ver](after-1440x900-selection.png) |
| Conquista y bajas | [Ver](after-844x390-result.png) | [Ver](after-1440x900-result.png) |
| Elegir movimiento | [Ver](after-844x390-move.png) | [Ver](after-1440x900-move.png) |
| Confirmar mejora | [Ver](after-844x390-upgrade.png) | [Ver](after-1440x900-upgrade.png) |
| Resultado de misil | [Ver](after-844x390-missile.png) | [Ver](after-1440x900-missile.png) |
| Setup manual de unidades | [Ver](after-844x390-setup.png) | [Ver](after-1440x900-setup.png) |

`mobile-ux.browser.cjs` prepara los escenarios y ejecuta clics en escritorio y toques emulados en móvil. No son partidas completas. Incluye también defensa humana, continuación/retirada, reglas/cierres, recursos, pinch/arrastre/cancelación y giro; vertical con movimiento reducido.

## Partidas completas E2E

Sin fixtures de dominio: PRNG con semilla123 y timers acelerados son las únicas inyecciones. Setup60 → turnos → ganador válido.

- Escritorio: Libertos ronda12, 233 acciones UI, 0 errores JS. [Informe](desktop-full-game-report.json), [captura](desktop-full-game-victory.png), [traza](desktop-full-game-trace.zip).
- Horizontal touch844×390: Libertos ronda12, 190 acciones UI, 0 errores JS. [Informe](touch-full-game-report.json), [captura](touch-full-game-victory.png), [traza](touch-full-game-trace.zip).

[Última matriz de layout](final-layout-results.txt), repetida tras retirar los dos botones redundantes móviles.

[Validación conjunta](validation-results.txt): 121 tests Node pasando, smoke anterior, dos clientes Chrome con ratón y toque (transporte local), matriz de cinco tamaños, comparación desktop y ambas partidas completas. El número de acciones es el del conductor de la misma partida/semilla; los conteos por flujo se detallan en [UX_MOBILE.md](../../UX_MOBILE.md).

[Comparación visual desktop](desktop-visual-comparison.json): cero píxeles diferentes fuera de código de sala, LED animado y tooltip corregido. Exclusiones con coordenadas explícitas; no equivalen a certificar todas las pantallas. Mapa, datos, assets, CSS original y Battle sin cambios.

Dispositivo físico/Safari, Firebase real/reconexión, PWA/offline y E2E de todas las facciones/configuraciones siguen pendientes. Sin push, merge ni despliegue.
