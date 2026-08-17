# Resumen de Sesión: Configuración de CI/CD y Resolución de Autorización

**Fecha:** 20 de Marzo de 2026 (y posteriores)
**Objetivo Principal:** Establecer un pipeline CI/CD robusto para Google Apps Script y resolver problemas de autorización en el entorno de Producción.

## Logros Principales

1. **Implementación de Pipeline CI/CD:**
   - Se crearon scripts en `package.json` (`deploy:dev` y `deploy:prod`) para automatizar despliegues usando `clasp`.
   - Se desarrolló el script `deploy.js` que se encarga de intercambiar la configuración (`.clasp.json`) según el entorno objetivo, permitiendo apuntar al Script de Desarrollo o al Script de Producción de manera dinámica.

2. **Gestión de Entornos (Environments):**
   - Se refactorizó la configuración del proyecto para evitar conflictos de variables globales en Google Apps Script (el error de `Identifier 'CONFIG' has already been declared`).
   - Se creó la carpeta `environments/` con plantillas específicas: `Config.dev.js` y `Config.prod.js`.
   - Durante el despliegue, `deploy.js` toma la plantilla correspondiente y la copia en `src/Global_Config.js`.
   - *Nota de seguridad:* `.clasp.json` fue agregado a `.gitignore` para no exponer IDs en el repositorio.

3. **Resolución de Error de Autorización (SpreadsheetApp.openById):**
   - Se corrigió el problema donde la Web App no tenía permisos para acceder al Google Sheet en Producción.
   - **Causa raíz y solución:** Era un problema combinado de caché de GAS y la forma en que se solicitaban los alcances (scopes). Se modificó `appsscript.json` para establecer `"executeAs": "USER_DEPLOYING"`, lo que asegura que la aplicación se ejecuta con los permisos del desarrollador (quien tiene acceso al Sheet), mientras el acceso a la webapp se mantiene para `"ANYONE"`.
   - Se forzó la sincronización de permisos ejecutando una función manual (`PRUEBA_ACCESO_DIRECTO` / `FORZAR_AUTORIZACION`) desde el editor de Apps Script.

4. **Seguridad y Restricción de Dominio:**
   - En el archivo `environments/Config.prod.js`, se configuró la restricción para que solo los usuarios de los dominios `@coppel.com` y `@bancoppel.com` tengan acceso a la aplicación en Producción.
   - En `environments/Config.dev.js` se mantienen permisos más laxos para pruebas.

## Estructura Actual de Archivos Clave

- `deploy.js`: Script de orquestación de despliegues.
- `package.json`: Contiene los comandos `npm run deploy:dev` y `npm run deploy:prod`.
- `environments/Config.prod.js`: Contiene el ID del Google Sheet de Producción y los dominios permitidos.
- `environments/Config.dev.js`: Contiene (o debe contener) el ID del Google Sheet de Desarrollo.
- `src/Global_Config.js`: Es el archivo autogenerado por `deploy.js` que GAS lee en tiempo de ejecución. **No editar directamente**.
- `.clasp-dev.json` / `.clasp-prod.json`: Contienen los `scriptId` de los proyectos de Apps Script correspondientes.

## Próximos Pasos (Pendientes para futuras sesiones)

1. **Configurar ID de Desarrollo:** Actualizar `environments/Config.dev.js` con el ID real del Spreadsheet que se usará para el entorno de Dev.
2. **Desarrollo de Nuevas Funciones:** Continuar con el desarrollo de la aplicación (UI y Backend). Para probar los cambios localmente y subirlos al entorno de pruebas, usar siempre `npm run deploy:dev`.
3. **Paso a Producción:** Una vez que las nuevas funciones estén validadas en el entorno Dev, ejecutar `npm run deploy:prod` para actualizar la versión final.

---
*Este documento sirve como registro para retomar el contexto en futuros chats. Todos los cambios de esta sesión ya fueron consolidados en un commit de Git.*
