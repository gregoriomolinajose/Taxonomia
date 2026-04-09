const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', '..', 'src', 'Schema_Engine.gs');

let s = fs.readFileSync(file, 'utf8');

s = s.replace(/metadata: \{ showInMenu: (true|false), showInDashboard: true,\s+/g, (match, p1) => {
    return `uiConfig: { dashboardCard: true },\n    metadata: { showInMenu: ${p1}, `;
});

s = s.replace(/metadata: \{ showInMenu: (true|false), showInDashboard: false,\s+/g, (match, p1) => {
    return `metadata: { showInMenu: ${p1}, `;
});

fs.writeFileSync(file, s);
console.log('Done refactoring Schema_Engine.gs');
