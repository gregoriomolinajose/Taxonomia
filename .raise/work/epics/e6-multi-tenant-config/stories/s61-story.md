# S61 — Adapter_Config (PropertiesService)

## User Story (Connextra)

**Como** administrador del sistema,  
**quiero** poder guardar y leer la configuración del sistema (`Config_System`) desde el panel de administración,  
**para** que los parámetros del tenant (Sheet ID, dominios SSO, branding) persistan entre sesiones sin escribir ninguna fila en Google Sheets.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Adapter_Config persiste Config_System en PropertiesService

  Scenario: Administrador guarda la configuración por primera vez
    Given la instancia es nueva y PropertiesService está vacío
    When el administrador guarda Config_System con tenant_name="Tenant A" y spreadsheet_id="1ABC..."
    Then Adapter_Config.setAll() almacena los valores en PropertiesService.getScriptProperties()
    And Engine_DB.save('Config_System', payload) retorna { success: true }
    And NO se escribe ninguna fila en Google Sheets

  Scenario: Administrador recarga la configuración
    Given PropertiesService contiene una config guardada previamente
    When Engine_DB.list('Config_System') es invocado
    Then Adapter_Config.asListResponse() retorna { headers: [...], rows: [[...]] }
    And los valores corresponden a lo almacenado en PropertiesService

  Scenario: Config_System vacío en primer arranque
    Given PropertiesService está vacío (instancia nueva)
    When Engine_DB.list('Config_System') es invocado
    Then Adapter_Config.asListResponse() retorna { headers: [...], rows: [[valores_default]] }
    And el campo config_id tiene el valor "SYS-CONFIG-001"
    And los demás campos están vacíos (string vacío)

  Scenario: Configuración se actualiza sin duplicar
    Given ya existe una config guardada con tenant_name="Tenant A"
    When el administrador guarda con tenant_name="Tenant A Actualizado"
    Then PropertiesService contiene el valor nuevo
    And NO existe una segunda entrada — la config es un singleton
```

---

## Specification by Example

| Operación | Input | Resultado esperado |
|-----------|-------|--------------------|
| `setAll(payload)` | `{ tenant_name: 'Tenant A', spreadsheet_id: '1ABC' }` | PropertiesService actualizado, retorna `{ success: true }` |
| `asListResponse()` | (PropertiesService lleno) | `{ headers: ['config_id','tenant_name',...], rows: [['SYS-CONFIG-001','Tenant A',...]] }` |
| `asListResponse()` | (PropertiesService vacío) | `{ headers: [...], rows: [['SYS-CONFIG-001','','','','','','']] }` — valores default |
