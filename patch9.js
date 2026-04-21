const fs = require('fs');
const { execSync } = require('child_process');

// Obtain the pristine base file from Git natively in Node.js (guaranteeing UTF-8)
const pristineBuffer = execSync("git cat-file -p HEAD:src/UI_DataGrid.client.js");
const pristineText = pristineBuffer.toString('utf8');

const buildTargetStart = pristineText.indexOf('_buildTargetMemo:');
if (buildTargetStart === -1) throw new Error("Could not find _buildTargetMemo in pristine");

let pristineBottomHalf = pristineText.substring(buildTargetStart);

// Inject the optimized PK parsing logic cleanly
pristineBottomHalf = pristineBottomHalf.replace(
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

// Get our current working tree's content (which has the Premium UI Layout at the top)
let currentText = fs.readFileSync('src/UI_DataGrid.client.js', 'utf8');

// Find where the corrupted bottom half begins
// The corruption started roughly at `_buildTargetMemo:` or right after `_extractGraphMetadata` returns.
const extractEndStr = 'return metaNodes;\n        },';
const extractEndIdx = currentText.indexOf(extractEndStr);
if (extractEndIdx === -1) throw new Error("Could not find metaNodes return in current file");

// Cut the current file right after `_extractGraphMetadata`
const safeTopHalf = currentText.substring(0, extractEndIdx + extractEndStr.length);

// Stitch them together perfectly
const finalFixedText = safeTopHalf + '\n\n        ' + pristineBottomHalf;

fs.writeFileSync('src/UI_DataGrid.client.js', finalFixedText, 'utf8');
console.log("Encoding arreglado estáticamente en memoria. Sin artefactos de Win32.");
