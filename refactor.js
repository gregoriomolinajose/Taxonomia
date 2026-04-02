const fs = require('fs');
const filePath = 'src/DataView_UI.html';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove _buildColPopoverContentHTML
content = content.replace(/function _buildColPopoverContentHTML\(\) \{[\s\S]*?return content;\s*\}/, '');

// 2. Remove _ensureColPopover
content = content.replace(/function _ensureColPopover\(\) \{[\s\S]*?\}\);\s*\}/, '');

// 3. Remove _buildToolbarHTML
content = content.replace(/function _buildToolbarHTML\(\) \{[\s\S]*?return toolbar;\s*\}/, '');

// 4. Remove _buildHeader
content = content.replace(/function _buildHeader\(\) \{[\s\S]*?return headerDiv;\s*\}/, '');

// 5. Replace Calls
content = content.replace(/_buildColPopoverContentHTML\(\)/g, 'window.UI_DataViewBuilders.buildColPopoverContentHTML(_state)');
content = content.replace(/_ensureColPopover\(\)/g, 'window.UI_DataViewBuilders.ensureColPopover(_state)');
content = content.replace(/_buildToolbarHTML\(\)/g, 'window.UI_DataViewBuilders.buildToolbarHTML(_state)');
content = content.replace(/_buildHeader\(\)/g, 'window.UI_DataViewBuilders.buildHeader(_state)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactor completed using JS AST RegExp logic!');
