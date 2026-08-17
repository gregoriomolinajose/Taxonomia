// =====================================================================
// CONFIG MANAGER — Gestor de Configuración Dinámica (Fase 2)
// =====================================================================

var DEFAULTS = {
  SHEET_NAME: "Transacciones",
  LABEL_COLA: "Zelle/Cola",
  LABEL_OK: "Zelle/Registrado",
  LABEL_ERROR: "Zelle/Error",
  BATCH_SIZE: 50,
  MAX_RETRY: 3,
  ANOMALY_THRESHOLD: 0.5,
  AUTO_INTERVAL_HOURS: 1
};

/**
 * cargarConfiguracion — Carga la configuración exclusivamente desde Properties y defaults
 * @returns {Object} Configuración consolidada
 */
function cargarConfiguracion() {
  var props = PropertiesService.getScriptProperties();
  
  // 1. Iniciar con los defaults
  var config = {};
  for (var key in DEFAULTS) {
    config[key] = DEFAULTS[key];
  }

  // 2. Sobrescribir con PropertiesService (Fuente de verdad)
  var rawProps = props.getProperties();
  for (var propKey in rawProps) {
    if (rawProps[propKey]) {
      config[propKey] = rawProps[propKey].trim();
    }
  }

  // 3. Conversiones de tipo seguras
  if (typeof config.BATCH_SIZE === 'string') config.BATCH_SIZE = parseInt(config.BATCH_SIZE, 10);
  if (typeof config.MAX_RETRY === 'string') config.MAX_RETRY = parseInt(config.MAX_RETRY, 10);
  if (typeof config.ANOMALY_THRESHOLD === 'string') config.ANOMALY_THRESHOLD = parseFloat(config.ANOMALY_THRESHOLD);
  if (typeof config.AUTO_INTERVAL_HOURS === 'string') config.AUTO_INTERVAL_HOURS = parseInt(config.AUTO_INTERVAL_HOURS, 10);

  return config;
}
