## Quality Review: E68 (Zero-Trust & GViz Scalability)

### Critical (fix before merge)
- **Engine_DB.js:884** - *Reference Error*: El código llama a `_Adapter_Sheets.query(...)`. El objeto instanciado se llama `Adapter_Sheets`. Esto lanzará un `ReferenceError` en runtime y romperá el motor completo de ABAC. **Sugerencia:** Renombrar `_Adapter_Sheets` a `Adapter_Sheets`.
- **Engine_ABAC.js:75-92** - *Memory Scalability (OOM)*: El Paso 1 de la resolución topológica (Base Ownership) no fue refactorizado. Sigue iterando sobre *todas* las entidades y ejecutando `this._getCachedData(entName)` para buscar coincidencias. Esto descarga todas las tablas a la memoria de V8 (Full Table Scan), derrotando el propósito de esta épica (evitar OOM). **Sugerencia:** Refactorizar el Paso 1 para utilizar `Engine_DB.listBy` con GViz, idéntico al Paso 2.

### Recommended (improve code quality)
- **Install_Seeder.js:25** - *Generación de IDs de Permisos*: [FIXED] El índice fue removido garantizando idempotencia.
- **Engine_DB.js:862** - *Escape de comillas en GViz*: [FIXED] Se añadió la validación temprana de `null/undefined`.
- **Engine_DB.js:857** - *Code Smells*: La función `getColumnLetter` se declara anónima dentro de `listBy` en cada ejecución. **Sugerencia:** Extraerla como un helper privado `_getColumnLetter` en el objeto principal.
- **Install_Seeder.js:150-153** - *Inconsistencia de Patrones*: La función `seedGreatPeepsRoles` sigue usando IDs harcodeados manuales, en contraste con el nuevo modelo dinámico del resto del seeder. **Sugerencia:** Alinear los patrones.

### Observations (no action needed)
- **Adapter_Sheets.js:782** - *Regex Parser*: El uso de `(?<=.*\().*(?=\);)` para limpiar el callback `/*O_o*/` de GViz es frágil si Google alguna vez cambia la estructura del callback, pero es el estándar de la industria (no documentado) que lleva 10 años sin cambiar. Es un riesgo aceptado.
- **Engine_ABAC.js:106** - *Fallback Recursivo*: Si GViz falla (ej. por cuotas de UrlFetchApp agotadas), el motor retrocede limpiamente a `_getCachedData`. Esto es una excelente práctica de resiliencia (graceful degradation técnico, no de seguridad).

### Verdict
- [ ] FAIL (Requiere corrección del Reference Error y la escalabilidad del Paso 1)
