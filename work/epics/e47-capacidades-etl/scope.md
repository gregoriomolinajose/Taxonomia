# Scope: ETL Carga Masiva de Capacidades (E47)

## Objective
Desarrollar un ETL para la carga masiva de capacidades desde un archivo plano, transformando la estructura de 4 niveles (Macrocapacidad, Capacidad, Subcapacidad, Componente) al esquema interno del sistema con auto-generación de rutas lógicas (`order_path` y `path_completo_es`).

## In Scope
- **Auto-detección en Modal ETL:** Capacidad del modal de importación existente para detectar proactivamente la firma de este archivo (ej. columnas específicas o título "Modelo de Capacidades de Grupo 2.0" en las primeras filas) y enrutarlo automáticamente a este nuevo parser, simplificando la UX.
- **Parsing Avanzado:** Lógica para ignorar las primeras 5 filas (títulos/logos), leer los headers en la fila 6 y resolver la herencia de celdas combinadas (merged cells) en las columnas de niveles superiores.
- Adaptación o creación del parser ETL para leer el archivo de capacidades en su formato origen.
- Lógica de mapeo y transformación:
  - Nivel 0: Macrocapacidad (Etiqueta "Macrocapacidad"). Sin descripción.
  - Nivel 1: Capacidad (Etiqueta "Capacidad"). Sin descripción.
  - Nivel 2: Subcapacidad (Etiqueta "Sub capacidad"). Mapea "Descripción de la Subcapacidad".
  - Nivel 3: Componente (Etiqueta "Componente"). Mapea "Descripción del componente".
- Auto-generación del campo `order_path` y `path_completo_es` consumiendo estrictamente las funciones pre-existentes `buildOrdenPath` y `buildPathName` del `Math_Engine.html` (re-evaluando su compatibilidad para ingesta masiva si es necesario, pero evitando re-desarrollarlas).
- Tratamiento explícito de campos no mapeados como vacíos: `external_id`, `nombre_en_ingles`, `abreviacion`, `contexto_completo`.
- Persistencia de los datos en la entidad de Capacidades.

## Out of Scope
- Modificación de la estructura de la base de datos más allá de lo necesario para esta ingesta.
- Alteración a los permisos del ABAC sobre capacidades.
- Exportación del catálogo a este mismo formato.

## Stories
- S47.1: ETL Parser y Mapeo Estructural Básico.
- S47.2: Algoritmos de auto-generación de topología (`order_path` y `path_completo_es`).
- S47.3: Integración y pruebas de carga con la base de datos / UI.
