const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '../src');
const BANNED_PATTERNS = [
    { regex: /window\.DataAPI\.call/g, desc: "Direct RPC Call" },
    { regex: /window\.Module\./g, desc: "Legacy Module Coupling" },
    { regex: /window\.DataViewEngine/g, desc: "Controller Coupling" },
    { regex: /window\.AppEventBus\.emit/g, desc: "Direct Event Broadcasting" }
];

let failed = false;

fs.readdirSync(UI_DIR).forEach(file => {
    // Escaneamos solo las Factorías/Componentes UI puros (Prefijo UI_)
    if (file.startsWith('UI_') && file.endsWith('.client.js')) {
        const p = path.join(UI_DIR, file);
        const code = fs.readFileSync(p, 'utf8');
        const lines = code.split('\n');
        
        lines.forEach((line, idx) => {
            BANNED_PATTERNS.forEach(rule => {
                if (rule.regex.test(line)) {
                    // Validamos excluisones de línea (comentarios en misma línea o la anterior)
                    if (line.includes('// eslint-disable-line arch') || 
                        (idx > 0 && lines[idx - 1].includes('// eslint-disable-next-line arch'))) {
                        return;
                    }

                    console.error(`\x1b[31mArchitecture Violation in ${file}:${idx + 1}\x1b[0m`);
                    console.error(`  > ${line.trim()}`);
                    console.error(`  [${rule.desc}] UI components (UI_*.client.js) must strictly use DI or passed callbacks.`);
                    failed = true;
                }
            });
        });
    }
});

if (failed) {
    process.exit(1);
} else {
    console.log('\x1b[32m[OK] Architecture Lint: Strict Component Boundaries Maintained.\x1b[0m');
}
