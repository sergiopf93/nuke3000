# Coherencia visual — evidencia desde main local

Fecha: 28/10/2026. Base visual: cd5d921. Integración en main mediante fast-forward autorizada por el propietario; ramas de recuperación conservadas. Sin push, merge remoto ni despliegue.

## Comparativas 844×390

Los enlaces «antes» apuntan a los originales ya guardados de la primera iteración, sin duplicarlos ni sobrescribirlos. «Después» representa la revisión actual con las mismas familias y paleta de NUKE3000.

| Estado | Antes | Después |
|---|---|---|
| Partida | [Ver](../mobile-ux/after-844x390-map.png) | [Ver](after-844x390-map.png) |
| Territorio seleccionado | [Ver](../mobile-ux/after-844x390-selection.png) | [Ver](after-844x390-selection.png) |
| Preparación de ataque | [Ver](../mobile-ux/after-844x390-combat.png) | [Ver](after-844x390-combat.png) |
| Resultado de combate | [Ver](../mobile-ux/after-844x390-result.png) | [Ver](after-844x390-result.png) |
| Mejora | [Ver](../mobile-ux/after-844x390-upgrade.png) | [Ver](after-844x390-upgrade.png) |
| Movimiento | [Ver](../mobile-ux/after-844x390-move.png) | [Ver](after-844x390-move.png) |
| Misiles | [Ver](../mobile-ux/after-844x390-missile.png) | [Ver](after-844x390-missile.png) |
| Despliegue manual | [Ver](../mobile-ux/after-844x390-setup.png) | [Ver](after-844x390-setup.png) |

También inspeccionadas: [selección avanzada](after-844x390-attack-selection.png), [tirada y bajas](after-844x390-roll.png), [dados mixtos/degradaciones](after-844x390-mixed-dice.png), [refuerzos](after-844x390-reinforcements.png) y [construcción nuclear](after-844x390-nuclear.png). Las capturas de escenarios preparados son integraciones UI, no partidas E2E completas.

## Escritorio y otros tamaños

- 1440x900: [mapa](after-1440x900-map.png), [combate](after-1440x900-combat.png), [tirada](after-1440x900-roll.png), [resultado](after-1440x900-result.png).
- 667x375: [mapa](after-667x375-map.png), [combate](after-667x375-combat.png), [tirada](after-667x375-roll.png), [resultado](after-667x375-result.png).
- 932x430: [mapa](after-932x430-map.png), [combate](after-932x430-combat.png), [tirada](after-932x430-roll.png), [resultado](after-932x430-result.png).
- 390x844: [mapa](after-390x844-map.png), [combate](after-390x844-combat.png), [tirada](after-390x844-roll.png), [resultado](after-390x844-result.png).

Escritorio adicional: [mejora](after-1440x900-upgrade.png), [movimiento](after-1440x900-move.png), [misil](after-1440x900-missile.png). El tablero de escritorio se compara píxel a píxel con su escena anterior, excluyendo solo el contenedor de sala de ancho variable, LED y tooltip: [informe](desktop-visual-comparison.json). El modal se rediseña deliberadamente y no se exige que sea idéntico al anterior.

## Comprobaciones ejecutadas

- [Suite base desde main](main-baseline-results.txt). Las 121 regresiones y los recorridos pasan. El primer comparador falló por 24 píxeles del borde variable de la sala; se localizaron en x=999, se corrigió la exclusión y se repitió la comparación. El registro conserva ese fallo y su resolución.
- [Validación conjunta](validation-results.txt): 121 tests pasan; smoke de escritorio, dos clientes Chrome con ratón/toque y transporte local, matriz 1440×900 / 667×375 / 844×390 / 932×430 / 390×844, comparación del tablero y dos partidas E2E completas.
- [Regresión final de acciones](action-regression-results.txt): matriz repetida tras corregir la prioridad CSS del botón principal y feedback táctil. Verifica que Confirmar tiene borde dorado y fondo distinto a Cancelar. Se inspeccionaron de nuevo las capturas; la corrección no cambia dominio ni flujo. También se prueba la etiqueta TIRADO para el ataque que aún espera defensa, diferenciándola de SIN PAR tras resolver.
- Selector oscuro, fuentes locales, acciones dentro del viewport, ausencia de scroll principal en preparación 844×390 y resultado mixto, representación de pares/bajas, construcción nuclear y refuerzos manuales.
- [Integridad por SHA256](board-engine-integrity.json): engine.js, battle.js, data.js, map.js, assets.js y game.css idénticos a cd5d921. Cambios de combat.js limitados a representación/inserción del selector.

## Partidas completas

Solo PRNG sembrado y timers acelerados; sin fixtures ni mutaciones del dominio. Desde lobby/setup de 60 territorios hasta victoria real:

- Escritorio: Libertos, ronda 12, 233 acciones UI, 0 errores JavaScript. [Informe](desktop-game-report.json), [captura](desktop-game-victory.png), [traza](desktop-game-trace.zip).
- Horizontal táctil: Libertos, ronda 12, 190 acciones UI, 0 errores JavaScript. [Informe](touch-game-report.json), [captura](touch-game-victory.png), [traza](touch-game-trace.zip).

## Límites

Chrome con tacto emulado. WebKit no pudo instalarse: la versión de Playwright disponible no lo soporta en macOS12. Safari/iOS real y dispositivo físico siguen pendientes; no se atribuyen pruebas inexistentes al entorno. Firebase real, PWA/offline y aceptación del propietario también pendientes.

[Diseño visual](../../VISUAL_SYSTEM.md), [estrategia de pruebas](../../TEST_STRATEGY.md).
