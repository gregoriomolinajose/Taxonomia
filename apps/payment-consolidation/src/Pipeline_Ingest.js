// =====================================================================
// PIPELINE: INGEST — Lectura de correos desde Gmail
// =====================================================================

/**
 * ingestFromGmail — Extrae hilos de Gmail y los estandariza
 * 
 * @param {GmailLabel} etiquetaCola Objeto etiqueta de Gmail (Cola)
 * @param {number} maxHilos Máximo de hilos a procesar
 * @returns {Array<Object>} Array de objetos mensaje estandarizados
 */
function ingestFromGmail(etiquetaCola, maxHilos) {
  var hilos = etiquetaCola.getThreads(0, maxHilos);
  var mensajesEstandarizados = [];

  for (var i = 0; i < hilos.length; i++) {
    var hilo = hilos[i];
    var correos = hilo.getMessages();

    for (var j = 0; j < correos.length; j++) {
      var correo = correos[j];

      // Solo procesamos correos no leídos para evitar reprocesar todo el hilo
      // si un hilo mixto contiene correos viejos ya procesados.
      if (correo.isUnread()) {
        mensajesEstandarizados.push({
          id: correo.getId(),
          body: correo.getPlainBody(),
          html: correo.getBody(),
          subject: correo.getSubject(),
          date: correo.getDate(),
          rawMessage: correo,
          rawThread: hilo
        });
      }
    }
  }

  return mensajesEstandarizados;
}
