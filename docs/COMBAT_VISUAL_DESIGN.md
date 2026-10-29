# Presentación oficial sobre el tablero original

El motor V4 no se sustituye. `rules-v4.js`, `battle.js`, `engine.js`, `data.js` y `map.js` conservan sus reglas y geometría. `v4-game.js` coordina resultados ya decididos; no importa `demo.js` ni eventos ficticios.

## Contrato y componentes

- `DiceSequence.play({dice,cause,container,signal,speed})` representa D6/D12/D20 con caras SVG nítidas y valor incrustado; giro y rebote exclusivamente 2D. Cada dado conserva `raw`, `effective`, `bonus` y `value`; no hay RNG visual. Normaliza y devuelve una promesa finita que resuelve una vez al completar, omitir o cancelar. El fallback temporal no depende de que `animation.finished` llegue.
- `PhaseVisuals` deduplica IDs y transmite eventos de presentación `PRESENTATION_EVENT`. Colas y promesas viven fuera de G, de sus snapshots y de la persistencia. Un error de renderizado se resuelve como cancelación, sin deshacer decisiones del motor.
- `BattleScene.open(ctx,before)` crea una capa transparente en el área real del mapa. El zoom temporal usa la transformación de cámara, restaurable al finalizar. No se deforma ni agita ningún hexágono.
- `BattleScene.result(ctx,result)` reproduce los dados, resalta los pares del resultado y dispara desde la unidad ganadora real hacia la perdedora, en ambos sentidos. `planRound` usa las bajas tipadas emitidas por el motor. IDs visuales deterministas conservan la misma miniatura al degradarla; se reconcilian conteos al terminar la ronda. Máximo nueve representantes activos por bando; una baja retira solo su nodo tras representarse y los supervivientes ya visibles no se ocultan por cambiar de ronda; los contadores siempre muestran el total real.
- `presentMissile({type,event,dice,explosion})` consume lanzamiento, intercepción, impacto, accidente y cierre reales. El origen gráfico se sitúa en una base/territorio propio sin añadir restricciones de alcance. Intercepción D6 de cada intento; éxito evita cualquier impacto. Un misil no interceptado destruye automáticamente las unidades legales y solo una base alcanzada genera D12. La cadena recibe los centros del motor, nunca los calcula el renderizador.

## Todas las fases y continuidad

Sorteo y desempates guardan el D6 autoritativo inmediatamente y presentan todos los dados de la generación antes de resolver el orden. `setupDicePresentations` es un registro local, no parte de G.setup. Los paquetes D6 llevan generación; un desempate futuro queda en cola mientras el observador termina la generación anterior. Cada facción tiene contenedor propio, también online, evitando que otro dado cancele su animación. El botón CONTINUAR aparece después de terminar/omitir la presentación; los cambios de pantalla recibidos online esperan a los dados locales pendientes.

En mantenimiento se tiran todos los D12 sin asignación a bases. Solo después de terminar/omitir se habilitan las decisiones de accidente; CPU sigue la misma barrera. Las explosiones elegidas se resuelven en el motor y se representan en secuencia, recalculando las opciones existentes. Cerrar, abortar o cambiar la visibilidad no inventa tiradas ni cambia unidades.

El estado autoritativo de combate/misil se aplica y sincroniza antes de su animación. Las continuaciones comprueban identidad del combate/paso. Una promesa visual termina antes de presentar la siguiente ronda o una decisión de base; no quedan también activos los temporizadores antiguos de avance de ronda. CPU/CPU avanza sola. Los observadores consumen COMBAT_VIEW y eventos de fase sin tirar dados y cierran la escena automáticamente.

Preferencia cinematográfica/rápida/sin animación en AJUSTES de partida, heredada del almacenamiento al crearla; escenas sin selectores repetidos, solo OMITIR durante la representación; prefers-reduced-motion, señal AbortController, omisión, Escape y visibilidad interrumpen la presentación y liberan las continuaciones. Sin WebGL, motor 3D ni sonido. Se retiran las llamadas decorativas de movimiento/refuerzo/mejora/construcción/victoria; solo se anima un accidente cuando el motor proporciona sus centros reales.

## Verificación y límites

Matriz compacta adicional en 1440×900, 844×390, 667×375 y 390×844, con carriles sin solapamientos, nodos supervivientes estables, contadores grandes y tiempo de disparo 520 ms (antes 600 ms). 337 tests Node; integración y vídeos de sorteo/desempate, combate, misiles y mantenimiento en 1440×900/844×390; disparos en ambos sentidos y misma identidad tras degradaciones. Casos extra: intercepción exitosa sin impacto/D12, misil con D12=1/cadena, aborto y cambio de visibilidad simulado, contadores grandes con DOM acotado. Partidas completas V4 de cuatro jugadores hasta victoria en ambos tamaños, con preferencia mínima y semilla/aceleración; ninguna mutación del estado desde los tests.

Dos Chrome con transporte de pruebas validan humanos/CPU, autoridad única, respuestas defensivas y transiciones. No certifica Firebase real ni Safari físico. La fidelidad de las fotografías provisionales queda a validación artística del propietario.
