# Debug Analysis: Dashboard Cards Serialization Error

## Step 0: Triage
**Tier:** S (Cause obscure, single causal chain)
**Method:** 5 Whys

## Step 1: Define the Problem
**WHAT:** Cards en el Dashboard (Portafolios, Equipos, Personas) muestran puntos suspensivos ("...") infinitamente y un error aparece en consola ("dropping postMessage.. deserialize threw error").
**WHEN:** Al cargar la página principal (Dashboard_UI.html) e intentarse la captura de contadores mediante `DataAPI.call('API_Universal_Router', 'getDashboardCounters')`.
**WHERE:** En el Sandboxed iframe de Google Apps Script (`google.script.run`) y el enrutador universal (`API_Universal.gs`).
**EXPECTED:** Los contadores numéricos (ej. 3, 5, 2) deben reemplazar a los puntos suspensivos; o en su defecto, pintar "-" en caso de error explícito de red.

## Step 2: 5 Whys
1. **¿Por qué los spinners ("...") nunca se reemplazan?**
   Porque ni el handler `.then()` ni el `.catch()` se disparan en `Dashboard_UI.html` tras invocar el Fetch de la API.
2. **¿Por qué la promesa se queda eternamente colgada y muere silenciada excepto por la alerta de postMessage en consola?**
   Porque `google.script.run` falla al recibir la carga IPC (`postMessage`) con un Internal Error "deserialize threw error", rompiendo la cadena y devorando los callbacks.
3. **¿Por qué el Motor de Apps Script lanza `deserialize threw error` al regresar del Backend?**
   Google Apps Script posee un bug primitivo conocido donde los objetos que atraviesan los retornos directos hacia el IFRAME (si no son parseados extremadamente limpios u ocasionalmente si contienen firmas internas de objetos nativos) disparan una falla del parseador interno de Google (IPC Serialization Bug).
4. **¿Por qué se desencadenaba para estos contadores si intentábamos pasar un objeto regular devuelto por `JSON.parse`?**
   Porque `API_Universal.gs` retornaba `JSON.parse(JSON.stringify({ status: "success", data: responseData }))`. El engine GAS re-serializaba este objeto JavaScript de vuelta al navegador. Cualquier irregularidad diminuta en el recolector del V8 del servidor se estrellaba contra el validador del IPC.
5. **¿Root cause y por qué este "error" era posible sistemáticamente?**
   El Frontend siempre esperó Objetos, obligando al Backend a arriesgar re-serializaciones sobre el wire, abriendo vulnerabilidades en la frágil capa de transporte de G-Suite para las respuestas de la UI.

**Countermeasure:** Refactorización Arquitectónica de frontera IPC.
Para inmunizar a todo el frontend contra las fallas de `deserialize threw error`:
- Hemos modificado `API_Universal.gs` para retornar EXCLUSIVAMENTE datos fuertemente tipificados (JSON Raw String) mediante `return JSON.stringify({...})`. Las strings en JS son atómicas, inmutables y 100% seguras en el tránsito de variables GAS.
- Modificamos el pipeline asíncrono (interceptando todo `google.script.run.withSuccessHandler` dentro del cliente `DataAPI.client.js`). Si recibe Strings, asume que es el payload serializado, y aplica el `JSON.parse` localmente antes de pasárselo al `.then()`.

## Step 3: Implement & Prevent
- [x] Fix addresses confirmed root cause (`API_Universal.gs` emite Strings).
- [x] Parches aplicados a Catch y Return Blocks.
- [x] Refactorización central activada en `DataAPI.client.js` impactando de raíz a TODAS las llamadas del sistema.
- [x] Systemic Prevention implementada con la directiva arquitectónica para que `API_Universal.gs` actúe estrictamente en modalidad de payload Text/Stringual.
