# Epic Design: E13 - The Cleaning Sprint

## 1. Gemba (The Reality)
Actualmente, el `FormRenderer_UI.html` sufre de hipertrofia arquitectónica (ca. 1500 LOC). Más de 300 líneas están dedicadas puramente a evaluar un flujo incrustado de tablas anidadas (Subgrids M:N interactivos) mediante la función interna `renderSubgrid`. Simultáneamente, nuestra validación y UI acopla nombres fijos de variables (ej. `cant_`, `total_integrantes`, `estado`) obligando a parchear el motor genérico cuando el catálogo de datos muta. Finalmente, la manipulación Regex de hojas de estilo en el `deploy.js` es un riesgo no mitigado para la integración continua.

## 2. Target Components & Contracts

### A. Subgrid Architecture (`UI_SubgridBuilder.html`)
- **Tipo:** Vanilla UI Factory Component.
- **Contract IN:** Recibirá el identificador del `field` (Schema), el `data` crudo hidratado y la instancia viva del `LocalEventBus`.
- **Contract OUT:** Devolverá al Renderizador un `HTMLDivElement` completamente atado a eventos.
- **Reactivity Bridge:** Utilizaremos `LocalEventBus` para evitar callbacks infernales. El Subgrid publicará `SUBGRID::DATA_CHANGED`, y el Renderizador Principal escuchará para repintar dependencias (Ej. contadores maestros).

### B. Declarative Validator Engine
- **Current State:** `FormValidators.html` posee bloques `if (key.startsWith('cant_')) ...` directos en su JS.
- **Target State:** Se inyectará un array u objeto meta en `Global_Config.js` o `Schema_Engine.gs` bajo la llave `APP_SCHEMAS.topologyRules.computables`. El validador iterará sobre configuraciones, no sobre literales de código.

### C. AST CSS Minifier Pipeline
- **Tecnología:** Reemplazar el `replace(/.../g)` de `deploy.js` por el paquete `esbuild` nativo o `clean-css`.
- **Contract:** Entrada = Archivos `CSS_*.html` crudos. Salida = Strings CSS 100% minificados con abstracción AST (sin riesgo de destruir selectores exóticos como pseudoclases Tailwind-like u hojas de cascada complejas).
- **Tooling:** Se ejecutará sincrónicamente dentro de `node deploy.js` sin alterar los pasos manuales del desarrollador (`npm run deploy:dev`).

## 3. Top Architectural Risks
1. **Pérdida de Hydration Cache en Subgrids:** Al extraer la inyección Subgrid, podríamos romper el binding al objeto `window.__APP_CACHE__.nestedData`. *Mitigación:* Centralizar el manejador de estado anidado (`SubgridState.js`) proveyéndolo estáticamente a la nueva Factoría.
2. **Deploy Pipeline Freeze:** Integrar esBuild requiere módulos Node adicionales que podrían no ser portátiles en entornos CI pelados. *Mitigación:* Añadir los binarios como `devDependencies` en el `package.json` para garantía de ejecución vía `npm install`.
