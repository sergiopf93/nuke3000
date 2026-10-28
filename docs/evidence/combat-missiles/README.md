# Combate, misiles y publicación — 28/10/2026

Defensa automática en el motor, máximo de dados y prioridad por caras; mech antes que aircraft a igualdad. Sin intervención defensiva local/remota. El atacante conserva selección/guarnición y continuar/retirarse.

Misil: consumo inmediato → intercepción válida → si pasa, D6 de impacto → elección de tipo presente elegible. Soldado 1–6; mech/aircraft 5–6; scorpion 6. Interceptado: sin impacto. Última unidad protegida; sin elegible, sin baja. Las etapas impiden tiradas/bajas duplicadas y SIGUIENTE durante una elección pendiente.

CPU: preparación 900 ms, resultado intermedio 1600 ms y resultado final 2200 ms, cierre disponible y callback único. Todas las combinaciones abren ventana; observadores online reciben las rondas. La última conquista ganadora conserva su tirada antes de victoria; ganador y bloqueo de acciones inmediatos.

## Pruebas

- [Suite completa](test-all.log): npm run test:all, salida 0. 222 tests Node: 121 anteriores adaptados +101 nuevos; 80 composiciones de defensa, caras/límite, seis caras de intercepción/impacto y casos de selección/ausencia/duplicados.
- Chrome con estados preparados y pausas reales: humano/CPU, CPU/humano, CPU/CPU; dos rondas, degradación, conquista, callback, cierre y última tirada ganadora. 1440×900 y 844×390 touch.
- Dos clientes Chrome escritorio/touch: humano/humano, CPU/humano, intercepción remota y victoria final visible. Transporte local; no certifica Firebase real.
- Matriz adicional: 667×375, 932×430, 390×844 con reduce-motion, controles, gestos y flujos existentes.
- Partidas completas por UI desde lobby/setup: [escritorio](desktop-game-report.json), [horizontal touch](mobile-game-report.json). Semilla 123 y temporizadores acelerados; ninguna mutación del estado desde el test. Ambas: Libertos ronda 12, 121 acciones UI, cero errores JS. [Victoria escritorio](desktop-game-victory.png), [victoria móvil](mobile-game-victory.png); trazas ZIP adjuntas.
- SW real: v4 del commit 19130f4 → v5 completa → recarga automática → eliminación de caché anterior → SHA256 de siete recursos → arranque offline con 60 territorios. Se corrigió esperar navegación dentro de activate, que bloqueaba la propia activación. CDN externos bloqueados intencionadamente.
- [Integridad](integrity.json): data/map/assets/game.css/setup idénticos a 19130f4. [Comparación desktop](desktop-visual-comparison.json): cero diferencias fuera de zonas dinámicas. La primera comparación falló por 16 píxeles del halo del LED (x28–29, y126–137); se amplió solo su máscara para cubrir box-shadow de 12px, sin cambiar producción.

## Capturas

| Estado | Escritorio | Móvil horizontal |
|---|---|---|
| Preparación | [1440](1440-prepare.png) | [844](844-prepare.png) |
| CPU–CPU: bajas/degradación | [1440](1440-lib-clt-round.png) | [844](844-lib-clt-round.png) |
| CPU–CPU: conquista | [1440](1440-lib-clt-final.png) | [844](844-lib-clt-final.png) |
| Tirada ganadora antes de victoria | [1440](1440-winning-combat.png) | [844](844-winning-combat.png) |
| Misil interceptado, sin impacto | [1440](1440-missile-intercepted.png) | [844](844-missile-intercepted.png) |
| D6=6 y elección posterior | [1440](1440-missile-choose.png) | [844](844-missile-choose.png) |
| Baja y contador actualizado | [1440](1440-missile-result.png) | [844](844-missile-result.png) |

## Publicación y límites

Publicación directa en main/Pages autorizada. Tras el commit se verifican workflow para su SHA, hashes públicos y los mismos combates/misiles contra https://sergiopf93.github.io/nuke3000/ (NUKE_PUBLIC_URL en combat-flow.browser.cjs). El resultado remoto se informa en la entrega, separado de las pruebas locales anteriores al push.

Sin nuevas discrepancias reglamentarias. Safari/iPhone físico y Firebase real/reconexión siguen pendientes. Standalone histórico sin actualizar. Sin build/lint/TypeScript configurados; comprobación de sintaxis activa y git diff --check. Los .DS_Store y pruebas/ ajenos se conservan fuera de Git.
