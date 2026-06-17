/**
 * UI_FormSubmitter.html (S14.1)
 *
 * Micro-Frontend / Clase dedicada a procesar el envío de datos, 
 * sanitización de payloads, conexión asíncrona (GAS RPC) y 
 * parcheo Topológico en el Caché Local (Zero-Latency).
 */

window.UI_FormSubmitter = class UI_FormSubmitter {
    constructor(entityName, fields, submitBtn, apiService = null, modal = null, localEditId = null) {
        this.entityName = entityName;
        this.fields = fields;
        this.submitBtn = submitBtn;
        
        // Dependency Injection for API Services
        this.apiService = apiService || window.DataAPI;
        this.modal = modal;
        this._internalRetryId = localEditId;
        
        this.isSaving = false;
        this._isSilent = false; // Flag para auto-guardado sin cerrar modal

        this._attachSubmitListener();
        if (this.submitBtn) this.submitBtn._formSubmitterInstance = this;
    }

    _attachSubmitListener() {
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', async () => {
                await this.executeSave({ isSilent: false });
            });
        }
    }

    async executeSave(options = {}) {
        const isSilentSave = options.isSilent || false;
        this._isSilent = isSilentSave;

        if (this.isSaving) return; // Bloqueo anti-doble envío
        this.isSaving = true;
        
        if (this.submitBtn && !isSilentSave) {
            this.submitBtn.disabled = true;
        }

        // S57.X: Guardrail: Skip save if no changes in UPDATE mode or empty CREATE
        const action = this._internalRetryId ? 'update' : 'create';
        if (!this.hasChanges()) {
            console.log("[FormSubmitter] Sin cambios detectados. Omitiendo guardado en BD.");
            this.isSaving = false;
            if (this.submitBtn && !isSilentSave) this.submitBtn.disabled = false;
            if (window.AppEventBus) {
                window.AppEventBus.publish('FORM::SUBMIT_SUCCESS', { 
                    entityName: this.entityName, 
                    response: { status: 'success', action: 'none', message: 'No changes detected.' }, 
                    isSilent: this._isSilent 
                });
            }
            return;
        }

        if (action === 'create') {
            const payloadCheck = this.extractPayload();
            let hasMeaningfulData = false;
            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(this.entityName) : 'id_registro';
            
            for (const key of Object.keys(payloadCheck)) {
                // S57.Y: Ignorar campos de sistema, llaves y campos topológicos pre-rellenados
                if (key === pkField || key === '_version' || key === '_work_context' || key.startsWith('_')) continue;
                if (['created_at', 'created_by', 'updated_at', 'updated_by', 'estado'].includes(key)) continue;
                if (key.endsWith('_padre') || key === 'nivel_tipo') continue; // Campos topológicos inyectados
                
                // Ignorar si el schema lo marca como oculto
                const schemaDef = this.fields ? this.fields.find(f => f.name === key) : null;
                if (schemaDef && (schemaDef.type === 'hidden' || schemaDef.isSystem)) continue;

                const val = payloadCheck[key];
                
                if (Array.isArray(val) && val.length > 0) {
                    hasMeaningfulData = true; break;
                }
                
                if (val !== null && val !== undefined && String(val).trim() !== '' && val !== '[]' && val !== 'null') {
                    // Si el schema tiene un default value y el usuario no lo ha cambiado, no lo consideramos "meaningful" por sí solo
                    if (schemaDef && schemaDef.defaultValue !== undefined && String(val).trim() === String(schemaDef.defaultValue).trim()) {
                        continue;
                    }
                    hasMeaningfulData = true; break;
                }
            }
            
            if (!hasMeaningfulData) {
                console.log("[FormSubmitter] Bloqueando creación de registro vacío.");
                this.isSaving = false;
                if (this.submitBtn && !isSilentSave) this.submitBtn.disabled = false;
                if (!isSilentSave) {
                    this._showToast('⚠️ No se puede guardar un registro completamente vacío.', 'warning');
                }
                return;
            }
        }

        if (this.submitBtn && !isSilentSave) {
            this.originalBtnChildren = Array.from(this.submitBtn.childNodes);
            window.DOM.clear(this.submitBtn);
            
            this.submitBtn.appendChild(window.DOM.create('ion-spinner', { name: 'crescent' }));
            this.submitBtn.appendChild(document.createTextNode(' \u00a0 Guardando...'));
        }

            // --- Removed UI Blocking (S42.7: Optimistic UI) ---
            // Sincronía background habilitada.

            // LECTURA JIT (Evita Detached Nodes)
            let payload = this.extractPayload();

            // S37.3: Identity Collision Prevention (Uniqueness Checker)
            if (window.DataStore && this.fields) {
                const liveData = window.DataStore.get(this.entityName) || [];
                
                // Extrae cualquier campo marcado oficialmente en Schema_Engine como "único"
                const uniquenessFields = this.fields.filter(f => f.unique === true);
                
                let collisionFound = false;
                
                for (const field of uniquenessFields) {
                    const valToCheck = payload[field.name];
                    if (valToCheck && String(valToCheck).trim() !== '') {
                        const hit = liveData.find(r => (r.estado !== 'Eliminado' && r.estado !== 'eliminado') && String(r[field.name]).toLowerCase() === String(valToCheck).toLowerCase());
                        if (hit) {
                            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(this.entityName) : 'id_registro';
                            const hitId = hit[pkField];
                            // Si es nuevo registro, hitId colisiona. Si es actualizacion, colisiona si es distinto registro
                            if (!this._internalRetryId || String(hitId) !== String(this._internalRetryId)) {
                                collisionFound = true;
                                this._showToast(`⚠️ Colisión Detectada: Ya existe un registro vigente con ${field.label || field.name} = ${valToCheck}.`, 'danger');
                                break;
                            }
                        }
                    }
                }
                
                if (collisionFound) {
                    this._revertButtonState();
                    return; // Abort Submit Flow
                }
            }

            // S57.5: Auto-cálculo de Nivel Jerárquico
            if (this.fields) {
                const levelFieldDef = this.fields.find(f => f.name === 'nivel_tipo');
                if (levelFieldDef && window.Math_Engine && typeof window.Math_Engine.calculateHierarchyLevel === 'function') {
                    const parentDef = this.fields.find(f => f.relationType === 'padre');
                    const mathParams = {
                        entity: this.entityName,
                        levelField: 'nivel_tipo',
                        parentField: parentDef ? parentDef.name : 'id_dominio_padre',
                        pkField: window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(this.entityName) : 'id_registro'
                    };
                    const cacheData = window.DataStore ? window.DataStore.get(this.entityName) : [];
                    
                    const mockState = { ...payload };
                    const rawParent = mockState[mathParams.parentField];
                    if (Array.isArray(rawParent) && rawParent.length > 0) {
                        mockState[mathParams.parentField] = rawParent[0].id_registro || rawParent[0].id || rawParent[0];
                    } else if (typeof rawParent === 'string' && rawParent.startsWith('[') && rawParent.endsWith(']')) {
                        try {
                            const parsed = JSON.parse(rawParent);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                mockState[mathParams.parentField] = parsed[0].id_registro || parsed[0].id || parsed[0];
                            }
                        } catch (e) {}
                    }
                    
                    payload['nivel_tipo'] = window.Math_Engine.calculateHierarchyLevel(mockState, mathParams, cacheData);
                }
            }

            // Sanitización de Auditoría
            delete payload.created_at;
            delete payload.created_by;
            delete payload.updated_at;
            delete payload.updated_by;

            // action is already declared at the top of the listener
            
            // [S50.2] Inyección Atómica de Borradores (Atomic Drafts)
            // Cuando estamos en el Wizard de Taxonomía, forzamos estado y contexto a los hijos
            const isDraftMode = this.entityName === 'Taxonomia' || (this.modal && this.modal.dataset && this.modal.dataset.isDraft === 'true') || (this.modal && this.modal.dataset && this.modal.dataset.taxonomiaContext);
            const pkFieldT = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(this.entityName) : 'id';
            const contextId = (this.modal && this.modal.dataset && this.modal.dataset.taxonomiaContext) ? this.modal.dataset.taxonomiaContext : (payload[pkFieldT] || this._internalRetryId || 'DRAFT_CTX');

            // [S53.8] Execute Schema Hooks
            const formSchema = window.APP_SCHEMAS && window.APP_SCHEMAS[this.entityName] ? window.APP_SCHEMAS[this.entityName] : null;
            if (formSchema && formSchema.hooks && typeof formSchema.hooks.preSubmit === 'function') {
                const isTempPk = this._internalRetryId && String(this._internalRetryId).startsWith('TMP_');
                payload = formSchema.hooks.preSubmit(payload, contextId, action, isTempPk, this._internalRetryId);
            }

            if (isDraftMode) {
                
                // [S50.2] Force root entity to Draft state if it's a Taxonomia
                if (this.entityName === 'Taxonomia') {
                    payload.estado = 'Borrador';
                }

                const fieldsConfig = formSchema ? (formSchema.fields || Object.keys(formSchema).map(k => ({name: k, ...formSchema[k]}))) : [];
                const relationKeys = new Set(fieldsConfig.filter(f => f.type === 'relation' || f.isTemporalGraph).map(f => f.name));

                // [S53.6] Provide explicit work context to the root payload so Engine_DB can diff correctly when children are empty
                payload._work_context = contextId;

                Object.keys(payload).forEach(key => {
                    if (Array.isArray(payload[key])) {
                        payload[key] = payload[key].map(child => {
                            if (typeof child === 'object') {
                                return {
                                    ...child,
                                    _estado_arista: 'Borrador',
                                    _contexto_arista: contextId
                                };
                            }
                            return {
                                id_registro: String(child),
                                _estado_arista: 'Borrador',
                                _contexto_arista: contextId
                            };
                        });
                    } else if (relationKeys.has(key) && payload[key] && typeof payload[key] === 'string') {
                        // S51.7 Fix: Ensure select_single relational strings get draft properties injected
                        payload[key] = [{
                            id_registro: String(payload[key]),
                            _estado_arista: 'Borrador',
                            _contexto_arista: contextId
                        }];
                    }
                });
            }
            
            // S30.3 QA Review: Circular Reference & DOM-Leakage Guard
            const getCircularReplacer = () => {
                const seen = new WeakSet();
                return (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) return undefined; // Drop cycles
                        seen.add(value);
                    }
                    return value;
                };
            };
            const safePayload = JSON.parse(JSON.stringify(payload, getCircularReplacer()));

            // ==========================================
            // S42.7: OPTIMISTIC DATA CLONING & JIT PATCH
            // ==========================================
            const liveStore = (window.DataStore && this.entityName) ? window.DataStore.get(this.entityName) : null;
            const stateBackup = liveStore ? JSON.parse(JSON.stringify(liveStore)) : [];
            const childBackups = {};
            
            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(this.entityName) : 'id_registro';
            let optimisticPK = payload[pkField] || this._internalRetryId;
            let isTempPK = false;
            
            if (!optimisticPK) {
                 if (payload[pkField]) {
                     optimisticPK = payload[pkField];
                 } else {
                     optimisticPK = 'TMP_LOCAL_' + Math.random().toString(36).substring(2, 10).toUpperCase();
                     payload[pkField] = optimisticPK;
                     isTempPK = true;
                 }
            }
            
            // formSchema was already declared at line 131
            const fieldsConfig = formSchema ? (formSchema.fields || Object.keys(formSchema).map(k => ({name: k, ...formSchema[k]}))) : [];
            const temporalFields = fieldsConfig.filter(f => f.isTemporalGraph).reduce((acc, f) => { acc[f.name] = f; return acc; }, {});

            // Extrapolar submisiones de subgrids para el repintado predictivo.
            const optimisticChildren = {};
            const _sessionId = optimisticPK; // Session tagging para aislar asincronía concurrente
            
            for (const key of Object.keys(payload)) {
                 if (Array.isArray(payload[key])) {
                      const tField = temporalFields[key];
                      if (tField) {
                          if (!optimisticChildren['Sys_Graph_Edges']) optimisticChildren['Sys_Graph_Edges'] = [];
                          
                          const edgeName = (tField.graphEdgeType || tField.name).toUpperCase();
                          const edges = (window.DataStore ? window.DataStore.get('Sys_Graph_Edges') : []) || [];
                          
                          // 1. Identify previous edges for this node/context to close them optimistically
                          let oldEdges = [];
                          if (tField.workspaceMode) {
                              const effParent = tField.dynamicParentField ? (payload[tField.dynamicParentField] || tField.fixedParentId) : tField.fixedParentId;
                              oldEdges = edges.filter(e => String(e.es_version_actual).toLowerCase() === 'true' && String(e.id_nodo_padre).trim() === String(effParent).trim() && e.tipo_relacion === edgeName && String(e.contexto_id).trim() === String(contextId || '').trim());
                          } else if (tField.relationType === 'padre') {
                              oldEdges = edges.filter(e => String(e.es_version_actual).toLowerCase() === 'true' && String(e.id_nodo_hijo).trim() === String(optimisticPK).trim() && e.tipo_relacion === edgeName);
                          } else {
                              oldEdges = edges.filter(e => String(e.es_version_actual).toLowerCase() === 'true' && String(e.id_nodo_padre).trim() === String(optimisticPK).trim() && e.tipo_relacion === edgeName);
                          }
                          
                          if (payload._work_context) {
                              oldEdges = oldEdges.filter(e => String(e.contexto_id).trim() === String(payload._work_context).trim());
                          } else if (contextId && contextId !== 'DRAFT_CTX' && contextId !== optimisticPK) {
                              oldEdges = oldEdges.filter(e => String(e.contexto_id).trim() === String(contextId).trim());
                          }
                          
                          const closedEdges = oldEdges.map(e => ({ ...e, es_version_actual: false, _optimistic_session: _sessionId }));
                          optimisticChildren['Sys_Graph_Edges'].push(...closedEdges);

                          // 2. Create the new edges
                          const edgeRecords = payload[key].map(child => {
                              const newId = 'TMP_EDGE_' + Math.random().toString(36).substring(2, 10).toUpperCase();
                              const childPk = child.id_registro || child[window.Schema_Utils.getPrimaryKey(tField.targetEntity)];
                              let edgePadre = tField.relationType === 'hijo' ? optimisticPK : childPk;
                              let edgeHijo = tField.relationType === 'hijo' ? childPk : optimisticPK;
                              
                              if (tField.workspaceMode) {
                                  edgePadre = tField.dynamicParentField ? (payload[tField.dynamicParentField] || tField.fixedParentId) : tField.fixedParentId;
                                  edgeHijo = childPk;
                              }
                              
                              return {
                                  id_relacion: newId,
                                  id_nodo_padre: edgePadre,
                                  id_nodo_hijo: edgeHijo,
                                  tipo_relacion: edgeName,
                                  es_version_actual: true,
                                  estado: child._estado_arista || 'Activo',
                                  contexto_id: child._contexto_arista || '',
                                  _optimistic_session: _sessionId
                              };
                          });
                          optimisticChildren['Sys_Graph_Edges'].push(...edgeRecords);
                      } else if (window.DataStore && window.DataStore.get(key)) {
                          optimisticChildren[key] = payload[key].map(child => {
                              const childClone = { ...child, _optimistic_session: _sessionId };
                              if (isTempPK) { // Ligar Edges nuevos con el Padre Falso de ser requerido
                                  const childParentRef = 'id_' + this.entityName.toLowerCase();
                                  childClone[childParentRef] = optimisticPK;
                              }
                              // Asegurar un PK falso temporal para que DataGrid no explote
                              const childPkF = window.Schema_Utils.getPrimaryKey(key);
                              if (!childClone[childPkF]) childClone[childPkF] = 'TMP_EDGE_' + Math.random().toString(36).substring(2, 10).toUpperCase();
                              return childClone;
                          });
                          childBackups[key] = JSON.parse(JSON.stringify(window.DataStore.get(key)));
                      }
                 }
            }
            
            const fakeResponse = { status: 'success', action: action, pk: pkField, pkValue: optimisticPK, data: { orchestratedChildren: optimisticChildren } };
            
            // FASE 1: INYECCIÓN CERO-LATENCIA VISUAL Y DESTRUCCIÓN UI
            try {
                 if (window.DataStore && typeof window.DataStore.reconcileOptimisticPatch === 'function') {
                     window.DataStore.reconcileOptimisticPatch(this.entityName, fakeResponse, payload);
                 }
                 
                 let isInlineRendered = false;
                 if (this.modal) {
                     isInlineRendered = true;
                     this.modal.dispatchEvent(new CustomEvent('FormEngine::InlinePersisted', { detail: { response: fakeResponse, payload: safePayload } }));
                 }
                 this._showToast('Guardando en segundo plano...', 'medium');
                 this._performSuccessCleanup(fakeResponse, isInlineRendered); 
            } catch(opErr) {
                 console.error('Optimistic Patch Fracasó, abortando red:', opErr);
                 return this._revertButtonState();
            }

            // FASE 2: THE BACKGROUND FIRE & FORGET (Sin Bloqueo Await)
            const timeoutMs = 25000; // Incrementado a 25s por el colchón background
            const _timeoutSafe = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), timeoutMs));
            
            Promise.race([
                this.apiService.call('API_Universal_Router', action, this.entityName, safePayload),
                _timeoutSafe
            ]).then(rawResponse => {
                const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
                
                if (response && response.status === 'success') {
                    // 1. Consolidación Quirúrgica del Caché Optimista
                    if (window.DataStore) {
                        for (const key of Object.keys(optimisticChildren)) {
                             let liveCache = window.DataStore.get(key) || [];
                             liveCache.forEach(row => {
                                 if (row._optimistic_session === _sessionId) {
                                     delete row._optimistic_session;
                                     if (isTempPK && response.pkValue && String(response.pkValue) !== String(optimisticPK)) {
                                         if (row.id_nodo_padre === optimisticPK) row.id_nodo_padre = response.pkValue;
                                         if (row.id_nodo_hijo === optimisticPK) row.id_nodo_hijo = response.pkValue;
                                     }
                                 }
                             });
                             window.DataStore.set(key, liveCache);
                        }
                    }

                    // 2. Inyección de la Verdad Absoluta (Backend Hydration)
                    if (window.DataStore && typeof window.DataStore.reconcileOptimisticPatch === 'function') {
                        window.DataStore.reconcileOptimisticPatch(this.entityName, response, payload);
                    }

                    // 3. Reconciliación: Intercambio de Llaves y Versiones
                    if (isTempPK && response.pkValue && String(response.pkValue) !== String(optimisticPK)) {
                        this._reconcileTemporaryId(this.entityName, optimisticPK, response.pkValue, response.lexical_id);
                        this._internalRetryId = response.pkValue;
                    }
                    if (response.data && response.data.adapter_results && response.data.adapter_results.sheets) {
                        const newVer = response.data.adapter_results.sheets.version;
                        if (newVer) this._reconcileVersion(this.entityName, response.pkValue || optimisticPK, newVer);
                    }
                    
                    // S55.6: Actualización JIT del DOM para autoguardados secuenciales (evita OCC)
                    if (this._isSilent) {
                        const activeForm = this.modal || document.getElementById('app-container');
                        if (activeForm) {
                            if (response.data && response.data.adapter_results && response.data.adapter_results.sheets) {
                                const newVer = response.data.adapter_results.sheets.version;
                                if (newVer) {
                                    const verInput = activeForm.querySelector('input[name="_version"]');
                                    if (verInput) verInput.value = newVer;
                                }
                            }
                            if (response.pkValue) {
                                const pkF = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(this.entityName) : 'id';
                                const idInput = activeForm.querySelector(`input[name="${pkF}"]`);
                                if (idInput) idInput.value = response.pkValue;
                                // Asegurar que el siguiente paso se envíe como 'update'
                                this._internalRetryId = response.pkValue; 
                            }
                        }
                    }
                    if (response.action === 'updated') {
                        this._showToast(`Registro actualizado silenciosamente.`, 'success');
                    } else {
                        const itemName = (response.data && response.data.Entity) ? response.data.Entity : this.entityName;
                        const cleanItemName = itemName.replace(/_/g, ' ');
                        this._showToast(`¡${cleanItemName} guardado en nube!`, 'success');
                    }

                    // [S45.2] We no longer blindly invalidate Cargo and Sys_Graph_Edges on UI save
                    // because Engine_DB.upsert handles graph edges and UI_FormSubmitter reconciles locally.
                    // This restores the 0ms instant-render performance.
                    if (this.entityName === 'Persona' && response.action !== 'updated') {
                        if (window.UI_Router) window.UI_Router.navigateTo('dataview', 'Persona');
                    }
                } else {
                    if (response && response.errorType === 'CONCURRENCY') {
                        this._handleOptimisticRollback(stateBackup, childBackups, 'Choque de concurrencia OCC en Base de datos.');
                    } else {
                        this._handleOptimisticRollback(stateBackup, childBackups, response ? response.message : 'Error desconocido de Adaptador');
                    }
                }
        }).catch(err => {
            if (err.message === 'TIMEOUT_EXCEEDED') {
                this._handleOptimisticRollback(stateBackup, childBackups, 'Red severamente saturada (>25s) u Off-line.');
            } else {
                this._handleOptimisticRollback(stateBackup, childBackups, 'Falla de conexión: ' + err.message);
            }
        });
        // Fin executeSave
    }

    // --- SUBRUTINAS DE RECONCILIACIÓN OPTIMISTA (S42.7) ---
    _reconcileTemporaryId(entityName, tmpId, realId, lexicalId) {
        if (!window.DataStore) return;
        const liveData = window.DataStore.get(entityName);
        if (!liveData) return;
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id_registro';
        let mutated = false;
        liveData.forEach(row => {
            if (String(row[pkField]) === String(tmpId)) {
                row[pkField] = realId;
                if (lexicalId) row.lexical_id = lexicalId;
                mutated = true;
            }
        });
        if (mutated) {
            window.DataStore.set(entityName, liveData);
            if (window.AppEventBus) window.AppEventBus.publish('DATA::UPDATED', { entityKey: entityName });
        }
    }

    _reconcileVersion(entityName, entityId, freshVersion) {
        if (!window.DataStore) return;
        const liveData = window.DataStore.get(entityName);
        if (!liveData) return;
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id_registro';
        let mutated = false;
        liveData.forEach(row => {
            if (String(row[pkField]) === String(entityId)) {
                row._version = freshVersion;
                row.version = freshVersion;
                mutated = true;
            }
        });
        if (mutated) window.DataStore.set(entityName, liveData);
    }

    _handleOptimisticRollback(stateBackup, childBackups, issueDesc) {
        if (window.DataStore) {
            window.DataStore.set(this.entityName, stateBackup);
            for (const key of Object.keys(childBackups || {})) {
                window.DataStore.set(key, childBackups[key]);
            }
            if (window.AppEventBus) window.AppEventBus.publish('DATA::UPDATED', { entityKey: this.entityName });
        }
        console.error("OPTIMISTIC_ROLLBACK", issueDesc);
        this._showToast(`⚠️ Rollback Automático: ${issueDesc}. Tus cambios temporales visuales fueron desechados.`, 'danger');
        if (window.AppEventBus) window.AppEventBus.publish('FORM::SUBMIT_ERROR', { entityName: this.entityName, error: issueDesc });
    }


    _revertButtonState() {
        this.isSaving = false;
        if (this.submitBtn && !this._isSilent) {
            this.submitBtn.disabled = false;
            window.DOM.clear(this.submitBtn);
            if (this.originalBtnChildren) {
                this.originalBtnChildren.forEach(node => this.submitBtn.appendChild(node));
            }
        }
    }


    _performSuccessCleanup(response, isInlineRendered) {
        this._revertButtonState();
        
        // Capture the new saved state as the initial state for subsequent transitions
        this.captureInitialState();
        
        const wasSilent = this._isSilent; // Cachear para evitar que los suscriptores muten el estado prematuramente

        if (!wasSilent) {
            this._internalRetryId = null; // Liberar caché de reintentos solo si no es silencioso
        }

        if (window.DataStore) {
            // [S29.7] window.DataStore.clearNested() extirpado. Los Subgrids ahora son stateless.
            // S42.1 (Fast-I/O Optimization): Extirpada la re-hidratación por red de Sys_Graph_Edges.
            // La entidad ya se hidrata atómicamente a través de window.DataStore.reconcileOptimisticPatch usando orchestratedChildren.
            
            // Invalida el caché intermedio de Peticiones Asincronas de Formularios
            if (window.FormEngine_Resolvers && typeof window.FormEngine_Resolvers.invalidateCache === 'function') {
                window.FormEngine_Resolvers.invalidateCache();
            }
        }
        // Cerramos el Modal si no estamos en auto-guardado silencioso
        if (window._closeTopModal && !wasSilent) {
            window._closeTopModal();
        }

        // Enrutamiento post-Guardado Inmediato
        if (!isInlineRendered && !wasSilent && (!window.DrawerStackController || window.DrawerStackController.getDepth() === 0)) {
            if (window.AppEventBus) {
                window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dataview', entityKey: this.entityName});
            } else if (window.onSaveSuccessCallback) {
                window.onSaveSuccessCallback();
            }
        }

        // S49.4 Broadcast success event for global listeners (e.g. SelfService_Home_UI modal close)
        // Publicado al final para que los subscriptores (ej. Stepper) puedan mutar _isSilent sin afectar la lógica anterior.
        if (window.AppEventBus) {
            window.AppEventBus.publish('FORM::SUBMIT_SUCCESS', { entityName: this.entityName, response: response, isSilent: wasSilent });
        }
    }

    async _showToast(msg, color) {
        const toast = document.createElement('ion-toast');
        toast.message = msg;
        toast.duration = 3000;
        toast.position = 'bottom';
        toast.color = color;
        document.body.appendChild(toast);
        await window.PresentSafe(toast);
    }

    extractPayload() {
        const activeForm = this.modal || document.getElementById('app-container');
        if (!activeForm) return {};
        const freshInputs = activeForm.querySelectorAll('ion-input, ion-textarea, ion-select, input[type="hidden"]');
        const payload = {};
        
        freshInputs.forEach(input => {
            const name = input.getAttribute('name');
            if (name && !input.closest('[data-dynamic-list]') && !name.toLowerCase().startsWith('ion-')) {
                let val = input.value;
                const schemaField = this.fields ? this.fields.find(f => f.name === name) : null;
                
                if (schemaField) {
                    if (schemaField.type === 'relation' || schemaField.uiComponent === 'select_single') {
                        let strVal = (val === null || val === undefined) ? "" : String(val).trim();
                        if (strVal.toLowerCase() === "null" || strVal.toLowerCase() === "undefined") strVal = "";
                        payload[name] = strVal;
                    } else {
                        let cleanVal = (typeof val === 'string') ? val.trim() : val;
                        if (cleanVal !== undefined && cleanVal !== null && cleanVal !== '') {
                            payload[name] = cleanVal;
                        }
                    }
                } else {
                    let cleanVal = (typeof val === 'string') ? val.trim() : val;
                    if (cleanVal !== undefined && cleanVal !== null && cleanVal !== '') {
                        payload[name] = cleanVal;
                    }
                }
            }
        });

        const nodalComponents = activeForm.querySelectorAll('[data-form-component]');
        nodalComponents.forEach(cmp => {
            const name = cmp.getAttribute('data-form-component');
            if (name && typeof cmp.getValidatedValue === 'function') {
                const val = cmp.getValidatedValue();
                if (val !== undefined) {
                    payload[name] = val;
                }
            }
        });

        return payload;
    }

    captureInitialState() {
        this._initialPayload = this.extractPayload();
    }

    hasChanges() {
        if (!this._initialPayload) return true;
        
        const currentPayload = this.extractPayload();
        const keys1 = Object.keys(this._initialPayload);
        const keys2 = Object.keys(currentPayload);
        const allKeys = new Set([...keys1, ...keys2]);
        
        for (const key of allKeys) {
            const val1 = this._initialPayload[key];
            const val2 = currentPayload[key];
            
            if (!this._areEqual(val1, val2)) {
                console.log(`[FormSubmitter] Guardado cancelado temporalmente: Cambio detectado en '${key}': '${val1}' -> '${val2}'`);
                return true;
            }
        }
        return false;
    }

    _areEqual(val1, val2) {
        if (val1 === val2) return true;
        const isEmpty1 = (val1 === null || val1 === undefined || val1 === '');
        const isEmpty2 = (val2 === null || val2 === undefined || val2 === '');
        if (isEmpty1 && isEmpty2) return true;
        if (isEmpty1 !== isEmpty2) return false;
        
        if (typeof val1 === 'object' && typeof val2 === 'object') {
            return JSON.stringify(val1) === JSON.stringify(val2);
        }
        return String(val1).trim() === String(val2).trim();
    }

};