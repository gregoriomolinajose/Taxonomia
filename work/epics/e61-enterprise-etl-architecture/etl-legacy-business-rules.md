# Evaluación de Reglas de Validación en Carga Masiva (Legacy ETL)

Al evaluar el algoritmo de carga masiva antiguo (`DataView_UI.client.js` que delegaba a `DataEngine_ETL.client.js`), encontramos que el motor implementaba un enfoque de procesamiento síncrono por lotes en el navegador. 

A continuación, presento la lista estructurada del orden de aplicación de reglas de negocio y validaciones que se ejecutaban sobre los registros:

## Orden de Aplicación de Reglas

### A. Fase 1: Pre-Validación (Fast-Fail)
Estas reglas se aplicaban antes de procesar la matriz de datos completa para evitar desgaste computacional en archivos inválidos.

1. **Regla de Correspondencia Estructural (Overlap General)**
   - **Alcance:** Todas las Entidades.
   - **Regla:** Extrae las cabeceras del CSV y calcula el solapamiento contra los campos declarados en `APP_SCHEMAS`. Si el solapamiento es **menor al 30%**, la importación se cancela inmediatamente bajo el supuesto de que se cargó el archivo equivocado.

2. **Regla de Existencia Estricta**
   - **Alcance:** Específico para Entidad `Persona`.
   - **Regla:** Verifica que exista al menos una columna llamada *"correo"*, *"email"* o *"correo corporativo"* en la cabecera. Si no existe, se aborta la carga completa ("El archivo no contiene la columna correo").

3. **Regla Estructural de Formato Topológico**
   - **Alcance:** Específico para Entidad `Capacidad`.
   - **Regla:** Requiere obligatoriamente un formato de Excel 2.0 (XLSX) con al menos 6 filas. Las primeras 5 filas se asumen como metadata/instrucciones visuales y se ignoran por completo.

---

### B. Fase 2: Sanitización y Mapeo
Aplicada fila por fila para estandarizar la información antes de validarla contra el esquema.

4. **Regla de Sanitización Global (Trim)**
   - **Alcance:** Todas las Entidades.
   - **Regla:** Remueve espacios en blanco residuales (trailing/leading whitespaces) en todas las celdas de texto para evitar inconsistencias heredadas de Google Sheets.

5. **Regla de Exclusión de Sistema**
   - **Alcance:** Todas las Entidades.
   - **Regla:** Ignora explícitamente cualquier columna que comience con `sys_`, `file_`, o se llame `avatar`.

6. **Resolución de Alias Visuales**
   - **Alcance:** Específico para Entidad `Dominio`.
   - **Regla:** Traduce columnas visualmente amigables a sus identificadores técnicos (ej. *"nivel subdominio"* pasa a ser `nivel_tipo`, *"definición"* a `descripcion`).

---

### C. Fase 3: Reglas Topológicas y de Relación
Se aplicaban reglas de estructura de grafos antes de procesar la metadata.

7. **Aplanamiento de Grafo (Graph Flattening)**
   - **Alcance:** Específico para Entidad `Capacidad`.
   - **Regla:** Convierte las columnas planas ("Macrocapacidad", "Capacidad", "Subcapacidad", "Componente") en entidades independientes jerarquizadas, heredando el contexto de las celdas vacías superiores.

8. **Cálculo de Topología Dinámica**
   - **Alcance:** Específico para Entidad `Dominio`.
   - **Regla:** Organiza los nodos basándose en su `orden_path` para garantizar que los Padres se procesen primero. Deduce la relación foránea (`relaciones_padre`) fragmentando el string del `orden_path`.

---

### D. Fase 4: Validación de Esquema (Schema Engine)
La validación individual de datos formales de negocio.

9. **Validación de Integridad de Esquema (Obligatorios y Tipos)**
   - **Alcance:** Todas las Entidades (incluyendo **Equipo**).
   - **Regla:** Cada fila procesada se inyecta en el `ValidationEngine.validate()`. Este motor evalúa:
     - **Obligatoriedad:** Campos marcados como `required` en el esquema.
     - **Tipos de Datos:** Asegura que los números sean numéricos, etc.
     - Si la fila falla, se incrementa el contador de errores, se anexa el motivo y la fila es **rechazada individualmente** (no bloquea el resto del lote).

10. **Autocompletado de Ciclo de Vida**
    - **Alcance:** Todas las Entidades.
    - **Regla:** Si el campo `estado` llega vacío, se inyecta automáticamente el valor predeterminado `"Activo"`.

11. **Transformación Robusta de Fechas ISO 8601**
    - **Alcance:** Todas las Entidades.
    - **Regla:** Si un campo es de tipo `date` o `datetime`, intercepta formatos latinos (`DD/MM/YYYY`) y los fuerza a formato `ISO Date Z`. Si la fecha arroja `NaN`, se rechaza el registro.

12. **Gobernanza de Accesos (Allowed Domains)**
    - **Alcance:** Específico para Entidad `Persona`.
    - **Regla:** Verifica el dominio de la dirección de correo contra una lista blanca institucional (`ENV_CONFIG.ALLOWED_DOMAINS`). Si no coincide, el registro es rechazado por razones de seguridad.

---

### E. Fase 5: Post-Procesamiento (JIT Triggers)

13. **Auto-Provisionamiento Workspace (Sync Job)**
    - **Alcance:** Específico para Entidad `Persona`.
    - **Regla:** Al terminar el ETL con éxito, encola automáticamente la sincronización síncrona contra Google Workspace para provisionar/actualizar cuentas en el dominio.

---

### Resumen Específico para la entidad "Equipo"
A diferencia de `Persona` o `Dominio` que tenían lógica a la medida, **Equipo** no contaba con reglas manuales "hardcodeadas" en el ETL. 

Toda validación de "Equipo" se regía **exclusivamente por el esquema universal (Fase 4)**. Esto incluía la validación del nombre, su responsable y sus relaciones, rechazando únicamente filas vacías o que incumplían el solapamiento del 30% en las cabeceras de la plantilla.
