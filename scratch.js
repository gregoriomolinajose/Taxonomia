const fs = require('fs');
const html = fs.readFileSync('src/Vendor_ApexTree.html', 'utf8');
const match = html.match(/b64Chunks = \[\s*([^\]]+)\]/);
if (match) {
  const b64 = match[1].replace(/['",\s\n]+/g, '');
  const text = Buffer.from(b64, 'base64').toString('utf8');
  
  // Find "expand(" and extract around it
  const eIndex = text.indexOf('expand(');
  if (eIndex > -1) {
    console.log('EXPAND:', text.substring(eIndex - 50, eIndex + 150));
  }
  const cIndex = text.indexOf('collapse(');
  if (cIndex > -1) {
    console.log('COLLAPSE:', text.substring(cIndex - 50, cIndex + 150));
  }
}
