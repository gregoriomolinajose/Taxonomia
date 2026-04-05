# Problem Brief: White-Label Typography Customization

## 1. Dominio Anclado (La Apuesta)
**Personalización Comercial (White-Label / Marca Blanca)**. El objetivo principal no es cosmético, sino comercial/estratégico: desvincular la exclusividad de diseño estático para proveer el sistema y que cada corporativo pueda estamparle su identidad propia.

## 2. Stakeholder Primario (Para Quién)
**El Super Admin (Dueño de Instancia/Tenant)**. Él experimenta la fricción de no poder configurar el branding; y sus decisiones repercuten globalmente a todos sus usuarios subordinados.

## 3. Estado Actual (The Gap)
Hoy, un Super Admin recién incorporado **no puede** alinear la plataforma a su manual de identidad visual de marca **porque** nuestra arquitectura acopla la tipografía (Playfair/Poppins) como un código rígido inyectado y compilado obligatoriamente para todos.

## 4. Root Cause (Los Por Qués)
**Causa Raíz Identificada:** La base de datos y la arquitectura visual no están comunicadas en la capa más profunda ("Zero-Touch Customization"). El "Motor de Tema" (*ThemeManager*) hidrata colores desde una configuración, pero carece del mecanismo estructural para hidratar familias topográficas, relegándolo al CSS duro estático.

## 5. Early Signal (Indicador Temprano - 4 semanas)
**Comportamiento Observable:** Al ingresar en la pestaña de Ajustes, el Super Admin interactuará con un menú desplegable (Drop-down) y elegirá un sistema de fuentes pre-optimizado. Al darle guardar, la señal temprana del éxito se validará cuando *cualquier* otro usuario en su organización inicie sesión y vea instantáneamente transmutada su pantalla a la nueva tipografía base sin tener que hacer _flush_ manual profundo de cachés, sin latencia visual y *sin necesidad de pedirle permiso a ingeniería.*

## 6. Hipótesis SAFe
**Si** el modelo rígido actual impide que la herramienta se camufle e identifique como un software corporativo propio del cliente, 
**entonces** migrar la tipografía hacia un catálogo global dinámico y pre-optimizado, 
permitirá al **Super Admin** gobernar el Branding de Marca Blanca bajo demanda, 
**medido por** la nula dependencia de tiempo de desarrollo y la erradicación del "vendor-lock" gráfico mediante cero despliegues al momento de la customización corporativa.
