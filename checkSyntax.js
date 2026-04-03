const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const srcDir = path.join(__dirname, 'src');
const files = fs.readdirSync(srcDir);

files.forEach(file => {
  const fullPath = path.join(srcDir, file);
  if (fs.statSync(fullPath).isDirectory()) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  let jsCode = '';
  if (file.endsWith('.html')) {
    // Extract script contents roughly
    const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
    let match;
    while ((match = scriptRegex.exec(content)) !== null) {
      jsCode += match[1] + '\n';
    }
  } else if (file.endsWith('.js') || file.endsWith('.gs')) {
    jsCode = content;
  }
  
  // Remove GAS template tags to allow parsing
  jsCode = jsCode.replace(/<\?\!=.*?\?>/g, 'null');
  
  try {
    if (jsCode.trim()) {
      acorn.parse(jsCode, { ecmaVersion: 2020 });
    }
  } catch (e) {
    console.error(`Syntax error in ${file}: ${e.message}`);
  }
});
