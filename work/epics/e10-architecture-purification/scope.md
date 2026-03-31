---
epic: E10
title: "Architecture Purification & Enterprise Modularity"
status: "in progress"
---

# Epic E10: Architecture Purification & Enterprise Modularity - Scope

## Objective
Purgar la deuda arquitectónica acumulada durante las Épicas E8 y E9. 
El objetivo principal es lograr el Isomorfismo (testeabilidad agnóstica del UI), erradicar la polución del Namespace Global en Vanilla JS y finalizar la encapsulación Agnóstica del *Design System* separando responsabilidades semánticamente, para evolucionar el Motor de Formularios en un Patrón Factory.

## In Scope
- Creación de Módulos (Namespaces) para controladores utilitarios JS aislándolos de `window`.
- Inyección de comprobadores de tipos (Type Guards) generalizados.
- Abstracción isomórfica de lógicas de validación `FormEngine_UI.html` -> `SubgridState.js`.
- Separación de Estilos emulados locales hacia un compilado CSS maestro.
- Remoción de deuda técnica heurística (JSON Parsers acoplados, Memory Profiling formal).

## Out of Scope
- Migración a React/Angular (Se mantiene Vanilla/WebComponents).
- Implementación de nuevas arquitecturas de base de datos (Ej DB NoSQL distintas a las aprobadas).

## Planned Stories
- **[x] S10.1**: Isomorphism & Namespace Factory (Aislar Utilidades DRY y agregar Type Guards, Migrar Validaciones Subgrid) ✓
- **S10.2**: Agnosticismo del Design System V2 (Desacoplar tokens *default*, Purgar `<style>` locales, y definir el Theme Manager final).
- **S10.3**: Memory Profiling & Defensive E2E (Evitar Garbage Collection Leaks y comprobar GC del Modal Stack con flujos agresivos).
- **S10.4**: (Spike/Dragon) Exploración hacia un FormEngine *Factory Component Pattern* alejándose de `document.createElement`.

## Done Criteria
- [ ] El namespace `window.UI_Factory` (o equivalente) concentra los helpers (Tickets 18, 19).
- [ ] JSON Parser para temas corre independientemente de directivas "default" (Tickets 10, 13).
- [ ] Ningún Partial HTML de UI contiene reglas `<style>` estáticas localizadas (Ticket 11).
- [ ] Existen métricas o pruebas demostrando que un modal desanidado es destruido en RAM (Ticket 9).
