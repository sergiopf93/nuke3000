# Inventario vigente — miniaturas del paquete oficial

Fuente recibida: `NUKE3000_animaciones_prototipo.zip`; contrato leído `INTEGRACION_R2.md`; solicitud del propietario `PROMPT_PARA_R2.md`. Prototipo ejecutado e inspeccionado en Chrome local antes de integrar. La demo solo mostró ejemplos; sus resultados ficticios no se incorporaron al motor.

Se integran nueve PNG en `assets/cinematic/`: soldado, meca, aeronave, escorpión, misil, base nuclear y dados D6/D12/D20. Todos son copias byte a byte de los recortes oficiales recibidos, procedentes de MATERIAL, p.5 del Reglamento V4. Dimensiones y SHA256 en [README de assets](../assets/cinematic/README.md).

No se integra `board_reference.png`. Fondo, paleta, hexágonos, texturas, coordenadas, adyacencias y fuentes Orbitron/Rajdhani existentes se conservan. Se retiran las miniaturas SVG genéricas, el terreno duplicado y los pulsos decorativos de la iteración anterior. La nueva escena transparente muestra directamente el mapa vivo, sin reemplazarlo por una imagen.

Calidad provisional: las figuras tienen entre 284 y 425 px de alto en los recortes; no equivalen a fotografías originales de alta definición ni a modelos 3D. Se solicitan para una mejora futura vistas frontal/3⁄4/lateral de las seis figuras, fondo neutro, luz uniforme y ≥2000 px de alto, más fotos por facción si deben conservarse colores particulares y dados legibles. No se han generado figuras sustitutivas ni contratado servicios.
