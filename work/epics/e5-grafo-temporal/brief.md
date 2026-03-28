---
epic_id: E5
title: Grafo Temporal Multi-Estructural
status: in-progress
---

# Epic Brief: E5 - Grafo Temporal Multi-Estructural

## 1. Hypothesis (The Problem & The Bet)
La arquitectura actual de Árbol N-Ario (Adjacency List plana) en la entidad `Dominio` está severamente restringida a relaciones estrictamente "Militares" (1:N), impidiendo la visualización topológica de arquitecturas Matriciales o de Red Colaborativa. Adicionalmente, re-escribir las relaciones destruye la memoria histórica transaccional.
**La Apuesta:** Segregando las relaciones hacia una nueva Tabla Puente `Relacion_Dominios` (SCD Tipo 2), permitiremos interconexiones N:M multiformes (Militar, Matricial, Colaborativa), preservando el linaje histórico de cada movimiento jerárquico y autorresolviendo colisiones organizativas (Cascade Flattening) de manera inmutable.

## 2. Success Metrics
- **Trazabilidad 100%:** Todo cambio de "Padre" generará un cierre histórico transaccional en lugar de un Update destructivo.
- **Rendimiento O(1) in-memory:** El backend podrá resolver grafos masivos mediante Mapas de Hash reduciendo la latencia de consultas jerárquicas a milisegundos.

## 3. Appetite
2-3 Semanas de Re-Arquitectura, ETL, Transacciones y Refactorización del Payload del Cliente.

## 4. Rabbit Holes (What to avoid)
- **Bloqueos Recíprocos:** Diseñar una ETL que intente procesar registro por registro de `Dominios`. Toda la migración debe ser una operación Bulk (`setValues`).
