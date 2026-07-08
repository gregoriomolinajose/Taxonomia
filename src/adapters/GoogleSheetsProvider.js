class GoogleSheetsProvider {
    constructor(spreadsheet) {
        this.spreadsheet = spreadsheet;
    }

    read(entityName) {
        let sheet = this.spreadsheet.getSheetByName(entityName);
        if (!sheet) {
            sheet = this.spreadsheet.getSheets()[0];
        }
        if (!sheet) throw new Error(`Sheet for entity '${entityName}' not found.`);

        const data = sheet.getDataRange().getDisplayValues();
        if (!data || data.length < 2) return [];

        const headers = data[0];
        const records = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const record = {};
            let isEmptyRow = true;

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                if (!header || header.trim() === '') continue;

                const value = row[j];
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    isEmptyRow = false;
                    record[header] = value;
                }
            }

            if (!isEmptyRow) {
                record._rowIndex = i + 1;
                records.push(record);
            }
        }
        return records;
    }

    write(entityName, records) {
        let sheet = this.spreadsheet.getSheetByName(entityName);
        if (!sheet) {
            throw new Error(`Sheet '${entityName}' not found.`);
        }
        if (!records || records.length === 0) return;

        const headers = Object.keys(records[0]).filter(k => !k.startsWith('_'));
        sheet.clearContent();
        
        const data2D = [headers];
        records.forEach(rec => {
            const row = headers.map(h => rec[h] !== undefined ? String(rec[h]) : "");
            data2D.push(row);
        });

        const range = sheet.getRange(1, 1, data2D.length, headers.length);
        range.setValues(data2D);
    }
}

if (typeof module !== 'undefined') module.exports = { GoogleSheetsProvider };
