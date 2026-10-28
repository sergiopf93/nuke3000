# Coherencia visual NUKE3000 — 28/10/2026

## Identidad reutilizada

La revisión parte de cd5d921 y conserva la jugabilidad simplificada. No introduce otra identidad ni reglas nuevas.

| Elemento | Referencia existente | Aplicación |
|---|---|---|
| Superficies | Negro #050507, panel #0a0a0d, bordes finos | Paneles oscuros, separación de 8/12/16 px, esquinas de 2 px |
| Acento principal | Dorado #C8A800 | Títulos, confirmación, acción principal, foco y resultado |
| Ataque / peligro | Rojo #8B1A1A / #aa2222 | Bando atacante, retirada y disparo |
| Defensa / movimiento | Azul #4488cc | Bando defensor y movimiento |
| Refuerzos | Verde de los controles existentes | Título y borde de distribución |
| Tipografía | Orbitron y Rajdhani | Orbitron para títulos; Rajdhani para datos, controles y ayudas |
| Botones | Degradados discretos originales, bordes de 1 px | Dorado principal, gris secundario y rojo peligroso; foco visible |
| Indicadores | Números y acentos de facción | Recursos compactos y agrupación de tropas sin ceros redundantes |

`css/visual-system.css` reúne los estilos reutilizables de los componentes revisados. Orbitron 700 y Rajdhani 400/600/700 se sirven desde assets/fonts con sus licencias OFL. Se usan alias CSS **solo en la UI revisada**: el SVG mantiene sus estilos y su familia originales. No se sustituyen fondo, paleta, hexágonos ni assets del tablero.

Selectores e inputs tienen fondo, texto, borde y `color-scheme: dark` explícitos; el selector de guarnición tiene flecha dorada y etiqueta propia. Las opciones también declaran colores oscuros. La ventana nativa que abre cada sistema operativo sigue dependiendo del navegador; no se afirma validación Safari real.

## Composición del combate

Cabecera fija: ronda y selector de guarnición. Centro: dos bandos con función, facción, territorio, ejército y dados. Franja de resultado: conclusión destacada, unidades iniciales y supervivientes. Pie fijo: detalle, lanzar/continuar y cancelar/retirarse.

Los dados muestran unidad, caras y valor. Se ordenan para representar los pares **ya calculados** por Battle; se marca GANA, BAJA, degradación o SIN PAR. Los datos se leen de tiradas, pares y bajas del resultado, sin tirar ni resolver otra vez. Tras la conquista se muestran los supervivientes de ambos combatientes y se identifica quién ocupa el territorio.

La selección avanzada y el detalle se desplazan dentro del centro. A 844×390 se comprueba que la preparación predeterminada y el resultado caben sin desplazar las acciones. La selección avanzada se pliega después de resolver; el resultado no permite cambiar retroactivamente la guarnición. Las animaciones siguen siendo decorativas y respetan movimiento reducido.

## Componentes revisados

Inspector territorial, recursos compactos, cabecera/turno, panel contextual, jugadores/registro, selección avanzada, movimiento, setup/refuerzos, mejoras, misiles, centrales, mantenimiento, decisiones remotas y editor de reglas. Se mantienen los elementos originales que ya encajan; no se sustituye el layout de escritorio ajeno al combate.

## QA y límites

La matriz usa Chrome con ratón a 1440×900 y tacto emulado a 667×375, 844×390, 932×430 y 390×844. Incluye fondo oscuro del selector, fuentes locales, pie de acciones, ausencia de scroll principal en el caso 844×390, pares y pérdidas representados, mezcla de tipos/degradaciones y los flujos existentes. Se añaden construcción nuclear y refuerzos manuales a las comprobaciones de UI. Las 121 pruebas de motor/protocolo permanecen intactas.

La comparación de píxeles comprueba la escena del tablero de escritorio. El modal se ha cambiado deliberadamente, por lo que su aceptación se basa en controles, geometría, regresiones y capturas inspeccionadas, no en exigir igualdad con el modal anterior. Se conservan los originales de cd5d921.

Se intentó instalar WebKit de Playwright en /tmp: la herramienta no soporta WebKit en este macOS 12. Por ello Safari/iOS real y dispositivo físico siguen pendientes; la declaración CSS oscura está comprobada en Chrome, sin atribuir al entorno pruebas que no ejecutó. Firebase real y PWA/offline tampoco se certifican en esta revisión.

Evidencia y comparativas en [visual-consistency](evidence/visual-consistency/README.md).

## Git autorizado por el propietario

Se trabaja temporalmente en **main local**, por instrucción explícita del 28/10/2026. Se integró dev/mobile-gameplay-ux por fast-forward: conserva ec9a955 y cd5d921 y las ramas existentes. Los commits nuevos son locales y descriptivos. No hay autorización para push, merge remoto ni despliegue.

Resultados finales: 121 tests pasando y dos E2E completos hasta Libertos ronda12 (233 acciones escritorio, 190 táctiles), sin errores JS. La matriz se repitió tras corregir una prioridad CSS que dejaba gris la acción principal de mejora; se añadió una aserción de contraste entre confirmar/cancelar y se inspeccionaron las capturas finales. No hay discrepancias reglamentarias nuevas.

La defensa pendiente muestra TIRADO en los dados atacantes conocidos; SIN PAR se reserva para dados no emparejados de un resultado ya resuelto. La regresión correspondiente pasa en los cinco tamaños.
