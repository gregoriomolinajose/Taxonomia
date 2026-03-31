const fs = require('fs');
const path = require('path');

const indexFile = '.raise/rai/memory/index.json';
const modDir = 'governance/architecture/modules';

const graphData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
const files = fs.readdirSync(modDir).filter(f => f.endsWith('.md'));

let report = {};

// Build a map of modules from the graph directly
const modNodesList = graphData.nodes.filter(n => n.type === 'module');
const modMap = {};
for (const n of modNodesList) {
    if (n.id.startsWith('mod-')) {
        const name = n.id.substring(4);
        modMap[name] = n.metadata;
    }
}

for (const f of files) {
    const fpath = path.join(modDir, f);
    const content = fs.readFileSync(fpath, 'utf8');
    const yamlMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!yamlMatch) continue;
    
    // Parse name
    const nameMatch = yamlMatch[1].match(/name:\s*([^\r\n]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');

    const mdMeta = modMap[name];
    if (!mdMeta) {
       console.log('No metadata for mod-', name, 'in index.json');
       continue;
    }

    // Attempt a rudimentary YAML parsing for fields we care about
    const extractArray = (field) => {
        const regex = new RegExp(`^${field}:\\s*\\[(.*)\\]`, 'm');
        const match = yamlMatch[1].match(regex);
        if (match) {
            return match[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
        }
        return [];
    };
    
    const extractComponentsNum = () => {
        const regex = new RegExp('^components:\\s*\n((\\s+-\\s+[^\n]+\n?)*)', 'm');
        const match = yamlMatch[1].match(regex);
        if (match) {
            return match[1].split('\n').filter(l => l.trim().startsWith('-')).length;
        }
        return 0;
    };

    report[name] = {
        doc: {
            depends_on: extractArray('depends_on'),
            depended_by: extractArray('depended_by'),
            public_api: extractArray('public_api'),
            components: extractComponentsNum()
        },
        graph: {
            depends_on: mdMeta.depends_on || [],
            depended_by: mdMeta.depended_by || [],
            public_api: mdMeta.public_api || [],
            components: (mdMeta.components || []).length
        },
        file: fpath,
        frontmatterString: yamlMatch[1]
    };
}

fs.writeFileSync('drift_report.json', JSON.stringify(report, null, 2));
console.log('Done');
