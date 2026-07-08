# System Design: CorePlatform

> System architecture and component design — fill with /rai-project-create or /rai-project-onboard

## Components

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| Engine_DB | Enrutador agnóstico de I/O de bases de datos. | GAS JavaScript |
| FormRenderer_UI | Renderizado recursivo dinámico de interfaces de esquemas. | HTML/Web Components |
| Graph_Engine | Cálculo matemático y relacional de nodos (Taxonomía). | Vis.js / JavaScript |
| Engine_ABAC | Motor de autorización contextual jerárquica. | GAS JavaScript |
| Taxonomia_Module | Lógica de negocio para gobierno de Portafolios SAFe. | GAS JavaScript |
| GreatPeeps_Module | Lógica de negocio para reclutamiento, vacantes y scoring. | GAS JavaScript |
| Integration_Hub | Adaptadores para APIs externas (LinkedIn, Gemini). | GAS JavaScript |
