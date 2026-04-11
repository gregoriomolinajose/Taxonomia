# Problem Brief: Schema Engine Constraint Governance

> **Fecha:** 2026-04-10
> **Proyecto:** Taxonomia
> **Estado:** Listo para `/rai-epic-design`

---

## 1. APUESTA — Dominio del Problema

**Tipo:** Visibilidad / control — falta información, métricas o trazabilidad del sistema.

---

## 2. PARA QUIÉN — Stakeholder Primario

**Stakeholder:** Equipo de desarrollo (los que construyen y mantienen Taxonomia).

---

## 3. ESTADO ACTUAL — La Brecha

> *"El equipo de desarrollo no puede auditar ni mantener el esquema de restricciones de campos porque las etiquetas de comportamiento de restricciones y las definiciones de entidades viven mezcladas en un solo archivo (`Schema_Engine`) que crece sin control, dificultando su lectura y exponiendo al sistema a duplicaciones silenciosas."*

**Evidencia observable:**
- El directorio de etiquetas para declaración en el esquema está creciendo de manera acelerada.
- No se tiene visibilidad clara de las restricciones ya configuradas.
- La configuración repetitiva dentro del archivo esquema lo hace cada vez más difícil de leer.
- Alta susceptibilidad a errores al introducir nuevas entidades o campos.

---

## 4. CAUSA RAÍZ — 3 Whys

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué el archivo de esquema crece y es difícil de leer? | Las etiquetas de restricciones de comportamiento están acopladas inline dentro de cada entidad. |
| 2 | ¿Por qué las etiquetas de restricciones están acopladas a las entidades? | Porque no había separación entre el catálogo de restricciones reutilizables y las definiciones de entidades. |
| 3 | ¿Por qué no existía esa separación? | Porque no se había necesitado hasta ahora — el sistema era pequeño y el acoplamiento era manejable. |

**Causa raíz confirmada:**
> *"El `Schema_Engine` fue diseñado con un modelo monolítico donde las etiquetas de restricciones de comportamiento se declaran inline dentro de cada entidad, lo cual era suficiente en las etapas tempranas del sistema — pero con el crecimiento del catálogo de entidades, ese acoplamiento se ha vuelto insostenible: genera repetición silenciosa, dificulta la auditoría y expone al sistema a errores de consistencia."*

---

## 5. EARLY SIGNAL — Indicador Temprano (4 semanas)

**Categoría:** Métrica que mejora.

**Señal:** El `Schema_Engine` deja de crecer proporcionalmente con cada nueva entidad — agregar una entidad nueva no requiere redeclarar etiquetas de restricción ya existentes.

---

## 6. HIPÓTESIS SAFe

> *"Si las etiquetas de restricciones de comportamiento siguen declaradas inline en cada entidad del `Schema_Engine`, entonces agregar nuevas entidades y restricciones seguirá aumentando la deuda de legibilidad y el riesgo de duplicación para el equipo de desarrollo, medido por: **disminución de fallos en la configuración del esquema** al introducir nuevas entidades o campos."*

---

## Señales de Diseño para `/rai-epic-design`

- Separar el catálogo de etiquetas/restricciones del `Schema_Engine` en una capa de configuración independiente.
- Permitir que las entidades referencien restricciones ya declaradas en lugar de redeclararlas.
- Considerar una interfaz o herramienta de configuración visual que permita vincular restricciones declaradas del engine a campos específicos de una entidad.
- El diseño debe mantener retrocompatibilidad con el contrato actual del `Schema_Engine` (E29 strict `primaryKey`).
