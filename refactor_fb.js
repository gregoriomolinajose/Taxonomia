const fs = require('fs');

const original = fs.readFileSync('src/FormBuilder_Inputs.html', 'utf8');
const lines = original.split(/\r?\n/); // Windows/Unix safe

function getLines(startLine, endLine) {
    return lines.slice(startLine - 1, endLine).join('\n');
}

// === Build Base ===
const baseHeader = `
<script>
    /* ============================================================
       FormBuilder_Inputs_Base.html
       Micro-Frontend: Componentes Primitivos Formularios
       ============================================================ */
    (function (global) {
        global.UI_Factory = global.UI_Factory || {};
`;
const baseFooter = `
    })(window);
</script>
`;
const baseContent = getLines(14, 99) + '\n\n' + getLines(492, 501);
fs.writeFileSync('src/FormBuilder_Inputs_Base.html', baseHeader + baseContent + baseFooter, 'utf8');

// === Build Complex ===
const compHeader = `
<script>
    /* ============================================================
       FormBuilder_Inputs_Complex.html
       Micro-Frontend: Componentes Estructurados y Compuestos
       ============================================================ */
    (function (global) {
        global.UI_Factory = global.UI_Factory || {};
`;
const compFooter = `
    })(window);
</script>
`;
const compContent = getLines(101, 490);
fs.writeFileSync('src/FormBuilder_Inputs_Complex.html', compHeader + compContent + compFooter, 'utf8');

// === Build Router (Main) ===
const routerHeader = `
<script>
    /* ============================================================
       FormBuilder_Inputs.html
       Micro-Frontend: Enrutador y Topología de Formulario
       ============================================================ */
    (function (global) {
        global.UI_Factory = global.UI_Factory || {};
`;
const routerFooter = `
    })(window);
</script>
`;
const routerContent = getLines(503, 676);
fs.writeFileSync('src/FormBuilder_Inputs.html', routerHeader + routerContent + routerFooter, 'utf8');

console.log("Success! FormBuilder component split perfectly by LOC offsets.");
