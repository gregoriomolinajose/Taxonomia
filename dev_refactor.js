const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'DataView_UI.html');
let content = fs.readFileSync(targetPath, 'utf8');

const replacements = [
  // 1. null string
  {
    find: `if (value === null || value === undefined || value === '') return '<span style="color:var(--dv-text-light)">—</span>';`,
    replace: `if (value === null || value === undefined || value === '') return '<span class="dv-empty-text">—</span>';`
  },
  {
    find: `if (value.length === 0) return '<span style="color:var(--dv-text-light)">—</span>';`,
    replace: `if (value.length === 0) return '<span class="dv-empty-text">—</span>';`
  },
  // 2. Chips
  {
    find: `return labels.map(l => \`<span style="display:inline-block;background:var(--dv-bg,#f0f0f0);border:1px solid var(--dv-border,#ddd);border-radius:4px;padding:1px 7px;font-size:.78rem;margin:1px;">\${l}</span>\`).join(' ');`,
    replace: `return labels.map(l => \`<span class="dv-chip">\${l}</span>\`).join(' ');`
  },
  // 3. PK code
  {
    find: `return \`<code onclick="window.openEditForm('\${strVal}')" style="font-size:.78rem;background:var(--dv-bg);padding:1px 5px;border-radius:3px;cursor:pointer;color:var(--dv-primary);font-weight:bold;text-decoration:underline;">\${strVal}</code>\`;`,
    replace: `return \`<code class="dv-pk-code" onclick="window.openEditForm('\${strVal}')">\${strVal}</code>\`;`
  },
  // 4. Error block
  {
    find: `<h3 style="color:var(--ion-color-danger)">No pudimos cargar la información.</h3>`,
    replace: `<h3 class="dv-error-title">No pudimos cargar la información.</h3>`
  },
  {
    find: `<p style="font-size:0.75rem; color:var(--dv-text-light); margin-top:8px;">(Detalle: \${error ? error.message : 'Error de red'})</p>`,
    replace: `<p class="dv-error-desc">(Detalle: \${error ? error.message : 'Error de red'})</p>`
  },
  // 5. Skeleton
  {
    find: `const cells = widths.map(w => \`<div class="dv-skeleton-cell" style="width:\${w}px;"></div>\`).join('');`,
    replace: `const cells = widths.map(w => \`<div class="dv-skeleton-cell" style="width:\${w}px;"></div>\`).join(''); // width is dynamic layout`
  },
  {
    find: `return \`<div class="dv-card" style="padding:4px 0;">\${rows}</div>\`;`,
    replace: `return \`<div class="dv-card dv-card-skel">\${rows}</div>\`;`
  },
  // 6. Folder Icon
  {
    find: `<ion-icon name="folder-open-outline" style="font-size: 64px; color: var(--ion-color-medium);"></ion-icon>`,
    replace: `<ion-icon class="dv-folder-icon" name="folder-open-outline"></ion-icon>`
  },
  // 7. Table headers
  {
    find: `<thead><tr><th style="width: 50px; text-align: center;">#</th>\${thead}<th style="width:50px;"></th></tr></thead>`,
    replace: `<thead><tr><th class="dv-th-num">#</th>\${thead}<th class="dv-th-action"></th></tr></thead>`
  },
  // 8. indexCell
  {
    find: `const indexCell = \`<td style="width: 50px; text-align: center; color: var(--dv-text-secondary); font-variant-numeric: tabular-nums; font-weight: 500;">\${rowNum}</td>\`;`,
    replace: `const indexCell = \`<td class="dv-td-num">\${rowNum}</td>\`;`
  },
  // 9. actionCell
  {
    find: `const actionCell = \`<td style="width:50px; text-align:center;">`,
    replace: `const actionCell = \`<td class="dv-td-action">`
  },
  {
    find: `<button class="dv-btn-icon" style="color:var(--ion-color-danger);" onclick="event.stopPropagation(); window.DataViewEngine._confirmDelete('\${id}')" title="Eliminar">`,
    replace: `<button class="dv-btn-icon dv-btn-danger" onclick="event.stopPropagation(); window.DataViewEngine._confirmDelete('\${id}')" title="Eliminar">`
  },
  // 10. fk Badge
  {
    find: `? \`<ion-badge color="primary" style="font-size:.7rem;font-weight:600;margin-top:10px;display:inline-flex;align-items:center;gap:4px;">🔗 \${meta.fkField.label}: \${row[meta.fkField.key]}</ion-badge>\``,
    replace: `? \`<ion-badge class="dv-fk-badge">🔗 \${meta.fkField.label}: \${row[meta.fkField.key]}</ion-badge>\``
  },
  // 11. Modal Card
  {
    find: `<ion-card-header style="display:flex; justify-content:space-between; align-items:flex-start;">`,
    replace: `<ion-card-header class="dv-card-header-flex">`
  },
  {
    find: `style="font-family:monospace;font-size:.72rem;color:var(--dv-primary);cursor:pointer;text-decoration:underline;">`,
    replace: `class="dv-code-link">`
  },
  {
    find: `<ion-card-title style="font-size:.95rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="\${title}">\${title}</ion-card-title>`,
    replace: `<ion-card-title class="dv-card-title-clamp" title="\${title}">\${title}</ion-card-title>`
  },
  {
    find: `<button class="dv-btn-icon" style="color:var(--ion-color-danger); border:none; padding:4px;" onclick="event.stopPropagation(); window.DataViewEngine._confirmDelete('\${id}')" title="Eliminar">`,
    replace: `<button class="dv-btn-icon dv-btn-danger-lite" onclick="event.stopPropagation(); window.DataViewEngine._confirmDelete('\${id}')" title="Eliminar">`
  },
  {
    find: `<div style="border-top:1px solid var(--dv-border);background:var(--dv-surface);border-radius:0 0 var(--dv-radius) var(--dv-radius);">`,
    replace: `<div class="dv-card-footer">`
  },
  // 12. Pagination
  {
    find: `<div style="display:flex;align-items:center;gap:8px;">`,
    replace: `<div class="dv-flex-group">`
  },
  {
    find: `<span style="padding:0 10px;font-size:.83rem;color:var(--dv-text-secondary);">Pág. \${_state.page} / \${tPages}</span>`,
    replace: `<span class="dv-page-info">Pág. \${_state.page} / \${tPages}</span>`
  },
  // 13. Popover Items
  {
    find: `<ion-item lines="none" style="--min-height:42px;">`,
    replace: `<ion-item class="dv-popover-item" lines="none">`
  },
  {
    find: `style="--size:18px;--border-radius:4px;"`,
    replace: `class="dv-popover-checkbox"`
  },
  {
    find: `<ion-label style="font-size:.85rem;">\${col.label}</ion-label>`,
    replace: `<ion-label class="dv-popover-label">\${col.label}</ion-label>`
  },
  {
    find: `<ion-content style="--background:var(--dv-surface);width:220px;">`,
    replace: `<ion-content class="dv-popover-content">`
  },
  {
    find: `<ion-list-header style="min-height:36px;">`,
    replace: `<ion-list-header class="dv-popover-header">`
  },
  {
    find: `<ion-label style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--dv-text-secondary);">`,
    replace: `<ion-label class="dv-sub-label">`
  },
  {
    find: `<ion-icon name="options-outline" slot="start" style="margin-right: 6px;"></ion-icon> Columnas`,
    replace: `<ion-icon class="dv-options-icon" name="options-outline" slot="start"></ion-icon> Columnas`
  },
  // 14. Title Header
  {
    find: `<h2><ion-icon name="\${meta.iconName}" color="\${meta.color}" style="font-size: 1.6rem;"></ion-icon> \${displayLabel}</h2>`,
    replace: `<h2><ion-icon class="dv-title-icon" name="\${meta.iconName}"></ion-icon> \${displayLabel}</h2>`
  },
  // 15. CSV Input
  {
    find: `<input type="file" id="dv-bulk-upload-input" accept=".csv" style="display:none;" onchange="window.DataViewEngine._importCSV(event)">`,
    replace: `<input type="file" id="dv-bulk-upload-input" accept=".csv" class="dv-hidden" onchange="window.DataViewEngine._importCSV(event)">`
  }
];

