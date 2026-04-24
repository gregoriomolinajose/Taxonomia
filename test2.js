const nombre = "80 (Por definir)";
const k1 = String(nombre).replace(' (Por definir)', '').trim().toLowerCase();
const k2 = String(nombre).replace(/\s*\(Por definir\)/i, '').trim().toLowerCase();
console.log(`k1: '${k1}', k2: '${k2}'`);
