# Epic Brief: ETL Carga Masiva de Capacidades (E47)

## Hypothesis
Si creamos un proceso ETL de carga masiva, los usuarios podrán poblar eficientemente las capacidades desde un archivo, transformando su formato plano de 4 niveles (Macrocapacidad, Capacidad, Subcapacidad, Componente) en nuestra estructura jerárquica, generando automáticamente las rutas lógicas (`order_path`, `path_completo_es`). Esto reducirá el tiempo de captura manual y garantizará la estandarización de la taxonomía.

## Success Metrics
- El sistema puede procesar un archivo plano con la estructura definida.
- Las capacidades se ingieren correctamente asociando el nivel (0-3) y las etiquetas correspondientes.
- Los campos auto-generados (`order_path` y `path_completo_es`) se construyen con precisión matemática (ej: 1.1.2 y Canal>Manejo de canales).
- Los campos vacíos (`external_id`, `nombre_en_ingles`, `abreviacion`, `contexto_completo`) se procesan sin errores.
- Descripciones y nombres se mapean a los campos correctos de nuestro esquema según las reglas de nivel.

## Appetite
1 semana.

## Rabbit Holes
- Errores o inconsistencias en los datos del archivo origen (celdas vacías donde se espera valor, o formatos anómalos).
- Complejidad en el cálculo en memoria de los `order_path` y `path_completo_es` si los niveles no vienen en orden jerárquico estricto.
