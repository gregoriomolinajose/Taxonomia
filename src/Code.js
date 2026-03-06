/**
 * EPT-OMR Gateway API
 * Google Apps Script Web App Entry Point
 */

/**
 * Renders the main SPA Index HTML.
 */
function doGet(e) {
    // Check user identity early to force Google Apps Script to request authorization
    // and show the OAuth consent screen before loading the Web App UI.
    var userEmail = '';
    try {
        userEmail = Session.getActiveUser().getEmail();
    } catch (err) {
        console.error("Auth Error", err);
    }

    var template = HtmlService.createTemplateFromFile("Index");
    return template.evaluate()
        .setTitle("EPT-OMR Platform")
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
}

/**
 * Utility function to include external HTML partials (JS/CSS) into Index.html
 */
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
