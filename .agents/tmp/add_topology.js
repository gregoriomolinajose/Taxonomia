const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', '..', 'src', 'Schema_Engine.gs');

let s = fs.readFileSync(file, 'utf8');

const topologyBlock = `    topologyRules: {
      topologyType: "JERARQUICA_ESTRICTA",
      preventCycles: true,
      maxDepth: 6,
      allowOrphanStealing: true,
      deletionStrategy: "ORPHAN",
      siblingCollisionCheck: true,
      scd2Enabled: true
    },`;

// Unidad_Negocio — the only one missing. Insert after primaryKey line.
// The pattern: primaryKey: "id_unidad_negocio",\r\n    fields:
s = s.replace(
  /primaryKey: "id_unidad_negocio",\s*\n(\s*fields:)/,
  `primaryKey: "id_unidad_negocio",\n${topologyBlock}\n$1`
);

fs.writeFileSync(file, s);

// Verify
const count = (s.match(/JERARQUICA_ESTRICTA/g) || []).length;
console.log('Total JERARQUICA_ESTRICTA occurrences: ' + count);
