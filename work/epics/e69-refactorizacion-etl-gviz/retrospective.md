# Epic E69: Refactorización ETL GViz - Retrospective

## Summary
- **Epic**: E69 - Refactorización ETL GViz
- **Status**: ❌ Abandoned / Descoped
- **Dates**: Agosto 2026

## Why was this Epic Descoped?
Tras una evaluación técnica crítica de la hipótesis original de la épica ("usar GViz resolverá los problemas de OOM al importar archivos en Google Drive"), se determinó que:

1. **Hipótesis Invalidada**: GViz no es una API de streaming y devuelve la tabla serializada completa en un JSONP masivo. No reduce significativamente el uso de memoria RAM en el runtime V8 para archivos extremadamente grandes (más de 5,000 registros). 
2. **Problemas de Autenticación**: GViz sobre archivos externos (subidos por el usuario) presenta riesgos severos de permisos (ej. `.xlsx` convertidos o Drives compartidos sin visibilidad directa). El enfoque actual usando `SpreadsheetApp.openById()` hereda la sesión y scopes de manera mucho más robusta y segura.
3. **Historia Absorbida**: El wrapper interno `Adapter_Sheets.query()` planeado en la historia S69.1 ya fue desarrollado de manera exitosa y absorbido por la épica de Zero-Trust GViz (E68).

## What to improve (Technical Debt Logged)
La optimización real del ETL masivo no requiere de GViz, sino de corregir la lectura y carga del motor de extracción original:
- En `extractDataFromDrive`, se realizan llamadas redundantes de doble lectura (`getDisplayValues` + `getValues`) que cargan la misma hoja en RAM dos veces. 
- La tabla completa se debería cargar en "chunks" o bloques de 500 filas usando `getRange()`.
- En `hydrateAndDeduplicate`, la proyección para traer toda la DB a memoria con `list()` debería cambiarse a una consulta GViz `SELECT uniqueFields, pk` a través del adaptador existente (`listBy`). Esta mejora de ~30 líneas (S69.3) se tratará como un parche de deuda técnica separado.

## Conclusion
La épica se cancela formalmente para evitar sobre-ingeniería en una solución técnica (GViz externo) que empeoraría los cuellos de botella existentes en lugar de resolverlos.
