# Revisión vigente de coherencia visual

El propietario acepta la simplificación de interacciones y solicita corregir la integración visual. El desarrollo actual se realiza en main local, autorizado expresamente, sin publicación. Ver [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md) y sus comparativas. Este documento conserva a continuación el diseño y conteos de la primera iteración.

# UX móvil — primera iteración, 28/10/2026

Base `ec9a955`, rama `dev/mobile-gameplay-ux`. La rama de estabilización y main se conservan. Referencia conceptual facilitada por el propietario: claridad de origen/destino y rapidez de combate de RISK; se reutiliza el tablero e identidad de NUKE3000, sin copiar su diseño. Skills UX/UI y QA aplicadas directamente por R2, sin subagentes.

## Diagnóstico y propuesta

Antes, a 844×390, las dos columnas laterales reservaban 360 px, el mapa disponía de 484 px y los controles eran pequeños. La información de territorio se apoyaba en hover y elementos ocultos; el flujo de ataque exigía origen, destino, botón de ataque, confirmación de unidades y lanzamiento. Los selectores posicionados junto al puntero podían quedar fuera de pantalla. La mezcla de eventos mouse/touch permitía selecciones accidentales al terminar gestos.

Se propone conservar la vista de escritorio y adaptar la estructura en pantallas de hasta 1024 px y 600 px de alto, o hasta 600 px de ancho: cabecera de turno compacta, mapa central, columna contextual de 216 px con recursos propios, inspector debajo del mapa y jugadores/registro bajo demanda. A 844 px, el área de tablero pasa de 484 a 628 px de ancho. El inspector ocupa espacio propio para evitar tapar hexágonos. El mapa conserva sus coordenadas, fondo, paleta y geometría; la vista completa sigue disponible con Centrar, y se permite zoom/arrastre.

## Flujos implementados y acciones

Conteos del camino predeterminado, sin cambiar unidades sugeridas, hacer zoom ni cancelar; no incluyen cerrar el resultado.

| Flujo | Antes | Ahora en móvil | Comportamiento |
|---|---:|---:|---|
| Primera tirada de ataque | 5 | 3 | Origen → enemigo adyacente → lanzar. El segundo toque abre preparación, sin tirar automáticamente |
| Movimiento | 4 | 3 | Origen → destino azul → confirmar cantidades; desaparece la activación previa de modo |
| Primera defensa local | 2 | 1 | Lanzar con sugeridas; se puede desplegar selección avanzada antes de lanzar |
| Mejora | 3 | 3 | Territorio → mejora → confirmar; controles accesibles, cancelación sin gasto |
| Misil desde el panel | 3 | 3 | Lanzar → territorio → tipo; resultados y recursos se actualizan sin cerrar |
| CPU contra CPU | 0 | 0 | Se conserva la automatización del bloque A, sin exigir SIGUIENTE |

El inspector identifica controlador, unidades, nuclear y siguiente acción. Durante turnos ajenos permite inspección sin ejecutar acciones. Solo se resaltan enemigos válidos desde el origen seleccionado. Jugadores y registro se abren por separado, tienen cierre visible, retorno de foco y Escape; el acceso a salir de la sala/lobby se conserva en Jugadores.

El combate añade ejércitos actuales, resumen de bajas/degradaciones y valores de dados. Tras conquistar identifica correctamente las unidades ocupantes. El detalle muestra tipo, caras, tirada bruta, bonificación y comparación. La selección avanzada es opcional; al abrirla se suspende lanzar hasta confirmar o plegarla. Continuar prepara la ronda siguiente; retirarse conserva la resolución ya aplicada. La animación breve de dados solo representa un resultado existente y respeta movimiento reducido.

Los popups se centran y limitan al viewport con desplazamiento interno. Los controles principales tienen un mínimo de 44 px. En vertical se ofrece tablero y panel apilados, con recomendación de girar; no se bloquea la orientación (`manifest.orientation=any`). El zoom del navegador queda permitido fuera de los gestos propios del mapa.

## Separación técnica y correcciones de interacción

`js/mobile-ux.js` adapta presentación y entrada; `css/mobile-ux.css` contiene la adaptación. Los únicos enlaces en engine.js son inspección, entrada contextual, resaltado y actualización de vista. No cambia Battle, RULES, datos del mapa, generación de tiradas, daño, objetivos o turnos. Los controles llaman a acciones existentes y validadas.

Pointer Events unifica ratón y táctil, con captura, umbral de arrastre y pinch. Un gesto cancelado o de varios dedos nunca selecciona un territorio. Se consume el clic sintetizado de ese gesto incluso si aparece un diálogo bajo el dedo: una regresión detectó que podía abrir selección avanzada accidentalmente. Una nueva pulsación deliberada limpia esa protección. Se evita registrar listeners duplicados y se reajusta la cámara al cambiar el tamaño del tablero.

La selección avanzada vuelve a habilitar lanzar al confirmar. Recursos se refrescan junto a las tarjetas, incluso al construir misiles sin redibujar el mapa. Cerrar un combate limpia los indicadores del origen. También se corrige `undefined` en el tooltip de escritorio usando el nombre territorial existente.

## Evidencia y validación

[Índice de capturas y resultados](evidence/mobile-ux/README.md). Se distinguen:

- 121 tests Node de motor/protocolo, sin cambios en sus casos. Incluyen simulaciones completas 3–6J.
- Integración con escenarios preparados: 1440×900 con ratón; 667×375, 844×390, 932×430 y 390×844 con `hasTouch`, emulación móvil y `tap()`. Setup manual de soldado/mech/central; selección; ataque, conquista, continuación y retirada; defensa; mejoras; construcción y lanzamiento de misiles; reglas/cierres; arrastre, pinch, cancelación; giro sin mutación de partida. Vertical prueba también movimiento reducido.
- Dos clientes Chrome: ataque humano, CPU de varias rondas e intercepción humana, con ratón y con toque horizontal. Transporte local sustituye Firestore; no certifica Firebase.
- Partida completa real de 3J, semilla 123, solo acciones UI: escritorio termina en Libertos ronda 12, 233 acciones; horizontal táctil termina en Libertos ronda 12, 190 acciones. El conductor solo inyecta PRNG y aceleración de timers; no prepara ni modifica estado de partida.
- Comparación de escenas de escritorio frente a ec9a955: cero píxeles diferentes fuera de las zonas declaradas de código de sala, LED animado y tooltip corregido. Las capturas se conservan, incluidos los originales sin máscara. Mapa/datos/Battle/CSS original sin diff.

## Límites y siguiente validación

Probado en Chrome con táctil emulado. Sin dispositivo físico ni Safari/iOS real; no se afirma certificación móvil universal. Falta validación del propietario, E2E de todas las victorias y partidas navegador 4–6J, combinaciones avanzadas de transporte/unidades, accesibilidad con lector de pantalla y PWA/offline. Firebase real, reconexión y autoridad siguen fuera de esta iteración.

La siguiente revisión debe hacerse primero sobre mapa/combate y tamaño de lectura, antes de ampliar el rediseño. No hay push, merge ni despliegue.
