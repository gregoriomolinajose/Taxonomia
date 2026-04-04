const fs = require('fs');
const content = fs.readFileSync('src/assets/css/app.css', 'utf8');
const lines = content.split(/\r?\n/);

const sidebarLines = lines.slice(0, 186);
const dashboardLines = lines.slice(186, 233);
const utilitiesLines = lines.slice(233, 284);
const dataviewLines = lines.slice(284);

fs.writeFileSync('src/assets/css/sidebar.css', sidebarLines.join('\n'));
fs.writeFileSync('src/assets/css/dashboard.css', dashboardLines.join('\n'));
fs.writeFileSync('src/assets/css/utilities.css', utilitiesLines.join('\n'));
fs.writeFileSync('src/assets/css/dataview.css', dataviewLines.join('\n'));

fs.unlinkSync('src/assets/css/app.css');
console.log('Split complete!');
