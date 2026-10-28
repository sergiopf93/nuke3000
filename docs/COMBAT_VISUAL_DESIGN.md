# Presentación cinematográfica de combate

`BattleScene` es un adaptador aislado. `open(ctx, before)` recibe territorios y snapshot `{attacker, defender}` anterior a la resolución. `result(ctx, result)` representa dados y bajas ya calculados por Battle. `close()` limpia animaciones y restaura la transformación del mapa; `effect(kind,{targetId})` resalta temporalmente acciones sobre un hexágono. Ninguna llamada calcula tiradas, cambia unidades ni gobierna el turno.

La escena reutiliza el contenedor desplazable `#combat-content`, sin reemplazar controles del modal. Cámara temporal mediante Web Animations sobre `#world-g`: no cambia G.vx/vy/vscale, fondo, coordenadas ni datos de hexágonos. Al cerrar, cambiar orientación o esconder pestaña, cancela la transformación temporal. Miniaturas SVG originales inspiradas en las siluetas de material del reglamento V4 página 5: soldado, meca, aeronave de dos motores y escorpión con cañón y patas.

Normal, rápida y mínima se guardan localmente; reduced-motion y pestaña oculta desactivan efectos. Omitir y Escape cancelan presentación exclusivamente, conservando resumen y resultado. Cada animación es finita y no tiene callbacks de dominio. Dados muestran bruto → mínimo efectivo + bonificación y total compartido; nunca generan valores aleatorios. Miniaturas decorativas ocultas a lectores; resultado resumido mediante aria-live.

Integración: cargar CSS después de visual-system.css y JS antes de combat.js. Invocar open antes de calcular primera ronda; result después de displayBattleResult y close desde closeDice. Para espectadores usar el mismo snapshot antes/resultado compartido. La presentación puede omitirse sin cambiar el resultado ni bloquear CPU. Las animaciones fuera de combate pueden llamar effect para movimiento, refuerzos, mejoras, misiles o nuclear.

Verificado en Chrome escritorio 1440×900 y móvil horizontal emulado 844×390: API aislada (estado inmutable, dados, degradación, omitir, limpieza, reduced-motion), y combate integrado mediante V4Game.battle + RulesV4.round con RNG determinista. El integrado confirma meca → soldado y aeronave eliminada, controles V4 sin lanzar/cancelar heredados y paletas de facción. Capturas /tmp/nuke-integrated-pilot-{1440,844}.png. Estas comprobaciones no equivalen a una partida E2E completa ni a Safari físico; quedan pendientes validación humana artística y Safari físico.

## Ampliación de efectos

La escena añade un plano con el fondo real del mapa y referencias SVG a los hexágonos originales (no cambia sus coordenadas). El zoom destaca origen y territorio enfrentado. Al cerrar regresa durante 450 ms a la transformación actual del tablero; la animación no controla el turno y puede cancelarse por resize/segundo plano. Proyectiles ligeros/pesados/aéreos usan trazos distintos según unidades participantes.

`effect(kind,data)` admite `movement`/`move`/`missile` con `{srcId,targetId,path?: [ids]}` para ruta temporal; `reinforcements` con `{targetId,type}` para aparición; `upgrade` para transformación; `nuclearBuild` para activación; `nuclear`/`nuclearChain` con `{centers:[ids]}` para flash contenido y ondas secuenciales; `victory` con `{fk}` para retrato original de la facción sobre `#game-result`. Todos son efectos finitos sin RNG, cálculos ni callbacks de turno. Su integración exige que el motor proporcione los centros ya calculados, jamás propagación calculada por el renderer.

Omitir/Escape emiten `document` CustomEvent `battle-scene-skip`, detail `{targetId,round}`. El adaptador de turnos puede acortar únicamente la espera visual pendiente. No debe usar ese evento para omitir cálculos o ataques obligatorios.

`BattleScene.duration(ms)` devuelve una espera de presentación: 0 para mínima/reduced-motion/hidden/escena omitida, ms/3 para rápida y ms para normal. El adaptador del motor decide cómo programar sus acciones. Paletas locales/remotas comparten FDATA[ctx.attFk/ctx.defFk].color; etiquetas y valores conservan texto claro.
