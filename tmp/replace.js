const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'Schema_Engine.gs');
let code = fs.readFileSync(file, 'utf8');
const initialLength = code.length;
// Match { section: "Anything" , optionally followed by a space
code = code.replace(/section:\s*"[^"]+",?\s*/g, '');
fs.writeFileSync(file, code);
console.log(`Initial length: ${initialLength}, Final length: ${code.length}`);
