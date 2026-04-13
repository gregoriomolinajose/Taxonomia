# Problem Brief: Visibilidad de Capacidad Operativa en Equipos Ágiles

**Fecha:** 2026-04-12
**Proyecto:** Taxonomia
**Stakeholder primario:** Portafolio / Liderazgo & Área de Negocio
**Estado:** Confirmado

---

## 1. Dominio

**Categoría:** Visibilidad / Control

---

## 2. Stakeholder

**Primario:** Liderazgo y Portafolio
**Secundario:** Área de Negocio

El negocio no conoce su capacidad operativa ni su arquitectura interna. El liderazgo no puede ver el estado real de los equipos como consecuencia directa.

---

## 3. Estado Actual — El Gap

> **"El liderazgo no puede calcular el WIP porque no tiene visibilidad del censo operativo real de sus equipos."**

Las herramientas existentes (directorio activo + herramienta de RRHH) agrupan colaboradores por área funcional, no por equipos multifuncionales ágiles.

---

## 4. Causa Raíz (3 Whys)

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué el liderazgo no tiene visibilidad del censo operativo real? | No existe un source of truth |
| 2 | ¿Por qué no existe un source of truth? | Solo se tiene directorio activo y una herramienta de RRHH que agrupa por área, no por equipos ágiles multifuncionales |
| 3 | ¿Por qué las herramientas existentes no reflejan equipos ágiles? | No fueron diseñadas para ello |

**Raíz confirmada:**
> "No existe un sistema diseñado para modelar la estructura real de equipos ágiles, por lo que el liderazgo opera sin un censo operativo que le permita calcular capacidad y WIP."

---

## 5. Early Signal (4 semanas)

> **El liderazgo puede consultar la capacidad operativa por equipo sin generar un reporte manual.**

Indicadores convergentes:
- Métrica que mejora: tiempo de cálculo de WIP pasa de horas/días a < 1 minuto
- Comportamiento que cambia: el liderazgo deja de solicitar reportes manuales
- Proceso que desaparece: se elimina el Excel/censo mensual
- Queja que deja de escucharse: "no sé cuántas personas tengo disponibles"

---

## 6. Hipótesis (SAFe)

> **Si** el liderazgo no cuenta con un sistema que modele equipos ágiles multifuncionales y opera sin un censo operativo real, **entonces** en 4 semanas podrá consultar la capacidad operativa por equipo sin generar reportes manuales **para** portafolio y área de negocio, **medido por** eliminación de reportes manuales de censo y tiempo de cálculo de WIP < 1 minuto.

---

## Siguiente paso

→ `/rai-epic-design` — cargar este Brief en Step 0.7
