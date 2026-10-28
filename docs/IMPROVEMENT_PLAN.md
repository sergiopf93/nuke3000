# Plan incremental NUKE3000

Base: main `93eba1e`. Rama: `dev/stabilization-gameplay`. Sin push, merge ni despliegue.

## Estado — 28/10/2026

Bloque A **en curso**, no aceptado como completo. Primera iteración: regresiones de cierre, eliminación, rotación, despliegue manual/centrales y defectos del protocolo online. 17 pruebas de motor/protocolo/reservas y smoke de navegador. Se conserva el análisis inicial y los archivos locales existentes.

| Bloque | Pendiente para validarlo |
|---|---|
| A | Unificar combate/dados/bajas; evitar callbacks obsoletos y bucles; reparar setup manual/mixto, mantenimiento, misiles y confirmación de mejoras; comprobar momentos de victoria |
| B | Rusia y grafo corregidos según p.6 (no supone cierre del bloque); E2E reales y partidas completas 3–6J; capturas comparativas |
| C | Diseño e implementación móvil horizontal, acciones contextuales y combate claro; regresión escritorio |
| D | Reglas versionadas/validadas, copia por partida, editor soportado por motor, presets/importación/exportación |
| E | Autoridad, deduplicación, reconexión, setup online y pruebas multicliente en entorno seguro; seguridad/persistencia |

Orden siguiente: reproducciones deterministas de combate y setup; corregir antes de avanzar de bloque. No interpretar los smoke tests como partidas completas.

## Dependencias externas

Recibidos reglamento V3 y lore V1. Rusia confirmada e incorporada; mapa/paleta conservados. El futuro reglamento definitivo no se da por recibido: V3 es la referencia actual; divergencias y decisiones en RULES_SPEC.md. Firebase de producción queda fuera de pruebas.

## Iteración de referencia física

24 tests pasan, incluyendo siete del mapa/reparto y las regresiones de reservas ahora sobre 60 territorios. Chrome verifica 59 antes y 60 después en dos tamaños, clic real en 06_07 y DOM idéntico de los 59 originales. Siguiente prioridad A: resolución común de dados tipados con degradaciones y guard de una unidad, según V3 p.10; no avanzar dando por cerrado el motor.
