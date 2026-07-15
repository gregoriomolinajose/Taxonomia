# S63 — Pipeline de Despliegue para Tenant B

## User Story (Connextra)

**Como** operador del sistema,  
**quiero** poder desplegar el código a una instancia independiente de Google Apps Script para Tenant B,  
**para** que cada tenant tenga su propio proyecto GAS aislado con su propia configuración, sin que un despliegue afecte al otro.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Pipeline de despliegue independiente por tenant

  Scenario: Despliegue a Tenant B via CLI
    Given existe el archivo environments/Config.tenantB.js
    And existe un SCRIPT_ID para Tenant B en deploy.js
    When el operador ejecuta: npm run deploy:tenantB:auto
    Then el pipeline sube los 86 archivos al GAS project de Tenant B
    And el Config copiado en .build/Global_Config.js corresponde al Tenant B
    And NO se modifica el proyecto GAS de Tenant A ni el de dev/prod

  Scenario: Config.tenantB.js no contiene dominios hardcodeados de tenants específicos
    Given environments/Config.tenantB.js existe
    Then NO contiene literales de dominios de tenants específicos (sólo genéricos o vacíos)
    And los ALLOWED_DOMAINS se leen desde Adapter_Config en runtime via PropertiesService

  Scenario: Config.dev.js y Config.prod.js sin dominios hardcodeados
    Given Config.dev.js y Config.prod.js existen
    Then sus ALLOWED_DOMAINS contienen únicamente dominios genéricos de desarrollo
    And no contienen dominios de tenants específicos (white-label)

  Scenario: deploy.js acepta 'tenantB' como environment válido
    Given deploy.js ha sido actualizado
    When se pasa el argumento 'tenantB' o 'tenant-b'
    Then el pipeline usa SCRIPT_IDS['tenantB'] para apuntar al GAS correcto
    And usa environments/Config.tenantB.js como archivo de config
```

---

## Specification by Example

| Comando | Efecto |
|---------|--------|
| `npm run deploy:tenantB:auto` | Push a Tenant B GAS con Config.tenantB.js |
| `npm run deploy:tenantB` | Mismo, pero interactivo (pregunta versión) |
| `npm run deploy:dev:auto` | Sin cambio — sigue apuntando a dev |
| `npm run deploy:prod:auto` | Sin cambio — sigue apuntando a prod |
