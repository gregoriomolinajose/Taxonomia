/**
 * JS_SchemaUtils.client.js (S14.X - Schema Driven UI)
 *
 * Dedicated core utility for schema validation and structural properties.
 * Decoupled from Form utilities to act as a Single Source of Truth for frontend schema logic.
 */

window.Schema_Utils = (function () {

    /**
     * Resuelve el Primary Key canónico para una entidad
     * Strict SSOT: 1. primaryKey -> 2. idField -> 3. Fallback convención
     * @param {string} entityName
     * @returns {string} The resolved primary key field name
     */
    function getPrimaryKey(entityName) {
        if (typeof entityName !== 'string') return 'id';
        if (!entityName || !window.APP_SCHEMAS || !window.APP_SCHEMAS[entityName]) {
            // [S29.11] Fallback Seguro global para Grafos Temporales cuando el schema se omite por optimización de payload
            if (entityName === 'Sys_Graph_Edges') return 'id_relacion';
            return 'id';
        }
        const schema = window.APP_SCHEMAS[entityName];
        return schema.primaryKey || schema?.metadata?.idField || ('id_' + entityName.toLowerCase());
    }

    /**
     * Resuelve el nombre semántico (título) de una entidad.
     * @param {string} entityName
     * @param {Object} recordData
     * @returns {string} El nombre semántico o "Nuevo Registro"
     */
    function getSemanticTitle(entityName, recordData) {
        if (!recordData) return 'Nuevo Registro';
        let targetTitleField = 'nombre';
        if (entityName && window.APP_SCHEMAS && window.APP_SCHEMAS[entityName]) {
            targetTitleField = window.APP_SCHEMAS[entityName]?.metadata?.titleField || 'nombre';
        }
        return recordData[targetTitleField] || recordData['nombre'] || recordData['nombre_unidad'] || 'Nuevo Registro';
    }

    /**
     * Calcula las iniciales de un texto (para Avatars).
     * @param {string} nameString
     * @returns {string} Iniciales (1 o 2 letras mayúsculas)
     */
    function getAvatarInitials(nameString) {
        if (!nameString || nameString === 'Nuevo Registro') return "N/A";
        const parts = String(nameString).trim().split(' ').filter(String);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        return "N/A";
    }

    return {
        getPrimaryKey,
        getSemanticTitle,
        getAvatarInitials
    };

})();
