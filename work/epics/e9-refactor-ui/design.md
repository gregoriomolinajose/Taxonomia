# Epic E9: Refactor UI MDM - Architecture Design

## 1. Architectural ThemeManager $O(1)$ (JSON Tokens)
El proyecto Taxonomia empleará un pipeline "White Label" para el manejo de su Design System:
- **Origen Estructural:** Un diccionario estricto en JSON (Design Tokens) que define propiedades visuales de la marca (e.g. `window.__THEME_TOKENS__ = { colors: { interactive: { primary: "#..." } } }`).
- **Hidratación Reactiva (Parser):** En el ciclo de vida inicial del Frontend, un recursor aplanará (flatten) este árbol jerárquico hacia sintaxis Kebab-case de variables CSS nativas (`--color-interactive-primary`).
- **Transfusión:** Estas variables son inyectadas dinámicamente vía `document.documentElement.style.setProperty()` directamente al `:root`.
- **Ventaja $O(1)$:** A partir de la hidratación, `ThemeManager` no tiene carga de renderizado; el motor estático del navegador (CSS Native Engine) recalcula la pintura de forma asíncrona sin bloquear el JS Thread.

## 2. Gobernanza de DOM Sweeping & Zero-Touch UI
Alineado con el mandato **UI §14**, se impone la prohibición absoluta de *hardcoding* interactivo.
1. Se prohíbe el uso de `style="color:red"` o equivalentes CSS directos. Toda referencia visual debe consumir las variables hidratadas (`var(--color-...)`).
2. Se erradican inyectores de lógica gráfica estática dentro del DOM en los componentes transaccionales (`DataView_UI.html` y `FormEngine_UI.html`).

## 3. Gobernanza Z-Index (UI §14.2)
El ecosistema `CSS_App.html` delimita topológicamente la superposición gráfica bajo 4 capas herméticas:
- `10`: Sticky Footers y elementos bases en el flow.
- `50`: Sidebar y Menús Overlay (Mobile Drawer).
- `100`: Componentes de Navegación Modal y FormEngine apilados LIFO.
- `9999`: Loaders, Toasts, y Alertas Críticas de alta jerarquía.
