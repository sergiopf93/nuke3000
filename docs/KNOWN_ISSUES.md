# Estado de incidencias

El diagnóstico histórico completo permanece en PROJECT_ANALYSIS.md. Esta lista registra el desarrollo posterior, sin certificar el juego completo.

| Incidencia | Estado y evidencia |
|---|---|
| H01/H02: cierre inexistente/recursivo | Corregido en la ruta activa; resultado idempotente con vencedor explícito. Regresión VM y cierre controlado en Chrome; falta victoria de partida completa |
| H05: eliminación atribuida a pf y repetida | Corregido con atacante explícito e idempotencia. Regresión VM |
| H06: turnos de eliminados | Rotación omite eliminados y cuenta cruce de ronda. Regresión VM |
| H03: NEXT_STEP avanza dos veces | Handler aplica índice y ejecuta paso sin incrementarlo. Regresión de protocolo aislado |
| H04: CPU en invitado | runCurrentStep espera en turnos remotos/CPU sin autoridad, incluidos ingresos. Regresión VM. Setup online pendiente |
| BUG-09: estado final | Se registra/transmite resultado, se bloquean entradas principales y transiciones, se cierran dados y cancelan timers de ataques registrados. No hay auditoría completa de callbacks/temporizadores; sincronización real pendiente |
| BUG-02/H10/H11 | Corregida transición manual al despliegue combinado, contador con solo mechs y barrera de finalización con reservas pendientes. Se conserva reserva nuclear sin ubicación. CPU de setup solo host y evento DEPLOY común. Regresiones VM de reservas 3–6J; falta E2E manual/mixto y multicliente real |
| BUG-05/06/07/08 | Combate interactivo y automático divergen; posibles bucles/bloqueos, selección por AP frente a unidades y bajas poco claras. Pendientes |
| BUG-03/04/H07/H08/H09/H13 | Confirmación/costes de mejoras, contador y última unidad de misil, supervivientes nucleares, habilidades y evaluación de victoria pendientes |
| H12/H14 | Reconexión/replay/autoridad y nombres remotos inseguros pendientes; no probados contra Firebase |
| H15–H17 | Copias históricas, PWA y rendimiento pendientes; standalone intacta |
| BUG-01 | Móvil todavía no validado como jugable. Smoke horizontal solo verifica carga/cierre |
| Rusia | Corregido según reglamento V3 p.6: 60 territorios, 7 Rusia, enlace transcontinental. Grafo y conservación de 59 originales probados; capturas antes/después. Selección real en Chrome; partida completa/online real pendientes |

No se considera cerrado el bloque A. Los defectos restantes impiden certificar estabilidad.

## Contraste con V3 recibido

Ver RULES_SPEC.md con páginas. Nuevos fallos confirmados: bajas sin degradaciones ni identidad del dado, desempate por caras/tipo ausente, defensa limitada por dados atacantes, Aircraft sin vuelo/transporte y momentos de victoria incorrectos. Estos fallos mantienen abierto el bloque A. Contradicciones del resumen resueltas por el propietario: 4 Pu/base y D6≥5 contra Aircraft.
