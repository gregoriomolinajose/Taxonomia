const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/Controller_Action.gs');
const sourceCode = fs.readFileSync(filePath, 'utf8');

global.Engine_DB = {
    list: jest.fn()
};

const Controller_Action = require('../src/Controller_Action.gs');

describe('Controller_Action', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getDashboardCounters()', () => {
        it('should correctly sum active entities and ignore "Eliminado" states', () => {
             global.Engine_DB.list.mockImplementation((entity) => {
                 if (entity === 'Portafolio') {
                     return { rows: [{estado: 'Activo'}, {estado: 'Activo'}, {estado: 'Eliminado'}] };
                 }
                 if (entity === 'Equipo') {
                     return { rows: [{estado: 'Activo'}] };
                 }
                 if (entity === 'Persona') {
                     return { rows: [{estado: 'Eliminado'}, {estado: 'Inactivo'}] }; // Inactivo counts as non-Eliminado
                 }
                 return { rows: [] };
             });

             const result = Controller_Action.getDashboardCounters();
             
             expect(global.Engine_DB.list).toHaveBeenCalledWith('Portafolio');
             expect(global.Engine_DB.list).toHaveBeenCalledWith('Equipo');
             expect(global.Engine_DB.list).toHaveBeenCalledWith('Persona');
             
             expect(result.Portafolios).toBe(2);
             expect(result.Equipos).toBe(1);
             expect(result.Personas).toBe(1);
        });

        it('should handle null/empty rows definitions gracefully via optional chaining', () => {
             // Mock one of them returning null rows totally (edge case DB wipe)
             global.Engine_DB.list.mockImplementation((entity) => {
                 return {}; // Missing .rows
             });

             const result = Controller_Action.getDashboardCounters();
             
             expect(result.Portafolios).toBe(0);
             expect(result.Equipos).toBe(0);
             expect(result.Personas).toBe(0);
        });
        
        it('should handle rows that lack the "estado" property completely gracefully', () => {
             global.Engine_DB.list.mockImplementation((entity) => {
                 if (entity === 'Portafolio') {
                     return { rows: [{}, {estado: 'Activo'}, {}] }; // Missing estado on some
                 }
                 return { rows: [] };
             });

             const result = Controller_Action.getDashboardCounters();
             
             // undefined !== 'Eliminado' evaluates to true, so rows without 'estado' are kept in count.
             expect(result.Portafolios).toBe(3); 
        });
    });

});
