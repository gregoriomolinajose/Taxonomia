---
epic: E11
title: "Declarative UI & Topological Scaling"
status: "done"
end_date: "2026-03-31"
---

# Epic E11: Declarative UI & Topological Scaling - Scope

## Objective
Transicionar el monolito visual de VanillaJS procedural (`document.createElement`) hacia un Factory Pattern / Declarativo tolerante a eventos, salvaguardando en paralelo los manejadores de grafos (SCD-2) para soportar ingestas ETL masivas de forma segura (Zero-Trust).

## In Scope
- Refactorización de la inyección DOM de Componentes Relacionales (`S11.1`).
- Creación de Guard Clauses Topológicos y aislamiento del Theming Parser (`S11.2`).
- Encapsulado de utilidades reactivas y eventos (`S11.3`).
- Establecimiento y Pipeline de Tooling local (`TEST_Suite`, Jest config base, Build Minifier) (`S11.4`).

## Planned Stories
- **[x] S11.1**: Factory Component Blueprint (Abstracción del procedural `createElement` instalando un Mapeador Declarativo o Template Engine ligero).
- **[x] S11.2**: Topological & Parsing Resilience (Filtros de nodo `currentActiveEdges` y extracción `.default` del Theme flattener).
- **[x] S11.3**: Decoupled Event Controllers (Extracción de `levelChanged` local hacia un manejador de Eventos Global o Delegativo).
- **[x] S11.4**: Automated Tooling Ecosystem (Aislamiento de tools QA `TEST_Suite_UI.html` y arranque de Minificador CSS CLI).

## Done Criteria
- [x] Renderizado de FormEngine limpio de iteraciones locales `createElement` masivas.
- [x] JSON Parser opera a ciegas en temas sin incondicionales de negocio (.default).
- [x] Ningún test asíncrono QA vive inyectado en código SPA productivo.
- [x] Pipeline minificador instanciado para acortar peso de descarga CSS.
