const fs = require('fs');
const dir = 'c:/Users/grego/Antigravity/Taxonomia Project/src/';

fs.readdirSync(dir).forEach(file => {
    if(!file.endsWith('.html') || file === 'JS_Core.html') return;
    const p = dir + file;
    let cnt = fs.readFileSync(p, 'utf8');
    
    // RegEx para capturar: while(node.firstChild) node.removeChild(node.firstChild);
    let newCnt = cnt.replace(/while\s*\(\s*([a-zA-Z0-9_$.]+)\.firstChild\s*\)\s*\{?\s*\1\.removeChild\(\s*\1\.firstChild\s*\);\s*\}?/g, 'window.DOM.clear($1);');
    
    if(cnt !== newCnt) {
        fs.writeFileSync(p, newCnt);
        console.log('Updated ' + file);
    }
});
