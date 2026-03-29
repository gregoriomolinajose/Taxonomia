/**
 * Engine_Graph.js
 * Encapsulate all temporal edge logic (SCD-2) and topological cardinalities.
 */

const TOPOLOGY_DICTIONARY = {
    FUNCIONAL: { maxActiveParents: 1 },
    DIVISIONAL: { maxActiveParents: 1 },
    PLANA_HORIZONTAL: { maxActiveParents: null }, // unconstrained
    EQUIPOS: { maxActiveParents: null },
    JERARQUICA_LINEAL: { maxActiveParents: 1 },
    LINEA_STAFF: { maxActiveParents: null }, // M:N (staff lateral allowed)
    PROYECTOS: { maxActiveParents: null },
    HIBRIDA_MATRICIAL: { maxActiveParents: null }
};

const Engine_Graph = {
    /**
     * Patch SCD-2 metrics for edges based on topology rules.
     * @param {Array} activeEdges Current edges to save/update (from UI payload)
     * @param {Array} orphanEdges Edges that were removed in the UI (calculated by Engine_DB)
     * @param {String} topology The structure dictionary rule
     */
    patchSCD2Edges: function(activeEdges, orphanEdges, topology) {
        const sysDate = new Date().toISOString();

        // 1. Escenario 1: Validación de Payload (Hard Error)
        if (topology && TOPOLOGY_DICTIONARY[topology]) {
            const rules = TOPOLOGY_DICTIONARY[topology];
            if (rules.maxActiveParents !== null && activeEdges && activeEdges.length > rules.maxActiveParents) {
                // Bloquea payloads maliciosos o mal formados que exceden capacidad
                throw new Error("Violación de Topología: Payload excede el límite de padres simultáneos.");
            }
        }
        
        // 2. Escenario 2: Transición SCD-2 (Auto-Close Proxy)
        // Cierra los vínculos que ya no vienen en el activeEdges payload (transición de jefe)
        if (orphanEdges && orphanEdges.length > 0) {
            orphanEdges.forEach(o => {
                // Solo si estaban activos
                if (o.es_version_actual !== false) {
                    o.es_version_actual = false;
                    o.valido_hasta = sysDate;
                    o.updated_at = sysDate;
                }
            });
            if (typeof Logger !== 'undefined') Logger.log(`[Engine_Graph] Temporal edges closed: ${orphanEdges.length} orphans.`);
        }
        
        // 3. Process Active Edges (Open validity for new ones)
        if (activeEdges && activeEdges.length > 0) {
            activeEdges.forEach(child => {
                // If it's a new edge, it needs SCD-2 initialization
                if (!child.valido_desde) {
                    child.valido_desde = sysDate;
                    child.valido_hasta = "";
                    child.es_version_actual = true;
                    child.created_at = sysDate;
                    child.created_by = "UI_SUBGRID";
                }
            });
        }
    }
};

// Export for Node/Jest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Engine_Graph, TOPOLOGY_DICTIONARY };
}
