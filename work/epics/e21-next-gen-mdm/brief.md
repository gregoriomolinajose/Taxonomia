# Epic Brief: E21 Next-Gen MDM

## Hypothesis
Si implementamos mecanismos avanzados de concurrencia (Optimistic Locking) y eficiencia de UI/Query (Typeahead Asíncrono/Debounce, Soft-Delete), el Data Layer podrá soportar operaciones empresariales multi-usuario complejas sin corromper el Grafo Topológico ni sobrecargar el Thread del Frontend. Adicionalmente resolviendo deuda técnica crítica (ES5 Concats, Tests Mudos), estabilizaremos orgánicamente la calidad general.

## Success Metrics
- Tolerancia perfecta de transacciones recurrentes; las ediciones concurrentes abortan tempranamente si el hash de versión difiere, previniendo data-loss.
- Búsquedas resilientes en tablas (Typeahead search no ahoga el Main Thread ni genera Layout Trashing).
- Eliminación de Tests Mudos, restaurando el 100% de la Suite QA al Standard de aserciones útiles.

## Appetite
1 a 2 semanas (Continuous Flow).

## Rabbit Holes (Avoid)
- Construir bloqueadores pesados transaccionales (Pessimistic Locking) a nivel de Hoja de Cálculo, priorizar la agilidad del Optimistic Control para fallar elegantemente en la IU.
