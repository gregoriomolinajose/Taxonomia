/**
 * Job_Queue.js
 * Manages the state of asynchronous jobs in the system.
 */

var JobQueue = (function() {
  var JOB_SHEET_NAME = "SYS_JOBS";

  function _getJobSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(JOB_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(JOB_SHEET_NAME);
      sheet.appendRow(["jobId", "status", "total", "processed", "errors", "payload", "createdAt", "updatedAt"]);
    }
    return sheet;
  }

  function enqueue(payload) {
    var sheet = _getJobSheet();
    var jobId = "job_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
    var now = new Date().toISOString();
    var total = Array.isArray(payload) ? payload.length : (payload.data ? payload.data.length : 0);
    
    // Status: PENDING
    sheet.appendRow([jobId, "PENDING", total, 0, 0, JSON.stringify(payload), now, now]);
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
          createdAt: data[i][6],
          updatedAt: data[i][7]
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
        if (updates.payload !== undefined) sheet.getRange(row, 6).setValue(JSON.stringify(updates.payload));
        sheet.getRange(row, 8).setValue(now); // updatedAt
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
        return {
          jobId: data[i][0],
          status: data[i][1],
          total: data[i][2],
          processed: data[i][3],
          errors: data[i][4],
          payload: JSON.parse(data[i][5]),
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
