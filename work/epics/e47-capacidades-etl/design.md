# Epic Design: ETL Carga Masiva Capacidades (E47)

## Architectural Concept
El proceso ETL interceptará la subida del archivo, detectará su "firma" de manera proactiva, y transformará la matriz jerárquica de 4 niveles (a partir de la fila 6) en entidades `Capacidades` planas. La topología se construirá matemáticamente utilizando el `Math_Engine` ya existente.

## Component Design

### 1. UI File Interception & Format Sniffing
**Componente Modificado:** `UI_ETL_Modal.client.js` / `DataEngine_ETL.client.js`
- **Lógica:** Al recibir el archivo, se leerán los primeros bytes (o se usará un parser liviano) para buscar la firma del formato.
- **Firma (Sniffing):** Detección del string "Modelo de Capacidades de Grupo" o las columnas `Macrocapacidad` y `Capacidad`. Si hace match, el flujo se desvía al parser especializado.
- **Nota sobre XLSX:** El motor actual de `DataEngine_ETL` solo acepta `.csv`. Para procesar `.xlsx` nativamente en el navegador (y preservar los merged cells correctamente sin pedirle al usuario que convierta a CSV), se integrará la librería `SheetJS` o se pedirá la transformación previa. *Decisión: Priorizar la lectura directa de XLSX si es posible, o extraer un CSV estandarizado.*

### 2. Specialized Parser (`Parser_Capacidades.client.js` o extensión en ETL)
A diferencia del ETL estándar (que mapea 1:1), este requiere lógica de transformación pesada en memoria:
- **Offsetting:** Saltar las filas 0 a 4 (títulos). Leer cabeceras en la fila 5. Empezar iteración en fila 6.
- **Fill-Down (Memoria de Herencia):** Para resolver las celdas combinadas verticalmente, el algoritmo mantendrá variables de estado (`lastMacro`, `lastCapacidad`, `lastSubcapacidad`). Si la celda evaluada está vacía, hereda el valor del nivel superior.
- **Flattening (Aplanamiento de Grafo):** Cada fila del Excel representa un componente hoja y todos sus ancestros. El parser iterará y creará objetos únicos (usando un diccionario `Map` basado en la concatenación de nombres) para evitar insertar la misma "Macrocapacidad" múltiples veces.

### 3. Topology Auto-Generation
**Componente:** `Math_Engine.html`
- **Integración:** Durante el aplanamiento, al crear cada nodo en el diccionario, se invocará `window.Math_Engine.buildOrdenPath` y `window.Math_Engine.buildPathName`.
- **Estructura Caché:** Dado que el `Math_Engine` requiere la tabla completa para calcular los hermanos (`siblings`) y el padre, se construirá el arreglo de nodos de arriba hacia abajo (Nivel 0 -> Nivel 1 -> etc.), pasándolo como caché temporal a las funciones del motor.

### 4. Data API Injection
**Componente:** `DataEngine_ETL.client.js`
Una vez armada la matriz JSON plana final y validada, se utilizará la función robusta existente `_dispatchChunks` para fraccionar el envío a la Base de Datos y evadir los Timeouts de Apps Script, re-aprovechando toda la lógica de feedback y progreso de la UI.

## Parking Lot
- **Exportación en el mismo formato:** Por ahora fuera de scope, pero el diccionario inverso será fácil de construir en un futuro.
