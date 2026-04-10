import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';

describe('UI_Component_RelationBuilder & Hydration Stability', () => {
    let buildRelation;

    beforeAll(async () => {
        // Mock global environment required by legacy client files
        window.global = window;
        window.UI_Factory = {
            registerBuilder: vi.fn((name, fn) => {
                if (name === 'relation') buildRelation = fn;
            }),
            buildSearchableMulti: vi.fn()
        };
        
        window.APP_SCHEMAS = {
            Grupo_Productos: { primaryKey: "id_grupo_producto" },
            Portafolio: { primaryKey: "id_portafolio" }
        };
        
        window.UI_FormUtils = {
            normalizeId: (val) => String(val || '').trim()
        };
        
        window.SubgridState = {
            evaluateFieldState: vi.fn().mockReturnValue({ isDisabled: false, opacity: '1', placeholder: '— Sin asignar —' })
        };
        
        window.UI_CONSTANTS = {
            MOCK_FK_TOKEN: '_NEW_PARENT_'
        };

        // Load targeted JS Modules directly
        await import('../src/UI_FormUtils.client.js');
        await import('../src/UI_Component_RelationBuilder.client.js');
    });

    beforeEach(() => {
        document.body.innerHTML = '';
        
        window.__APP_CACHE__ = {};
        window.DataStore = {
            _cache: {
                Sys_Graph_Edges: [
                    { id_nodo_padre: "PORT-123", id_nodo_hijo: "GRUP-G14II", tipo_relacion: "PORTAFOLIO_GRUPO_PRODUCTO", es_version_actual: true, estado: 'Activo' }
                ],
                Portafolio: [
                    { id_portafolio: "PORT-123", nombre: "Portafolio Alfa", id_registro: "PORT-123", nivel_tipo: 1, estado: 'Activo' }
                ]
            },
            get: function(entityName) { return this._cache[entityName] || null; },
            set: function(entityName, data) { this._cache[entityName] = data; }
        };
    });

    it('AQ-Bug 1: Asegura extracción estricta PK desde APP_SCHEMAS evadiendo trampa Truthiness de Object.keys()', () => {
        const fieldConfig = {
            name: "id_portafolio",
            type: "relation",
            relationType: "padre",
            targetEntity: "Portafolio",
            graphEntity: "Sys_Graph_Edges",
            valueField: "id_portafolio",
            labelField: "nombre",
            uiComponent: "select_single",
            isTemporalGraph: true,
            graphEdgeType: "PORTAFOLIO_GRUPO_PRODUCTO"
        };
        
        // Simulación de "Trampa" en la que un ID foráneo existe antes en serialización.
        const mockFormRecordData = {
            descripcion: "", 
            estado: "1", 
            id_portafolio: "", // Falsa Primary Key si iteramos inocentemente
            id_grupo_producto: "GRUP-G14II" // Verdadera Primary Key
        };
        
        expect(buildRelation).toBeDefined();
        
        // Ejecución (Simula renderizado del sub-componente select)
        const uiOutput = buildRelation(fieldConfig, 'Grupo_Productos', mockFormRecordData, null, null);
        const ionicSelect = uiOutput.querySelector('ion-select');
        
        // Assertions 1: Que el DOM Element se creó
        expect(ionicSelect).not.toBeNull();
        
        // Assertions 2: Que el Valor asinado durante hidratación topológica corresponda correctamente a PORT-123
        expect(ionicSelect.value).toBe("PORT-123");
        
        // Assertions 3: Que la pre-renderización de las opciones cargó "Portafolio Alfa"
        const options = ionicSelect.querySelectorAll('ion-select-option');
        expect(options.length).toBeGreaterThan(1); // Mínimo 2 (el — Sin asignar — más la data)
        expect(Array.from(options).some(o => o.value === "PORT-123" && o.textContent.includes('Alfa'))).toBe(true);
    });

    it('AQ-Bug 2: Inyecta explícitamente data-skip-hydration="true" para evadir aniquilamiento (overwrite) FormRenderer', () => {
        const fieldConfig = {
            name: "id_dominio",
            type: "relation",
            relationType: "padre",
            targetEntity: "Dominio",
            graphEntity: "Sys_Graph_Edges",
            valueField: "id_dominio",
            labelField: "n0_es",
            uiComponent: "select_single",
            isTemporalGraph: true // ESTE PRECEPTA LA REGLA
        };
        
        const uiOutput = buildRelation(fieldConfig, 'Dominio', { id_dominio: "DOM-1" }, null, null);
        const ionicSelect = uiOutput.querySelector('ion-select');
        
        // Assertion: Confirmamos el escudo anti-sobreescritura para FormRenderer_UI.client.js
        expect(ionicSelect.getAttribute('data-skip-hydration')).toBe("true");
    });
    
    it('S29.8: Inyecta dinámicamente un Mock Option virtual si el initialData revela una creación en cadena (UI_CONSTANTS.MOCK_FK_TOKEN)', () => {
        const fieldConfig = {
            name: "id_portafolio",
            type: "relation",
            relationType: "padre",
            targetEntity: "Portafolio",
            graphEntity: "Sys_Graph_Edges",
            valueField: "id_portafolio",
            labelField: "nombre",
            uiComponent: "select_single",
            isTemporalGraph: true
        };
        
        const mockFormRecordData = {
            id_portafolio: window.UI_CONSTANTS.MOCK_FK_TOKEN
        };
        
        // Ejecución
        const uiOutput = buildRelation(fieldConfig, 'Portafolio', mockFormRecordData, null, null);
        const ionicSelect = uiOutput.querySelector('ion-select');
        
        // Assertions: Confirmar que existe el option virtual
        const options = Array.from(ionicSelect.querySelectorAll('ion-select-option'));
        const hasVirtualOption = options.some(o => o.value === window.UI_CONSTANTS.MOCK_FK_TOKEN && o.textContent.includes('Padre en Curso'));
        
        expect(hasVirtualOption).toBe(true);
        expect(ionicSelect.value).toBe(window.UI_CONSTANTS.MOCK_FK_TOKEN);
    });
});
