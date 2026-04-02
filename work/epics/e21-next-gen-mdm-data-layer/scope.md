# Epic 21: Next-Gen MDM & Concurrency Data Layer

> **Status:** 🚧 To Do
> **Origen:** Roadmap Estratégico (Post-Epic 18)

## 📌 Contexto
El SPA está madurando de una herramienta de consumo de lectura a una plataforma distribuida de Master Data Management (MDM). Se requiere fortalecer la concurrencia asíncrona ante colisiones e ingesta masiva (Big Data).

## 🎯 Objetivos
- Proteger contra sobreescrituras en caliente.
- Escalar el flujo de catálogos masivos y dependencias huérfanas mediante estrategias optimistas.

## 📦 Scope / Historias Candidatas

1. **[ ] S21.1: Motor Transaccional B2B (Optimistic Locking)**
   - Sistema de colisión: impedir escritura concurrente si existen "Dirty Writes" simultáneos.
   
2. **[ ] S21.2: Motor de Escalabilidad (Selects Asíncronos)**
   - Flags pasivos en `APP_SCHEMAS`: Implementar `lookupType: "async"` con Debounce en UI para Typeahead de listas >2000 nodos.

3. **[ ] S21.3: Grafos Tolerantes a Fallos (Soft Delete Constraints)**
   - Rebotar recursivamente sobre nodos huérfanos que cuyo Parent haya sufrido Borrado Lógico en Engine_DB.