let changedCount = 0;
for (const rep of replacements) {
  if (content.includes(rep.find)) {
    content = content.replace(rep.find, rep.replace);
    changedCount++;
  } else {
    console.log("NOT FOUND:", rep.find);
  }
}

// Inject new CSS classes
const cssToAdd = `
    /* ── UI Design Classes (Refactor S9.4) ── */
    .dv-empty-text { color: var(--dv-text-light); }
    .dv-chip { display:inline-block; background:var(--dv-bg); border:1px solid var(--dv-border); border-radius:4px; padding:1px 7px; font-size:.78rem; margin:1px; }
    .dv-pk-code { font-size:.78rem; background:var(--dv-bg); padding:1px 5px; border-radius:3px; cursor:pointer; color:var(--dv-primary); font-weight:bold; text-decoration:underline; }
    .dv-error-title { color: var(--color-interactive-error); }
    .dv-error-desc { font-size: 0.75rem; color: var(--dv-text-light); margin-top: 8px; }
    .dv-card-skel { padding: 4px 0; }
    .dv-folder-icon { font-size: 64px; color: var(--ion-color-medium); }
    .dv-th-num { width: 50px; text-align: center; }
    .dv-th-action { width: 50px; }
    .dv-td-num { width: 50px; text-align: center; color: var(--dv-text-secondary); font-variant-numeric: tabular-nums; font-weight: 500; }
    .dv-td-action { width: 50px; text-align: center; }
    .dv-btn-danger { color: var(--color-interactive-error); }
    .dv-btn-danger-lite { color: var(--color-interactive-error); border: none; padding: 4px; }
    .dv-fk-badge { --background: var(--dv-primary); font-size: .7rem; font-weight: 600; margin-top: 10px; display: inline-flex; align-items: center; gap: 4px; }
    .dv-card-header-flex { display: flex; justify-content: space-between; align-items: flex-start; }
    .dv-code-link { font-family: monospace; font-size: .72rem; color: var(--dv-primary); cursor: pointer; text-decoration: underline; }
    .dv-card-title-clamp { font-size: .95rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dv-card-footer { border-top: 1px solid var(--dv-border); background: var(--dv-surface); border-radius: 0 0 var(--dv-radius) var(--dv-radius); }
    .dv-flex-group { display: flex; align-items: center; gap: 8px; }
    .dv-page-info { padding: 0 10px; font-size: .83rem; color: var(--dv-text-secondary); }
    .dv-popover-item { --min-height: 42px; }
    .dv-popover-checkbox { --size: 18px; --border-radius: 4px; }
    .dv-popover-label { font-size: .85rem; }
    .dv-popover-content { --background: var(--dv-surface); width: 220px; }
    .dv-popover-header { min-height: 36px; }
    .dv-sub-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--dv-text-secondary); }
    .dv-options-icon { margin-right: 6px; }
    .dv-title-icon { font-size: 1.6rem; color: var(--dv-primary); }
    .dv-hidden { display: none; }
`;

content = content.replace('/* ── Contenedor raíz ── */', cssToAdd + '\\n    /* ── Contenedor raíz ── */');

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Refactored " + changedCount + " nodes in DataView_UI.html");
