# S60 — Config_System Entity Schema (Adapter-Driven)

## User Story (Connextra)

**Como** administrador del sistema,  
**quiero** tener una entidad `Config_System` accesible desde el menú lateral de Taxonomía,  
**para** poder configurar los parámetros fundamentales del sistema (adaptador de BD, dominio, branding) sin acceder directamente a archivos de código o a pestañas ocultas del Schema Studio.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Config_System en menú lateral

  Scenario: Administrador ve Config_System en el menú
    Given el usuario autenticado tiene rol SUPER_ADMIN
    When navega a la barra lateral izquierda
    Then ve la opción "Configuración del Sistema" bajo la sección ADMINISTRACIÓN

  Scenario: Formulario de Config_System se renderiza
    Given el administrador hace clic en "Configuración del Sistema"
    When el FormRenderer carga la entidad
    Then ve los campos: db_adapter_id, spreadsheet_id, tenant_name, allowed_domains, app_title, favicon_url
    And el campo db_adapter_id es un select con opciones "sheets" y "clouddb"
    And todos los campos son editables

  Scenario: Engine_DB enruta Config_System al Adapter_Config
    Given el administrador guarda el formulario de Config_System
    When API_Universal procesa el save
    Then Engine_DB detecta el campo adapter: 'config' en el schema
    And delega a Adapter_Config en lugar de Adapter_Sheets
    And NO se escribe ninguna fila en Google Sheets

  Scenario: Schema de Config_System no aparece en Schema Studio Blueprint Composer
    Given el administrador abre el Schema Studio
    When navega a la lista de entidades
    Then Config_System NO aparece como entidad gestionable en el Composer
    (es una entidad de sistema, no de datos de negocio)
```

---

## Specification by Example

| Campo | Valor de prueba | Comportamiento esperado |
|-------|----------------|------------------------|
| `db_adapter_id` | `"sheets"` | Select con opciones sheets/clouddb; valor default sheets |
| `spreadsheet_id` | `"1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"` | Texto libre, no validado en frontend |
| `tenant_name` | `"Tenant A"` | Texto libre, reemplaza branding hardcodeado |
| `allowed_domains` | `"@tenantA.com,@tenantB.com"` | CSV, el mismo formato que `alias_alternativos` |
| `app_title` | `"Sistema de Taxonomía OMR"` | White-label del título de la pestaña del navegador |
| `favicon_url` | `"https://empresa.com/favicon.ico"` | URL del ícono |
