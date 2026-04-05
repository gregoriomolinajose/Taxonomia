# Epic 23 Brief: Enterprise Identity & Zero-Trust SSO

## Hypothesis
Si integramos el SDK de Google Workspace (Admin Directory API) y resolvemos la deuda estática heredada, lograremos un flujo de Single-Sign-On confiable capaz de suministrar la visualización de avatares reales para los perfiles, robusteciendo paralelamente el despacho de eventos de la interfaz sin falsas llamadas u over-fetching.

## Success Metrics
- El sistema visualiza consistentemente Google Profile Photos desde el Backend (Directory API).
- El sistema inyecta `debounce` directamente a nivel del `AppEventBus` para todos los dispatches.
- Mocks en LocalStorage (`MOCK_ENV=true`) quedan oficial y sistemáticamente desactivados / removidos.

## Appetite
Esfuerzo planificado ~1 a 2 semanas, esfuerzo estructural.

## Rabbit Holes
- Caching: No recargar el Admin API Directory con cuota excesiva; los avatars deben ser almacenados en memoria/caché por sesión o delegados vía Identity Proxy seguro.
