# Comparativa de Migración: Reglas ETL (Legacy Frontend vs Current Backend)

A continuación, presento el análisis comparativo entre el viejo motor de carga masiva (`DataEngine_ETL.client.js`) y nuestro nuevo sistema asíncrono basado en colas (`Engine_ETL.js` + `Job_Worker.js`). 

El objetivo de esta lista es identificar con precisión qué lógica ya hemos adoptado de forma centralizada y qué deuda técnica (brechas de lógica) nos impide eliminar por completo los archivos viejos.

---

## 🟢 Reglas YA MIGRADAS al Nuevo Proceso (Backend)

Estas reglas operan correctamente en el nuevo flujo de Job Queue:

1. **(General) Correspondencia Estructural Estricta:** 
   - **Estado:** Migrada y MEJORADA.
   - **Dónde está:** `Engine_ETL.extractDataFromDrive`.
   - **Detalle:** No solo revisa el antiguo umbral del 30% de superposición de columnas, sino que gracias a la historia S61.16, implementa un Fail-Fast del 100% que exige coincidencia exacta con la plantilla (exceptuando campos del sistema).

2. **(General) Sanitización Global (Trim) y Exclusión:**
   - **Estado:** Migrada.
   - **Dónde está:** `Engine_ETL.extractDataFromDrive`.
   - **Detalle:** Se eliminan espacios blancos residuales y se ignoran inteligentemente las columnas internas (`sys_`, `_version`, etc.).

3. **(General) Resolución de Alias Visuales:**
   - **Estado:** Migrada.
   - **Dónde está:** `JS_SchemaUtils.getFieldNameFromLabel`.
   - **Detalle:** En lugar de "hardcodear" mapeos de `Dominio` como antes, ahora el motor busca dinámicamente si el texto coincide con la propiedad `label` del `Schema_Engine`, haciendo que el mapeo sea universal.

4. **(General) Validación de Integridad de Negocio (Validation Engine):**
   - **Estado:** Migrada.
   - **Dónde está:** En el Job Worker y Base de Datos (durante la inserción masiva).
   - **Detalle:** Se respetan los campos obligatorios y tipos nativos.

5. **(General) Autocompletado de Estados (Ciclo de Vida):**
   - **Estado:** Migrada.
   - **Dónde está:** `Job_Worker.js`.
   - **Detalle:** Por defecto asigna `Activo` o `Borrador` dependiendo de la naturaleza de la entidad.

---

## 🔴 Reglas PENDIENTES de Migrar (Deuda Técnica)

Para poder borrar definitivamente el algoritmo Legacy sin perder funcionalidades, **DEBEMOS** implementar esto en el backend (`Business_Interceptors.js` o `Engine_ETL.js`):

### Específicas de Entidad `Persona`:
1. **Gobernanza de Accesos (Allowed Domains)**
   - **Problema:** Actualmente el Job Worker insertaría cualquier correo (ej. pepito@hotmail.com). 
   - **Solución Necesaria:** Mover la validación contra `ENV_CONFIG.ALLOWED_DOMAINS` al bloque `hydrateAndDeduplicate` o como un *Business Interceptor*.
2. **Auto-Provisionamiento Automático en Workspace**
   - **Problema:** En el flujo viejo, tras cargar Personas, el frontend invocaba la creación de correos en Workspace (`runWorkspaceSyncJob`). El Job Worker backend actualmente termina su tarea de Ingesta, pero no encadena automáticamente el Job de Sincronización.
   - **Solución Necesaria:** Al finalizar la ingesta masiva de "Persona" en el Worker, encolar un evento a la tabla `Job_WorkspaceSync`.

### Específicas de Entidad `Dominio`:
3. **Generación de Topología Dinámica**
   - **Problema:** El backend no deduce automáticamente quién es el padre analizando el campo `orden_path` (ej. si suben "1.1", no saben que el padre es "1").
   - **Solución Necesaria:** Implementar un pre-procesador en `hydrateAndDeduplicate` (o un Interceptor) para la entidad `Dominio`.

### Específicas de Entidad `Capacidad`:
4. **Flattening de Grafo Complejo (Lectura de Excel XLSX anidado)**
   - **Problema:** El nuevo ETL asume tablas planas de una dimensión (Google Sheets regulares). Las Capacidades usan un archivo con celdas combinadas (Macrocapacidad > Capacidad > Subcapacidad).
   - **Solución Necesaria:** Evaluar si estandarizamos la carga de Capacidades a un formato plano normal, o si construimos un parser especial en `Engine_ETL.js` para leer su estructura.

### Generales:
5. **Transformación Robusta de Fechas ISO 8601**
   - **Problema:** Si el usuario tipea `24/12/2026` (DD/MM/YYYY), el viejo algoritmo lo interceptaba y lo pasaba a formato ISO de base de datos (`2026-12-24T00:00:00Z`). El nuevo proceso podría depender solo del motor de base de datos y generar registros inválidos.
   - **Solución Necesaria:** Añadir una corrección genérica de fechas en `Engine_ETL.extractDataFromDrive`.
