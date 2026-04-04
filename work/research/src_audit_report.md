# Codebase Audit Report: `/src` Directory Analysis

Hemos corrido el escáner de volumetría, tamaño (Weight en KB) y densidad (LOC - Lines of Code) sobre toda la carpeta `/src`. La meta es identificar archivos "Dios" (*God Objects*) que centralizan demasiada responsabilidad, rompiendo el Principio de Responsabilidad Única (SRP) y limitando el mantenimiento cognitivo.

## Resumen Ejecutivo

- **Total de Archivos Auditados:** 50
- **Umbral "God File" (Factor de Riesgo):** Cualquier archivo superior a **600 líneas** o con peso mayor a **30 KB** es calificado como un Archivo Dios que debe ser deconstruido.
- **Salud del Backend:** Excelente. Todos los motores (Engines) están por debajo de 500 líneas (Ej. `Engine_DB.js` con 490, `Adapter_Sheets.js` con 395). Esto significa que la lógica de servidor / persistencia ya está altamente segmentada.
- **Deuda Activa:** La inflación se encuentra íntegramente alojada en la capa de Presentación/UI (Archivos `.html`).

---

## 🚨 The "God Files" (Prioridad Máxima de Refactorización)

Los 4 archivos con peor índice de concentración. Requieren división estructural.

| Rango | Archivo | Líneas (LOC) | Peso (KB) | Análisis de Sobrecarga (Responsabilidades que mezcla) |
|---|---|---|---|---|
| **#1** | `app.css` | **829** | 35.83 | Monolito de Estilos globales. Acumula utilidades estructurales, colores, reset general, espaciados y componentes individuales bajo un único macro-documento. Requiere fraccionarse (arquitectura *Atomic CSS* o *BEM* modularizada). |
| **#2** | `DataView_UI.html` | **763** | 41.02 | El componente más voluminoso de Javascript. Concentra todo el ciclo de vida del Datagrid: Paginación, Drag & Drop nativo, Filtrado asíncrono, Ordenamiento y Generación por Factories (DOM Tree). Debe extraerse en una arquitectura Model-View-Presenter (DataGrid, DataGrid_Toolbar, DataGrid_State). |
| **#3** | `FormRenderer_UI.html` | **697** | 40.61 | Mezcla la lógica recursiva profunda de renderizado de formularios condicionales (Form Engine) junto con la inyección de UI en Ionic. Sus subsistemas de "Evaluación de Dependencias" deberían extraerse. |
| **#4** | `FormBuilder_Inputs.html` | **617** | 34.03 | A pesar de que ya hay desprendimientos de archivos (Base y Complex), este archivo carga toda la lógica constructiva por cada DataType en un macro script (switch de fábricas de input monstruoso). |

---

## 🟡 Componentes Secundarios (Tier 2 - Zona Segura / "Warning")

Archivos gruesos pero que todavía son coherentes dentro de sus fronteras dominales (~400 a 500 líneas).

| Archivo | Líneas (LOC) | Peso (KB) | Estado y Comentarios |
|---|---|---|---|
| `DesignKit_UI.html` | 516 | 22.86 | Componentes globales unificados (botones, tarjetas, micro-inputs). Fuerte, pero es por naturaleza un diccionario de UI. |
| `Engine_DB.js` | 490 | 24.84 | El ORM Core. Su densidad es puramente referenical y algorítmica. No es prioritario dividirlo ya que no es frágil. |
| `UI_DataGrid.html` | 480 | 22.88 | La factoría visual de componentes del grid. |
| `Adapter_Sheets.js` | 395 | 22.09 | Adaptador de Capa de Datos. Completamente OCP. |

---

## ✅ Distribución Excepcional (Tier 3 - Arquitectura Limpia)

El 84% restante de los archivos en Taxonomia operan en una densidad **inferior a las 350 líneas**, con el grueso estando entre 50 y 200 líneas. Ejemplos del éxito del Proyecto de Refactorización Dual-Write:

- `JS_Core.html`: 285 líneas (Aislado y Limpio)
- `Engine_ABAC.gs`: 198 líneas (Desprendido con éxito)
- `Schema_Engine.gs`: 179 líneas
- `Telemetry`, `Math_Engine.js`: Altamente atómicos.

---

## Recomendaciones a Nivel Arquitectura

Si buscamos planificar una historia de refactorización "Extract & Modularize" (Extracción y Modularización) dentro de las próximas Épicas, las prioridades innegociables sugiero sean:

1. **El patrón del `DataView_UI` (Frontend):** 760 líneas de JS para construir, ordenar y dibujar una tabla lo vuelve riesgoso de mantener. Deberíamos desprender una clase `DataView_Toolbar.html` y un motor `DataView_State_Controller.js`.
2. **Partición de CSS (`app.css`):** Extraer los grids, tipografías e Ionic Overrides a archivos `.css` puros aislados.
