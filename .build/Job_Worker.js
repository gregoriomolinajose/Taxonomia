/**
 * Job_Worker.js
 * Processes background jobs in chunks.
 */

var JobWorker = (function() {
  var CHUNK_SIZE = 500; // Rows per execution
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
    
    // If no trigger, create one to run 1 minute from now
    if (!hasTrigger) {
      ScriptApp.newTrigger('processNextJobChunk')
               .timeBased()
               .after(100) // Trigger very soon
               .create();
    }
  }

  function processNextJobChunk() {
    var startTime = new Date().getTime();
    var job = JobQueue.getPendingJob();
    
    if (!job) {
      // Clean up triggers if no jobs
      var triggers = ScriptApp.getProjectTriggers();
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'processNextJobChunk') {
          ScriptApp.deleteTrigger(triggers[i]);
        }
      }
      return;
    }
    
    if (job.status === "PENDING") {
      JobQueue.updateJobStatus(job.jobId, { status: "PROCESSING" });
      job.status = "PROCESSING";
    }
    
    var payloadData = job.payload && job.payload.data ? job.payload.data : (Array.isArray(job.payload) ? job.payload : []);
    var entityName = job.payload && job.payload.entity ? job.payload.entity : "Unknown";
    var startIndex = job.processed || 0;
    var errors = job.errors || 0;
    var dlq = job.payload && job.payload.dlq ? job.payload.dlq : [];
    
    var endIndex = Math.min(startIndex + CHUNK_SIZE, payloadData.length);
    
    var chunk = payloadData.slice(startIndex, endIndex);
    
    // Process chunk
    for (var i = 0; i < chunk.length; i++) {
      try {
        var record = chunk[i];
        if (typeof _generateShortUUID === 'function' && (!record.id || String(record.id).trim() === '')) {
           record.id = _generateShortUUID(entityName);
        }
        if (typeof _handleCreate === 'function') {
           _handleCreate(entityName, record);
        } else {
           Utilities.sleep(10); // fallback
        }
      } catch(e) {
        errors++;
        dlq.push({ record: chunk[i], error: e.toString() });
      }
      
      // Check execution time limit to prevent 6 minute timeout
      if (new Date().getTime() - startTime > MAX_EXECUTION_TIME_MS) {
        // Break early if we're out of time
        endIndex = startIndex + i + 1;
        break;
      }
    }
    
    // Save DLQ back to payload if needed (for S61.5)
    if (job.payload) job.payload.dlq = dlq;
    
    var newProcessed = endIndex;
    
    if (newProcessed >= payloadData.length) {
      // Completed
      JobQueue.updateJobStatus(job.jobId, { 
        status: "COMPLETED", 
        processed: newProcessed,
        errors: errors,
        payload: job.payload
      });
    } else {
      // Still processing, update progress
      JobQueue.updateJobStatus(job.jobId, { 
        processed: newProcessed,
        errors: errors,
        payload: job.payload
      });
      // Ensure trigger is alive to process the next chunk
      triggerProcessing();
    }
  }

  return {
    triggerProcessing: triggerProcessing
  };
})();

// Global wrapper for Google Apps Script trigger
function processNextJobChunk() {
  JobWorker.processNextJobChunk();
}
