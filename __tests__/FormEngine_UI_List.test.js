// __tests__/FormEngine_UI_List.test.js

describe('Frontend (Listado): Filtro de Soft Delete', () => {

    it('Debe excluir del DataGrid los registros con estado Eliminado', () => {
        const mockDataFromServer = [
            { id_user: 'U-1', name: 'Alice', estado: 'Activo' },
            { id_user: 'U-2', name: 'Bob', estado: 'Eliminado' },
            { id_user: 'U-3', name: 'Charlie', estado: 'Borrador' }
        ];

        // Lógica conceptual del frontend para filtrar datos antes del render
        const filterDeleted = (data) => data.filter(record => record.estado !== 'Eliminado');

        const activeRecords = filterDeleted(mockDataFromServer);

        expect(activeRecords.length).toBe(2);
        // Debe excluir a Bob
        expect(activeRecords.find(r => r.name === 'Bob')).toBeUndefined();
        // Debe mantener a Alice y Charlie
        expect(activeRecords.find(r => r.name === 'Alice')).toBeDefined();
        expect(activeRecords.find(r => r.name === 'Charlie')).toBeDefined();
    });
});
