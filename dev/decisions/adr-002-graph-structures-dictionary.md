# ADR 002: Diccionario de Topologías en el Grafo SCD-2

## Contexto
El negocio requiere que una misma entidad (`Dominio` o análoga) pueda participar en **múltiples estructuras organizacionales simultáneas** (Funcional, Divisional, Horizontal, Basada en Equipos, Jerárquica, Línea-Staff, Por Proyectos, Híbrida). Cada una de estas estructuras ostenta lógicas de cardinalidad distintas (Ej. Jerárquica = rígido 1:N; Proyectos = volátil M:N con caducidad rapida). 
Usar un esquema simple `isTemporalGraph` no es suficiente para prevenir corrupción de dependencias si un usuario inserta aristas ilógicas para determinada estructura.

## Decisión
Implementaremos un **Diccionario de Estructuras Organizacionales (Topologías)** dentro de `Engine_Graph.js`. 
Cada nodo relacional definido en `Schema_Engine` admitirá un flag estructural, ej: `topology: "JERARQUICA_LINEAL"`.
`Engine_Graph.js` interceptará las transacciones y validará la cardinalidad usando las reglas de este Diccionario antes de aplicar la lógica SCD-2 (cerrar fechas `valido_hasta`). Si una topología dicta 1:N, el proxy invalidará automáticamente cualquier padre anterior de la misma estirpe al crear uno nuevo, garantizando la consistencia del grafo.

## Consecuencias
- **Positivas:** Altamente robusto. Garantiza que el backend purgue o advierta sobre colisiones de estructura y respeta la co-existencia multi-grafo para un mismo UUID.
- **Negativas:** Obliga a mantener sincronizado este diccionario; añade una micro penalización (O(1) dictionary lookup) antes de las operaciones de escritura batch.
