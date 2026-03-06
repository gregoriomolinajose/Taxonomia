/**
 * EPT-OMR Gateway API
 * Google Apps Script Web App Entry Point
 */

/**
 * Renders the main SPA Index HTML.
 */
function doGet(e) {
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
