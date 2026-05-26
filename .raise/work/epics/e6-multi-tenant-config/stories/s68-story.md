# S68 · Transferencia de Ownership Deploy

## Story

**Como** administrador de Coppel,  
**quiero** ser la cuenta principal que despliega a todos los entornos (Gmail-dev, Coppel-prod, Bancoppel),  
**para que** no dependa de que mi cuenta Gmail tenga permisos especiales en los proyectos GAS de Coppel/Bancoppel, respetando las restricciones de seguridad corporativas.

---

## Contexto

La restricción de Coppel impide compartir sus recursos (GAS projects, Google Sheets) con cuentas externas `@gmail.com`. Hasta ahora el workaround era compartir el Sheet de Coppel con Gmail. La solución definitiva es invertir el flujo: la cuenta Coppel hace el push a todos los entornos.

Esta story es principalmente operacional (pasos manuales + verificación) pero incluye cambios en `deploy.js`:
- Registrar el Script ID real de Bancoppel
- Actualizar documentación de setup para nuevos developers

---

## Acceptance Criteria

```gherkin
Scenario: Cuenta Coppel puede hacer push a dev (Gmail)
  Given que ~/.clasp-gmail.json tiene un token de la cuenta Gmail
  And el proyecto GAS de dev (Script 1ZjGYDS...) está compartido con cuenta Coppel como Editor
  When ejecuto npm run deploy:dev:auto desde la cuenta Coppel
  Then el push es exitoso con 87 archivos

Scenario: Cuenta Coppel puede hacer push a prod (Coppel)  
  Given que ~/.clasp-coppel.json tiene un token de la cuenta Coppel
  And el Script ID 14oIjG_... pertenece a la cuenta Coppel
  When ejecuto npm run deploy:prod:auto
  Then el push es exitoso

Scenario: Script ID de Bancoppel registrado
  Given que el proyecto GAS de Bancoppel ha sido creado
  When reviso deploy.js > SCRIPT_IDS['tenantB']
  Then contiene el Script ID real (no el placeholder)

Scenario: README del setup está actualizado
  Given que un developer nuevo quiere configurar el pipeline
  When sigue las instrucciones en docs/deploy-setup.md
  Then puede configurar los dos archivos de credenciales y desplegar exitosamente
```

---

## Pasos Manuales (prerequisitos)

Estos pasos los realiza el desarrollador, no el agente:

1. **Compartir el proyecto GAS de dev con la cuenta Coppel**
   - Ir a `script.google.com` con la cuenta Gmail
   - Abrir `Taxonomia Project` → Compartir → Agregar `tu_cuenta@coppel.com` como Editor

2. **Generar token de la cuenta Gmail**
   ```powershell
   # Guardar el token actual de Gmail
   Copy-Item "$env:USERPROFILE\.clasprc.json" "$env:USERPROFILE\.clasp-gmail.json"
   ```

3. **Generar token de la cuenta Coppel**
   ```powershell
   # Login con cuenta Coppel (abre browser)
   npx clasp login --no-localhost
   # Copiar el token generado
   Copy-Item "$env:USERPROFILE\.clasprc.json" "$env:USERPROFILE\.clasp-coppel.json"
   # Restaurar Gmail como default si se prefiere (opcional)
   Copy-Item "$env:USERPROFILE\.clasp-gmail.json" "$env:USERPROFILE\.clasprc.json"
   ```

4. **Obtener Script ID de Bancoppel** (cuando exista el proyecto GAS)

---

## Files to Modify

| Archivo | Cambio |
|---------|--------|
| `deploy.js` | `SCRIPT_IDS['tenantB']` con el ID real de Bancoppel |
| `docs/deploy-setup.md` | Nuevo archivo: guía de setup de credenciales multi-cuenta |
| `.gitignore` | Verificar que `~/.clasp-*.json` no se suba (están fuera del repo — OK) |

## Size: M · Depends on: S67 (done)
