const fs = require('fs');
const path = require('path');

const artifactsPath = '.raise/artifacts';
const files = fs.readdirSync(artifactsPath);
files.forEach(f => {
    if(f.endsWith('.yaml')) {
        let content = fs.readFileSync(path.join(artifactsPath, f), 'utf8');
        if(content.includes('complexity: medium')) {
            content = content.replace(/complexity: medium/g, 'complexity: moderate');
            fs.writeFileSync(path.join(artifactsPath, f), content, 'utf8');
        }
    }
});

const backlogPath = 'governance/backlog.md';
let backlog = fs.readFileSync(backlogPath, 'utf8');
backlog = backlog.replace('## Parking Lot', '| E101 | GreatPeeps: Módulo MVP de Reclutamiento             | In Progress   | Implementar hub integrador de reclutamiento con Gemini, Calendar y LinkedIn | Máxima   |\n## Parking Lot');
fs.writeFileSync(backlogPath, backlog, 'utf8');

const scopePath = 'work/epics/e22-enterprise-ux-transformation/scope.md';
if (fs.existsSync(scopePath)) {
    try {
        let scopeBuffer = fs.readFileSync(scopePath);
        let str = scopeBuffer.toString('latin1');
        fs.writeFileSync(scopePath, str, 'utf8');
    } catch(e) {
        console.error(e);
    }
}

console.log('Fixed encodings and artifacts');
