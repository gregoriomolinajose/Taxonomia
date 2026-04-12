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

            // --- UI Blocking (Zero-Latency Rule) ---
            const loading = window.DOM.create('ion-loading', {
                backdropDismiss: false,
                message: 'Guardando registro...',
                spinner: 'crescent'
            });
            document.body.appendChild(loading);
            await window.PresentSafe(loading);

            // LECTURA JIT (Evita Detached Nodes)
            const activeForm = this.modal || document.getElementById('app-container');
            const freshInputs = activeForm.querySelectorAll('ion-input, ion-textarea, ion-select, input[type="hidden"]');
            const payload = {};
            
            freshInputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name && !input.closest('[data-dynamic-list]')) {
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

            // [S29.7] Nested Data se recolecta ahora automáticamente a través del hidden_input inyectado por SubgridBuilder.

            // Sanitización de Auditoría
            delete payload.created_at;
            delete payload.created_by;
            delete payload.updated_at;
            delete payload.updated_by;

            // Bugfix (QA Review & S30.6): Usamos closure pura per-modal guardada en this._internalRetryId
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

            try {
                // S30.12 - Timeboxed Network Wrapper (20s Threshold) UX Resilience
                const timeoutMs = 20000;
                const _timeoutSafe = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), timeoutMs)
                );
                
                const rawResponse = await Promise.race([
                    this.apiService.call('API_Universal_Router', action, this.entityName, safePayload),
                    _timeoutSafe
                ]);
                
                const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
                
                if (response && response.status === 'success') {
                    this._patchFrontendCache(this.entityName, response, payload);
                    const itemName = (response.data && response.data.Entity) ? response.data.Entity : this.entityName;
                    this._showToast(`¡${itemName} guardado con éxito!`, 'success');
                    if (activeForm) {
                        // El estado ahora pertenece localmente a cada componente (S30.11 Nodal Architecture).
                        // Si requieren limpieza post-guardado, responderán a AppEventBus u otro ciclo de vida.
                    }
                    
                    // Disparo de Evento Nativo de Persistencia Inline (H6/H2 Simplification)
                    let isInlineRendered = false;
                    if (this.modal) {
                        isInlineRendered = true;
                        this.modal.dispatchEvent(new CustomEvent('FormEngine::InlinePersisted', {
                            detail: { response: response, payload: safePayload }
                        }));
                    }
                    
                    this._performSuccessCleanup(response, isInlineRendered);
                } else {
                    if (response && response.errorType === 'CONCURRENCY') {
                        this._showToast('⚠️ Colisión: Los datos fueron modificados por otro usuario mientras los editabas. Por favor extrae la información fresca.', 'danger');
                    } else {
                        this._showToast(`Error: ${response ? response.message : 'Error desconocido'}`, 'danger');
                    }
                    this._revertButtonState();
                }
            } catch (err) {
                this._revertButtonState();
                if (err.message === 'TIMEOUT_EXCEEDED') {
                    this._showToast('⏳ Saturación de Red Temporal: Evitamos el bloqueo visual. Por favor intenta guardar nuevamente.', 'warning');
                } else {
                    this._showToast(`Error de Servidor: ${err.message}`, 'danger');
                }
            } finally {
                // S30.12 - Garantía Blindaje de UX Cleanup
                if (loading && typeof loading.dismiss === 'function') {
                    await loading.dismiss().catch(e => console.warn('[UI_FormSubmitter] Tolerancia mitigada de Backdrop Fantasma:', e));
                }
            }
        });
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
            // Re-hidratación Asíncrona del Grafo O(1): Evitamos destruir el caché base y en su lugar
            // pedimos al backend los nuevos edges silenciosamente para no bloquear la Interfaz UI.
            if (this.apiService && typeof this.apiService.call === 'function') {
                this.apiService.call('getInitialPayload', 'Sys_Graph_Edges').then(payload => {
                    const res = typeof payload === 'string' ? JSON.parse(payload) : payload;
                    if (res && res.data && res.data.rows && res.data.headers) {
                        const headers = res.data.headers;
                        const edgesObj = res.data.rows.map(tuple => {
                            const obj = {};
                            headers.forEach((h, i) => obj[h] = tuple[i]);
                            return obj;
                        });
                        window.DataStore.set('Sys_Graph_Edges', edgesObj);
                        window.DataStore.set('DB_Sys_Graph_Edges', edgesObj);
                        console.log('[Cache] Sys_Graph_Edges re-hidratado silenciosamente tras guardado.');
                        
                        if (window.AppEventBus) {
                            window.AppEventBus.publish('CACHE::GRAPH_HYDRATED', { entityKey: this.entityName });
                        }
                    }
                }).catch(err => console.warn('[Cache] Falla al re-hidratar aristas en 2do plano:', err));
            }
            
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

    _patchFrontendCache(entityName, response, payload) {
        if (!window.DataStore) return;

        // 1. Root Entity Injection
        if (window.DataStore.get(entityName) && Array.isArray(window.DataStore.get(entityName))) {
            let pkField = response.pk;
            let pkValue = response.pkValue;

            if (!pkField || !pkValue) {
                pkField = Object.keys(payload).find(k => k.startsWith('id_'));
                pkValue = pkField ? payload[pkField] : null;
            }

            if (!pkField || !pkValue) {
                pkField = window.UI_FormUtils.getPrimaryKey(this.entityName);
                pkValue = pkField ? payload[pkField] : null;
            }

            if (pkField && pkValue) {
                let freshVersion = payload._version || 1;
                let freshLexical = payload.lexical_id;
                try {
                    if (response.lexical_id) freshLexical = response.lexical_id;
                    if (response.data && response.data.adapter_results && response.data.adapter_results.sheets) {
                        if (response.data.adapter_results.sheets.version) freshVersion = response.data.adapter_results.sheets.version;
                        if (response.data.adapter_results.sheets.lexical_id) freshLexical = response.data.adapter_results.sheets.lexical_id;
                    }
                } catch(e) {}
                
                const cleanRecord = { ...payload, [pkField]: pkValue, _version: freshVersion };
                if (freshLexical) cleanRecord.lexical_id = freshLexical;
                const liveData = window.DataStore.get(entityName);
                const existingIdx = liveData.findIndex(r => window.UI_FormUtils.normalizeId(r[pkField]) === window.UI_FormUtils.normalizeId(pkValue));

                window.DataStore.set(entityName, existingIdx !== -1
                    ? [...liveData.slice(0, existingIdx), cleanRecord, ...liveData.slice(existingIdx + 1)]
                    : [cleanRecord, ...liveData]);
                
                console.log(`[Cache] ${existingIdx !== -1 ? 'UPDATE' : 'INSERT'} para: ${entityName} optimizado a versión ${freshVersion}.`);
            }
        }

        // 2. Inyección Dinámica para Entidades Anidadas (Subgrids 0.0s latency)
        if (response.data && response.data.orchestratedChildren) {
            const orch = response.data.orchestratedChildren;
            Object.keys(orch).forEach(childEntity => {
                if (window.DataStore && Array.isArray(window.DataStore.get(childEntity))) {
                    const freshChildren = orch[childEntity] || [];
                    const childPkField = 'id_' + childEntity.toLowerCase().replace(/s$/, '').replace(/es$/, '');
                    
                    let currentCache = [...window.DataStore.get(childEntity)];
                    freshChildren.forEach(newChild => {
                        const cid = newChild[childPkField] || newChild['id_' + childEntity.toLowerCase()];
                        const idx = currentCache.findIndex(c => (c[childPkField] === cid) || (c['id_' + childEntity.toLowerCase()] === cid));
                        if (idx !== -1) {
                            currentCache = [...currentCache.slice(0, idx), newChild, ...currentCache.slice(idx + 1)];
                        } else {
                            currentCache = [newChild, ...currentCache];
                        }
                    });
                    window.DataStore.set(childEntity, currentCache);
                }
            });
        }
        
        // Notificar globalmente mutación de entidad (Ej. DataGrid Re-render)
        if (window.AppEventBus) {
            window.AppEventBus.publish('DATA::UPDATED', { entityKey: entityName });
        }
    }
};