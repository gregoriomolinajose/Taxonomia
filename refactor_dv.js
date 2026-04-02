const fs = require('fs');
let c = fs.readFileSync('src/DataView_UI.html', 'utf8');

const regex = /return keys\.map\(key => \{[\s\S]*?\}\);/;
const repl = `return keys.map(key => {
    let isHidden = false;
    let isPrimaryKey = false;
    let uiType = 'text';

    if (fields) {
        const f = fields.find(field => field.name === key);
        if (f) {
            if (f.primaryKey) isPrimaryKey = true;
            if (f.type === 'hidden' && !f.primaryKey) isHidden = true;
            if (f.showInList !== undefined) isHidden = !f.showInList;
            uiType = f.gridFormat || f.type || 'text';
        } else {
            if (['created_at', 'updated_at', 'updated_by'].includes(key)) isHidden = true;
        }
    } else {
        if (['created_at', 'updated_at', 'updated_by'].includes(key)) isHidden = true;
    }

    if (key.startsWith('id_')) {
        isPrimaryKey = true;
    }
    
    return {
        key,
        label: window.UI_DataGrid && window.UI_DataGrid._labelFromKey ? window.UI_DataGrid._labelFromKey(key, entityName) : key,
        visible: isPrimaryKey ? true : !isHidden,
        sortable: true,
        uiType: uiType
    };
});`;

c = c.replace(regex, repl);
fs.writeFileSync('src/DataView_UI.html', c);
console.log('DataView columns mapped successfully.');
