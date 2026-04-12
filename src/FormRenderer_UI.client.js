/**
     * FormEngine_UI.html
     *
     * Client-side logic for dynamic UI generation.
     * Mobile-First: Strictly generates Ionic Web Components (<ion-*>).
     * Rule 5.1: Progressive Disclosure (Wizards).
     * Rule 5.2: Responsive Native Grids.
     */
 
    (function (global) {
        
        /* ─────────────────────────────────────────────────────────────────
           NOTA ARQUITECTURA (S14.1):
           Las utilidades globales de este módulo fueron extraídas a:
           - UI_FormUtils.html (normalizeId, resolutores de diccionarios puros)
           - UI_FormSubmitter.html (_patchFrontendCache)
           ─────────────────────────────────────────────────────────────── */

        // [S10.1] Architecture Purification: UI_Factory Namespace
        // Toda la lógica DOM fue abstraída a src/FormBuilder_Inputs.html (S12.1)
        window.UI_Factory = window.UI_Factory || {};

        if (typeof module !== 'undefined' && module.exports) {
            module.exports = {};
        }

        // [S11.2] Modal Stack Controller moved to UI_ModalManager.html
        // Backward compatibility (T7)
        global._closeTopModal = function() {
            if (global.AppEventBus) {
                global.AppEventBus.publish('MODAL::CLOSE_REQUEST');
            } else if (global.ModalStackController) {
                global.ModalStackController.closeTop();
            }
        };


        global.renderForm = async function (entityName, data = null, injectedCallback = null, config = {}) {
            // S11.3: EventBus de Alcance Léxico Local (Lifecycle atado a Instancia UI para GC automático)
            const LocalEventBus = {
                listeners: {},
                subscribe: function(event, callback) {
                    if (!this.listeners[event]) this.listeners[event] = [];
                    this.listeners[event].push(callback);
                },
                publish: function(event, detail) {
                    if (!this.listeners[event]) return;
                    this.listeners[event].forEach(cb => {
                        try { cb({detail: detail}); } 
                        catch (e) { console.error(`[LocalEventBus] Error in subscriber for ${event}:`, e); }
                    });
                }
            };

            // S14.3: Topological PubSub Inversion (Listening to child intents)
            LocalEventBus.subscribe('UI::REQUEST_SUBFORM_OPEN', (ev) => {
                const { targetEntity, initialData, onSuccess } = ev.detail;
                if (typeof global.renderForm === 'function') {
                    // [S29.8] Propagar el payload inicial si existe (ej. Auto-vinculado)
                    global.renderForm(targetEntity, initialData || null, onSuccess);
                }
            });

            // Asegurar reset de estado al abrir formulario nuevo
            if (global.ModalStackController && global.ModalStackController.getDepth() === 0) {
                window._lastSection = null; // Reset de secciones UI
            }
            
            // S30.6 Resolutor de Contexto Local (Adiós global.currentEditId)
            let localEditId = null;
            if (data) {
                const targetPkField = window.UI_FormUtils.getPrimaryKey(entityName);
                localEditId = data[targetPkField] || data['id_registro'] || null;
            }
            // Construcción del Drawer de la Vista de Formularios (S25.2 Architecture)
            const modal = document.createElement('div');
            if (!global.DrawerStackController.push(modal)) {
                return false; // Abort topological creation (Max Depth Guard triggered)
            }
            
            // Inyectar callback opcional (In-line Creation via Bubble Events)
            if (injectedCallback) {
                modal.addEventListener('FormEngine::InlinePersisted', (e) => {
                    injectedCallback(e.detail.response, e.detail.payload);
                }, { once: true });
            }

            // Header Custom del DrawerS25.2
            const header = document.createElement('div');
            header.className = 'drawer-header';
            
            const title = document.createElement('h2');
            title.className = 'drawer-title';
            title.textContent = `Taxonomia: ${window.formatEntityName(entityName)}`;
            
            const closeBtn = document.createElement('ion-button');
            closeBtn.setAttribute('fill', 'clear');
            closeBtn.setAttribute('color', 'medium');
            closeBtn.className = 'btn-close-drawer';
            closeBtn.innerHTML = '<ion-icon slot="icon-only" name="close-outline"></ion-icon>';
            closeBtn.addEventListener('click', () => {
                if(window.AppEventBus) { window.AppEventBus.publish('MODAL::CLOSE_REQUEST'); } 
                else if(window._closeTopModal) { window._closeTopModal(); }
            });
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            modal.appendChild(header);

            // Contenedor interno scrollable del Drawer con soporte nativo para móvil
            const container = document.createElement('ion-content');
            container.className = 'drawer-content ion-padding';
            modal.appendChild(container);

            const schemas = global.APP_SCHEMAS;
            if (!schemas || !schemas[entityName]) {
                throw new Error("Schema not found for entity: " + entityName);
            }

            const schemaDef = schemas[entityName];
            // Normalize schema definition (flat array vs object containing steps)
            let fields = [];
            let steps = schemaDef.steps || null;

            if (Array.isArray(schemaDef)) {
                fields = schemaDef;
            } else if (schemaDef.fields) {
                fields = schemaDef.fields;
            } else {
                // Default to Portfolio Canvas layout
                fields = Object.keys(schemaDef).map(k => ({ name: k, ...schemaDef[k] }));

                if (!steps) {
                    const extractedGroups = [...new Set(fields.map(f => f.group).filter(Boolean))];
                    if (extractedGroups.length > 0) steps = extractedGroups;
                }

                // Map 'group' to 'step' for backward UI layout compatibility
                fields.forEach(f => {
                    if (f.group && !f.step) f.step = f.group;
                });
            }

            // --- MATH ENGINES (Delegado a Math_Engine.js universal) ---
            global.getGenericOrdenPath = function(formStateObj, params) {
                const cache = (window.DataStore && window.DataStore.get(params.entity)) ? window.DataStore.get(params.entity) : [];
                return window.Math_Engine ? window.Math_Engine.buildOrdenPath(formStateObj, params, cache) : '';
            };

            global.getGenericPathName = function(formStateObj, params) {
                const cache = (window.DataStore && window.DataStore.get(params.entity)) ? window.DataStore.get(params.entity) : [];
                return window.Math_Engine ? window.Math_Engine.buildPathName(formStateObj, params, cache) : '';
            };

            // --- DEPENDENCY RESOLVER: Abstracted to FormEngine_Resolvers ---
            if (window.FormEngine_Resolvers) {
                // S25.3: Pure UX Master-Detail (Non-Blocking Hydration)
                // Lanza la hidratación en background sin trabar la UI.
                window.FormEngine_Resolvers.hydrateLookupSources(fields).catch(e => console.warn(e));
            } else {
                console.warn("[FormEngine] ALERTA: FormEngine_Resolvers no está cargado.");
            }



            // --- REFERENCIAS AL MAIN SHELL ELIMINADAS (UX Master-Detail Puro) ---
            // El Drawer ahora flota a la derecha de forma independiente. No manipulamos
            // ni el sidebar principal ni el header central para no romper la navegación.

            // Reparación Crítica: Instanciar variable solicitada por el Stepper
            const sidebarList = document.getElementById('sidebarList');
            const sidebarSteps = document.getElementById('form-steps-container');

            // Validación de seguridad (Rule 5.3: Fault Tolerance)
            if (!sidebarList) {
                console.error("[FormEngine] No se encontró el contenedor #sidebarList en el DOM.");
                return;
            }
            
            // S21.1: Optimistic Locking Hidden Metadata
            const versionInput = document.createElement('input');
            versionInput.type = 'hidden';
            versionInput.name = '_version';
            versionInput.value = (data && data._version) ? data._version : 1;
            container.appendChild(versionInput);

            // Hybrid Layout (Linear Vertical vs Progressive Wizard)
            const extractedSections = [...new Set(fields.filter(f => f.section && f.section.trim() !== '').map(f => f.section))];
            if (extractedSections.length > 0) steps = extractedSections;
            if (!steps || steps.length === 0) steps = ['Configuración General'];

            let useStepper = steps.length > 1;

            // Soporte para prescindir del wizard manualmente y convivir puramente con divisores topológicos:
            const entitySchema = global.APP_SCHEMAS[entityName];
            if (entitySchema && entitySchema.metadata && entitySchema.metadata.uiBehavior === 'linear') {
                useStepper = false; // Fuerza el scroll vertical único (las secciones ahora actúan de divisores visuales)
            }

            let rows = {};

            if (useStepper) {
                // S14.1 Arquitectura de FormStepper (Wizard)
                if (!window.UI_FormStepper) {
                    console.error("[FormEngine] ALERTA: UI_FormStepper no está cargado.");
                    return;
                }

                container._btnPrev = document.createElement('ion-button');
                container._btnPrev.fill = 'clear';
                container._btnPrev.color = 'medium';
                container._btnPrev.appendChild(document.createTextNode('Atrás'));

                container._btnNext = document.createElement('ion-button');
                container._btnNext.appendChild(document.createTextNode('Siguiente'));
                
                // Inicializamos el stepper, reasignaremos submitBtn después
                container._stepperRef = new window.UI_FormStepper({
                    steps: steps,
                    cardContent: container,
                    sidebarSteps: sidebarSteps,
                    btnPrev: container._btnPrev,
                    btnNext: container._btnNext,
                    btnSubmit: submitBtn, // Referencia temporal, lo ajustamos en el Sticky Footer
                    progressLabel: null 
                });
                
                rows = container._stepperRef.getRows();
            } else {
                // LINEAR LAYOUT (1 section or none)
                const mainGrid = document.createElement('ion-grid');
                container.appendChild(mainGrid);

                steps.forEach(stepName => {
                    const stepRow = document.createElement('ion-row');
                    
                    // Evaluar la topología del Schema (Inyección manual del Auto-Divider en Linear)
                    const exactDivider = fields.find(f => f.section === stepName && f.type === 'divider' && f.label === stepName);
                    
                    if (!exactDivider) {
                        const dividerCol = document.createElement('ion-col');
                        dividerCol.setAttribute('size', '12');
                        dividerCol.appendChild(global.UI_Factory.buildDivider({ label: stepName === 'Configuración General' ? '' : stepName }));
                        stepRow.appendChild(dividerCol);
                    }

                    rows[stepName] = stepRow;
                    mainGrid.appendChild(stepRow);
                });
            }

            // Generación Segura de Componentes con Theming Activo
            fields.forEach(field => {
                // Soporte nativo y rápido para campos ocultos fuera del Grid UI
                if (field.type === 'hidden') {
                    const hiddenInput = document.createElement('input');
                    hiddenInput.setAttribute('type', 'hidden');
                    hiddenInput.setAttribute('name', field.name);
                    
                    if (field.primaryKey) {
                        const prefix = entityName.substring(0, 4).toUpperCase();
                        const sufix = Math.random().toString(36).substring(2, 7).toUpperCase();
                        hiddenInput.value = `${prefix}-${sufix}`;
                    } else if (field.defaultValue !== undefined) {
                        hiddenInput.value = field.defaultValue;
                    }

                    container.appendChild(hiddenInput); // Global persistency
                    return; // Skip drawing UI columns
                }

                // REGLA DE EXCLUSIÓN: Campos 'relation' sin uiComponent son manejados por el Subgrid component.
                if ((field.type === 'relation' && !field.uiComponent) || field.type === 'subgrid') {
                    return; // Skip — renderSubgrid() lo maneja en su propio flujo
                }

                // 3. Distribución de Campos JIT por Sección
                if (!field.section || !field.width) {
                    console.warn(`[FormEngine] ALERTA: La entidad ${entityName} se está renderizando con valores por defecto. Falta 'section' o 'width' en el campo '${field.name}'. Actualice al Blueprint V3.`);
                    field.section = field.section || "Datos Generales";
                    field.width = field.width || 12;
                }
                const targetRowName = field.section || steps[0];
                let targetRow = rows[targetRowName] || rows[Object.keys(rows)[0]];

                // Generar Columna Ionic Responsive
                const ionCol = document.createElement('ion-col');
                ionCol.setAttribute('size', '12'); // Mobile: ancho completo
                if (field.width) {
                    ionCol.setAttribute('size-md', String(field.width)); // Desktop: respeta el width en grid 12-columnas
                } else {
                    ionCol.setAttribute('size-md', '12'); // Desktop: ancho completo por defecto
                }

                // Usamos ion-input nativo pero configurando su "fill" y "label-placement"
                // para emular el Figma (label arriba transparente, caja contorno)
                const inputEl = global.UI_Factory.buildFieldNode(field, entityName, data, LocalEventBus, localEditId);

                ionCol.appendChild(inputEl);
                targetRow.appendChild(ionCol);
            });

            // Habilitar el renderizado del componente 'relation' (Subgrids M:N Delegados a Factoria Externa)
            for (const field of fields) {
                // Solo renderizar el Subgrid si NO tiene un uiComponent propio
                if (field.type === 'relation' && field.uiBehavior === 'subgrid' && !field.uiComponent) {
                    const targetSection = field.section || field.step || (steps && steps[0]);
                    let targetRow = rows[targetSection] || rows[Object.keys(rows)[0]];
                    const subCol = document.createElement('ion-col');
                    subCol.setAttribute('size', '12');
                    
                    // S13.1 Delegación Arquitectónica Pura SRP
                    // S14.3 Topological PubSub Dependency Injection
                    // S30.6 Injection of parentEditId directly avoiding singletons 
                    await window.UI_SubgridBuilder.build(field, subCol, data, entityName, LocalEventBus, modal, {
                        ...config, 
                        parentEditId: localEditId
                    });
                    
                    targetRow.appendChild(subCol);
                }
            }

            // Footer Fijo Lateral Derecho para Action Buttons
            const footerContainer = document.createElement('div');
            footerContainer.className = 'drawer-footer';
            
            const btnGrid = document.createElement('ion-grid');
            btnGrid.style.padding = 'var(--spacing-1) var(--spacing-2)';
            const btnRow = document.createElement('ion-row');
            
            // Recrear solo el botón Submit Principal
            const submitBtn = document.createElement('ion-button');
            submitBtn.setAttribute('shape', 'round');
            submitBtn.setAttribute('color', 'primary');
            submitBtn.style.cssText += ' font-family: var(--sys-font-family, inherit) !important;';
            const iconSave = document.createElement('ion-icon');
            iconSave.setAttribute('slot', 'start');
            iconSave.setAttribute('name', 'save-outline');
            submitBtn.appendChild(iconSave);
            submitBtn.appendChild(document.createTextNode(' Guardar ' + window.formatEntityName(entityName)));

            if (useStepper && container._btnPrev && container._btnNext && container._stepperRef) {
                // Layout Híbrido: Acomodar botones de Stepper
                const colLeft = document.createElement('ion-col');
                colLeft.setAttribute('size', '4');
                colLeft.style.textAlign = 'left';
                colLeft.appendChild(container._btnPrev);

                const colRight = document.createElement('ion-col');
                colRight.setAttribute('size', '8');
                colRight.style.textAlign = 'right';
                
                // Ambos botones en el ladro derecho
                const btnGroup = document.createElement('span');
                
                const iconNext = document.createElement('ion-icon');
                iconNext.setAttribute('slot', 'end');
                iconNext.setAttribute('name', 'arrow-forward-outline');
                container._btnNext.appendChild(iconNext);
                container._btnNext.setAttribute('shape', 'round');

                btnGroup.appendChild(container._btnNext);
                btnGroup.appendChild(submitBtn);

                colRight.appendChild(btnGroup);

                btnRow.appendChild(colLeft);
                btnRow.appendChild(colRight);

                // Arrancar flujo topológico
                container._stepperRef.btnSubmit = submitBtn; // Aseguramos bind
                container._stepperRef.start();
            } else {
                // Layout Linear 1 Step: Solo Guardar a la derecha
                const colRight = document.createElement('ion-col');
                colRight.setAttribute('size', '12');
                colRight.style.textAlign = 'right';
                colRight.appendChild(submitBtn);
                btnRow.appendChild(colRight);
            }

            btnGrid.appendChild(btnRow);
            footerContainer.appendChild(btnGrid);
            // Fin de armado de Header/Footer Híbrido

            // --- Delegación de Business Rules UI_Validators ---
            if (global.UI_Validators && typeof global.UI_Validators.attachBusinessRulesListeners === 'function') {
                global.UI_Validators.attachBusinessRulesListeners(container, entityName);
            }
            // --------------------------------------------------------------------

            // --- HOTFIX v1.2.2: Repaint Bidireccional de Opciones por Cambio de Nivel ---
            container.addEventListener('ionChange', (e) => {
                const target = e.target;
                if (target && target.name === 'nivel_tipo') {
                    const rules = global.APP_SCHEMAS[entityName]?.topologyRules;
                    if (rules) {
                        const nuevoNivel = parseInt(target.value, 10);
                        const parentWrappers = container.querySelectorAll('div[data-relation-type="padre"]');
                        // Pub/Sub: Notificamos a los contenedores padre usando LocalEventBus
                        LocalEventBus.publish('TAXONOMY_LEVEL_CHANGED', { newLevel: nuevoNivel, rules: rules });
                    }
                }
            });
            // --------------------------------------------------------------------

            // S14.1 Delegación Submitter Object
            new window.UI_FormSubmitter(entityName, fields, submitBtn, null, modal, localEditId);
            
            // --- Metadata-Driven Dependency Injection (Zero-Touch UI) ---
            if (window.UI_FormDependencies) {
                window.UI_FormDependencies.attachListeners(modal, fields);
            }
            // ------------------------------------------------------------

            modal.appendChild(footerContainer);
            // El insertion del Drawer ya fue manejado por DrawerStackController.push
            // de forma síncrona arriba, no requiere document.body.appendChild.
        };

        /**
         * openEditForm (Directiva 3)
         * Busca un registro en el cache local de DataViewEngine, pre-llena el formulario
         * y activa el modo UPDATE.
         */
        global._isRenderingForm = false;

        global.openEditForm = async function (id, customEntityName = null) {
            if (global._isRenderingForm) {
                console.warn("[FormEngine] Race condition prevenida: ignorando click duplicado");
                return;
            }
            global._isRenderingForm = true;
            try {
                console.log("[FormEngine] Solicitud de edición recibida para ID:", id);

            const state = window.DataViewEngine ? window.DataViewEngine._getState() : null;
            const entityName = customEntityName || (state ? state.entityName : null);
            
            if (!entityName) {
                console.error("[FormEngine] Error: Entidad objetivo no identificada.");
                return;
            }

            const meta = window.APP_SCHEMAS[entityName];
            const dataBase = window.DataStore.get(entityName);

            const pkField = window.UI_FormUtils.getPrimaryKey(entityName);

            // --- REGLA 3 (rules_qa.md): PROTECTOR DE NULLS ---
            if (!meta || !pkField) {
                console.error("[FormEngine] Error Crítico: No se encontró metadata o 'primaryKey' para la entidad:", entityName);
                alert("Error de Configuración: La entidad '" + window.formatEntityName(entityName) + "' no tiene un mapeo de metadatos válido.");
                return;
            }

            if (!dataBase || !Array.isArray(dataBase)) {
                console.error("[FormEngine] Error: Cache de datos no disponible para la entidad:", entityName);
                return;
            }

            console.log("[FormEngine] Editando entidad:", entityName, "Usando metadata:", meta);

            // 2. Buscar el registro completo
            const record = dataBase.find(item => String(item[pkField]) === String(id));
            if (!record) {
                console.error("[FormEngine] Error: Registro no encontrado en cache local para ID:", id, "en datos:", dataBase);
                alert("Error: El registro con ID '" + id + "' no pudo ser localizado para edición.");
                return;
            }

            console.log("[FormEngine] Registro encontrado:", record);

            // [UX] Navegación: Evitamos destruir el stack si es Drill-Down
            if (!customEntityName && global.DrawerStackController && global.DrawerStackController.getDepth() > 0) {
                global.DrawerStackController.clearAllSync();
            }

            // 3. (Obsoleto) currentEditId ya no se usa globalmente

            // S18.4 - Evaluación temprana ABAC para propagar el modo Lectura estructuralmente (Prop-Drilling)
            const canEdit = !window.ABAC || window.ABAC.can('update', entityName, id);

            // 4. Renderizar el formulario base de la entidad AL INSTANTE (0ms) usando caché local
            await global.renderForm(entityName, record, null, { readonly: !canEdit });

            // 5. [S29.9 Fix] Eliminada la pantalla Skeleton. La hidratación ahora es verdaderamente transparente.
            // Actualizar Título del Drawer
            if (global.currentFormDrawer) {
                const modalTitle = global.currentFormDrawer.querySelector('.drawer-title') || global.currentFormDrawer.querySelector('ion-title');
                if (modalTitle) modalTitle.textContent = "Editar: " + window.formatEntityName(entityName);
            }

            // 5. Pre-llenado de campos (Acelerado a 0ms Local Cache)
            const container = global.currentFormDrawer || document.getElementById('app-container');
            const inputs = container.querySelectorAll('ion-input, ion-textarea, ion-select, input[type="hidden"]');

            // =========================================================================================
            // MDM Guardrail S4.3 Auditoría: Pre-Hidratación de 0ms (Solución a Fallo de Tree Lock Visual)
            // =========================================================================================
            // ARQUITECTURA: En Modo Edición (UPDATE), los campos anidados padre como `id_dominio_padre`
            // son sometidos a inmutabilidad de estructura, impidiendo iterar combos cerrados.
            // Para que el WebComponent de Ionic renderice el valor seleccionado en pantalla y NO un
            // string nulo fantasma, inyectamos primero las `<ion-select-option>` buscando funciones
            // locales 0ms. Todo ocurre ANTES del populate original de record[name].
            // =========================================================================================
            const formSchema = APP_SCHEMAS[entityName]?.fields || [];
            const formStateObj = { ...record };
            const formCurrentStateArr = Object.keys(formStateObj).map(k => ({name: k, value: formStateObj[k]}));

            for (const input of Array.from(inputs)) {
                if (input.tagName.toLowerCase() === 'ion-select') {
                    const fieldName = input.getAttribute('name');
                    const schemaDef = formSchema.find(f => f.name === fieldName);
                    
                    if (schemaDef && schemaDef.lookupSource) {
                        const localResolver = window[schemaDef.lookupSource] || global[schemaDef.lookupSource];
                        if (typeof localResolver === 'function') {
                            // R-03: await Promise.resolve() handles both sync and async resolvers
                            // without crashing when a resolver is a google.script.run wrapper (returns Promise)
                            const newOptions = await Promise.resolve(localResolver(formCurrentStateArr));
                            input.innerHTML = '';
                            
                            (Array.isArray(newOptions) ? newOptions : []).forEach(opt => {
                                const ionOption = document.createElement('ion-select-option');
                                ionOption.value = opt.value;
                                ionOption.textContent = opt.label;
                                input.appendChild(ionOption);
                            });
                        }
                    }
                }
            }

            console.log("[FormEngine] Pre-llenando", inputs.length, "campos...");
            const formSchemaMap = APP_SCHEMAS[entityName] ? (APP_SCHEMAS[entityName].fields || APP_SCHEMAS[entityName]) : [];
            const pkFieldLocal = APP_SCHEMAS[entityName]?.primaryKey || 'id';

            inputs.forEach(input => {
                const name = input.getAttribute('name');
                if (!name || input.hasAttribute('data-skip-hydration')) return;

                let valToSet = undefined;
                if (record.hasOwnProperty(name)) {
                    valToSet = record[name];
                } else {
                    // S30.13 JIT Graph Relational Pre-fill para Single-Select Padres (Evita Stealing Fantasma)
                    let checkSchemaMap = Array.isArray(formSchemaMap) ? formSchemaMap : Object.keys(formSchemaMap).map(k => ({ name: k, ...formSchemaMap[k]}));
                    const fieldMeta = checkSchemaMap.find(f => f.name === name);
                    
                    if (fieldMeta && fieldMeta.isTemporalGraph && window.DataStore && window.DataStore.get('Sys_Graph_Edges')) {
                        const activeEdges = window.DataStore.get('Sys_Graph_Edges').filter(e => e.es_version_actual !== false);
                        const edgeName = (fieldMeta.graphEdgeType || fieldMeta.name).toUpperCase();
                        const currentPK = record[pkFieldLocal];
                        if (currentPK) {
                            if (fieldMeta.relationType === 'padre') {
                                const match = activeEdges.find(e => String(e.id_nodo_hijo) === String(currentPK) && e.tipo_relacion === edgeName);
                                if (match) valToSet = match.id_nodo_padre;
                            } else {
                                const match = activeEdges.find(e => String(e.id_nodo_padre) === String(currentPK) && e.tipo_relacion === edgeName);
                                if (match) valToSet = match.id_nodo_hijo;
                            }
                        }
                    }
                }

                if (valToSet !== undefined) {
                    if (input.dataset.parser === 'json_array') {
                        let parsedData = [];
                        try {
                            parsedData = typeof valToSet === 'string' ? JSON.parse(valToSet) : valToSet;
                        } catch(e) { parsedData = typeof valToSet === 'string' && valToSet ? [valToSet] : []; }
                        input.value = JSON.stringify(Array.isArray(parsedData) ? parsedData : []);
                    } else {
                        input.value = valToSet;
                    }
                }
            });

            // S7.3 - El "Pre-llenado de Chip Components" nativo fue removido. 
            // Reason (Principio DRY): UI_Components gestiona esta hidratación activamente
            // al ser instanciados con `window._buildSearchableMulti(...)` en el switch parent.

            // S18.4 - ABAC Passive Hiding & HelpDesk Mitigation (Educative Zero-Trust)
            if (!canEdit) {
                // S24.2 Delega ABAC al servicio utilitario puro
                if (window.UI_FormUtils && window.UI_FormUtils.applyReadOnlyLock) {
                    window.UI_FormUtils.applyReadOnlyLock(container, null, null, true);
                }
            }

            // 7. Agregar Audit Trail (Directiva del Product Architect)
            if (record.updated_at && record.updated_by) {
                let formattedDate = record.updated_at;
                try {
                    const d = new Date(record.updated_at);
                    if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleString();
                    }
                } catch (e) { }

                const noteContainer = document.createElement('div');
                noteContainer.style.textAlign = 'center';
                noteContainer.style.padding = 'var(--spacing-4)';
                noteContainer.style.marginTop = 'var(--spacing-2)';

                const note = document.createElement('ion-note');
                note.style.fontSize = 'var(--sys-font-small)';
                note.style.color = 'var(--dv-text-light)';
                note.textContent = `Última actualización por ${record.updated_by} el ${formattedDate}`;

                noteContainer.appendChild(note);
                container.appendChild(noteContainer);
            }

            // [S29.9 Fix] 8. Disparar Hidratación Silenciosa al final sin bloquear el hilo
            window.DataAPI.call('API_Universal_Router', 'read', entityName, { id: id })
                .then(rawRes => {
                    const res = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;
                    if (res && res.status === 'success' && window.AppEventBus) {
                        window.AppEventBus.publish('FormEngine::RecordHydrated', res.data);
                    }
                })
                .catch(e => console.warn("[FormEngine] Falló hidratación background profunda:", e));

            } catch (err) {
                console.error("[FormEngine] Error asíncrono abriendo Formulario:", err);
            } finally {
                global._isRenderingForm = false;
            }

        };



    })(typeof window !== 'undefined' ? window : this);