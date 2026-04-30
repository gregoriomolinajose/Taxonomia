const fs = require('fs');
const content = fs.readFileSync('src/Vendor_ApexTree.html', 'utf-8');
const js = content.replace('<script>', '').replace('</script>', '');
try {
  new Function(js);
  console.log('Syntax OK');
} catch (e) {
  console.error('Syntax Error:', e);
}
