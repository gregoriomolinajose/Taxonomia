# Epic 16: Blueprint V4 Audit & Refactoring

## Description
Refactorización Arquitectural Exhaustiva: DataGrid Minimalism, Visibility Flags, Topología. Esta épica materializa las recomendaciones de modularidad extraídas de la auditoría `src_modules_audit.md`, aplicando el diseño de *Inversión de Control* y delegación explícita (SRP) tanto en Frontend (Factorías y Layouts) como en Backend (Action Router).

## Stories Breakdown

1. **[x] S16.1: Governance SSOT & Visibility Flags (S) ✓**
   - *Description:* Mover meta-datos de visualización UI (`showInMenu`, `iconName`) desde `Index.html` (Front) hacia `APP_SCHEMAS.METADATA` (Backend) garantizando una única fuente de verdad topológica.
2. **[x] S16.2: Action Router Purification (M) ✓**
   - *Description:* Fragmentar la complejidad de `API_Universal.gs` (>500 LOC) transformándolo en un enrutador ligero que delegue llamados a Action Controllers puros.
3. **[ ] S16.3: DataGrid Minimalism & Layout Extraction (L)**
   - *Description:* Extraer el motor de búsqueda en-memoria fuera de `DataView_UI.html` hacia su propio módulo, limpiando el `UI_DataGrid` para que sea una interfaz 100% "tonta" enfocada solo en pintado masivo de filas.
4. **[ ] S16.4: Inversion of Control en FormFactory (L)**
   - *Description:* Desmantelar el monstruoso switch interno de `FormBuilder_Inputs.html` e implementar un patrón de registro (*Input Builder Registry*) para los campos especializados.

## Boundaries
- **In Scope:** Extracción del metadata, desacoplamiento del grid de filtros, enrutador de capa de servidor.
- **Out of Scope:** Alteración en la Base de Datos (`Adapter_Sheets.js`), lógica de topologías temporales (ya gestionada).

## Done Criteria & Risks
- **Done:** Las 4 historias fusionadas a `develop`. Servidor y SPA presentan una carga mental drásticamente menor (LOC reducido). El evaluador estático AST de Node aprueba sin errores de sintaxis o referencias sueltas.
- **Risks:** Scope Bleeding de variables globales durante el refactoring asíncrono; se mitiga validando estrictamente el despliegue a DEV (`node deploy.js dev`) tras cada macro-movimiento de capas.
