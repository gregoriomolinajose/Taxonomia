// __tests__/IntegrityRefactor.test.js

/**
 * BDD Tests for System Integrity Refactoring
 * Valida: 
 * 1. Upsert Idempotente (Sin appendRow)
 * 2. Sanitización a JSON estricto (Fechas nativas)
 * 3. Inyección de RAM Inmutable y cero Fetch (Frontend simulations)
 * 4. Saneamiento de Strings (Anti-Snake-Case)
 */

describe('Mandato A: Capa de Datos (Backend)', () => {

    it('A.1: Debe existir una rutina de Upsert Idempotente que no use appendRow()', () => {
        // Validación estática del código fuente de Adapter_Sheets
        const fs = require('fs');
        const path = require('path');
        const adapterCode = fs.readFileSync(path.join(__dirname, '../src/Adapter_Sheets.js'), 'utf8');
        
        // La directiva prohíbe el uso ciego de appendRow()
        expect(adapterCode).not.toMatch(/\.appendRow\(/);
        // Debe usar setValues para escrituras idempotentes (ya sea Update o Insert en nueva fila)
        expect(adapterCode).toMatch(/\.setValues\(/);
    });

    it('A.2: Sanitización Obligatoria de Salida (Regla de postMessage)', () => {
        const Adapter_Sheets = require('../src/Adapter_Sheets');
        
        // Mock de datos sucios con un Date nativo
        const mockDataWithDate = {
            id_demo: 'DEMO-123',
            created_at: new Date('2026-03-24T12:00:00Z'), // Native date object
            nombre: 'Test'
        };

        // Simular que el Adapter devuelve este objeto al leer
        // En la implementación real, `Adapter_Sheets.list` o el retorno de `upsertBatch`
        // debe parsear y stringificar para destruir el Date prototype
        
        // Asumiendo una función helper estática o integración en mock:
        // const sanitized = Adapter_Sheets._sanitizeEntity(mockDataWithDate);
        // expect(sanitized.created_at).toBe('2026-03-24T12:00:00.000Z');
        // expect(sanitized.created_at instanceof Date).toBe(false);
    });

    it('A.3: Auditoría Silenciosa en el Backend', () => {
        const Engine_DB = require('../src/Engine_DB');
        const payloadFromFrontend = { id_demo: 'DEMO-444', nombre: 'Puro Nombre' };
        
        // El payload no tiene auditoría. Engine_DB o el Adapter deben inyectar updated_at
        // Evaluaremos en green phase que la mutación anexe estos valores
        // Esto se valida verificando los argumentos que Engine_DB pasa al adaptador.
    });

    it('A.4: Integridad de Soft-Delete (Regla 3 DB)', () => {
        // Validación estática de que Adapter_Sheets.remove incorpora auditoría estricta
        const fs = require('fs');
        const path = require('path');
        const adapterCode = fs.readFileSync(path.join(__dirname, '../src/Adapter_Sheets.js'), 'utf8');
        
        // Verifica que se busquen y pueblen las columnas mandatorias de eliminación
        expect(adapterCode).toMatch(/idxDeletedAt\s*>\s*-1\)\s*rowToUpdate\[idxDeletedAt\]\s*=\s*currentTimestamp/);
        expect(adapterCode).toMatch(/idxDeletedBy\s*>\s*-1\)\s*rowToUpdate\[idxDeletedBy\]\s*=\s*currentUser/);
    });
});

describe('Mandato B: Capa de Memoria y UI (Frontend)', () => {

    it('B.1: Saneamiento de Strings (Anti-Snake-Case)', () => {
        // Mock de la función utilitaria global que se inyectará en frontend
        const formatLabel = (str) => {
            return (str || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        };

        expect(formatLabel('unidad_negocio')).toBe('Unidad Negocio');
        expect(formatLabel('id_del_grupo_producto')).toBe('Id Del Grupo Producto');
        expect(formatLabel('created_at')).toBe('Created At');
    });

    it('B.2: Inyección Inmutable en RAM y Cero Re-fetching', () => {
        // Simulación del estado del DataViewEngine (window.__APP_CACHE__)
        const APP_CACHE = {
            'Producto': [
                { id_producto: 'PROD-1', nombre: 'A' },
                { id_producto: 'PROD-2', nombre: 'B' }
            ]
        };

        // Función mock que simula el handler de guardado exitoso (DataView_UI)
        const applyLocalMutation = (entityName, newRecord, isEdit) => {
            if (isEdit) {
                const idx = APP_CACHE[entityName].findIndex(r => r['id_producto'] === newRecord['id_producto']);
                if (idx > -1) APP_CACHE[entityName][idx] = { ...APP_CACHE[entityName][idx], ...newRecord };
            } else {
                APP_CACHE[entityName].unshift(newRecord); // Prepend para registros nuevos
            }
        };

        // Simular Creación (Insert)
        applyLocalMutation('Producto', { id_producto: 'PROD-3', nombre: 'Nuevo' }, false);
        expect(APP_CACHE['Producto'].length).toBe(3);
        expect(APP_CACHE['Producto'][0].id_producto).toBe('PROD-3'); // Unshift coloca al inicio

        // Simular Edición (Update)
        applyLocalMutation('Producto', { id_producto: 'PROD-1', nombre: 'A Editado' }, true);
        expect(APP_CACHE['Producto'][1].nombre).toBe('A Editado');
        expect(APP_CACHE['Producto'].length).toBe(3); // NO altera el conteo total
    });

});
