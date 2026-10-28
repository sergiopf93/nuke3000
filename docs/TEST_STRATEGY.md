# Pruebas NUKE3000

## Infraestructura inicial

Node >=22 y node:test sin dependencias para regresiones. tests/engine.test.cjs carga fuentes reales con node:vm y DOM/temporizadores sustituidos. Incluye protocolo online instrumentado solo en memoria: no expone helpers privados en producción ni contacta Firebase.

```sh
npm test
npm run test:engine
npm install
npm run test:browser
```

Playwright 1.63.0 es dependencia de desarrollo gratuita para Chrome instalado. En esta máquina se reutilizó la instalación ya disponible, sin npm install ni cambios al proyecto vecino:

```sh
PLAYWRIGHT_MODULE=/Users/sergiopardo/Desktop/language-trainer/node_modules/playwright /Users/sergiopardo/.nvm/versions/node/v22.23.3/bin/node tests/browser-smoke.cjs
```

El PATH original usa Node 13: usar Node 22 instalado o activar nvm. No se ha generado lockfile ni comprobado instalación limpia de dependencias.

## Evidencia inicial

Cinco regresiones fallaban antes de corregir código; después pasan. Suite ampliada a 17 pruebas (incluye despliegue y reservas 3–6J): victoria idempotente, atribución/eliminación, rotación/ronda, parada de transiciones, autoridad CPU, ausencia de wrapper recursivo, resultado remoto sin eco, NEXT_STEP y snapshot final.

Chrome real: 1440×900 y 844×390; seleccionar facción y comenzar por botones, comprobar 59 nodos, preparar condición final controlada y comprobar resultado único, sin errores JS. Capturas: /tmp/nuke3000-{1440,844}-{setup,result}.png.

**Clasificación:** regresiones de motor/protocolo aislado y smoke de integración en navegador. La victoria del smoke usa estado preparado; no es una partida completa ni un E2E de lobby a victoria legítima. No certifica jugabilidad móvil. Todas las solicitudes externas, SDK/configuración Firebase y service workers están bloqueados durante navegador.

## Pendiente obligatorio

Dados/azar inyectables, combate/setup/economía/misiles/habilidades con límites; simulaciones completas 3/4/5/6J; E2E reales de acciones y al menos una partida completa; emulación táctil/zoom/orientación/móvil pequeño; comparación visual antes/después del cambio de mapa. Firebase Emulator y multicliente: no implementados ni ejecutados. Dispositivos físicos: pendientes.

No existe todavía suite completa, comando E2E ni lint/build/typecheck del proyecto. Mantener esta distinción en entregas.
