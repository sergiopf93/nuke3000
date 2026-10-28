# Plan incremental NUKE3000

Rama `dev/stabilization-gameplay`, base main `93eba1e`. Sin push/merge/despliegue. Mapa 60/7 Rusia preservado.

## Bloque A — estabilización local validada; pendiente de aceptación del propietario

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
- [ ] Validación del propietario antes de aceptar el bloque; sin push/merge/despliegue.

Resultados y límites en TEST_STRATEGY.md; incidencias/causas en KNOWN_ISSUES.md; referencias V3 en RULES_SPEC.md. 121 tests Node y partida real 3J: Libertos ronda 12, 233 acciones UI, sin bloqueos ni errores JS. Las reglas detectadas ya están aclaradas; el alcance no incluye certificar Firebase, PWA ni todos los recorridos de navegador.

## Siguientes bloques

B: mapa/grafo incorporados previamente; ampliar E2E de otras acciones/configuraciones después de A.
C: UX móvil horizontal y combate visual; no iniciado.
D: esquema validado/versionado, reglas por partida, editor completo/presets/importación/exportación; no iniciado. La protección básica del editor pertenece a estabilidad.
E: autoridad/sincronización, integración Firebase de las decisiones humanas, reconexión/deduplicación, emuladores/multicliente y seguridad; validación integral pendiente.
