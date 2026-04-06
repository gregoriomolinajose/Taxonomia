# Epic 25 Scope: The Zero-Defect Hardening Sprint

## Objective
Sanear la deuda técnica UI/UX resultante de la Épica de descomposión de objetos (God Objects). Se depreca totalmente el uso de modales nativos de Ionic (`ion-modal`) en favor de un diseño Off-Canvas "Mobile First Drawer" para evitar inestabilidad en animaciones y fugas de control.

## In Scope
- Restauración temática: Re-binding ThemeManager -> variables `--ion-color-*`.
- Omnibar UX Fixes: Margen seguro del viewport (Bug 2).
- Event Binding: Re-conectar eventos *click* de la grilla principal hacia la inyección de UI (Bug 3).
- Arquitectura "Drawer": Substitución del Ionic Modal Manager por Drawer personalizado (Bug 4, 5, 6).
- Aislamiento del Sidebar: Remover hijack del DOM principal con forms.

## Planned Stories
- **[x] S25.1**: Estilos del Sistema e Interfaz Core (Bugs 1 y 2) ✓
- **[x] S25.2**: Arquitectura de Formularios "Mobile First Drawer" (Bugs 4, 5 y 6) ✓
- **[x] S25.3**: Restauración de Interacciones de DataGrid (Bug 3) ✓

## Done Criteria
- Error *Unhandled Promise Rejection* en Modal Dismiss está extinguido estadísticamente.
- Colores del DesignKit inyectados correctamente de ThemeManager a Ionic Variables.
- Crear/Editar registros sucede dentro de un Drawer responsivo que abarca el 100% en pantallas móviles y 40-50% en ordenadores de sobremesa.
- Hacer click en una fila de la data layer levanta un modo edición transparente.
