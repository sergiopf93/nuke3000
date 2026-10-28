# Plan incremental NUKE3000

Trabajo actual en **main local**, autorizado expresamente por el propietario el 28/10/2026. Integración fast-forward hasta cd5d921; se conservan dev/mobile-gameplay-ux y dev/stabilization-gameplay como recuperación. Sin push ni despliegue; integración local fast-forward autorizada. Mapa 60/7 Rusia preservado.

## Bloque A — estabilización técnica preservada

- [x] Resolución común de combate tipado, bajas simultáneas/degradaciones, bonos V3, guarnición y conquista.
- [x] CPU–CPU sin botones de ronda ni límite arbitrario de diez rondas; terminación por progreso real.
- [x] Seis objetivos con momento por facción, eliminación idempotente, rotación viva y estado final estable.
- [x] Callbacks de pasos/tiradas acotados al contexto; setup sin dobles arranques, despliegue manual/mechs/centrales.
- [x] Superviviente nuclear real de elección; automatización CPU sin modales.
- [x] Mejoras confirmadas con costes aplicados a tropas reales; contador y última unidad de misil.
- [x] Elegibilidad común de refuerzos; rango terrestre, guarnición y transporte aéreo.
- [x] Pruebas deterministas, simulaciones completas 3/4/5/6J y partida E2E real hasta ganador.
- [x] Integrar y probar las decisiones de Libertos, Shinin, movimiento y orden de misiles; 4 Pu/Aircraft ≥5 preservados.
- [x] Decisiones remotas implementadas y probadas con dos páginas Chrome y transporte local. Firebase real no certificado.
- [x] Revisar el diff y guardar evidencia de la partida con las reglas finales.
- [x] El propietario acepta la estabilización técnica para avanzar a UX/UI, conservando las 121 regresiones. No autoriza push/merge/despliegue.

Resultados y límites en TEST_STRATEGY.md; incidencias/causas en KNOWN_ISSUES.md; referencias V3 en RULES_SPEC.md. 121 tests Node y partida real 3J: Libertos ronda 12, 233 acciones UI, sin bloqueos ni errores JS. Las reglas detectadas ya están aclaradas; el alcance no incluye certificar Firebase, PWA ni todos los recorridos de navegador.

## Siguientes bloques

B: mapa/grafo incorporados previamente; ampliar E2E de otras acciones/configuraciones después de A.
C: primera iteración horizontal implementada: mapa contextual, recursos, jugadores/registro, gestos y combate rápido/detallado. [Diseño y flujos](UX_MOBILE.md). Pendiente de validación del propietario y prueba física.
D: esquema validado/versionado, reglas por partida, editor completo/presets/importación/exportación; no iniciado. La protección básica del editor pertenece a estabilidad.
E: autoridad/sincronización, integración Firebase de las decisiones humanas, reconexión/deduplicación, emuladores/multicliente y seguridad; validación integral pendiente.

## UX/UI — primera iteración

- [x] Rama desde ec9a955 y capturas previas antes de modificar la UI.
- [x] Adaptación incremental de mapa/selección y combate; controles táctiles y popups limitados al viewport.
- [x] Inspector, destinos por origen, acceso a jugadores/registro y recursos reales.
- [x] Ataque 5→3 acciones; movimiento 4→3; defensa local sugerida 2→1. Selección avanzada preservada.
- [x] Gestos con Pointer Events, pinch/cancelación y protección frente al clic del mismo gesto.
- [x] 121 tests de regresión; integración táctil en cuatro tamaños y escritorio; dos clientes con transporte local.
- [x] E2E completos de escritorio y móvil horizontal hasta victoria válida; comparación visual de escritorio.
- [ ] Validación del propietario y dispositivo físico/Safari real antes de dar aceptación móvil definitiva.

No se modifica el tablero ni se amplían las reglas. Evidencia y límites en UX_MOBILE.md y TEST_STRATEGY.md.

## Coherencia visual — revisión posterior

- [x] Verificar historial, integrar por fast-forward y ejecutar la suite base desde main.
- [x] Identificar y reutilizar paleta, bordes, degradados y familias originales; sistema visual compartido.
- [x] Selector de guarnición y opciones oscuros; tipografías locales limitadas a UI.
- [x] Combate dividido en bandos, pares de dados/pérdidas, resultado destacado y acciones fijas.
- [x] Revisar inspector, recursos, paneles, movimiento, mejoras, setup/refuerzos, misiles, centrales, mensajes y reglas.
- [x] Regresiones de layout/control oscuro, dados mixtos y representación de bajas; capturas en cinco tamaños.
- [x] Cerrar validación conjunta y registrar dos partidas completas desde main; matriz repetida tras la corrección de prioridad CSS.
- [ ] Revisión del propietario; Safari/dispositivo físico pendiente por limitación del entorno.

[Diseño visual](VISUAL_SYSTEM.md). Motor, mapa y reglas se conservan. Sin push ni despliegue.
