# Epic 19: Core Framework Resilience & Strictness

> **Status:** 🚧 To Do
> **Origen:** Consolidación de Deuda Técnica (Post-Epic 18)

## 📌 Contexto
Esta épica agrupa las deudas técnicas enfocadas en el fortalecimiento del framework contra flujos subóptimos, manejo erróneo de tipos y asincronía débil. 

## 🎯 Objetivos
- Mitigar silenciamientos de errores a nivel del Framework (JSON Parsons y AppEventBus).
- Refactorizar flujos asíncronos frágiles (reemplazando listeners nativos de eventos por Promesas de Ionic).
- Eliminar la "Trampa de Truthiness" en validadores núcleo.

## 📦 Scope / Historias Candidatas

1. **[ ] S19.1: Estricción de Validadores y Fugas Numéricas**
   - Corregir `!input.value` en `validateRequiredFields`.
   - Limpiar `ES5 String Concatenation` de DataGrid.

2. **[ ] S19.2: Asincronía Robusta y Promesas de Stencil**
   - Transicionar `ionModalDidDismiss` a Promesas estrictas en la gestión modal.
   - Refugiar los estilos estáticos en `<template id="wsod-mitigator">`.

3. **[ ] S19.3: Trazabilidad Global y Tests Reales**
   - Activar `console.info` sobre el AppEventBus.
   - Purgar el Muda de Test Suites desactivadas en el pipeline E2E.
