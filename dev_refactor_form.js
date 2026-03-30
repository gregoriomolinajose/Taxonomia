const fs = require('fs');
const targetPath = 'src/FormEngine_UI.html';
let content = fs.readFileSync(targetPath, 'utf8');

const replacements = [
  { find: /style="font-size:32px"/g, replace: 'style="font-size:var(--sys-font-display)"' },
  { find: /\.style\.marginBottom\s*=\s*['"]20px['"]/g, replace: ".style.marginBottom = 'var(--spacing-5)'" },
  { find: /\.style\.marginTop\s*=\s*['"]20px['"]/g, replace: ".style.marginTop = 'var(--spacing-5)'" },
  { find: /\.style\.letterSpacing\s*=\s*['"]1px['"]/g, replace: ".style.letterSpacing = '0.05em'" },
  { find: /\.style\.borderRadius\s*=\s*['"]8px['"]/g, replace: ".style.borderRadius = 'var(--rounded-sm)'" },
  { find: /\.style\.margin\s*=\s*['"]4px 12px['"]/g, replace: ".style.margin = 'var(--spacing-1) var(--spacing-3)'" },
  { find: /\.style\.marginBottom\s*=\s*['"]10px['"]/g, replace: ".style.marginBottom = 'var(--spacing-2)'" },
  { find: /\.style\.marginTop\s*=\s*['"]10px['"]/g, replace: ".style.marginTop = 'var(--spacing-2)'" },
  { find: /\.style\.marginBottom\s*=\s*['"]12px['"]/g, replace: ".style.marginBottom = 'var(--spacing-3)'" },
  { find: /\.style\.padding\s*=\s*['"]0['"]/g, replace: ".style.padding = 'var(--spacing-0)'" },
  { find: /\.style\.padding\s*=\s*['"]0px['"]/g, replace: ".style.padding = 'var(--spacing-0)'" },
  { find: /\.style\.marginBottom\s*=\s*['"]8px['"]/g, replace: ".style.marginBottom = 'var(--spacing-2)'" },
  { find: /\.style\.paddingLeft\s*=\s*['"]5px['"]/g, replace: ".style.paddingLeft = 'var(--spacing-1)'" },
  { find: /\.style\.marginBottom\s*=\s*['"]4px['"]/g, replace: ".style.marginBottom = 'var(--spacing-1)'" },
  { find: /\.style\.padding\s*=\s*['"]10px 15px['"]/g, replace: ".style.padding = 'var(--spacing-2) var(--spacing-4)'" },
  { find: /\.style\.padding\s*=\s*['"]20px['"]/g, replace: ".style.padding = 'var(--spacing-5)'" },
  { find: /\.style\.padding\s*=\s*['"]16px['"]/g, replace: ".style.padding = 'var(--spacing-4)'" },
  { find: /\.style\.fontSize\s*=\s*['"]0\.75rem['"]/g, replace: ".style.fontSize = 'var(--sys-font-small)'" },
  { find: /cardContent\.style\.padding\s*=\s*['"]var\(--spacing-6\)['"]/g, replace: "cardContent.style.padding = 'var(--spacing-6)'" } // just for checking
];

let replaced = 0;
for (const r of replacements) {
  const matches = content.match(r.find);
  if (matches) {
    content = content.replace(r.find, r.replace);
    replaced += matches.length;
  }
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log(`Replaced ${replaced} inline styles with CSS Token mappings in FormEngine.`);
