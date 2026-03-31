/**
 * Math_Engine.js
 * Universal Pure Logic Module for Hierarchy calculations.
 */

'use strict';

function buildOrdenPath(formStateObj, params, cache) {
    if (!params || !params.entity) return '';

    const levelField = params.levelField || 'nivel_tipo';
    const parentField = params.parentField || 'id_dominio_padre';
    const pkField = params.pkField || 'id_' + params.entity.toLowerCase();
    const orderField = params.orderField || 'orden_path';

    const nivelStr = formStateObj[levelField];
    if (nivelStr === undefined || nivelStr === null) return '';
    const nivel = parseInt(nivelStr, 10);
    if (isNaN(nivel)) return '';
    
    const safeCache = cache || [];
    
    if (nivel === 0) {
        let maxRoot = 0;
        safeCache.filter(d => parseInt(d[levelField], 10) === 0).forEach(d => {
            if (d[orderField]) {
                const val = parseInt(String(d[orderField]).split('.')[0], 10);
                if (!isNaN(val) && val > maxRoot) maxRoot = val;
            }
        });
        return String(maxRoot + 1).padStart(2, '0');
    } else {
        const idPadre = formStateObj[parentField];
        if (!idPadre || idPadre === '') return '';
        
        const padre = safeCache.find(d => String(d[pkField]) === String(idPadre));
        if (!padre || !padre[orderField]) return '';
        
        const parentPathStr = String(padre[orderField]).split('.').map(p => p.padStart(2, '0')).join('.');
        
        const siblings = safeCache.filter(d => String(d[parentField]) === String(idPadre));
        let maxSuffix = 0;
        siblings.forEach(sib => {
            if (sib[orderField]) {
                const parts = String(sib[orderField]).split('.');
                const lastPart = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastPart) && lastPart > maxSuffix) maxSuffix = lastPart;
            }
        });
        
        return parentPathStr + '.' + String(maxSuffix + 1).padStart(2, '0');
    }
}

function buildPathName(formStateObj, params, cache) {
    if (!params || !params.entity || !params.parentField || !params.nameField || !params.pathField) return '';
    
    const nombre = formStateObj[params.nameField] || '';
    const idPadre = formStateObj[parentField];
    
    if (!idPadre || idPadre === '') {
        return `PATH: ${nombre}`;
    }
    
    const safeCache = cache || [];
    const pkField = params.pkField || 'id_' + params.entity.toLowerCase();
    const padreRecord = safeCache.find(r => String(r[pkField]) === String(idPadre));
    
    if (!padreRecord || !padreRecord[params.pathField]) {
        return `PATH: ... > ${nombre}`;
    }
    
    const cleanParentPath = padreRecord[params.pathField].replace(/^PATH:\s*/, '').trim();
    return `PATH: ${cleanParentPath} > ${nombre}`;
}

// Universal Wrapper
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildOrdenPath, buildPathName };
} else if (typeof window !== 'undefined') {
    window.Math_Engine = { buildOrdenPath, buildPathName };
}
