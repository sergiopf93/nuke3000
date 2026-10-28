# Plan incremental NUKE3000

Base: main `93eba1e`. Rama: `dev/stabilization-gameplay`. Sin push, merge ni despliegue.

## Estado — 28/10/2026

Bloque A **en curso**, no aceptado como completo. Primera iteración: regresiones de cierre, eliminación, rotación, despliegue manual/centrales y defectos del protocolo online. 17 pruebas de motor/protocolo/reservas y smoke de navegador. Se conserva el análisis inicial y los archivos locales existentes.

| Bloque | Pendiente para validarlo |
|---|---|
| A | Unificar combate/dados/bajas; evitar callbacks obsoletos y bucles; reparar setup manual/mixto, mantenimiento, misiles y confirmación de mejoras; comprobar momentos de victoria |
| B | Referencia física para Rusia; validar grafo; E2E reales y partidas completas 3–6J; capturas comparativas |
| C | Diseño e implementación móvil horizontal, acciones contextuales y combate claro; regresión escritorio |
| D | Reglas versionadas/validadas, copia por partida, editor soportado por motor, presets/importación/exportación |
| E | Autoridad, deduplicación, reconexión, setup online y pruebas multicliente en entorno seguro; seguridad/persistencia |

Orden siguiente: reproducciones deterministas de combate y setup; corregir antes de avanzar de bloque. No interpretar los smoke tests como partidas completas.

## Dependencias externas

Se necesita referencia física que confirme coordenadas y adyacencias del hexágono de Rusia. No se ha inventado ninguna conexión ni cambiado mapa/paleta. El reglamento nuevo sigue pendiente: conservar mecánicas vigentes y registrar diferencias sin decidir balance. Firebase de producción queda fuera de pruebas.
