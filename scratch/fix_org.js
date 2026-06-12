const fs = require('fs');
let code = fs.readFileSync('src/UI_View_Organigrama.client.js', 'utf8');

const target = `                // Verificar campo de rol (ej. gerente_dominio_id)
                const rawVal = entityObj[rule.roleField];
                // Puede ser un array o un solo id
                const roleIds = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : []);`;

const replacement = `                // Verificar campo de rol (ej. gerente_dominio_id)
                let rawVal = entityObj[rule.roleField];
                
                // Si el valor no vino hidratado directamente, búscalo en el grafo
                if ((!rawVal || (Array.isArray(rawVal) && rawVal.length === 0)) && window.Schema_Engine && window.Schema_Engine.APP_SCHEMAS) {
                    const schema = window.Schema_Engine.APP_SCHEMAS[rule.entity];
                    if (schema) {
                        const fieldDef = schema.fields.find(f => f.name === rule.roleField);
                        if (fieldDef && fieldDef.graphEdgeType) {
                            const pkField = schema.primaryKey;
                            const entityId = entityObj[pkField];
                            if (entityId) {
                                if (fieldDef.relationType === 'hijo') {
                                    rawVal = edges.filter(e => String(e.id_nodo_padre) === String(entityId) && e.tipo_relacion === fieldDef.graphEdgeType && String(e.es_version_actual).toLowerCase() === 'true').map(e => e.id_nodo_hijo);
                                } else if (fieldDef.relationType === 'padre') {
                                    rawVal = edges.filter(e => String(e.id_nodo_hijo) === String(entityId) && e.tipo_relacion === fieldDef.graphEdgeType && String(e.es_version_actual).toLowerCase() === 'true').map(e => e.id_nodo_padre);
                                }
                            }
                        }
                    }
                }

                // Puede ser un array o un solo id
                const roleIds = Array.isArray(rawVal) ? rawVal : (rawVal ? [rawVal] : []);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/UI_View_Organigrama.client.js', code);
