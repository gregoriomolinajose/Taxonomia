# Reglas de Interfaz Gráfica y UX/UI (Frontend)

## 1. Arquitectura Frontend Mobile-First
- [cite_start]Aplicación de Arquitectura Híbrida (Capacitor-Ready) SPA[cite: 8].
- [cite_start]Apps Script solo funge como API/Servidor que inyecta la página; el UI está desacoplado[cite: 35].
- [cite_start]**Uso Estricto de Componentes Nativos:** Todo el DOM dinámico debe generarse usando Web Components de **Ionic (`<ion-input>`, `<ion-datetime>`)**[cite: 36].
- [cite_start]NUNCA inventes o construyas componentes visuales complejos desde cero si existe una alternativa oficial en el framework[cite: 59].

## 2. Progressive Disclosure (Wizards)
- [cite_start]PROHIBIDO renderizar formularios largos en una sola vista plana[cite: 73].
- [cite_start]Si el `APP_SCHEMAS` define la propiedad `steps`, el motor DEBE renderizar un componente de navegación paso a paso (Wizard) utilizando `<ion-stepper>` o `<ion-segment>`[cite: 74].

## 3. Diseño Responsivo Nativo (Grid)
- [cite_start]El layout DEBE construirse estrictamente sobre `<ion-grid>`, `<ion-row>` y `<ion-col>`[cite: 76].
- [cite_start]Todo input debe ser Mobile-First (`size="12"`)[cite: 77]. [cite_start]Si el esquema define `width`, debe mapearse a breakpoints grandes (ej. `<ion-col size="12" size-md="6">`)[cite: 78]. [cite_start]NUNCA uses CSS crudo para el layout[cite: 79].

## 4. Feedback Visual y Theming
- [cite_start]Toda operación de red DEBE bloquear la interfaz usando `<ion-loading>` o `<ion-spinner>`[cite: 80].
- [cite_start]El resultado de las operaciones DEBE comunicarse mediante un `<ion-toast>` nativo[cite: 81]. [cite_start]NUNCA uses `alert()` nativo[cite: 82].
- [cite_start]DEBES usar los tokens de color nativos de Ionic (`primary`, `success`, etc.)[cite: 83]. [cite_start]NUNCA inyectes estilos CSS con colores "hardcoded"[cite: 82].