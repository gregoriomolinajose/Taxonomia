# Epic 23 Scope: Enterprise Identity & Zero-Trust SSO

## Objective
Implementar hidratación de identidades persistentes vía el *Admin SDK Directory API* para avatares de Workspace de forma nativa e inyectar soporte Multi-Workspace, al mismo tiempo que se salda la deuda técnica de E21 (debounce universal nativo y obsolescencia de Mocks).

## In Scope
- Admin SDK Directory API integration (Multi-Tenant configurable por UI nativa en `APP_SCHEMAS`).
- Manejo de Fallbacks para identidades sueltas o sin foto (Scopes insuficientes).
- Absorber `auto-debouncing` nativamente dentro del Dispatcher de `AppEventBus`.
- Validaciones *Type-Strict* (`typeof delay === 'number'`) en literales.
- Normalizar rastros de `console.error` residuales de despliegues.
- Desactivación y/o purga de Mocks Locales.

## Out of Scope
- Migrar o reescribir Reglas del Core ABAC (ya hechas en E18).

## Planned Stories
- **[x] S23.1**: Admin SDK Connector & Avatar Hydration Cache
- **[x] S23.2**: Multi-Workspace Configurations Panel UI
- **[x] S23.3**: Event Dispatcher `auto-debouncing` Integration
- **S23.4**: Mock Deprecation & Console Warning Cleanups

## Done Criteria
- [ ] No existen mocks forzando el login; todo pasa genuinamente por el flujo Zero-Trust.
- [ ] Configurador Multi-Workspace existe y funciona via DataView.
- [ ] Los Perfiles cargan visualmente Google Photos del Directory.
- [ ] Todo input asíncrono tiene su debouncer delegado desde el EventBus transparentemente.
