---
id: E45
type: retrospective
status: closed
---

# Epic 45 Retrospective: Architecture Refactoring & Tech Debt

## Executive Summary
La Épica 45 se centró en saldar la deuda técnica adquirida durante las integraciones topológicas y de carga masiva previas (E44). El resultado principal es la estabilización completa del pipeline de Ingesta Masiva (ETL), la optimización del rendimiento mediante cachés eficientes y la consolidación de Google Workspace como Fuente Única de Verdad (Single Source of Truth) para el aprovisionamiento de Personas. Se mitigaron cuellos de botella severos, bugs de duplicación y dependencias circulares, dejando la plataforma preparada para el desarrollo de módulos visuales como el Organigrama.

## Metrics & Scope
- **Planned Stories:** 6
- **Completed Stories:** 5
- **Descoped Stories:** 1 (S45.1 - Aplazada al no ser crítica post-estabilización local)
- **Key Deliverables:**
  - Auto-provisionamiento de Cargos refactorizado al Middleware (`Schema_Engine`).
  - Motor de Validación ETL con directivas Fast-Fail (Archivos Vacíos, Formatos Inválidos, Dominios).
  - Feedback UI robustecido (Spinner progresivo, marcadores rojos nativos en caso de error HTTP enmascarado).
  - Lógica de sincronización Zero-Touch priorizada (Workspace > CSV).

## What Went Well
- **Adopción del Principio Fail-Fast:** Mover las validaciones críticas (formatos, presencia de columnas, dominios) al frontend antes del despacho de la red (`DataEngine_ETL.client.js`) redujo sustancialmente la carga sobre la cuota de ejecución de Apps Script.
- **Resolución Asíncrona (Promises):** Entender la orquestación del `API_Universal_Router` y cómo encapsula errores 500 en respuestas 200 JSON, permitió resolver la desconexión entre backend y frontend, restaurando las notificaciones visuales precisas en Ionic.
- **Resiliencia de Procesamiento:** Implementar iteradores `case-insensitive` en el motor de lectura de Excel blindó a la herramienta ante errores de dedo de los usuarios, abrazando la Ley de Postel.

## What Needs Improvement
- **Estructuras de Red Dispersas:** Si bien no fue un bloqueador (motivo por el que se descopó S45.1), la falta de un objeto de respuesta HTTP unificado en Apps Script requiere trampas defensivas en el cliente.
- **Manejo de Errores Google SDK:** Google Workspace y Google Drive SDK aún arrojan excepciones secas (e.g. "Not Authorized") que, aunque las atrapamos localmente, asustan en los logs de App Script Console.

## Lessons Learned
1. **La Validación de Red nunca sustituye la Validación Visual:** Validar en backend es obligatorio, pero si el Frontend no interpreta la validación correctamente y no bloquea el Submit, el usuario percibe el fallo como un "bug silencioso" (Ghost Spinners).
2. **Priorización Estricta de Datos Corporativos:** Si el entorno cuenta con un Active Directory / Workspace, siempre debe dictar el dato. Sobreescribir aportes manuales asegura la gobernanza de datos.

## Action Items (for next epics)
- Proceder con la Épica 46 (Organigrama) confiando en que el motor de relaciones, los identificadores (`id_cargo` y `correo`) y los vértices ya no sufrirán mutaciones aleatorias causadas por ingestas masivas inestables.
