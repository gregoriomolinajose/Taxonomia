const { GoogleSheetsProvider } = require('../../src/adapters/GoogleSheetsProvider');

describe('GoogleSheetsProvider', () => {
    let mockSheet;
    let mockSpreadsheet;

    beforeEach(() => {
        mockSheet = {
            getDataRange: vi.fn().mockReturnValue({
                getDisplayValues: vi.fn().mockReturnValue([
                    ['id', 'name'],
                    ['1', 'Alice'],
                    ['2', 'Bob']
                ])
            }),
            clearContent: vi.fn(),
            getRange: vi.fn().mockReturnValue({
                setValues: vi.fn()
            })
        };

        mockSpreadsheet = {
            getSheetByName: vi.fn().mockReturnValue(mockSheet),
            getSheets: vi.fn().mockReturnValue([mockSheet])
        };
    });

    it('should read data correctly', () => {
        const provider = new GoogleSheetsProvider(mockSpreadsheet);
        const data = provider.read('Sheet1');
        expect(data).toEqual([
            { id: '1', name: 'Alice', _rowIndex: 2 },
            { id: '2', name: 'Bob', _rowIndex: 3 }
        ]);
        expect(mockSpreadsheet.getSheetByName).toHaveBeenCalledWith('Sheet1');
    });

    it('should write data correctly', () => {
        const provider = new GoogleSheetsProvider(mockSpreadsheet);
        provider.write('Sheet1', [{ id: 3, name: 'Charlie' }]);
        
        expect(mockSheet.clearContent).toHaveBeenCalled();
        expect(mockSheet.getRange).toHaveBeenCalledWith(1, 1, 2, 2);
    });

    it('should throw error on write if sheet not found', () => {
        mockSpreadsheet.getSheetByName.mockReturnValue(null);
        const provider = new GoogleSheetsProvider(mockSpreadsheet);
        expect(() => provider.write('Missing', [{ id: 1 }])).toThrow(`Sheet 'Missing' not found.`);
    });
});
