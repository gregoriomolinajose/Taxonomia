// =====================================================================
// PLUGIN: Parsers de Zelle
// Define las reglas para extraer datos de los correos de Zelle
// =====================================================================

/**
 * registrarParsersZelle — Inyecta los parsers de Zelle en el registro
 * @param {Object} registry Diccionario de parsers
 */
function registrarParsersZelle(registry) {
  
  registry.zelle_entrada = {
    nombre: "Zelle Entrada",
    tipo: "entrada",
    fuentes: ["body", "html", "subject"],
    patron: /(.*?) le envió \$([0-9,.]+)/i,
    extraer: function(match) {
      return {
        contraparte: match[1].trim(),
        monto: parseFloat(match[2].replace(/,/g, '')),
        categoria: "Transferencia Zelle"
      };
    }
  };

  registry.zelle_salida = {
    nombre: "Zelle Salida",
    tipo: "salida",
    fuentes: ["body", "html", "subject"],
    patron: /El pago de Zelle® de \$([0-9,.]+) a (.*?) ha sido enviado/i,
    extraer: function(match) {
      return {
        contraparte: match[2].trim(),
        monto: parseFloat(match[1].replace(/,/g, '')),
        categoria: "Zelle Enviado"
      };
    }
  };

  // Parser alternativo para variaciones de formato si existen
  registry.zelle_entrada_alt = {
    nombre: "Zelle Entrada Alternativo",
    tipo: "entrada",
    fuentes: ["body", "html"],
    patron: /Recibió un pago de Zelle® de \$([0-9,.]+) de (.*?)\./i,
    extraer: function(match) {
      return {
        contraparte: match[2].trim(),
        monto: parseFloat(match[1].replace(/,/g, '')),
        categoria: "Transferencia Zelle"
      };
    }
  };
}
