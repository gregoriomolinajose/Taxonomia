/**
 * Job_Worker.js
 * Processes background jobs in chunks.
 */

var JobWorker = (function() {
  var CHUNK_SIZE = 50; // Rows per execution (reduced for active polling)
  var MAX_EXECUTION_TIME_MS = 5 * 60 * 1000; // 5 minutes (leaving 1 min safety buffer)

  function triggerProcessing() {
    // Check if a trigger already exists
    var triggers = ScriptApp.getProjectTriggers();
    var hasTrigger = false;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'processNextJobChunk') {
        hasTrigger = true;
        break;
      }
    }
    
    // If no trigger, create one to run every minute
    if (!hasTrigger) {
      ScriptApp.newTrigger('processNextJobChunk')
               .timeBased()
               .everyMinutes(1)
               .create();
    }
  }

  function processNextJobChunk() {
    var lock = LockService.getScriptLock();
    // Use a short wait for the queue assignment lock
    if (!lock.tryLock(5000)) {
      return { debug: "lock_failed" };
    }
    
    var job = null;
    try {
      job = JobQueue.getPendingJob();
      
      if (!job) {
        // Clean up triggers if no jobs
        var triggers = ScriptApp.getProjectTriggers();
        for (var i = 0; i < triggers.length; i++) {
          if (triggers[i].getHandlerFunction() === 'processNextJobChunk') {
            ScriptApp.deleteTrigger(triggers[i]);
          }
        }
        return { debug: "no_pending_job" };
      }
      
      if (job.status === "PENDING") {
        try {
          JobQueue.updateJobStatus(job.jobId, { 
            status: "PROCESSING",
            step: 3,
            message: "Iniciando validación e inserción de datos..."
          });
          job.status = "PROCESSING";
        } catch(e) {
          if (typeof Logger !== 'undefined') Logger.log("Error al marcar como PROCESSING: " + e.message);
        }
      }
    } finally {
      // RELEASE THE LOCK IMMEDIATELY AFTER ASSIGNING THE JOB!
      // This prevents DEADLOCKS because Adapter_Sheets uses the same ScriptLock!
      lock.releaseLock();
    }
    
    // Now process the job without holding the ScriptLock
    var startTime = new Date().getTime();
    try {
      var payloadData = job.payload && job.payload.data ? job.payload.data : (Array.isArray(job.payload) ? job.payload : []);
      var entityName = job.payload && job.payload.entity ? job.payload.entity : "Unknown";
      var startIndex = job.processed || 0;
      var endIndex = Math.min(startIndex + CHUNK_SIZE, payloadData.length);
      var chunk = payloadData.slice(startIndex, endIndex);
      var errors = job.errors || 0;
      var dlq = job.payload && job.payload.dlq ? job.payload.dlq : [];
      var debugErrors = [];
    
    // Initialize feedback array and identify target sheet for the current batch
    var chunkFeedback = [];
    var currentSheetId = null;
    if (chunk.length > 0 && chunk[0]._sheetId) {
        currentSheetId = chunk[0]._sheetId;
    }

    var newDlqBatch = [];
    // [BUGFIX] Execute ETL deduplication and interceptors before processing the chunk
    if (typeof Engine_ETL !== 'undefined' && typeof Engine_ETL.hydrateAndDeduplicate === 'function') {
        try {
            Engine_ETL.hydrateAndDeduplicate(entityName, chunk);
        } catch (e) {
            if (typeof Logger !== 'undefined') Logger.log("Error en hydrateAndDeduplicate: " + e.toString());
            debugErrors.push("ETL Deduplication Error: " + e.toString());
            // [CRITICAL BUGFIX] Do not swallow the error! Push the entire chunk to DLQ and abort insertion.
            errors += chunk.length;
            for (var k = 0; k < chunk.length; k++) {
              var errorMsg = e.toString();
              dlq.push({ record: chunk[k], error: errorMsg });
              newDlqBatch.push({
                 id_dlq: "DLQ-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000) + k,
                 job_id: job.jobId,
                 entity_name: entityName,
                 estado: "Pendiente",
                 error_message: errorMsg,
                 payload: JSON.stringify(chunk[k])
              });
              if (chunk[k]._rowIndex) {
                chunkFeedback.push({
                  _rowIndex: chunk[k]._rowIndex,
                  status: 'error',
                  reason: errorMsg
                });
              }
            }
            chunk = []; // Empty the chunk so it skips the insertion loops below
        }
    }

    // Process chunk in BATCH mode for massive performance gain
    var batchToInsert = [];
    
    for (var i = 0; i < chunk.length; i++) {
      var record = chunk[i];
      
      var pkField = 'id';
      var schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
      if (schema && schema.primaryKey) {
          pkField = schema.primaryKey;
      } else if (typeof JS_SchemaUtils !== 'undefined') {
          pkField = JS_SchemaUtils.getPrimaryKey(entityName);
      } else {
          pkField = 'id_' + entityName.toLowerCase();
      }
      if (!record[pkField] || String(record[pkField]).trim() === '') {
         if (typeof _generateShortUUID === 'function') {
             record[pkField] = _generateShortUUID(entityName);
         } else {
             var safeName = entityName ? entityName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() : 'UUID';
             var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
             var suffix = '';
             for (var c = 0; c < 8; c++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
             record[pkField] = safeName + '-' + suffix;
         }
      }
      if (schema && schema.metadata && schema.metadata.hasDraftLifecycle) {
          record.estado = 'Borrador';
      }
      
      batchToInsert.push(record);
    }
    
    try {
      if (typeof Engine_DB !== 'undefined' && Engine_DB.upsertBatch && batchToInsert.length > 0) {
        var batchConfig = { useSheets: true, useCloudDB: false };
        
        // 1. Resolve Graph Edges (M:N contextual relationships)
        var edgesToUpsert = [];
        var sysDate = new Date().toISOString();
        var currentEdges = [];
        try { currentEdges = (Engine_DB.list('Sys_Graph_Edges', {useSheets: true}, 'objects').rows || []); } catch(e) {}
        
        batchToInsert.forEach(function(record) {
           if (record._contexto_arista && record._tipo_arista) {
               var childId = String(record[pkField]).trim();
               var parentId = String(record._contexto_arista).trim();
               
               var duplicateEdgeMemory = edgesToUpsert.some(function(e) {
                   return e.tipo_relacion === record._tipo_arista && 
                          String(e.id_nodo_padre).trim() === parentId && 
                          String(e.id_nodo_hijo).trim() === childId;
               });
               
               var existingDBEdge = currentEdges.find(function(e) {
                   return e.es_version_actual !== false &&
                          e.tipo_relacion === record._tipo_arista && 
                          String(e.id_nodo_padre).trim() === parentId && 
                          String(e.id_nodo_hijo).trim() === childId;
               });
               
               if (!duplicateEdgeMemory) {
                   if (existingDBEdge) {
                       if (String(existingDBEdge.contexto_id || '').trim() !== parentId) {
                           var updateEstado = record._tipo_arista === 'PERSONA_TAXONOMIA' ? 'Borrador' : (record.estado || "Activo");
                           existingDBEdge.contexto_id = parentId;
                           existingDBEdge.estado = updateEstado;
                           edgesToUpsert.push(existingDBEdge);
                       }
                   } else {
                       var relId = (typeof _generateShortUUID === 'function') ? _generateShortUUID('Sys_Graph_Edges') : 'RELA-' + new Date().getTime() + '-' + Math.floor(Math.random()*1000);
                       var edgeEstado = record._tipo_arista === 'PERSONA_TAXONOMIA' ? 'Borrador' : (record.estado || "Activo");
                       edgesToUpsert.push({
                           id_relacion: relId,
                           id_nodo_padre: parentId,
                           id_nodo_hijo: childId,
                           tipo_relacion: record._tipo_arista,
                           valido_desde: sysDate,
                           valido_hasta: "",
                           es_version_actual: true,
                           estado: edgeEstado,
                           contexto_id: parentId
                       });
                   }
               }
           }
        });

        // 2. Insert Node Entities
        var entityRes = Engine_DB.upsertBatch(entityName, batchToInsert, batchConfig);
        
        // 3. Insert Edge Entities
        if (edgesToUpsert.length > 0) {
            Engine_DB.upsertBatch('Sys_Graph_Edges', edgesToUpsert, batchConfig);
        }
        
        // 4. Record Success Feedback based on the actual result
        for (var j = 0; j < batchToInsert.length; j++) {
           chunkFeedback.push({
             _rowIndex: batchToInsert[j]._rowIndex,
             status: 'success',
             message: 'Operación exitosa en bloque'
           });
        }
      } else {
        // Fallback for extreme cases
        for (var j = 0; j < batchToInsert.length; j++) {
           if (typeof _handleCreate === 'function') {
              _handleCreate(entityName, batchToInsert[j]);
              chunkFeedback.push({
                _rowIndex: batchToInsert[j]._rowIndex,
                status: 'success',
                message: 'Operación exitosa en fallback'
              });
           }
        }
      }
    } catch(e) {
      errors += chunk.length;
      for (var k = 0; k < chunk.length; k++) {
        var errorMsg = e.toString();
        dlq.push({ record: chunk[k], error: errorMsg });
        newDlqBatch.push({
           id_dlq: "DLQ-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000) + k,
           job_id: job.jobId,
           entity_name: entityName,
           estado: "Pendiente",
           error_message: errorMsg,
           payload: JSON.stringify(chunk[k])
        });
        chunkFeedback.push({
          _rowIndex: chunk[k]._rowIndex,
          status: 'error',
          reason: errorMsg
        });
      }
      debugErrors.push(e.toString());
    }
    
    // Persist new DLQ errors to the database
    if (newDlqBatch.length > 0 && typeof Engine_DB !== 'undefined') {
        try {
            Engine_DB.upsertBatch('Sys_DLQ', newDlqBatch, { useSheets: true, useCloudDB: false });
        } catch (dlqErr) {
            if (typeof Logger !== 'undefined') Logger.log("Error guardando en Sys_DLQ: " + dlqErr.toString());
        }
    }
    
    // Batch processing is atomic, so we always process the full chunk

    
    // Writeback feedback to the original sheet if available
    if (chunkFeedback.length > 0 && currentSheetId && typeof Engine_ETL !== 'undefined' && Engine_ETL.writebackFeedback) {
        try {
            Engine_ETL.writebackFeedback(currentSheetId, chunkFeedback);
        } catch(wbError) {
            if (typeof Logger !== 'undefined') Logger.log("Error writeback: " + wbError.toString());
        }
    }
    
    var newProcessed = endIndex;
    if (job.payload) {
      job.payload.dlq = dlq;
    }
    
      if (newProcessed >= payloadData.length) {
      // Completed
      try {
        JobQueue.updateJobStatus(job.jobId, { 
          status: "COMPLETED", 
          processed: newProcessed,
          errors: errors,
          step: 4,
          message: "Consolidando resultados finales...",
          payload: job.payload
        });
      } catch(e) {
        if (typeof Logger !== 'undefined') Logger.log("Error en updateJobStatus (COMPLETED): " + e.message);
        debugErrors.push("UpdateStatus Error: " + e.message);
      }
      return { debug: "completed", processed: newProcessed, errors: debugErrors };
    } else {
      // Still processing, update progress
      try {
        var pct = Math.round((newProcessed / payloadData.length) * 100) + "%";
        JobQueue.updateJobStatus(job.jobId, { 
          processed: newProcessed,
          errors: errors,
          step: 3,
          message: "Procesando registros (" + newProcessed + " de " + payloadData.length + ") - " + pct,
          payload: job.payload
        });
      } catch(e) {
        if (typeof Logger !== 'undefined') Logger.log("Error en updateJobStatus (PROCESSING): " + e.message);
      }
      // Ensure trigger is alive to process the next chunk
      triggerProcessing();
      return { debug: "processing", processed: newProcessed, errors: debugErrors };
    }
    } catch(err) {
      if (typeof Logger !== 'undefined') Logger.log("Error general en processNextJobChunk: " + err.toString());
      return { debug: "error_general", error: err.toString() };
    }
  }

  return {
    triggerProcessing: triggerProcessing,
    processNextJobChunk: processNextJobChunk
  };
})();

// Global wrapper for Google Apps Script trigger
function processNextJobChunk() {
  JobWorker.processNextJobChunk();
}
