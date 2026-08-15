// src/Adapter_Config.js
// [S61/E6] Adaptador de configuración del sistema para PropertiesService.
//
// Implementa la persistencia del singleton Config_System usando
// PropertiesService.getScriptProperties() como almacén local al tenant.
// Cada campo se almacena como una clave separada con el prefijo APP_CONFIG__.
//
// API pública (consumida por Engine_DB cuando metadata.adapter === 'config'):
//   Adapter_Config.asListResponse()  → { headers: string[], rows: any[][] }
//   Adapter_Config.setAll(payload)   → { success: true }

// Compatibilidad Node.js (para tests unitarios)
if (typeof process !== 'undefined' && typeof require !== 'undefined') {
    if (typeof APP_SCHEMAS === 'undefined') {
        global.APP_SCHEMAS = require('./Schema_Engine').APP_SCHEMAS;
    }
}

var Adapter_Config = (function () {

    // ─── Constantes ──────────────────────────────────────────────────────────

    var SINGLETON_ID  = 'SYS-CONFIG-001';
    var KEY_PREFIX    = 'APP_CONFIG__';
    var ENTITY_NAME   = 'Config_System';

    // ─── Helpers privados ────────────────────────────────────────────────────

    /**
     * Obtiene los nombres de campo del schema de Config_System de forma dinámica.
     * Si el schema no está disponible (entorno de test sin mock), retorna la lista base.
     */
    function _getFieldNames() {
        var localSchemas = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS : null;
        var schema = localSchemas ? localSchemas[ENTITY_NAME] : null;
        if (schema && schema.fields && schema.fields.length > 0) {
            return schema.fields
                .filter(function (f) { return f.type !== 'divider' && f.type !== 'uiComponent'; })
                .map(function (f) { return f.name; });
        }
        // Fallback de emergencia (alineado con S60)
        return ['config_id', 'tenant_name', 'db_adapter_id', 'spreadsheet_id',
                'allowed_domains', 'app_title', 'favicon_url'];
    }

    /**
     * Lee todos los campos de PropertiesService y retorna un objeto plano.
     * Los campos no encontrados se retornan como string vacío.
     */
    function _readAll() {
        var fields = _getFieldNames();
        var result = {};

        var props;
        try {
            props = (typeof PropertiesService !== 'undefined')
                ? PropertiesService.getScriptProperties().getProperties()
                : {};
        } catch (e) {
            props = {};
            if (typeof Logger !== 'undefined') {
                Logger.log('[Adapter_Config] WARN: PropertiesService no disponible: ' + e.message);
            }
        }

        fields.forEach(function (fieldName) {
            var storageKey = KEY_PREFIX + fieldName;
            // config_id es siempre el singleton ID — no se almacena en Properties
            if (fieldName === 'config_id') {
                result[fieldName] = SINGLETON_ID;
            } else {
                result[fieldName] = (props[storageKey] !== undefined && props[storageKey] !== null)
                    ? props[storageKey]
                    : '';
            }
        });

        return result;
    }

    // ─── API pública ─────────────────────────────────────────────────────────

    return {

        /**
         * asListResponse()
         * Retorna la configuración del sistema en formato { headers, rows }
         * compatible con el contrato de Engine_DB y el FormRenderer.
         * Siempre devuelve exactamente 1 fila (singleton).
         *
         * @returns {{ headers: string[], rows: any[][] }}
         */
        asListResponse: function () {
            var fields  = _getFieldNames();
            var current = _readAll();

            var row = fields.map(function (f) {
                return current[f] !== undefined ? current[f] : '';
            });

            if (typeof Logger !== 'undefined') {
                Logger.log('[Adapter_Config] asListResponse: leyendo Config_System desde PropertiesService.');
            }

            return {
                headers: fields,
                rows: [row]
            };
        },

        /**
         * setAll(payload)
         * Persiste los campos de Config_System en PropertiesService.
         * Opera como un upsert total (reemplaza todos los campos presentes en el payload).
         * El campo config_id es inmutable y se ignora en la escritura.
         *
         * @param {Object} payload - Objeto con los campos a persistir
         * @returns {{ success: true, action: 'upserted', id: string }}
         */
        setAll: function (payload) {
            if (!payload || typeof payload !== 'object') {
                throw new Error('[Adapter_Config] setAll requiere un payload de tipo objeto.');
            }

            var fields = _getFieldNames();
            var propsToSet = {};

            fields.forEach(function (fieldName) {
                if (fieldName === 'config_id') return; // inmutable
                if (payload.hasOwnProperty(fieldName) && payload[fieldName] !== null && payload[fieldName] !== undefined) {
                    propsToSet[KEY_PREFIX + fieldName] = String(payload[fieldName]);
                }
            });

            try {
                if (typeof PropertiesService !== 'undefined') {
                    PropertiesService.getScriptProperties().setProperties(propsToSet);
                }
            } catch (e) {
                throw new Error('[Adapter_Config] Error al escribir en PropertiesService: ' + e.message);
            }

            if (typeof Logger !== 'undefined') {
                Logger.log('[Adapter_Config] setAll: Config_System actualizado. Campos: ' + Object.keys(propsToSet).join(', '));
            }

            return {
                success: true,
                action: 'upserted',
                id: SINGLETON_ID
            };
        },

        /**
         * getField(fieldName)
         * Lee un campo individual de la configuración.
         * Útil para accesos puntuales sin necesidad de deserializar todo el objeto.
         *
         * @param {string} fieldName - Nombre del campo del schema
         * @returns {string} Valor del campo o string vacío si no existe
         */
        getField: function (fieldName) {
            if (fieldName === 'config_id') return SINGLETON_ID;
            try {
                var val = (typeof PropertiesService !== 'undefined')
                    ? PropertiesService.getScriptProperties().getProperty(KEY_PREFIX + fieldName)
                    : null;
                return (val !== null && val !== undefined) ? val : '';
            } catch (e) {
                return '';
            }
        },

        // Exponer para tests
        _SINGLETON_ID : SINGLETON_ID,
        _KEY_PREFIX   : KEY_PREFIX,
        _getFieldNames: _getFieldNames
    };

}());

// Exportar para entorno Node.js (tests unitarios)
if (typeof module !== 'undefined') {
    module.exports = { Adapter_Config: Adapter_Config };
}
