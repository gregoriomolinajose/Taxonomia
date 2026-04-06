# Retrospective: Hydration & Graph Topology Fix (sX.X)

## Tiempos y Esfuerzo
- **Estimado**: 2 horas
- **Real**: ~4 horas
- **Desviación**: +2 horas debido a "Ghost Events" y Race Conditions no documentadas en el caché del UI.

## ¿Qué funcionó bien?
1. **Detección Visual de Logs:** La captura de DevTools proveída por el usuario fue instrumental; pudimos detectar inmediatamente que el FormEngine estaba ejecutando re-renders instantáneos (0ms Cache Hit) y arrojando la información silenciosa en segundo plano.
2. **Uso de Patrones Locales:** El re-uso de `AppEventBus` permitió que la refactorización para acoplar funciones asíncronas fuese mínima y robusta, validando firmemente nuestro principio DR.
3. **Simetría Schema-Driven:** Cambiar la directiva `f.name` por `f.graphEdgeType` permitió lograr relaciones bidirecciones 1:N sin tener que refactorizar la base del orquestador.

## ¿Qué falló o costó trabajo?
1. **Comportamiento Asíncrono de Hidratación profunda (`readFull`)**: Había una falsa suposición en la UI de que un Subgrid (componente que espera Array) podía subsistir exclusivamente validando la primera inyección síncrona, a pesar de que sabíamos que los Grafo demandaban solicitudes HTTP de segunda capa.
2. **Memory Leaks de Suscripciones**: El `LocalEventBus` no es fácil de enganchar dinámicamente si no somos explícitos con los modales; cuando decidimos cambiar a `AppEventBus` estuvimos a segundos de introducir un *Memory Leak* estático al no atar la desuscripción al ciclo de vida del DOM.

## Mejoras al Proceso (Action Items)
- **Zero-Trust Memory Management:** A partir de ahora, cada vez que creemos un Listener Global (`window.AppEventBus.subscribe`) dentro de un componente UI que se despliegue y destruya dinámicamente (como Drawers/Modals), estableceremos por convención que *debe* haber un evento DOM de Destrucción anexado al `unsubscribe()`.
- **Estandarizar DataHydrated PubSub**: Incorporaremos `FormEngine::RecordHydrated` como estándar en nuestro repositorio, lo que permitirá a todos los desarrolladores crear WebComponents (como los Gráficos de Datos o los Selects Condicionales) confiando en este único evento para repintado.
