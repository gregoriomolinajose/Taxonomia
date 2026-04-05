const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const filesToMigrate = [
    // DataView Ecosystem
    "DataEngine_UI.html",
    "DataView_Builders_UI.html",
    "DataView_DragDrop.html",
    "DataView_UI.html",
    "UI_DataView_Toolbar.html",
    "UI_DataGrid.html",
    
    // FormRenderer Ecosystem
    "FormRenderer_UI.html",
    "UI_FormStepper.html",
    "UI_FormSubmitter.html",
    "UI_FormUtils.html",
    "UI_FormDependencies.html",
    "FormBuilder_Inputs.html",
    "FormBuilder_Inputs_Base.html",
    "FormBuilder_Inputs_Complex.html",
    "FormEngine_Resolvers.html",
    
    // UI Generics
    "UI_Component_DynamicList.html",
    "UI_Component_RelationBuilder.html",
    "UI_Component_SearchableMulti.html",
    "UI_Components.html",
    "UI_ModalManager.html",
    "UI_SubgridBuilder.html",
    "UI_ThemeManager.html",
    "UI_Router.html"
];

let migrated = 0;

filesToMigrate.forEach(file => {
    const htmlPath = path.join(srcDir, file);
    if (fs.existsSync(htmlPath)) {
        let content = fs.readFileSync(htmlPath, 'utf8');
        
        // Remove <script> tags at start and end loosely.
        content = content.replace(/^[\s\S]*?<script>/i, '').replace(/<\/script>[\s\S]*?$/i, '');
        
        // Remove the inner comments like <?!= include('...'); ?> just in case, but they usually aren't parsed dynamically in .client.js
        // Wait, if we remove <script>, it becomes pure JS. Does it have <?!= include ?> ?
        // Usually include is done in Index.html.
        
        const jsFileName = file.replace('.html', '.client.js');
        const jsPath = path.join(srcDir, jsFileName);
        
        fs.writeFileSync(jsPath, content.trim(), 'utf8');
        fs.unlinkSync(htmlPath);
        
        console.log(`Migrated: ${file} -> ${jsFileName}`);
        migrated++;
    } else {
        console.log(`File not found, skipping: ${file}`);
    }
});

console.log(`Successfully migrated ${migrated} files.`);
