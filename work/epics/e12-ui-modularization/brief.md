---
epic: E12
title: "UI Modularization & Core Scaling"
version: 1.0.0
---

# Epic Brief: UI Modularization & Core Scaling

## 💡 Hipótesis / Problema a Resolver
El cliente web ha alcanzado su límite cognitivo y arquitectónico. El archivo `FormEngine_UI.html` (~100 KB, >1700 LOC) centraliza la inyección, validación y renderizado de todos los inputs (MDM). Simétricamente, lógicas agnósticas (DataTables o el Router Nativo) se encuentran acopladas a la fuerza a constructores presentacionales (DataView y JS_Core). Al no existir un particionamiento formal (Factory Component / Routing Module), extender el ecosistema detiene el escalamiento por el severo Fat File Smell.

## 🎯 Métricas de Éxito
- **Desmembramiento de FormEngine:** El archivo principal debe pesar menos de 25 KB u 800 LOC.
- **Factoría Atómica:** Toda manipulación o creación de un Input (Select, Number, Text) debe provenir de un módulo inyector puro (`FormBuilder_Inputs.html`).
- **DataGrid Autocontenido:** El `DataView.html` delega toda parametrización de tablas externas limitándose a ser un "Esqueleto".

## ⏱️ Apetito (Timeboxing)
- **Duración Máxima:** 1-2 Sesiones de Desarrollo Profundo (Story Runs).
- **Esfuerzo:** Táctico / Quirúrgico (Corazón Abierto del DOM).

## 🐇 Rabbit Holes (Riesgos a Evitar)
- **Frameworks de Terceros:** Aferrarse al "Zero-Trust & Vanilla". NO instalar React, Vue, Svelte. Toda la maquinaria debe construirse nativa con funciones puras `(state) => DOMNode`.
- **Rotura de Vínculo SCD-2:** Separar los inputs podría quebrar los *Guard Clauses* de la Topología. Cada nodo factorizado debe re-suscribirse obligatoriamente a los controladores del EventBus local.
- **Complejidad de CSS:** Intentar instalar Esbuild en paralelo y romper la actual e inofensiva Minificación local AST que ya funciona perfectamente. Eso es secundario.
