/**
 * Prueba de Factibilidad para Google Visualization API (GViz)
 * 
 * Este script prueba si el entorno actual de Apps Script tiene los permisos
 * y tokens necesarios para hacer queries tipo SQL (GViz) directamente
 * a la base de datos de Sheets.
 * 
 * Instrucciones:
 * 1. Despliega/Sube este archivo a tu entorno de Apps Script.
 * 2. Selecciona la función `runGVizFeasibilityTest` en el editor.
 * 3. Haz clic en "Ejecutar".
 * 4. Revisa los registros (Logs) para ver si la conexión fue exitosa.
 */

function runGVizFeasibilityTest() {
  Logger.log("Iniciando prueba de factibilidad GViz (SQL-like API)...");
  
  // 1. Obtener el ID de la base de datos desde la configuración global
  const config = (typeof CONFIG !== 'undefined') ? CONFIG : null;
  const ssId = config && config.SPREADSHEET_ID_DB ? config.SPREADSHEET_ID_DB : null;
  
  if (!ssId) {
    Logger.log("❌ Error: SPREADSHEET_ID_DB no está definido. Asegúrate de tener CONFIG instanciado.");
    return;
  }
  
  // 2. Definir la tabla y la consulta
  // Usamos 'Persona' como ejemplo, solicitando solo 2 registros para no saturar.
  const sheetName = 'Persona';
  const sqlQuery = "SELECT * LIMIT 2";
  const encodedQuery = encodeURIComponent(sqlQuery);
  
  // URL endpoint secreto de GViz
  const url = `https://docs.google.com/spreadsheets/d/${ssId}/gviz/tq?tq=${encodedQuery}&sheet=${sheetName}`;
  
  Logger.log("URL Endpoint generado: " + url.substring(0, 60) + "...");
  
  try {
    // 3. Obtener el Token de Autorización del usuario corriendo el script
    const token = ScriptApp.getOAuthToken();
    if (!token) {
       Logger.log("❌ Error: ScriptApp.getOAuthToken() devolvió vacío. Falta autorizar.");
       return;
    }
    
    // 4. Realizar la petición HTTP
    const options = {
      method: "get",
      headers: {
        "Authorization": "Bearer " + token
      },
      muteHttpExceptions: true
    };
    
    Logger.log("Realizando UrlFetchApp...");
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    let text = response.getContentText();
    
    // 5. Analizar los resultados
    if (statusCode === 200) {
      Logger.log("✅ HTTP 200: Conexión Exitosa con el servidor GViz.");
      
      // GViz devuelve el JSON envuelto en un magic string (callback)
      // Ejemplo: /*O_o*/ google.visualization.Query.setResponse({ ... })
      const jsonMatch = text.match(/(?<=.*\().*(?=\);)/s);
      
      if (jsonMatch && jsonMatch[0]) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.status === 'ok') {
            Logger.log("✅ GViz Parser: ¡Prueba de Query exitosa!");
            Logger.log(`Se encontraron ${data.table.rows.length} filas en la tabla '${sheetName}'.`);
            Logger.log("Muestra de datos (RAW):");
            Logger.log(JSON.stringify(data.table.rows).substring(0, 200) + "...");
            Logger.log("===============================================");
            Logger.log("FACTIBILIDAD: APROBADA. Es posible usar la Ruta 2.");
        } else {
            Logger.log("⚠️ Respuesta 200, pero GViz reportó error lógico:");
            Logger.log(JSON.stringify(data.errors));
        }
      } else {
        Logger.log("⚠️ Respuesta 200, pero el formato no era GViz estándar.");
        Logger.log(text.substring(0, 100));
      }
    } else {
      Logger.log("❌ HTTP Falló: Código de Estado " + statusCode);
      if (statusCode === 401 || statusCode === 403) {
        Logger.log("💡 Diagnóstico: Problema de Permisos (Scopes). Asegúrate de que appsscript.json incluye 'https://www.googleapis.com/auth/spreadsheets'");
      }
      Logger.log("Respuesta del servidor: " + text.substring(0, 150));
    }
    
  } catch (e) {
    Logger.log("❌ Excepción capturada en ejecución: " + e.message);
  }
}
