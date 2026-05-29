# Deploy Setup Guide — Multi-Account Clasp Auth

## Resumen

El pipeline de deploy soporta múltiples cuentas Google simultáneamente. Cada entorno usa el archivo de credenciales de la cuenta propietaria del proyecto GAS destino.

| Entorno | Cuenta | Archivo de credenciales |
|---------|--------|------------------------|
| `dev` | Coppel (`@coppel.com`) | `~/.clasp-coppel.json` |
| `prod` | Coppel (`@coppel.com`) | `~/.clasp-coppel.json` |
| `tenantB` | Coppel (`@coppel.com`) | `~/.clasp-coppel.json` |

---

## Setup inicial (una sola vez por máquina)

### Paso 1 — Generar credenciales de Gmail

```powershell
# 1. Si ya tienes sesión de Gmail activa en clasp, guárdala directamente:
Copy-Item "$env:USERPROFILE\.clasprc.json" "$env:USERPROFILE\.clasp-gmail.json"

# O si necesitas hacer login desde cero:
npx clasp login --no-localhost
# Autentícate con tu cuenta Gmail en el browser
Copy-Item "$env:USERPROFILE\.clasprc.json" "$env:USERPROFILE\.clasp-gmail.json"
```

### Paso 2 — Generar credenciales de Coppel

```powershell
# Login con cuenta Coppel (esto REEMPLAZA el token default)
npx clasp login --no-localhost
# Autentícate con tu cuenta @coppel.com en el browser

# Guardar el token de Coppel
Copy-Item "$env:USERPROFILE\.clasprc.json" "$env:USERPROFILE\.clasp-coppel.json"
```

### Paso 3 — Restaurar el token default (opcional)

Si prefieres que la sesión activa sea Gmail para trabajo cotidiano:

```powershell
Copy-Item "$env:USERPROFILE\.clasp-gmail.json" "$env:USERPROFILE\.clasprc.json"
```

---

## Prerequisitos de acceso a proyectos GAS

Para que la cuenta Coppel pueda hacer push a todos los entornos, los proyectos GAS deben estar compartidos:

| Proyecto GAS | Dueño | Compartir con |
|-------------|-------|---------------|
| `Taxonomia Project` (dev) | Gmail | `tu_cuenta@coppel.com` como **Editor** |
| `SGMP` (prod) | Coppel | — (es el dueño, acceso nativo) |
| Proyecto Bancoppel | Por definir | `tu_cuenta@coppel.com` como **Editor** |

### Cómo compartir el proyecto GAS de dev:
1. Ir a [script.google.com](https://script.google.com) con la cuenta **Gmail**
2. Abrir `Taxonomia Project`
3. Menú → **Compartir** → Agregar `tu_cuenta@coppel.com` como **Editor**

---

## Verificación

```powershell
# Verificar que los archivos existen
Test-Path "$env:USERPROFILE\.clasp-gmail.json"   # debe ser True
Test-Path "$env:USERPROFILE\.clasp-coppel.json"  # debe ser True

# Test de deploy a dev (usando creds Coppel)
npm run deploy:dev:auto

# Test de deploy a prod (usando creds Coppel)
npm run deploy:prod:auto
```

---

## Troubleshooting

### Error: "Credentials file not found"
```
[Deploy] WARNING: Credentials file not found: C:\Users\grego\.clasp-coppel.json
```
**Solución:** Sigue el Paso 2 del setup.

### Error: "Could not read from remote repository" o "Permission denied"
La cuenta del archivo `.json` no tiene acceso al Script ID destino.  
**Solución:** Verifica que el proyecto GAS está compartido con la cuenta correcta.

### El deploy usa la cuenta incorrecta
Verifica que el archivo de credenciales corresponde a la cuenta esperada:
```powershell
$creds = Get-Content "$env:USERPROFILE\.clasp-coppel.json" | ConvertFrom-Json
# El campo 'token' o 'refresh_token' debe existir
```

---

## Arquitectura de archivos

```
%USERPROFILE%\
├── .clasprc.json          ← Token activo (default fallback)
├── .clasp-gmail.json      ← Credenciales cuenta Gmail (legacy, ya no se usa para deploy)
└── .clasp-coppel.json     ← Credenciales cuenta Coppel (dev, prod + tenantB)

Taxonomia Project/
├── deploy.js              ← Lee CREDS_FILE[env] para seleccionar credenciales
└── environments/
    ├── Config.dev.js
    ├── Config.prod.js
    └── Config.tenantB.js
```

> ⚠️ **Nunca subas los archivos `.clasp-*.json` al repositorio.** Contienen tokens OAuth2 privados. El `.gitignore` del proyecto excluye `*.clasprc*` pero verifica que también excluya `.clasp-*.json`.
