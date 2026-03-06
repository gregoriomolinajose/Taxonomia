# Modelo de Negocio, Entidades y SAFe 6.0

## 1. Visión
- [cite_start]Una plataforma viva y jerárquica que conecta la estrategia de negocio con la ejecución tecnológica[cite: 3].
- [cite_start]El Propósito: Ser la "Única Fuente de Verdad" (Single Source of Truth)[cite: 4].
- [cite_start]Enfoque SAFe 6.0: Obligatoriedad de jerarquía de aprobaciones, integridad referencial y evadir "Capacidades Huérfanas"[cite: 5].

## 2. Modelo de Datos y Entidades
- [cite_start]**Bloque de Valor:** Unidad de Negocio (Raíz) -> Portafolio -> Dominio -> Producto -> Capacidades[cite: 11, 12, 13].
- [cite_start]**Bloque Operativo:** Personas, Roles (PM, PO, SM, Dev), Equipos[cite: 14, 15].
- [cite_start]**Grafo (Crítico):** `T_Asignaciones` relaciona Persona con Equipo asignando Rol y `% de Dedicación` (la suma no debe exceder la capacidad)[cite: 16, 17]. [cite_start]`T_Relaciones_Grafo` maneja dependencias[cite: 18].

## 3. "Time-Travel" (Effective Dating)
- [cite_start]Nunca se "borran" o "sobrescriben" registros en caliente directamente[cite: 19].
- [cite_start]Toda relación del Grafo debe tener `Fecha_Inicio` y `Fecha_Fin` para permitir visualizaciones históricas[cite: 20].

## 4. RBAC y Flujos de Aprobación
- [cite_start]Todo acceso será exclusivo mediante cuenta de Google Workspace (`Session.getActiveUser().getEmail()`)[cite: 26, 27].
- [cite_start]Los cambios "Hijos" DEBEN ser aprobados por roles "Padre" (Ej: PO propone, PM aprueba)[cite: 31].
- [cite_start]Flujos de Aprobación Jerárquica: Draft -> Submitted -> Approved[cite: 30].

## 5. Sistema Viva (Engagement)
- [cite_start]Regla de Cultura Anti-Data Stale: El sistema deberá contar con notificaciones automáticas a los responsables para evitar que la información se vuelva obsoleta[cite: 33, 34].

## 6. Contrato Estricto del Esquema JSON (APP_SCHEMAS)

El archivo `JS_Schemas_Config.html` es la Única Fuente de Verdad. Para garantizar que los motores de iteración del Frontend (`FormEngine_UI`) y Backend (`Engine_DB`) no sufran excepciones de tipo "undefined", el esquema DEBE respetar la siguiente estructura:

- **PROHIBICIÓN ESTRUCTURAL:** NUNCA definas una entidad como un Array directo (ej. `Equipo: [ {...} ]`). Esto romperá los iteradores del sistema.
- **Estructura Obligatoria (Object-First):** TODA entidad de negocio declarada en el esquema DEBE ser un Objeto literal `{}`.
- **Propiedad `fields` Obligatoria:** Dentro del objeto de la entidad, DEBE existir siempre la propiedad `fields` que contenga el Array con la configuración de las columnas.
- **Formato Estándar Esperado:**
  ```javascript
  Nombre_Entidad: {
    steps: ["Paso 1", "Paso 2"], // Array (Opcional, solo si aplica Wizard)
    fields: [                    // Array (OBLIGATORIO siempre)
      { name: "campo_1", label: "Campo 1", type: "text" }
    ]
  }