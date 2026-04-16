# Epic E39: Biblioteca de Componentes UI Reutilizables y PWA/Nativo

## Objetivo
Evolucionar los componentes UI de Taxonomía desde módulos monolíticos IIFE hacia una biblioteca de **Web Components reutilizables** con soporte nativo para **Progressive Web App (PWA)** y empaquetado **Capacitor** para distribución en app stores (iOS/Android).

## Contexto Estratégico
Esta épica nace del parking lot de la E38 (Hub de Ingesta), donde se identificó que el Modal ETL — aunque funcional — está acoplado al flujo específico de ingesta CSV/Sheets, dificultando su reutilización para otros workflows de upload (avatares, documentos adjuntos, exports masivos). La migración a componentes genéricos y el soporte de APIs nativas (File Picker de Capacitor) son prerrequisitos para la distribución multi-plataforma de Taxonomía.

## Dentro del Alcance (In Scope)
- Componentización del Modal ETL como Web Component genérico (`<tx-upload-modal>`) con API declarativa.
- Integración con Capacitor File Picker para selección nativa de archivos en iOS/Android.
- Abstracción de un patrón de Upload Component reutilizable (drag-and-drop + file picker + progress).
- Registro de componentes en un catálogo interno de UI Components de Taxonomía.
- Manifesto PWA y Service Worker básico para la SPA de Taxonomía.

## Fuera de Alcance (Out of Scope)
- Publicación en npm público — solo distribución interna.
- Migración de todos los componentes UI existentes — solo el Modal Upload como piloto.
- Implementación de offline-first caching para datos del backend.
- Soporte para plataformas más allá de Web, iOS y Android.

## Historias Planificadas
- **S39.1**: [ ] Diseño de la API del Web Component `<tx-upload-modal>` (atributos, eventos, slots).
- **S39.2**: [ ] Implementación del Web Component genérico con Shadow DOM y CSS encapsulado.
- **S39.3**: [ ] Integración de Capacitor File Picker como adapter de fuente de archivos.
- **S39.4**: [ ] Manifesto PWA y Service Worker básico para la SPA de Taxonomía.
- **S39.5**: [ ] Catálogo de componentes y documentación de uso (Storybook o equivalente ligero).

## Criterios de Finalización (Done)
- El componente `<tx-upload-modal>` funciona idénticamente en browser (PWA), iOS (Capacitor) y Android (Capacitor).
- La selección de archivos usa la API nativa del dispositivo cuando está disponible.
- El componente es instanciable sin dependencias del módulo ETL — acepta cualquier `entityName` y callbacks genéricos.
- Existe documentación de uso con ejemplos concretos para desarrolladores.

## Dependencias
- **E38 (S38.7)**: El rediseño mobile-first del modal ETL debe completarse primero, ya que establece las clases CSS y tokens que el Web Component heredará.

## Riesgos
| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Shadow DOM de Web Components pierde herencia de Ionic tokens | Alta | Usar `adoptedStyleSheets` o `::part()` para penetrar Shadow DOM |
| Capacitor File Picker tiene limitaciones por plataforma | Media | Definir interface adapter con fallback a `<input type="file">` |
| Service Worker cachea assets stale | Baja | Estrategia network-first con cache fallback |
