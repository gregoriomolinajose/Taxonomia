---
epic_id: E4
title: Motor de Jerarquía de Grado Industrial
status: in-progress
---

# Epic Brief: E4 - Motor de Jerarquía Grado Industrial

## 1. Hypothesis (The Problem & The Bet)
Actualmente, el sistema confía ciegamente en que los humanos no cometerán errores al configurar dependencias jerárquicas ("Data-Trees"). En la industria real, esta confianza vulnera el sistema.
**La Apuesta:** Implementando mitigaciones matemáticas y lógicas robustas a nivel de Formulario y Base de Datos (Prevención de Ciclos, Mutaciones en cascada y Eliminaciones Restringidas), el motor soportará cualquier intento destructivo del usuario, manteniéndose incorruptible.

## 2. Success Metrics
- **Cero Ciclos Infinitos:** Ningún árbol registrará fallos `r=Infinity` en algoritmos de pre-procesamiento del DataView.
- **Trazabilidad Continua:** No existirán "Registros Fantasmas" (Hijos con padres eliminados o huérfanos con paths obsoletos).

## 3. Appetite
1-2 Semanas de implementación técnica y validación transaccional sobre el servidor central App Script (GAS).

## 4. Rabbit Holes (What to avoid)
- Complejidad innecesaria en la UI: La gestión de prevención de ciclos debe ser pasiva y automática, no requerir alertas complicadas.
- Lentitud en Transacciones de Cascada: La iteración sobre nietos durante *Re-parenting* debe delegarse al Core Backend utilizando Batch Ops nativas y evitando latencias SPA.
