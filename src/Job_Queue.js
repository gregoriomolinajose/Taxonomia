/**
 * Job_Queue.js
 * Manages the state of asynchronous jobs in the system.
 */

var JobQueue = (function() {
  var JOB_SHEET_NAME = "SYS_JOBS_V2";
  var CHUNK_SIZE = 45000;

  function _getJobSheet() {
    var ssId = (typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID_DB) ? CONFIG.SPREADSHEET_ID_DB : null;
    if (!ssId) {
      // Fallback for older environments if CONFIG is somehow unavailable, though unlikely.
      try {
        var envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
        if (envStr) ssId = JSON.parse(envStr).SPREADSHEET_ID_DB;
      } catch (e) {}
    }
    
    var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(JOB_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(JOB_SHEET_NAME);
      sheet.appendRow(["jobId", "status", "total", "processed", "errors", "createdAt", "updatedAt", "payload..."]);
    }
    return sheet;
  }

  function enqueue(payload) {
    var sheet = _getJobSheet();
    var jobId = "job_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
    var now = new Date().toISOString();
    var total = Array.isArray(payload) ? payload.length : (payload.data ? payload.data.length : 0);
    
    var str = JSON.stringify(payload);
    var rowData = [jobId, "PENDING", total, 0, 0, now, now];
    for (var i = 0; i < str.length; i += CHUNK_SIZE) {
      rowData.push(str.substring(i, i + CHUNK_SIZE));
    }
    
    // Ensure we have enough columns in the sheet before appending
    var currentCols = sheet.getMaxColumns();
    if (rowData.length > currentCols) {
      sheet.insertColumnsAfter(currentCols, rowData.length - currentCols);
    }
    
    sheet.appendRow(rowData);
    SpreadsheetApp.flush(); // FORCE FLUSH SO GETPENDINGJOB SEES IT
    return jobId;
  }

  function getJobStatus(jobId) {
    var sheet = _getJobSheet();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === jobId) {
        return {
          jobId: data[i][0],
          status: data[i][1],
          total: data[i][2],
          processed: data[i][3],
          errors: data[i][4],
          createdAt: data[i][5],
          updatedAt: data[i][6]
        };
      }
    }
    return null;
  }

  function updateJobStatus(jobId, updates) {
    var sheet = _getJobSheet();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === jobId) {
        var row = i + 1;
        var now = new Date().toISOString();
        if (updates.status !== undefined) sheet.getRange(row, 2).setValue(updates.status);
        if (updates.processed !== undefined) sheet.getRange(row, 4).setValue(updates.processed);
        if (updates.errors !== undefined) sheet.getRange(row, 5).setValue(updates.errors);
        
        if (updates.payload !== undefined) {
           var str = JSON.stringify(updates.payload);
           var chunks = [];
           for (var j = 0; j < str.length; j += CHUNK_SIZE) {
             chunks.push(str.substring(j, j + CHUNK_SIZE));
           }
           // Clear existing payload columns (from col 8 onwards)
           var lastCol = sheet.getLastColumn();
           if (lastCol >= 8) {
             sheet.getRange(row, 8, 1, lastCol - 7).clearContent();
           }
           
           // Ensure we have enough columns for the new chunks
           var requiredCols = 7 + chunks.length;
           var currentCols = sheet.getMaxColumns();
           if (requiredCols > currentCols) {
             sheet.insertColumnsAfter(currentCols, requiredCols - currentCols);
           }
           
           // Set new chunks
           if (chunks.length > 0) {
             sheet.getRange(row, 8, 1, chunks.length).setValues([chunks]);
           }
        }
        
        sheet.getRange(row, 7).setValue(now); // updatedAt
        return true;
      }
    }
    return false;
  }
  
  function getPendingJob() {
    var sheet = _getJobSheet();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === "PENDING" || data[i][1] === "PROCESSING") {
        var str = "";
        for (var j = 7; j < data[i].length; j++) {
           if (data[i][j]) str += data[i][j];
        }
        return {
          jobId: data[i][0],
          status: data[i][1],
          total: data[i][2],
          processed: data[i][3],
          errors: data[i][4],
          payload: str ? JSON.parse(str) : null,
          rowIndex: i + 1
        };
      }
    }
    return null;
  }

  return {
    enqueue: enqueue,
    getJobStatus: getJobStatus,
    updateJobStatus: updateJobStatus,
    getPendingJob: getPendingJob
  };
})();
