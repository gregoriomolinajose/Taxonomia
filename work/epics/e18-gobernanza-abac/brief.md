# 🚀 ÉPICA 18: Gobernanza Topológica y Seguridad Contextual (ABAC)

## 1. El Problema de Negocio (El "As-Is")
Actualmente, la organización gestiona su topología (Value Streams, Trenes, Equipos y Personas) en múltiples hojas de cálculo desconectadas (el VS Toolkit). Esto genera un modelo de **Gobierno Pasivo**: las reglas de quién debe hacer qué están escritas en un documento, pero no hay nada que impida físicamente que un usuario modifique datos de un equipo que no le pertenece, altere la estructura de un Tren, o asigne talento de manera incorrecta. Esto compromete la integridad global de la Taxonomía Comercial.

## 2. El Objetivo Estratégico (El "To-Be")
Evolucionar la plataforma hacia un modelo de **Gobierno Activo e Inteligente**. La Épica 18 transforma el sistema para que comprenda orgánicamente el marco de trabajo SAFe y la estructura organizacional. El sistema ya no otorgará permisos basados estáticamente en el "Título" del puesto, sino que comenzará a calcular una matriz de accesos y atributos basados en el **Contexto y la Pertenencia** del usuario logueado en tiempo real.

## 3. Rabbit Holes y Riesgos
- **Complejidad de Interceptores:** Lógica cruzada en `APP_SCHEMAS`. La herencia de permisos debe resolverse rápida y asíncronamente en backend pero limitarse ágilmente visualmente en frontend sin comprometer latencia.
- **Jerarquía Circular:** Se debe prevenir que durante la reasignación ABAC, un usuario modifique su propia taxonomía dejándose bloqueado o huérfano.
