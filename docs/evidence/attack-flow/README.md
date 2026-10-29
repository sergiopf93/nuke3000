# Ataques V4 y presentación V9 — 29/10/2026

Base: b1087e9. Main y publicación autorizados. Sin dependencias nuevas ni cambios de geometría/adyacencias del mapa.

## Causas y correcciones

- `G.movedUnits` no se reiniciaba en el turno siguiente. Las tropas llegadas seguían bloqueadas aunque su movimiento/ataque fuese legal. Se reinicia en el ingreso idempotente del turno, manteniendo el límite de una vez por fase.
- El selector podía preseleccionar tropas gastadas junto a otras legales, o reservar una guarnición adicional cuando ya quedaban llegados inmóviles. `movableArmy` calcula las disponibles y el selector reutiliza ese cálculo. En destinos solo aéreos, no ofrece escorpiones ni preselecciona carga incompatible; una aeronave gastada no habilita objetivos lejanos.
- El resaltado móvil de objetivos dependía de `attackSrc` del flujo V3, que no identifica los combates comprometidos V4. Ahora consume `attackers` y actualiza al cambiar de fase.
- La cámara aún podía estar interpolando cuando se fijaba la trayectoria del misil. Se espera su final real (con salida finita/cancelable) antes de fijar coordenadas. El impacto se comprueba contra el centro SVG real, no contra una coordenada inventada.

## Capturas y vídeos inspeccionados

| Caso | Escritorio | Horizontal 844×390 |
| --- | --- | --- |
| Compromiso con origen/objetivo | [Captura](attack-1440-committed.png) | [Captura](attack-844-committed.png) |
| Combate con marcadores | [Captura](attack-1440-combat.png) | [Captura](attack-844-combat.png) |
| Regreso con marcadores | [Captura](attack-1440-return.png) | [Captura](attack-844-return.png) |
| Nuclear unificado en mapa | [Captura](nuclear-map-1440.png) | [Captura](nuclear-map-844.png) |
| Misil no interceptado | [Vídeo](impact-1440.webm) | [Vídeo](impact-844.webm) |
| Choque/intercepción | [Vídeo](intercept-1440.webm) | [Vídeo](intercept-844.webm) |
| Impacto nuclear | — | [Vídeo](impact-base-844.webm) |
| Intercepción con base | — | [Vídeo](intercept-base-844.webm) |

Los vídeos son fixtures explícitos con eventos reales del motor y velocidad normal. El choque tiene un destello azulado entre ambos misiles; el impacto, una explosión naranja en el centro del objetivo. Los fotogramas iniciales/finales pueden no incluir el pico breve de la explosión; se revisaron también fotogramas del vídeo. No son partidas completas; estas se comprueban en los E2E independientes.

## Pruebas ejecutadas

- 343 tests Node pasan. Seis nuevas regresiones deterministas: ataque 1→defensa1,2→2,4→4,5→4,8→4; recálculo por supervivientes/límites configurables, selección fuerte y número exacto de llamadas RNG.
- Reproducción histórica del bloqueo en Chrome 1440×900 y 844×390, con los módulos V8 afectados. En ambos, el envío legal queda bloqueado y el popup abierto después del ingreso siguiente.
- Flujo corregido con gestos reales: origen→destino→selector→compromiso→fases→objetivo→batalla→conquista→regreso. Marcadores persistentes, límite defensivo, selección mixta/aérea, preferencia y nuclear comprobados.
- Ocho casos de misil: impacto/intercepción × con/sin base × escritorio/horizontal. Dos misiles simultáneos convergen al mismo punto; choque separado del centro del objetivo, sin bajas ni D12; impacto coincide con el centro real del hexágono (tolerancia 1 px), tres bajas y D12 solo si existe base. RNG y callback únicos, sin giros en keyframes.
- Suite de navegador V3/V4, humanos/CPU y dos clientes de escritorio/táctiles. Cuatro E2E por interfaz, sin inyectar estado: V3 hasta Libertos ronda 12/121 acciones; V4 de 4 jugadores hasta Libertos ronda 5/61 acciones, en ambos tamaños.
- Ocho escenas de sorteo, combate, misiles y mantenimiento; cancelación/visibilidad, cadenas, supervivientes y sorteo online. Matriz compacta 1440×900,844×390,667×375,390×844 pasa. La regresión de tiempo aplica la misma preferencia y el factor global 2/3.
- [Mapa](map-comparison.json): geometría/SVG y fondo conservados, sin diferencias significativas en tablero normal sin nucleares. El icono nuclear y los marcadores son cambios visuales intencionados verificados por separado. [Comparación de escritorio](desktop-comparison.json).
- PWA: actualización V8→V9, caché anterior retirada, SHA256 de 35 recursos y arranque offline con 60 territorios.

`test:all` se ejecutó y los grupos afectados se repitieron tras las correcciones. El fixture histórico necesitó cargar también el selector antiguo para no mezclar APIs de dos versiones. La prueba visual de misil pasó a sincronizarse con eventos DOM, en lugar de depender de una ventana breve de visibilidad. La regresión de coordenadas detectó el desfase real de cámara y pasó después de corregirlo.

[Resultados de comandos](verification.txt) · [Eventos, trayectorias y coordenadas de los ocho misiles](missile-report.json).

## Límites

Chrome real con emulación táctil; Safari/iPhone físico y Firebase real no certificados. Los recortes oficiales conservan su calidad provisional. Los orígenes se registran en nuevos compromisos; una instantánea histórica que no contenga procedencia no permite reconstruirla de forma fiable y no se inventa.
