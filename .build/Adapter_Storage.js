/**
 * Adapter_Storage.js
 * 
 * Capa de abstracción para el almacenamiento de archivos físicos.
 * Permite delegar la persistencia de Blobs fuera de la lógica de negocio,
 * facilitando en el futuro cambiar Google Drive por S3 u otros proveedores.
 */
var Adapter_Storage = (function() {

    /**
     * Guarda un archivo codificado en Base64 en una subcarpeta específica.
     * @param {Object} payloadObj - Objeto devuelto por el componente de UI (type, data, filename, mimeType)
     * @param {Object} parentFolder - Instancia de DriveApp Folder
     * @returns {string} URL del archivo creado
     */
    function saveBase64File(payloadObj, parentFolder) {
        if (!payloadObj || payloadObj.type !== 'local' || !payloadObj.data) {
            return null;
        }
        
        var mimeType = payloadObj.mimeType || 'application/pdf';
        var filename = payloadObj.filename || 'Documento';

        // Zero-Trust Validation (Backend)
        // Solo permitimos tipos MIME y extensiones autorizadas
        var allowedMimes = (payloadObj.allowedTypes && payloadObj.allowedTypes.length > 0) ? payloadObj.allowedTypes : ['application/pdf'];
        var ext = '.' + filename.split('.').pop().toLowerCase();
        
        var isValid = allowedMimes.includes(mimeType) || allowedMimes.includes(ext);
        
        if (!payloadObj.allowedTypes) {
            isValid = allowedMimes.includes(mimeType) || ext === '.pdf';
        }

        if (!isValid) {
            if (typeof Logger !== 'undefined') Logger.log('Seguridad: Tipo de archivo no permitido rechazado en Adapter_Storage: ' + mimeType + ' / ' + ext);
            throw new Error("Tipo de archivo no permitido.");
        }

        var blob = Utilities.newBlob(Utilities.base64Decode(payloadObj.data), mimeType, filename);
        
        var file = parentFolder.createFile(blob);
        return file.getUrl();
    }

    return {
        saveBase64File: saveBase64File
    };
})();
