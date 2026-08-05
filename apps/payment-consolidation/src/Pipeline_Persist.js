// =====================================================================
// PIPELINE: PERSIST — Escritura segura en Google Sheets
// =====================================================================

/**
 * persistBatch — Escribe un lote de transacciones en la hoja
 * Si hay un error de red o de cuotas, lanza la excepción para abortar
 * y garantizar que la etiqueta "Cola" no se remueva.
 * 
 * @param {Sheet} hoja Hoja destino
 * @param {Array<Object>} exitosos Array de resultados exitosos
 */
function persistBatch(hoja, exitosos) {
  if (!exitosos || exitosos.length === 0) return;

  var filasParaInsertar = [];
  
  for (var i = 0; i < exitosos.length; i++) {
    var ex = exitosos[i];
    var fila = ex.fila; // [fecha, categoria, contraparte, referencia, entrada, salida]
    
    // El orden esperado de las columnas en la hoja es:
    // A: Fecha, B: Categoria, C: Contraparte, D: Propietario (Referencia)
    // E: Entrada, F: Salida, G: Saldo En cuenta (Fórmula)
    // H: ID_Mensaje, I: Saldo Juliana (Fórmula), J: Saldo Gregorio (Fórmula)
    
    // Llenamos hasta la columna H (índice 7). No tocamos la I y J.
    while (fila.length < 7) fila.push(""); 
    
    fila[7] = ex.id; // Columna H (index 7)
    
    filasParaInsertar.push(fila);
  }

  // Insertar filas en la parte superior (después de los encabezados en la fila 2)
  // Esto empuja los datos existentes hacia abajo y mantiene lo más reciente arriba.
  hoja.insertRowsBefore(2, filasParaInsertar.length);
  
  // Escribir los datos en el nuevo espacio en blanco
  var rango = hoja.getRange(2, 1, filasParaInsertar.length, filasParaInsertar[0].length);
  rango.setValues(filasParaInsertar);

  // Copiar fórmulas de la fila que fue empujada hacia abajo (que ahora está en 2 + filasParaInsertar.length)
  var filaConFormulas = 2 + filasParaInsertar.length;
  if (hoja.getLastRow() >= filaConFormulas) {
    var numColumnas = hoja.getLastColumn();
    // Obtener las fórmulas de la fila base. Si no tiene fórmula, devuelve ""
    var formulasRow = hoja.getRange(filaConFormulas, 1, 1, numColumnas).getFormulasR1C1()[0];
    
    for (var col = 0; col < numColumnas; col++) {
      if (formulasRow[col]) { // Si la celda tiene una fórmula
        var srcRange = hoja.getRange(filaConFormulas, col + 1);
        var destRange = hoja.getRange(2, col + 1, filasParaInsertar.length, 1);
        srcRange.copyTo(destRange, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
        srcRange.copyTo(destRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      }
    }
  }
}

/**
 * cargarIdsExistentes — Obtiene un Set con los IDs de mensajes ya registrados
 * Sirve para garantizar la idempotencia de las transacciones.
 * 
 * @param {Sheet} hoja Hoja donde se guardan los datos
 * @returns {Set<string>} Set de IDs
 */
function cargarIdsExistentes(hoja) {
  var ids = new Set();
  var ultimaFila = hoja.getLastRow();
  
  if (ultimaFila < 2) return ids; // Solo headers o vacía

  // Carga la columna H (índice 8 en notación R1C1)
  var rango = hoja.getRange(2, 8, ultimaFila - 1, 1);
  var valores = rango.getValues();

  for (var i = 0; i < valores.length; i++) {
    var id = valores[i][0];
    if (id) {
      ids.add(id.toString().trim());
    }
  }

  return ids;
}
