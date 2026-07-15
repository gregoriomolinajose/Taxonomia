/**
 * Engine_AI.js
 * Motor agnóstico para interacciones con LLMs (Gemini).
 * No contiene reglas de negocio, solo la abstracción de conexión.
 */
var Engine_AI = (function() {

  /**
   * Llama a la API de Google Gemini (AI Studio).
   * @param {string} systemPrompt Instrucciones de sistema.
   * @param {string} userPrompt Texto principal del usuario (o contenido de un documento).
   * @param {string} [attachmentDriveId] (Opcional) ID de un archivo en Drive (PDF/TXT) para adjuntar como contexto.
   * @returns {object} Respuesta estructurada (JSON parseado si la IA devuelve JSON).
   */
  function callGemini(systemPrompt, userPrompt, attachmentDriveId) {
    try {
      // 1. Recuperar API Key segura
      const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY no está configurada en PropertiesService.");
      }

      // 2. Extraer contenido del archivo (si aplica)
      let fileContext = "";
      if (attachmentDriveId) {
        try {
          // Extraemos el texto del PDF usando Drive API (requiere Drive API activada o usar DocumentApp/PDF parser nativo,
          // para este MVP, asumiremos que DriveApp puede obtener el blob y enviarlo, o leemos texto si es Google Doc.
          // Una forma robusta en GAS de extraer PDF a texto es convertirlo a Google Doc temporal:
          const fileBlob = DriveApp.getFileById(attachmentDriveId).getBlob();
          
          // Por simplicidad en este MVP, enviaremos los bytes en base64 si Gemini 1.5 Pro soporta PDF directo,
          // o usaremos un fallback si no. Gemini 1.5 Pro API REST soporta 'inlineData' para PDFs.
          const base64Data = Utilities.base64Encode(fileBlob.getBytes());
          fileContext = {
            inlineData: {
              mimeType: fileBlob.getContentType() === 'application/pdf' ? 'application/pdf' : 'text/plain',
              data: base64Data
            }
          };
        } catch(e) {
          console.error("Error leyendo archivo de Drive: " + e.message);
          throw new Error("No se pudo leer el CV de Drive: " + e.message);
        }
      }

      // 3. Construir Payload para Gemini 1.5 Pro (REST API)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
      
      const payload = {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: []
          }
        ],
        generationConfig: {
          responseMimeType: "application/json" // Forzamos JSON
        }
      };

      // Si hay archivo, lo agregamos como primera parte
      if (fileContext) {
        payload.contents[0].parts.push(fileContext);
      }
      // Agregamos el prompt del usuario
      payload.contents[0].parts.push({ text: userPrompt });

      // 4. Hacer la petición síncrona
      const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (responseCode !== 200) {
        console.error("Error de Gemini API:", responseText);
        throw new Error("Error en IA: " + responseCode);
      }

      const json = JSON.parse(responseText);
      const outputText = json.candidates[0].content.parts[0].text;
      
      // Parsear el JSON devuelto por Gemini
      return JSON.parse(outputText);

    } catch (error) {
      console.error("Engine_AI Error:", error.message);
      return { error: error.message };
    }
  }

  return {
    callGemini: callGemini
  };

})();

if (typeof module !== 'undefined') module.exports = Engine_AI;
