---
epic_id: E68
epic_name: zero-trust-gviz
title: "Implementación de Zero-Trust y Optimización de Memoria GViz en ABAC"
status: done
---

# Problem Brief: E68

## 1. Contexto y Problema
El motor ABAC del Taxonomía Project sufría de dos problemas fundamentales:
1. **Seguridad (Fail-Open):** Si un permiso no estaba declarado, el sistema fallaba en favor del usuario (permitiendo el acceso por defecto o "graceful degradation"), lo cual es un riesgo crítico en arquitecturas empresariales.
2. **Escalabilidad (OOM en BFS):** La travesía topológica de permisos jerárquicos descargaba la matriz entera de base de datos a memoria por cada iteración. En árboles profundos (10+ niveles) o volúmenes masivos, esto provocaba que el motor V8 de Google Apps Script lanzara `Out Of Memory` (OOM).

## 2. Hipótesis
Si implementamos un modelo de seguridad "Zero-Trust" estricto (denegando el acceso por defecto si no hay regla en la matriz cruzada) y desplazamos el peso del filtrado relacional hacia los servidores de Google Sheets usando su API interna (`gviz/tq`), obtendremos una seguridad infalible y escalabilidad de memoria O(1) independiente del volumen de datos de la hoja de cálculo.

## 3. Métricas de Éxito
- Todo CUD sin permiso explícito es rechazado (Log de ABAC_FIREWALL presente).
- El autoseeder garantiza la inyección de `ALL` al administrador sobre todo el esquema (evitando lock-out).
- La iteración BFS consume una cuota constante de memoria (sólo la traída por GViz para el nodo actual).

## 4. Apetito
- **Tiempo de ejecución:** 1 ciclo
- **Nivel de esfuerzo:** Story/Spike

## 5. Madrigueras de Conejo (Rabbit Holes)
- Reconstruir `Engine_DB` completo en lugar de añadir un wrapper localizado (`listBy`).
- Exceder la cuota de `UrlFetchApp` (se asume que la latencia será compensada por la seguridad y la estabilidad, según lo acordado con el negocio).
