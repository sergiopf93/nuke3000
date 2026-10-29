# Audio V10

Origen: `NUKE3000_AUDIO_COMPLETO_PARA_R2.zip`, entrega de pruebas del usuario. Solo se incorporan sus 17 sonidos, sin transformación, en MP3 y OGG (`assets/audio/`). No se utiliza `music_battle_loop` ni generadores/WAV. MP3 es preferente; OGG es alternativa si falla la descarga o decodificación.

`GameAudio` mantiene un único AudioContext, una fuente musical en bucle y buses de mezcla independientes. La música empieza con la partida, después de una interacción; permanece en la misma fuente y posición entre fases, paneles, turnos y combates. Entrada y final tienen fundido. Al ocultar la página se suspende el contexto conservando la posición musical y se detienen los efectos. Al volver se intenta reanudar; un toque permite reintentar ante restricciones o interrupciones de Safari. No se espera al audio para resolver acciones del juego.

AJUSTES, accesible en lobby y partida, contiene un único grupo AUDIO: volumen general, música, efectos y silencio. Valores iniciales: general 80 %, música 20 %, efectos 100 %. Preferencias locales por dispositivo (`nuke-audio-v1`), independientes del estado compartido. Los volúmenes usan GainNode, sin depender del volumen de HTMLAudioElement. Silenciar no reinicia la música. Hay margen de mezcla, compresión y límites de seis voces simultáneas, dos de disparos.

| Sonido | Integración |
| --- | --- |
| `music_ambient_game_loop` | Inicio de partida, mismo bucle durante todo el juego |
| `dice_roll` | Inicio de cada secuencia visible: sorteo, desempate, batalla, intercepción, mantenimiento y accidente |
| `shot_soldier` | Proyectil disparado por soldado ganador |
| `shot_mech` | Proyectil de meca; aeronave reutiliza este sonido al 65 % |
| `shot_scorpion` | Proyectil de escorpión ganador |
| `hit_flesh` / `hit_armor` | Contacto del proyectil con soldado / unidad blindada |
| `unit_degrade` | Inicio de degradación de la figura superviviente |
| `unit_fall` | Inicio de caída de la unidad eliminada |
| `missile_launch` | Salida del misil atacante |
| `missile_intercept` | Colisión de ambos misiles; sin sonido de impacto territorial |
| `missile_impact` | Explosión en el hexágono tras vuelo no interceptado |
| `nuclear_alert` | Aviso previo a accidente confirmado, una vez por cadena |
| `nuclear_explosion` | Cada onda expansiva de la cadena, nivel moderado |
| `turn_notification` | Una vez por turno del humano local, nunca por cada render o fase |
| `victory` / `defeat` | Pantalla final según ganador local; atenúa el ambiente |

La presentación recibe resultados ya calculados: no modifica el motor V4, sus reglas, RNG, bajas, mapa o red. Los identificadores de eventos impiden reproducir otra vez el audio de un evento remoto o combate ya presentado, incluso si ha salido del registro visual de 128 entradas. Este registro sonoro vive durante la partida y se reinicia en la siguiente. Cada cliente mezcla su propio audio; no se transmiten órdenes de sonido.

OMITIR, cerrar escenas o abortarlas detiene sus voces y evita efectos posteriores. Dados sin animación y escenas con reducción de movimiento no disparan sonidos asociados a movimientos omitidos; la música y los avisos de turno/resultado se mantienen. No existe una cola de efectos para reproducir después de desbloquear, cargar, volver a la pestaña o quitar silencio.

PWA: `audio-v10` / `nuke3000-v10-audio`; módulo y 34 recursos de audio incluidos en precaché bajo `/nuke3000/`.

Pruebas: `npm run test:audio` usa decodificación y fuentes Web Audio reales, inspección PCM, escritorio y táctil 844×390. Comprueba continuidad, formatos/fallback, sonidos, cancelación, mezcla, silencio y persistencia, deduplicación, resultado y ausencia de API. `npm run test:all` agrega motor, partidas completas V3/V4, dos clientes, interfaz, cinemática, misiles y actualización/offline PWA. Ver [evidencia](evidence/audio/README.md).

Safari físico/iPhone y escucha artística requieren validación en el dispositivo. La emulación Chrome no los certifica. La estrategia de reanudación contempla el estado `interrupted` descrito por [MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state); las restricciones finales dependen del navegador y del gesto del usuario.
