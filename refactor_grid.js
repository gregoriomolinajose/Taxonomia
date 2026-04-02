const fs = require('fs');
let c = fs.readFileSync('src/UI_DataGrid.html', 'utf8');

c = c.replace(/HIDDEN_BY_DEFAULT:\s*\[.*\],\s*/g, '');
c = c.replace(/STATUS_FIELDS:\s*\[.*\],\s*/g, '');

const regex = /_formatValueNode:\s*function\s*\(\s*key\s*,\s*value\s*\)\s*\{[\s\S]*?return frag;\s*\}/m;
const repl = `_formatValueNode: function(key, value, explicitColConfig) {
    const makeEmpty = () => window.DOM.create('span', { class: 'dv-empty-text' }, '—');

    if (value === null || value === undefined || value === '') {
        return makeEmpty();
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return makeEmpty();
        const frag = document.createDocumentFragment();
        value.forEach(item => {
            let text = String(item);
            if (typeof item === 'object' && item !== null) {
                text = item.nombre || item.name || item.label || item.nombre_producto
                    || Object.values(item).find(v => typeof v === 'string' && !String(v).startsWith('id_') && v.length > 0)
                    || '—'; // Fallback OCP
            }
            frag.appendChild(window.DOM.create('span', { class: 'dv-chip' }, text));
            frag.appendChild(document.createTextNode(' '));
        });
        return frag;
    }

    const strVal = String(value);
    let uiType = explicitColConfig ? explicitColConfig.uiType : 'text';
    let isPrimaryKey = explicitColConfig ? explicitColConfig.primaryKey : false;

    // Fallback if colConfig wasn't directly provided
    if (!explicitColConfig && this.cfg && this.cfg.columns) {
        const col = this.cfg.columns.find(c => c.key === key);
        if (col) {
            uiType = col.uiType || 'text';
            isPrimaryKey = col.primaryKey || false;
        }
    }

    // Heuristic fallback
    if (key.startsWith('id_') && isPrimaryKey === false) isPrimaryKey = true;

    if (isPrimaryKey) {
        return window.DOM.create('code', { 
            class: 'dv-pk-code',
            onclick: () => this._invoke(this.cfg.onEdit, strVal)
        }, strVal);
    }

    if (window._LOOKUP_DATA && window._LOOKUP_DATA[key]) {
        const lookupArr = window._LOOKUP_DATA[key];
        const found = lookupArr.find(opt => String(opt.value) === strVal);
        if (found) return document.createTextNode(found.label);
    }

    if (uiType === 'badge') {
        return window.DOM.create('span', { class: this._badgeClass(strVal) }, strVal);
    }

    if (uiType === 'currency') {
        const num = parseFloat(strVal);
        if (!isNaN(num)) return document.createTextNode(\`$\${num.toLocaleString('es-MX')}\`);
    }

    if (uiType === 'percentage') {
        const num = parseFloat(strVal);
        if (!isNaN(num)) return document.createTextNode(\`\${num}%\`);
    }

    const outStr = strVal.length > 60 ? \`\${strVal.substring(0, 58)}…\` : strVal;
    return document.createTextNode(outStr);
}`;

c = c.replace(regex, repl);

// Also need to pass colConfig from caller methods if possible, but the fallback handles it if we don't.
// Wait! `_renderTableView` passes the column definition!
const renderTbRegex = /this\._formatValueNode\(col\.key,\s*row\[col\.key\]\)/g;
c = c.replace(renderTbRegex, 'this._formatValueNode(col.key, row[col.key], col)');

const renderGridRegex = /this\._formatValueNode\(k,\s*row\[k\]\)/g;
c = c.replace(renderGridRegex, 'this._formatValueNode(k, row[k], this.cfg.columns.find(c => c.key === k))');

fs.writeFileSync('src/UI_DataGrid.html', c);
console.log('UI_DataGrid completely refactored.');
