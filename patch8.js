const fs = require('fs');

let content = fs.readFileSync('src/UI_DataGrid.client.js', 'utf8');

// The file is corrupted. Since I used multi_replace_file_content, it deleted _buildTargetMemo and _resolveLogicalValue's beginning.
// I will just read the original old_UI.js (utf16le) to grab _buildTargetMemo, _resolveLogicalValue, and everything else inside it.

const oldContent = fs.readFileSync('old_UI.js', 'utf16le');
const buildTargetStart = oldContent.indexOf('_buildTargetMemo:');
if (buildTargetStart === -1) throw new Error("Could not find _buildTargetMemo in old_UI.js");

let theRest = oldContent.substring(buildTargetStart);

// Now I will modify _buildTargetMemo inside `theRest` string to include the pkField logic.
theRest = theRest.replace(
    /const memo = {};[\r\n\s]+for\(let i=0; i<rows\.length; i\+\+\) \{[\r\n\s]+const r = rows\[i\];[\r\n\s]+const vl = r\[labelKey\];[\r\n\s]+if \(vl\) \{[\r\n\s]+if \(r\.id_registro\) memo\[String\(r\.id_registro\)\] = vl;[\r\n\s]+if \(r\.lexical_id\) memo\[String\(r\.lexical_id\)\] = vl;[\r\n\s]+\}[\r\n\s]+\}/,
    `const memo = {};
            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id_registro';
            
            for(let i=0; i<rows.length; i++) {
                const r = rows[i];
                const vl = r[labelKey];
                if (vl) {
                    if (r.id_registro) memo[String(r.id_registro)] = vl;
                    if (r.lexical_id) memo[String(r.lexical_id)] = vl;
                    if (r[pkField]) memo[String(r[pkField])] = vl;
                }
            }`
);

// In current content, the corrupted string starts around _buildTargetMemo... or wait, it deleted _buildTargetMemo.
// Let's find where `return metaNodes;` is, which is the end of `_extractGraphMetadata`.
const extractEnd = content.indexOf('return metaNodes;\n        },');
if (extractEnd === -1) throw new Error("Could not find return metaNodes;");

const cutPoint = extractEnd + 'return metaNodes;\n        },'.length;

const finalContent = content.substring(0, cutPoint) + '\n\n        ' + theRest;

fs.writeFileSync('src/UI_DataGrid.client.js', finalContent, 'utf8');
console.log("Restaurado y parcheado _buildTargetMemo y _resolveLogicalValue desde old_UI.js");
