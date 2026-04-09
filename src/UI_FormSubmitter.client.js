/**
 * UI_FormSubmitter.html (S14.1)
 *
 * Micro-Frontend / Clase dedicada a procesar el envío de datos, 
 * sanitización de payloads, conexión asíncrona (GAS RPC) y 
 * parcheo Topológico en el Caché Local (Zero-Latency).
 */

window.UI_FormSubmitter = class UI_FormSubmitter {
    constructor(entityName, fields, submitBtn, apiService = null, modal = null) {
        this.entityName = entityName;
        this.fields = fields;
        this.submitBtn = submitBtn;
        
        // Dependency Injection for API Services
        this.apiService = apiService || window.DataAPI;
        this.modal = modal;
        
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
            const activeForm = window.currentFormDrawer || document.getElementById('app-container');
            const freshInputs = activeForm.querySelectorAll('ion-input, ion-textarea, ion-select, input[type="hidden"]');
            const payload = {};
            
            freshInputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name && !input.closest('[data-dynamic-list]')) {
                    let val = input.value;
                    const schemaField = this.fields ? this.fields.find(f => f.name === name) : null;
                    
                    if (input.dataset.parser === 'json_array') {
                        try {
                            let parsed = JSON.parse(val);
                            payload[name] = Array.isArray(parsed) ? parsed.filter(i => Boolean(i) && String(i).trim() !== "") : [];
                        } catch(e) { payload[name] = []; }
                    } else if (schemaField) {
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

            // Dynamic Lists
            const dynamicLists = activeForm.querySelectorAll('[data-dynamic-list]');
            dynamicLists.forEach(list => {
                const fieldName = list.getAttribute('data-dynamic-list');
                const rows = list.querySelectorAll('.dynamic-list-row');
                const jsonArray = [];
                
                rows.forEach(row => {
                    const rowData = {};
                    const rowInputs = row.querySelectorAll('ion-input, ion-select');
                    rowInputs.forEach(inp => {
                        if (inp.name) rowData[inp.name] = inp.value;
                    });
                    jsonArray.push(rowData);
                });
                payload[fieldName] = JSON.stringify(jsonArray);
            });

            // Chip Containers
            const freshChipContainers = activeForm.querySelectorAll('.chip-container');
            freshChipContainers.forEach(cc => {
                const name = cc.getAttribute('data-chip-name');
                if (name) {
                    const chips = cc.querySelectorAll('ion-label');
                    const arr = [];
                    chips.forEach(l => arr.push(l.textContent));
                    payload[name] = arr.join(', ');
                }
            });

            // Nested Data
            if (window.__APP_CACHE__ && window.__APP_CACHE__.nestedData) {
                Object.keys(window.__APP_CACHE__.nestedData).forEach(key => {
                    payload[key] = window.__APP_CACHE__.nestedData[key];
                });
            }

            // Sanitización de Auditoría
            delete payload.created_at;
            delete payload.created_by;
            delete payload.updated_at;
            delete payload.updated_by;

            // Bugfix (QA Review): Do not discard currentEditId immediately, otherwise network failures 
            // turn retried Updates into unintended Creates. Cache it for this component instance.
            this._internalRetryId = window.currentEditId || this._internalRetryId;
            const action = this._internalRetryId ? 'update' : 'create';
            window.currentEditId = null; // Liberamos la variable global
            
            const safePayload = JSON.parse(JSON.stringify(payload));

            try {
                const rawResponse = await this.apiService.call('API_Universal_Router', action, this.entityName, safePayload);
                await loading.dismiss();
                const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
                
                if (response && response.status === 'success') {
                    this._patchFrontendCache(this.entityName, response, payload);
                    const itemName = (response.data && response.data.Entity) ? response.data.Entity : this.entityName;
                    this._showToast(`¡${itemName} guardado con éxito!`, 'success');
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
                await loading.dismiss();
                this._revertButtonState();
                this._showToast(`Error de Servidor: ${err.message}`, 'danger');
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
        window.currentEditId = null;
        this._internalRetryId = null; // Liberar caché de reintentos

        if (window.__APP_CACHE__) {
            if (window.__APP_CACHE__.nestedData) window.__APP_CACHE__.nestedData = {};
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
                        window.__APP_CACHE__['Sys_Graph_Edges'] = edgesObj;
                        window.__APP_CACHE__['DB_Sys_Graph_Edges'] = edgesObj;
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
        if (!window.__APP_CACHE__) return;

        // 1. Root Entity Injection
        if (window.__APP_CACHE__[entityName] && Array.isArray(window.__APP_CACHE__[entityName])) {
            let pkField = response.pk;
            let pkValue = response.pkValue;

            if (!pkField || !pkValue) {
                pkField = Object.keys(payload).find(k => k.startsWith('id_'));
                pkValue = pkField ? payload[pkField] : null;
            }

            if (!pkField || !pkValue) {
                // eslint-disable-next-line arch // Justified: Needs state access for callback routing
                const meta = (window.DataViewEngine && typeof window.DataViewEngine._getState === 'function')
                    ? window.DataViewEngine._getState().entityMeta : null;
                pkField = meta && meta.idField ? meta.idField : pkField;
                pkValue = pkField ? payload[pkField] : null;
            }

            if (pkField && pkValue) {
                let freshVersion = payload._version || 1;
                try {
                    if (response.data && response.data.adapter_results && response.data.adapter_results.sheets) {
                        if (response.data.adapter_results.sheets.version) freshVersion = response.data.adapter_results.sheets.version;
                    }
                } catch(e) {}
                
                const cleanRecord = { ...payload, [pkField]: pkValue, _version: freshVersion };
                const liveData = window.__APP_CACHE__[entityName];
                const existingIdx = liveData.findIndex(r => window.UI_FormUtils.normalizeId(r[pkField]) === window.UI_FormUtils.normalizeId(pkValue));

                window.__APP_CACHE__[entityName] = existingIdx !== -1
                    ? [...liveData.slice(0, existingIdx), cleanRecord, ...liveData.slice(existingIdx + 1)]
                    : [cleanRecord, ...liveData];
                
                console.log(`[Cache] ${existingIdx !== -1 ? 'UPDATE' : 'INSERT'} para: ${entityName} optimizado a versión ${freshVersion}.`);
            }
        }

        // 2. Inyección Dinámica para Entidades Anidadas (Subgrids 0.0s latency)
        if (response.data && response.data.orchestratedChildren) {
            const orch = response.data.orchestratedChildren;
            Object.keys(orch).forEach(childEntity => {
                if (Array.isArray(window.__APP_CACHE__[childEntity])) {
                    const freshChildren = orch[childEntity] || [];
                    const childPkField = 'id_' + childEntity.toLowerCase().replace(/s$/, '').replace(/es$/, '');
                    
                    let currentCache = [...window.__APP_CACHE__[childEntity]];
                    freshChildren.forEach(newChild => {
                        const cid = newChild[childPkField] || newChild['id_' + childEntity.toLowerCase()];
                        const idx = currentCache.findIndex(c => (c[childPkField] === cid) || (c['id_' + childEntity.toLowerCase()] === cid));
                        if (idx !== -1) {
                            currentCache = [...currentCache.slice(0, idx), newChild, ...currentCache.slice(idx + 1)];
                        } else {
                            currentCache = [newChild, ...currentCache];
                        }
                    });
                    window.__APP_CACHE__[childEntity] = currentCache;
                }
            });
        }
    }
};