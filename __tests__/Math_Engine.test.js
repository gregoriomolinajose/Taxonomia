const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/Math_Engine.html');
let sourceCode = fs.readFileSync(filePath, 'utf8');

// Strip the <script> and </script> tags to allow eval
sourceCode = sourceCode.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');

const scriptContext = {};
eval(`
    ${sourceCode}
    scriptContext.buildOrdenPath = typeof buildOrdenPath !== 'undefined' ? buildOrdenPath : null;
    scriptContext.buildPathName = typeof buildPathName !== 'undefined' ? buildPathName : null;
    scriptContext.buildEChartsTreemapData = typeof buildEChartsTreemapData !== 'undefined' ? buildEChartsTreemapData : null;
`);

const { buildOrdenPath, buildPathName, buildEChartsTreemapData } = scriptContext;

describe('Math_Engine Hierarchical Calculations', () => {

    describe('buildOrdenPath', () => {
        it('should return 01 for the first root node', () => {
             const formStateObj = { nivel_tipo: 0 };
             const params = { entity: 'Dominio' };
             const cache = [];
             
             const result = buildOrdenPath(formStateObj, params, cache);
             expect(result).toBe('01');
        });

        it('should append suffix for sibling node at same parent', () => {
             const formStateObj = { nivel_tipo: 1, id_dominio_padre: 'PARENT_1' };
             const params = { entity: 'Dominio' };
             const cache = [
                 { id_dominio: 'PARENT_1', orden_path: '02' },
                 { id_dominio: 'SIB_1', id_dominio_padre: 'PARENT_1', orden_path: '02.01' },
                 { id_dominio: 'SIB_2', id_dominio_padre: 'PARENT_1', orden_path: '02.02' }
             ];
             
             const result = buildOrdenPath(formStateObj, params, cache);
             expect(result).toBe('02.03'); // The third sibling under PARENT_1
        });
    });

    describe('buildPathName', () => {
        it('should return base path when there is no parent', () => {
            const formStateObj = { nombre_dominio: 'Operaciones', id_dominio_padre: '' };
            const params = { 
                entity: 'Dominio', 
                parentField: 'id_dominio_padre', 
                nameField: 'nombre_dominio', 
                pathField: 'path_completo' 
            };
            
            const result = buildPathName(formStateObj, params, []);
            expect(result).toBe('PATH: Operaciones');
        });

        it('should append to parent path recursively', () => {
            const formStateObj = { nombre_dominio: 'Logística', id_dominio_padre: 'D1' };
            const params = { 
                entity: 'Dominio', 
                parentField: 'id_dominio_padre', 
                nameField: 'nombre_dominio', 
                pathField: 'path_completo',
                pkField: 'id_dominio'
            };
            const cache = [
                { id_dominio: 'D1', path_completo: 'PATH: Operaciones' }
            ];
            
            const result = buildPathName(formStateObj, params, cache);
            expect(result).toBe('PATH: Operaciones > Logística');
        });
    });

    describe('buildEChartsTreemapData', () => {
        it('should build hierarchical tree from flat cache utilizing SCD-2 Subgrids (Relacion_Dominios) via Engine_DB payload schema', () => {
            const cacheObject = {
                'Dominio': [
                    { id_dominio: 'D1', n0_es: 'Root Dom', path_completo_es: 'PATH: Root' },
                    { id_dominio: 'D2', n0_es: 'Child Dom', path_completo_es: 'PATH: Root > Child' }
                ],
                'Relacion_Dominios': [
                    { id_nodo_padre: 'D1', id_nodo_hijo: 'D2', tipo_relacion: 'Militar_Directa', es_version_actual: true }
                ]
            };

            const result = buildEChartsTreemapData(cacheObject);
            
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('D1');
            expect(result[0].children).toBeDefined();
            expect(result[0].children.length).toBe(1);
            expect(result[0].children[0].id).toBe('D2');
        });
        
        it('should handle broken links or missing parents gracefully', () => {
            const cacheObject = {
                'Dominio': [
                    { id_dominio: 'D2', n0_es: 'Orphan Child' }
                ],
                'Relacion_Dominios': [
                    { id_nodo_padre: 'NON_EXISTENT', id_nodo_hijo: 'D2', tipo_relacion: 'Militar_Directa', es_version_actual: true }
                ]
            };

            const result = buildEChartsTreemapData(cacheObject);
            
            // Should be appended as root node instead of failing
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('D2');
        });
    });

});
