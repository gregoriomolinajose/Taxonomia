# Epic Brief: Hub de Ingesta Inteligente y Sincronización Workspace

## Strategic Hypothesis
Si transformamos el componente básico de carga de archivos (ETL Offline) en un "Hub Híbrido Integrado con Google Workspace", los administradores de Taxonomía podrán sincronizar grandes directorios corporativos directamente desde Google Sheets ahorrando pasos manuales, al mismo tiempo que el sistema descarta silenciosamente duplicados y enriquece métricas organizacionales (teléfonos, puestos, ubicaciones) leyendo la "fuente de la verdad" corporativa.

## Success Metrics
- **Tiempo de onboarding**: Reducido en 80% (de exportar localmente a pegar una URL).
- **Integridad Referencial**: 100% de registros cruzados sin falsos positivos en entidades humanas (`Persona`).
- **Resiliencia Operativa**: O% Timeouts en App Script a escalar hasta lotes de 10k registros.

## Appetite
- **Tiempo**: 1 a 2 semanas (13 - 21 SP).
- **Equipo**: Frontend (Ionic, Parsing JS), Backend (Apps Script, Google Workspace SDK).
- **Riesgos**: Límite de Cuota de Google Admin SDK al leer 5k usuarios (Mitigado por chunking asíncrono desde frontend y limitadores de tasa).

## Anti-Goals (Rabbit Holes)
- Construir nosotros una "hoja de cálculo" en la web.
- Procesar descargas a archivos físicos desde el backend (Todo el flujo debe delegarse al frontend para evadir los 6 minutos lógicos o manejarse mediante API visual sobre los sheets vinculados).
