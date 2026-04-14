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

    return {
        getPrimaryKey
    };

})();
