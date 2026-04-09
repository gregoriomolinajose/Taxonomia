const fs = require('fs');

const rawTxt = fs.readFileSync('log3.txt', 'utf16le');
console.log("---- ERROR DETECTED: ----");

const errorLines = rawTxt.split('\n').filter(l => l.includes('Error:') || l.includes('locator') || l.includes('waiting for') || /failed/i.test(l)).slice(0, 10);
console.log(errorLines.join('\n'));
