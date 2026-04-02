# 🧹 Auditoría de Backlog y Parking Lot (Limpieza Post-Epic 18)

He cruzado todas las deudas técnicas listadas en `governance/backlog.md` y `dev/parking-lot.md` contra el AST actual de la base de código. Sorprendentemente, **el 50% de las tareas de Deuda Técnica ya fueron mitigadas collateralmente** gracias a las épicas masivas de refactorización (E13, E16, E18).

Aquí tienes el escrutinio de qué podemos desechar y qué sigue vivo:

## 🗑️ Para Purgar Inmediatamente (Ya resuelto u Obsoleto)

### En `dev/parking-lot.md`:
1. **[7] FormContext Object Injection:** *Obsoleto.* La arquitectura `FormBuilder_Inputs` acaba de ser desmantelada (S18.4) e invertida por Factory patterns orgánicos.
2. **[13] Granularidad Múltiple en DataGrid:** *Resuelto (E16).* Durante "DataGrid Minimalism" (S16.3) ya aislamos el SearchBox, alcanzando SRP sin necesidad de sobre-fracturar las tablas en micro-archivos inmanejables.
3. **[17] RBAC Validations (Zero-Trust):** *Superado.* Esto es literalmente la meta central del actual Epic 18 (Gobernanza ABAC), ya no es un "parking lot", es nuestro trabajo activo.
4. **[18] Decoupled Pub/Sub:** *Resuelto.* El SPA ya implementó `LocalEventBus` orgánicamente mitigando este punto durante S18.3.

### En `governance/backlog.md`:
5. **Hardcoded Taxonomia Rules:** *Resuelto.* El archivo `FormValidators.html` ahora itera sobre `APP_SCHEMAS.businessRules` dinámicamente usando OCP. El hardcode ya no existe.
6. **Subgrid Lookup Implicit Fetch:** *Resuelto.* El componente `UI_SubgridBuilder.html` fue reescrito de cero y ha dejado de depender silenciosamente de `window._LOOKUP_DATA`.
7. **sumPrefix Logic Duplication:** *Resuelto.* Un barrido AST confirmó que esta lógica matemática fue borrada de `DataView_UI` y unificada con éxito en `FormValidators`.
8. **WSOD Local XSS Risk:** *Resuelto.* Todo el framework de vistas ahora es XSS-Immune al utilizar constructos nativos o `.textContent` gracias a la directiva de Template Isolation (S18.3).
9. **UI_Router Global Aliases:** *Resuelto.* Ya fue abordado en iteraciones anteriores de Cleaning Sprint.
10. **Orphaned Factory Repaint:** *Obsoleto.* Las factorías fueron purificadas en la E18.

---

## 📌 Deuda que AÚN sigue Viva (Validado)

1. **Validator Truthiness Trap:** Verificado. `FormValidators.html` aún evalúa los checks requeridos con `!input.value`, que es propenso a errores en coerciones lógicas de campos numéricos cero. *(Debe escalarse).*
2. **JSON Parse Swallows Error:** Verificado. Los `try/catch` nativos del FormEngine ignoran fallos de parsing.
3. **Ionic Modal Promises:** Verificado. Aún dependemos de `.addEventListener` en lugar de Promises nativas en las transiciones modales.
4. **Tooling / Pipeline:** *AST RegExp Minifier*, *Native CSS Abstraction*, y *Limpieza Segura de Assets Temporales (.build/*)* siguen vigentes y discutiéndose sobre si mover a Node + Esbuild/Rollup.
5. **Roadmap Big Data MDM:** *Typeahead Selects*, *Soft-Delete Graph*, y *Optimistic Locking* se mantienen firmes como necesidades arquitectónicas a futuro.

---
**Recomendación Activa:** Puedo ejecutar de inmediato un **Purge Script Automático** usando reemplazo en ambos `.md` para eliminar de raíz toda la sección "Obsoleta/Resuelta" detallada arriba, y así reducir el ruido cognitivo de los documentos de gobernanza. 

¿Quieres que proceda con la guillotina para limpiar `backlog.md` y `parking-lot.md`?
