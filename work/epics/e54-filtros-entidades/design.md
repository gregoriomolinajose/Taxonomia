# Design: E54 Habilitar Filtros en Todas las Entidades

## 1. Gemba / Contexto Arquitectónico
Actualmente, las vistas de listado y grillas en el sistema no cuentan con un mecanismo universal de filtrado dinámico profundo. El `Schema_Engine.js` provee la metadata de todos los campos, pero la UI principal (como DataViews o listados) carece de un estado global de filtros.
El nuevo componente actuará como un mediador entre la metadata del esquema (para decidir qué se puede filtrar) y el motor de renderizado (para mostrar solo el conjunto de datos intersectado).

## 2. Componentes Clave (Target Components)

### `UI_UniversalFilter.client.js` (Nuevo)
- **Responsabilidad:** Renderizar la interfaz estilo Jira (Drawer/Sidebar lateral).
- **Comportamiento:** Extraerá dinámicamente de `APP_SCHEMAS[entityName]` la lista de campos (descartando `hidden` o `divider`). Para cada campo seleccionado, renderizará un dropdown con checkboxes deduplicando los valores presentes en el dataset actual o extrayendo las opciones si es un campo de tipo `select`/`relation`.
- **Manejo de Estado:** Mantendrá el estado interno de la selección.
  *Ejemplo de estado emitido:* `{ "departamento": ["Identidad", "Colaboración"], "modalidad": ["Presencial"] }`

### Vista Principal (DataView / List Engine)
- **Responsabilidad:** Inyectar un botón "Filtrar" que abre el Drawer y reaccionar a los cambios de estado.
- **Interacción:** Escuchará el evento o callback `onFilterChange(activeFilters)`. Al ejecutarse, aplicará una función iterativa pura (Array.filter) sobre los datos ya cargados en memoria y disparará el re-renderizado del grid.

## 3. Contratos de Datos (Key Contracts)

### Predicado de Filtrado Universal
La evaluación de los filtros funcionará como un AND entre campos diferentes, y un OR entre valores de un mismo campo.
Por ejemplo: `(departamento == 'Identidad' OR departamento == 'Colaboración') AND (modalidad == 'Presencial')`.

### Generación de Opciones
Para que la experiencia sea idéntica a Jira:
1. Al abrir el campo "Departamento", el sistema mapeará y hará `Set(records.map(r => r.departamento))` para ofrecer exactamente los valores disponibles.
2. Contendrá los valores especiales como `[Sin Valor]`.

## 4. Riesgos y Decisiones
- **Riesgo 1:** Rendimiento en datasets masivos.
  - *Mitigación:* Se ejecutará en cliente (in-memory filtering) que es extremadamente rápido para los límites actuales del sistema (< 5,000 nodos). No generará tráfico a Google Apps Script (Backend).
- **Riesgo 2:** Campos Relacionales (Relaciones 1:N / M:N).
  - *Mitigación:* El motor de filtrado debe soportar evaluar arreglos de IDs relacionales o buscar sobre el atributo textual pre-hidratado por el motor ETL.
- **Decisión Arquitectónica:** No requiere ADR. Es una extensión pura y agnóstica de la capa de Presentación (UI) sin mutación de estado persistente ni cambios en la topología de la base de datos.
