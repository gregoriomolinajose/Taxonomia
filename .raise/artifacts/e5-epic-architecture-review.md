## Architecture Review: Epic E5 (scope: epic)

**Context:** Revisión Arquitectónica Sistémica (Epic Scope) tras la conclusión de las historias S5.1 - S5.6 para evaluar la proporcionalidad del nuevo "Grafo Temporal Multi-Estructural".

### Heurísticas Evaluadas (Systemic & Proportionality)
*   **H13 (Orphaned Abstractions) - PASS:** No se detectaron interfaces abstractas sin uso. El subgrid `relaciones_padre` consume de manera concreta el engine genérico `orchestrateNestedSave`. El framework SCD-2 se aprovecha operativamente en su totalidad para historizar grafos matriciales.
*   **H14 (Coupling Direction) - PASS:** El core de transacciones `Engine_DB.js` opera de manera agnóstica sin importar las llaves hijas de UI. La capa `FormEngine_UI.html` depende del core (y no al revés), manteniendo la integridad del flujo de dependencias de Backend -> Frontend.
*   **H15 (Cyclic Dependencies) - PASS:** La extracción del cálculo `orden_path` previene dependencias cíclicas en renders visuales. La estructura ahora es `FormEngine -> Schema_Engine -> Engine_DB`, fluyendo unidireccionalmente sin callbacks circulares.
*   **H16 (Shotgun Surgery) - PASS WITH QUESTIONS:** 
    *   *Question:* La migración a la tabla puente N:M modificó simultáneamente `JS_Core`, `Engine_DB`, y `FormEngine_UI`. Aunque necesario por ser un "breaking change" estructural, futuras expansiones polimórficas (Ej. Modelar grafos de `Portafolios`) deberían poder heredar esta lógica sin tocar 3 archivos distintos.
*   **H4 (Necessity / YAGNI) - PASS:** La pronta eliminación de las variables muertas en `Math_Engine` durante S5.6 demostró alta adherencia a la regla de eliminar código redundante ni bien se vuelve obsoleto.

### Critical (fix before merge)
Ninguno.

### Recommended (simplify before next cycle)
*   Considerar mover la constante `targetEntity === "Relacion_Dominios"` del hook en `orchestrateNestedSave` hacia el `APP_SCHEMAS`, agregando quizás un flag abstracto `isTemporalGraph: true` para que futuros grafos no requieran un "if" hardcodeado en `Engine_DB.js`.

### Observations (patterns noted)
*   El uso del "Golden Pattern" de inyección de SCD-2 durante transacciones `upsertBatch` es altamente cohesivo. Se ha consolidado una "Memoria de Tiempo" O(1) que no penaliza a la SPA en absoluto.

### Verdict
- [x] PASS WITH QUESTIONS
