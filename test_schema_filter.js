const fs = require('fs');
let sContent = fs.readFileSync('src/Schema_Engine.js', 'utf8');
const appName = 'taxonomia';
sContent += `\n(function() { 
    var APP_NAME = '${appName}'; 
    var appSchemasConfig = { 
        taxonomia: ['Taxonomia', 'Portafolio', 'Value_Stream', 'Equipo', 'Persona', 'Unidad_Negocio', '_UI_CONFIG', 'Sys_Graph_Edges', 'Sys_Cache_Signals', 'Sys_Roles', 'Sys_Permissions', 'Sys_Microservices', 'Sys_IntegrationConfig'], 
        greatpeeps: ['Empresas', 'Vacantes', 'Candidatos', 'Entrevistas', 'Persona', '_UI_CONFIG', 'Sys_Graph_Edges', 'Sys_Cache_Signals', 'Sys_Roles', 'Sys_Permissions', 'Sys_Microservices', 'Sys_IntegrationConfig'] 
    }; 
    var allowed = appSchemasConfig[APP_NAME] || appSchemasConfig['taxonomia'] || []; 
    console.log("Allowed keys:", allowed);
    if (typeof APP_SCHEMAS !== 'undefined') { 
        console.log("Keys before:", Object.keys(APP_SCHEMAS));
        for (var key in APP_SCHEMAS) { 
            if (allowed.indexOf(key) === -1) { 
                delete APP_SCHEMAS[key]; 
            } 
        } 
        console.log("Keys after:", Object.keys(APP_SCHEMAS));
    } 
})();\n`;
fs.writeFileSync('temp_Schema_Engine.js', sContent);
require('./temp_Schema_Engine.js');
