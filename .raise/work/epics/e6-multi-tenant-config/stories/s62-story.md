# S62 — Migración "Ajustes Globales" → Config_System UI

## User Story (Connextra)

**Como** administrador del sistema,  
**quiero** ver y editar la configuración del sistema (tenant name, sheet ID, dominios SSO, branding) a través del panel "Ajustes Globales" en el Schema Studio,  
**para** que la configuración persista correctamente en PropertiesService (Adapter_Config) y deje de depender de campos sueltos con claves manuales.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Ajustes Globales usa Config_System como fuente única de verdad

  Scenario: Administrador carga la pestaña Ajustes Globales
    Given el usuario tiene rol SUPER_ADMIN
    When navega a Schema Studio → Ajustes Globales
    Then el formulario muestra los valores actuales leídos desde Adapter_Config
    And los campos reflejan lo que hay en PropertiesService

  Scenario: Administrador guarda la configuración
    Given el formulario de Ajustes Globales está visible con valores editables
    When el administrador hace clic en "Guardar Configuración"
    Then DataAPI llama a Engine_DB.save('Config_System', payload)
    And Adapter_Config.setAll() persiste en PropertiesService
    And se muestra un toast de confirmación
    And NO se llama a API_Admin_SaveGlobalConfig (ruta vieja deprecada)

  Scenario: Placeholder de dominios sin referencias a tenants específicos
    Given el formulario de Ajustes Globales está visible
    Then el placeholder del campo "Dominios SSO" es genérico (ej. "@tenantA.com")
    And NO contiene referencias a dominios de tenants específicos
```

---

## Specification by Example

| Acción | Resultado esperado |
|--------|--------------------|
| Cargar pestaña | `DataAPI.call('getEntityList','Config_System')` → pre-popula campos |
| Guardar | `DataAPI.call('save','Config_System', {...})` → `Adapter_Config.setAll()` |
| Cancelar | Campos resetean a valores originales |
