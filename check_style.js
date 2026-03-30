const fs = require('fs');
const content = fs.readFileSync('src/FormEngine_UI.html', 'utf8');

const regexMap = {
  styleAttr: /style="[^"]*"/g,
  jsStyle: /\.style\.[a-zA-Z]+ = ['"][^'"]+['"]/g,
  colorAttr: /color="[^"]*"/g
};

let issues = 0;
for (const [name, regex] of Object.entries(regexMap)) {
  const matches = content.match(regex);
  if (matches) {
    console.log(`\n--- ${name} (${matches.length} matches) ---`);
    const unique = [...new Set(matches)];
    for (const match of unique) {
      if (!match.includes('var(') && (match.includes('#') || match.includes('px') || match.includes('rem') || match.includes('%') || name === 'colorAttr')) {
        console.log(match);
        issues++;
      }
    }
  }
}
console.log(`\nFound ${issues} possible hardcoded elements to review.`);
