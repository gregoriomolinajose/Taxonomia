# Epic 23 Scope: Enterprise Identity & Zero-Trust SSO

## Objective
Implementar hidratación de identidades persistentes vía el *Admin SDK Directory API* para avatares de Workspace de forma nativa, al mismo tiempo que se salda la deuda técnica de E21 (debounce universal nativo y obsolescencia de Mocks).

## In Scope
- Admin SDK Directory API integration para Avatares Reales y sincronización.
- Manejo de Fallbacks para identidades sueltas o sin foto (Scopes insuficientes).
- Absorber `auto-debouncing` nativamente dentro del Dispatcher de `AppEventBus`.
- Validaciones *Type-Strict* (`typeof delay === 'number'`) en literales como `window.debounce`.
- Normalizar rastros de `console.error` residuales de despliegues.
- Desactivación y/o purga de Mocks Locales.

## Out of Scope
- Migrar o reescribir Reglas del Core ABAC (ya hechas en E18).

## Planned Stories
- **S23.1**: Admin SDK Connector & Avatar Hydration Cache
- **S23.2**: Event Dispatcher `auto-debouncing` Integration
- **S23.3**: Mock Deprecation & Console Warning Cleanups

## Done Criteria
- [ ] No existen mocks forzando el login; todo pasa genuinamente por el flujo Zero-Trust.
- [ ] Los Perfiles cargan visualmente Google Photos del Directory.
- [ ] Todo input asíncrono tiene su debouncer delegado desde el EventBus transparentemente.
