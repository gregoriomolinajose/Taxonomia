# Epic Brief: E28 Visibilidad de Estructura Ágil en Dashboard

## 1. Hypothesis
Si proveemos visibilidad inmediata del volumen de la estructura ágil (Portafolios, Equipos, Personas) superando la fragmentación actual en Sheets privados, entonces mejorará drásticamente la capacidad de gestión para el Área de Negocio, medido por la reducción del tiempo y esfuerzo de recabación de datos.

## 2. Success Metrics
- **Leading Indicator (4 semanas):** Reducción casi a cero en el tiempo invertido para consolidar recuentos vitales por parte del Área de Negocio (disponibilidad instantánea).
- **Behavioral:** Los stakeholders comienzan a consultar la plataforma para ver los totales de capacidad en vez de pedir reportes en Excel.

## 3. Appetite
- **Esfuerzo Estimado:** S/M (Pequeña/Mediana), en su mayoría la creación de Endpoints de conteo y UI Components estandarizados.

## 4. Rabbit Holes (Riesgos a evitar)
- **Sobrecubrir BI:** Tratar de transformar estas simples tarjetas en gráficas avanzadas o filtros cruzados complejos en la fase inicial. Mantenerlo ajustado a "contadores crudos".
- **Performance:** Cargar toda la base de datos de Equipos y Personas solo para contar el índice. De ser necesario se hará un conteo optimizado (`Engine_DB.count` si es que la API actual permite proyección ligera).
