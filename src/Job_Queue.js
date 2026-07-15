/**
 * Job_Queue.js
 * Manages the state of asynchronous jobs in the system.
 */

var JobQueue = (function() {
  var JOB_SHEET_NAME = "Sys_Jobs";
  var CHUNK_SIZE = 45000;

  function _getJobSheet() {
    var ssId = (typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID_DB) ? CONFIG.SPREADSHEET_ID_DB : null;
    if (!ssId) {
      try {
        var envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
        if (envStr) ssId = JSON.parse(envStr).SPREADSHEET_ID_DB;
      } catch (e) {}
    }
    
    var ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.getActiveSpreadsheet();
    var actualSheetName = "DB_" + JOB_SHEET_NAME;
    var sheet = ss.getSheetByName(actualSheetName);
    if (!sheet) {
      sheet = ss.insertSheet(actualSheetName);
      sheet.appendRow(["jobId", "status", "total", "processed", "errors", "step", "message", "createdAt", "updatedAt", "payload..."]);
    }
    return sheet;
  }

  function enqueue(payload) {
    var sheet = _getJobSheet();
    var jobId = "job_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
    var now = new Date().toISOString();
    var total = Array.isArray(payload) ? payload.length : (payload.data ? payload.data.length : 0);
    
    var str = JSON.stringify(payload);
    // ["jobId", "status", "total", "processed", "errors", "step", "message", "createdAt", "updatedAt", "payload..."]
    var rowData = [jobId, "PENDING", total, 0, 0, 1, "En cola...", now, now];
    for (var i = 0; i < str.length; i += CHUNK_SIZE) {
      rowData.push(str.substring(i, i + CHUNK_SIZE));
    }
    
    var currentCols = sheet.getMaxColumns();
    if (rowData.length > currentCols) {
      sheet.insertColumnsAfter(currentCols, rowData.length - currentCols);
    }
    
    sheet.appendRow(rowData);
    SpreadsheetApp.flush();
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
          step: data[i][5],
          message: data[i][6],
          createdAt: data[i][7],
          updatedAt: data[i][8]
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
        if (updates.step !== undefined) sheet.getRange(row, 6).setValue(updates.step);
        if (updates.message !== undefined) sheet.getRange(row, 7).setValue(updates.message);
        
        if (updates.payload !== undefined) {
           var str = JSON.stringify(updates.payload);
           var chunks = [];
           for (var j = 0; j < str.length; j += CHUNK_SIZE) {
             chunks.push(str.substring(j, j + CHUNK_SIZE));
           }
           var lastCol = sheet.getLastColumn();
           if (lastCol >= 10) {
             sheet.getRange(row, 10, 1, lastCol - 9).clearContent();
           }
           
           var requiredCols = 9 + chunks.length;
           var currentCols = sheet.getMaxColumns();
           if (requiredCols > currentCols) {
             sheet.insertColumnsAfter(currentCols, requiredCols - currentCols);
           }
           
           if (chunks.length > 0) {
             sheet.getRange(row, 10, 1, chunks.length).setValues([chunks]);
           }
        }
        
        sheet.getRange(row, 9).setValue(now); // updatedAt
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
        for (var j = 9; j < data[i].length; j++) {
           if (data[i][j]) str += data[i][j];
        }
        return {
          jobId: data[i][0],
          status: data[i][1],
          total: data[i][2],
          processed: data[i][3],
          errors: data[i][4],
          step: data[i][5],
          message: data[i][6],
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
