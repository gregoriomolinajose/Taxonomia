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

        this._attachSubmitListener();
    }

    _attachSubmitListener() {
        this.submitBtn.addEventListener('click', async () => {
            if (this.isSaving) return; // Bloqueo anti-doble envío
            this.isSaving = true;
            this.submitBtn.disabled = true;

            this.originalBtnChildren = Array.from(this.submitBtn.childNodes);
            window.DOM.clear(this.submitBtn);
            
            this.submitBtn.appendChild(window.DOM.create('ion-spinner', { name: 'crescent' }));
            this.submitBtn.appendChild(document.createTextNode(' \u00a0 Guardando...'));

            // --- Removed UI Blocking (S42.7: Optimistic UI) ---
            // Sincronía background habilitada.

            // LECTURA JIT (Evita Detached Nodes)
            const activeForm = this.modal || document.getElementById('app-container');
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

            // S30.11 - Protocolo de Extracción Nodal Frontend (Duck-Typing API)
            // Extrae datos de WebComponents delegando a su función getValidatedValue local.
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

            // S37.3: Identity Collision Prevention (Uniqueness Checker)
            if (window.DataStore && this.fields) {
                const liveData = window.DataStore.get(this.entityName) || [];
                
                // Extrae cualquier campo marcado oficialmente en Schema_Engine como "único" o trigger workspace
                const uniquenessFields = this.fields.filter(f => f.triggers_workspace_resolve === true || f.unique === true);
                
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

            // Sanitización de Auditoría
            delete payload.created_at;
            delete payload.created_by;
            delete payload.updated_at;
            delete payload.updated_by;

            const action = this._internalRetryId ? 'update' : 'create';
            
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
            
            if (action === 'create' && !optimisticPK) {
                 optimisticPK = 'TMP_LOCAL_' + Math.random().toString(36).substring(2, 10).toUpperCase();
                 payload[pkField] = optimisticPK;
                 isTempPK = true;
            }
            
            // Extrapolar submisiones de subgrids para el repintado predictivo.
            const optimisticChildren = {};
            const _sessionId = optimisticPK; // Session tagging para aislar asincronía concurrente
            
            for (const key of Object.keys(payload)) {
                 if (Array.isArray(payload[key]) && window.DataStore && window.DataStore.get(key)) {
                      optimisticChildren[key] = payload[key].map(child => {
                          const childClone = { ...child, _optimistic_session: _sessionId };
                          if (isTempPK) { // Ligar Edges nuevos con el Padre Falso de ser requerido
                              const childParentRef = 'id_' + this.entityName.toLowerCase();
                              childClone[childParentRef] = optimisticPK;
                          }
                          // Asegurar un PK falso temporal para que DataGrid no explote
                          const childPk = window.Schema_Utils.getPrimaryKey(key);
                          if (!childClone[childPk]) childClone[childPk] = 'TMP_EDGE_' + Math.random().toString(36).substring(2, 10).toUpperCase();
                          return childClone;
                      });
                      childBackups[key] = JSON.parse(JSON.stringify(window.DataStore.get(key)));
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
                    // 1. Purga Quirúrgica del Caché Optimista (Previene Ghost Records)
                    if (window.DataStore) {
                        for (const key of Object.keys(optimisticChildren)) {
                             let liveCache = window.DataStore.get(key) || [];
                             liveCache = liveCache.filter(row => row._optimistic_session !== _sessionId);
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
                    }
                    if (response.data && response.data.adapter_results && response.data.adapter_results.sheets) {
                        const newVer = response.data.adapter_results.sheets.version;
                        if (newVer) this._reconcileVersion(this.entityName, response.pkValue || optimisticPK, newVer);
                    }
                    if (response.action === 'updated') {
                        this._showToast(`Registro actualizado silenciosamente.`, 'success');
                    } else {
                        const itemName = (response.data && response.data.Entity) ? response.data.Entity : this.entityName;
                        this._showToast(`¡${itemName} guardado en nube!`, 'success');
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
            // Fin _attachSubmitListener
        });
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
    }


    _revertButtonState() {
        this.isSaving = false;
        this.submitBtn.disabled = false;
        window.DOM.clear(this.submitBtn);
        if (this.originalBtnChildren) {
            this.originalBtnChildren.forEach(node => this.submitBtn.appendChild(node));
        }
    }


    _performSuccessCleanup(response, isInlineRendered) {
        this._revertButtonState();
        this._internalRetryId = null; // Liberar caché de reintentos

        if (window.DataStore) {
            // [S29.7] window.DataStore.clearNested() extirpado. Los Subgrids ahora son stateless.
            // S42.1 (Fast-I/O Optimization): Extirpada la re-hidratación por red de Sys_Graph_Edges.
            // La entidad ya se hidrata atómicamente a través de window.DataStore.reconcileOptimisticPatch usando orchestratedChildren.
            
            // Invalida el caché intermedio de Peticiones Asincronas de Formularios
            if (window.FormEngine_Resolvers && typeof window.FormEngine_Resolvers.invalidateCache === 'function') {
                window.FormEngine_Resolvers.invalidateCache();
            }
        }
        // Cerramos el Modal
        if (window._closeTopModal) {
            window._closeTopModal();
        }

        // Enrutamiento post-Guardado Inmediato
        if (!isInlineRendered && (!window.ModalStackController || window.ModalStackController.getDepth() === 0)) {
            if (window.AppEventBus) {
                window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dataview', entityKey: this.entityName});
            } else if (window.onSaveSuccessCallback) {
                window.onSaveSuccessCallback();
            }
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


};