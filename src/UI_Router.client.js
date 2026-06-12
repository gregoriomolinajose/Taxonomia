/* ============================================================
       UI_Router.html — Motor Lógico de Navegación y Vistas
       Incluido via GAS: <?!= include('UI_Router'); ?>
       S18.6 Refactor: 100% Nodal Assembly
       ============================================================ */
    /* ── Sidebar Desktop (3-State §13) ──────────────────── */
    window.sidebarState = 0;

    window.applySidebarState = function() {
        var splitPane = document.querySelector('ion-split-pane');
        if (!splitPane) return;
        var state = localStorage.getItem('sidebar_state') || '0';
        splitPane.classList.remove('shell-mini', 'shell-hidden');
        if (state === '1') splitPane.classList.add('shell-mini');
        if (state === '2') splitPane.setAttribute('when', 'false');
        else splitPane.setAttribute('when', 'lg');
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 350);
    };

    window.toggleDesktopMenu = function() {
        if (window.innerWidth < 992) return;
        window.sidebarState = (window.sidebarState + 1) % 3;
        localStorage.setItem('sidebar_state', window.sidebarState);
        window.applySidebarState();
    };

    /**
     * @typedef {Object} StrictFilter
     * @property {string} key Nombre de la columna o campo relacional a filtrar.
     * @property {string} value ID Lexico o Técnico a igualar.
     * @property {string} [label] Etiqueta human-readable opcional para mostrar en la interfaz en lugar del ID.
     */

    window.UI_Router = {
        navigateTo: function(viewType, entityKey, payload) {
            if (typeof entityKey === 'undefined') entityKey = null;
            var container   = document.getElementById('app-container');
            var headerTitle = document.getElementById('main-header-title');
            var backBtn     = document.getElementById('global-back-btn');
            
            // Garantizar que ninguna vista herede el bloqueo de layout de DataGrid
            if (container) container.classList.remove('dv-fullscreen-lock');
            
            // S25.2 BugFix: Vaciar la pila de formularios flotantes para evitar Memory Leaks al cambiar de pantalla
            if (window.DrawerStackController && typeof window.DrawerStackController.clearAllSync === 'function') {
                window.DrawerStackController.clearAllSync();
            }

            // S25.2 BugFix: Prevenir memory leaks de los listeners de FormStepper al cambiar de pantalla
            if (window.ActiveSteppers && window.ActiveSteppers.length > 0) {
                window.ActiveSteppers.forEach(stepper => {
                    if (typeof stepper.destroy === 'function') stepper.destroy();
                });
                window.ActiveSteppers = [];
            }
            
            // 1. Quitar la clase .active de todos los items
            var navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(function(item) { item.classList.remove('active'); });
            
            // 2. Restaurar Sidebar State por defecto (S49.3 Quality Fix)
            if (typeof window.applySidebarState === 'function') window.applySidebarState();
            
            // 3. Restaurar Chrome de la App (Header y Sidebar físico) al salir de modos inmersivos
            var splitPane = document.querySelector('ion-split-pane');
            if (splitPane) splitPane.disabled = false;
            
            var menu = document.querySelector('ion-menu');
            if (menu) {
                menu.disabled = false;
                menu.style.display = '';
            }
            
            var mainHeader = document.querySelector('#main-content ion-header');
            if (mainHeader) mainHeader.style.display = '';

            var layoutSegment = document.getElementById('main-layout-segment');
            if (layoutSegment) {
                if (viewType === 'selfservice' || viewType === 'wizard') {
                    layoutSegment.value = 'selfservice';
                } else {
                    layoutSegment.value = 'dashboard';
                }
            }
            
            if (viewType === 'dashboard') {
                if (headerTitle) headerTitle.textContent = 'Plataforma de Gobernanza';
                if (backBtn) { backBtn.classList.add('ion-hide'); backBtn.onclick = null; }
                
                var oldPop = document.getElementById('dv-col-ion-popover');
                if (oldPop) oldPop.remove();
                
                var homeBtn = document.getElementById('nav-item-dashboard');
                if (homeBtn) homeBtn.classList.add('active');
                
                if (container) {
                    var tmpl = document.getElementById('tmpl-dashboard');
                    if (tmpl) {
                        window.DOM.clear(container);
                        container.appendChild(tmpl.content.cloneNode(true));
                        if (typeof window.renderDashboardCards === 'function') window.renderDashboardCards();
                        if (typeof window.renderDashboard === 'function') window.renderDashboard();
                    }
                }
            } 
            else if (viewType === 'selfservice') {
                if (headerTitle) headerTitle.textContent = 'Portal de Autoservicio';
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); };
                }
                
                // Ocultar Sidebar en modo SelfService para aislamiento Premium
                var splitPane = document.querySelector('ion-split-pane');
                if (splitPane) {
                    splitPane.setAttribute('when', 'false');
                }

                if (container) {
                    if (typeof window.SelfService_Home_UI !== 'undefined') {
                        window.SelfService_Home_UI.render(container);
                    } else {
                        console.error("SelfService_Home_UI no está disponible.");
                    }
                }
            }
            else if (viewType === 'wizard') {
                if (headerTitle) headerTitle.textContent = 'Asistente de Diseño Organizacional';
                let wizardUnsubscribe = null;
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { 
                        if (wizardUnsubscribe) wizardUnsubscribe();
                        window.AppEventBus.publish('NAV::CHANGE', {viewType: 'selfservice'}); 
                    };
                }
                
                // Ocultar Chrome de la App (Header y Sidebar) para Fullscreen inmersivo
                var splitPane = document.querySelector('ion-split-pane');
                if (splitPane) {
                    splitPane.disabled = true;
                }
                var menu = document.querySelector('ion-menu');
                if (menu) {
                    menu.disabled = true;
                    menu.style.display = 'none';
                }
                var mainHeader = document.querySelector('#main-content ion-header');
                if (mainHeader) {
                    mainHeader.style.display = 'none';
                }

                if (container) {
                    window.DOM.clear(container);
                    
                    const wrapper = document.createElement('div');
                    wrapper.id = 'wizard-fullscreen-zone';
                    wrapper.style.position = 'absolute';
                    wrapper.style.top = '0';
                    wrapper.style.bottom = '0';
                    wrapper.style.left = '0';
                    wrapper.style.right = '0';
                    wrapper.style.display = 'flex';
                    wrapper.style.flexDirection = 'column';
                    wrapper.style.background = 'var(--ion-background-color)';
                    
                    // S49.11: Header de estilo Landing (Left-aligned, mini caps + H2)
                    const headerZone = document.createElement('div');
                    headerZone.id = 'wizard-header-zone';
                    headerZone.style.position = 'relative';
                    
                    // Botón para salir/volver
                    const backBtn = document.createElement('ion-button');
                    backBtn.id = 'wizard-back-btn';
                    backBtn.fill = 'clear';
                    backBtn.color = 'medium';
                    backBtn.style.position = 'absolute';
                    backBtn.innerHTML = '<ion-icon slot="icon-only" name="close-outline"></ion-icon>';
                    backBtn.onclick = () => {
                        window.AppEventBus.publish('NAV::CHANGE', {viewType: 'selfservice'});
                    };
                    headerZone.appendChild(backBtn);
                    
                    // S49.11: Subtítulo mini caps con indicador de punto azul
                    const subtitle = document.createElement('p');
                    subtitle.style.cssText = 'margin:0 0 var(--spacing-1) 0;display:flex;align-items:center;gap:var(--spacing-2);';
                    
                    const dot = document.createElement('span');
                    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--ion-color-primary);display:inline-block;flex-shrink:0;';
                    
                    const subtitleText = document.createElement('span');
                    subtitleText.textContent = 'ORQUESTADOR DE TAXONOMÍA E2E';
                    subtitleText.style.cssText = 'font-size:var(--sys-font-caption, 0.75rem);font-family:var(--ion-font-family, system-ui, sans-serif);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--ion-color-step-600, #666);';
                    
                    subtitle.appendChild(dot);
                    subtitle.appendChild(subtitleText);
                    headerZone.appendChild(subtitle);
                    
                    // S49.11: Título principal H2 bold
                    const title = document.createElement('h1');
                    title.textContent = 'Diseñando la arquitectura de Portafolio';
                    title.style.cssText = 'font-size:var(--sys-font-h2, 1.5rem);color:var(--ion-text-color);font-family:var(--font-display, var(--ion-font-family, system-ui, sans-serif));font-weight:700;letter-spacing:-0.02em;margin:0;';
                    
                    headerZone.appendChild(title);
                    wrapper.appendChild(headerZone);

                    // Estilos Responsivos Integrados
                    const style = document.createElement('style');
                    style.innerHTML = `
                        #wizard-fullscreen-zone { overflow-y: auto; }
                        #local-sidebar-list {
                            display: flex;
                            flex-direction: row;
                            overflow-x: auto;
                            padding-bottom: var(--spacing-2);
                            gap: var(--spacing-2);
                            -webkit-overflow-scrolling: touch;
                            -ms-overflow-style: none;  /* IE and Edge */
                            scrollbar-width: none;  /* Firefox */
                        }
                        #local-sidebar-list::-webkit-scrollbar {
                            display: none;
                        }
                        #local-sidebar-list ion-item {
                            flex: 0 0 auto;
                            width: auto;
                            --padding-start: var(--spacing-3);
                            --padding-end: var(--spacing-3);
                        }
                        #local-sidebar-list ion-label { white-space: nowrap !important; }
                        #wizard-header-zone { 
                            padding: var(--spacing-5) var(--spacing-6) !important; 
                            font-family: var(--sys-font-family-body, system-ui, -apple-system, sans-serif); 
                            border-bottom: 1px solid var(--color-border, #e0e0e0);
                            background: var(--color-bg-body, #ffffff);
                            text-align: left;
                        }
                        #wizard-back-btn { top: var(--spacing-4) !important; right: var(--spacing-4) !important; left: auto !important; }
                        #wizard-col-left { border-right: none; border-bottom: 1px solid var(--ion-color-step-150); background: var(--color-bg-body, #ffffff); display: flex; flex-direction: column; height: 100%; min-height: 0; }

                        /* Footer Visibility Fix - Flexbox Refactor */
                        #wizard-col-right {
                            display: flex !important;
                            flex-direction: column !important;
                            padding: 0 !important; /* Move padding to inner content */
                            height: 100% !important;
                            min-height: 0 !important;
                            overflow: hidden !important;
                        }
                        #wizard-col-right ion-content {
                            position: relative !important;
                            flex: 1 !important;
                            --padding-top: var(--spacing-6);
                            --padding-bottom: var(--spacing-6);
                            --padding-start: var(--spacing-8);
                            --padding-end: var(--spacing-8);
                            background: var(--color-bg-body, #ffffff) !important;
                        }
                        #wizard-footer-zone .drawer-footer {
                            position: relative !important;
                            flex-shrink: 0 !important;
                            width: 100%;
                            height: 80px;
                            z-index: 100;
                            background: var(--color-bg-body, #ffffff);
                            border-top: 1px solid var(--color-border, #e0e0e0);
                            box-shadow: var(--shadow-top, 0 -4px 16px rgba(0,0,0,0.05));
                            padding: 0 var(--spacing-8);
                            display: flex;
                            align-items: center;
                            justify-content: center; /* Center grid inside */
                        }
                        #wizard-footer-zone .drawer-footer ion-grid {
                            width: 100%;
                            padding: 0;
                            max-width: 1200px; /* Limit width for ultra-wide screens */
                        }

                        /* Tablet & Desktop */
                        @media (min-width: 768px) {
                            #wizard-fullscreen-zone { overflow-y: hidden; background: var(--color-bg-body, #ffffff); }
                            #local-sidebar-list { flex-direction: column; overflow-x: visible; overflow-y: auto; flex: 1; padding-bottom: 0; margin-top: var(--spacing-4); }
                            #local-sidebar-list ion-item { width: 100%; margin: var(--spacing-1) 0; }
                            #local-sidebar-list ion-label { white-space: normal !important; }
                            #wizard-col-left { border-right: 1px solid var(--color-border, #e0e0e0) !important; border-bottom: none !important; display: flex; flex-direction: column; }
                        }
                        
                        /* Responsive Typography fixes for mobile title */
                        @media (max-width: 576px) {
                            #wizard-header-zone h1 { font-size: 1.5rem !important; }
                            #wizard-header-zone p { font-size: 0.85rem !important; }
                        }

                        /* S49.11: Pulsating dot animation for badge pill */
                        @keyframes wizard-pulse {
                            0%, 100% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(1.6); opacity: 0.5; }
                        }
                        .wizard-step-badge .pulse-dot {
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: var(--ion-color-primary);
                            display: inline-block;
                            animation: wizard-pulse 2s ease-in-out infinite;
                            flex-shrink: 0;
                        }
                    `;
                    wrapper.appendChild(style);

                    // Grid del Wizard (Ocupa el 100% restante del layout flex)
                    const grid = document.createElement('ion-grid');
                    grid.style.flex = '1';
                    grid.style.width = '100%';
                    grid.style.maxWidth = '100%';
                    grid.style.margin = '0';
                    grid.style.padding = '0';
                    grid.style.overflow = 'hidden';
                    grid.style.minHeight = '0';
                    grid.style.display = 'flex';
                    grid.style.flexDirection = 'column';
                    
                    const row = document.createElement('ion-row');
                    row.style.flex = '1';
                    row.style.minHeight = '0';
                    
                    const colLeft = document.createElement('ion-col');
                    colLeft.id = 'wizard-col-left';
                    colLeft.setAttribute('size', '12');
                    colLeft.setAttribute('size-md', '4');
                    colLeft.setAttribute('size-lg', '3');
                    colLeft.setAttribute('size-xl', '2');
                    colLeft.style.padding = 'var(--spacing-4)';
                    colLeft.style.background = 'var(--ion-color-step-50)';
                    
                    const localSidebarList = document.createElement('div');
                    localSidebarList.id = 'local-sidebar-list';
                    colLeft.appendChild(localSidebarList);
                    
                    const colRight = document.createElement('ion-col');
                    colRight.id = 'wizard-col-right';
                    colRight.setAttribute('size', '12');
                    colRight.setAttribute('size-md', '8');
                    colRight.setAttribute('size-lg', '9');
                    colRight.setAttribute('size-xl', '10');
                    colRight.style.padding = 'var(--spacing-6) var(--spacing-8)';
                    colRight.style.position = 'relative'; // CRITICAL: Allows ion-content to fill height
                    
                    row.appendChild(colLeft);
                    row.appendChild(colRight);
                    grid.appendChild(row);
                    wrapper.appendChild(grid);
                    
                    const footerZone = document.createElement('div');
                    footerZone.id = 'wizard-footer-zone';
                    footerZone.style.flexShrink = '0';
                    footerZone.style.width = '100%';
                    wrapper.appendChild(footerZone);

                    container.appendChild(wrapper);

                    // Escucha de éxito global
                    if (window.AppEventBus) {
                        wizardUnsubscribe = window.AppEventBus.subscribe('FORM::SUBMIT_SUCCESS', (payload) => {
                            if (payload.entityName === 'Taxonomia' && !payload.isSilent) {
                                if (wizardUnsubscribe) wizardUnsubscribe();
                                window.AppEventBus.publish('NAV::CHANGE', {viewType: 'selfservice'});
                                // Alerta Premium
                                const toast = document.createElement('ion-toast');
                                toast.message = '¡Taxonomía orquestada con éxito!';
                                toast.duration = 4000;
                                toast.color = 'success';
                                document.body.appendChild(toast);
                                window.PresentSafe(toast);
                            }
                        });
                    }

                    if (typeof window.renderForm === 'function') {
                        let recordId = (payload && payload.recordId) ? payload.recordId : null;
                        let recordData = null;
                        
                        // [Fix] Hydrate data from cache if a recordId is passed, since renderForm expects an object, not a string.
                        if (recordId && window.Schema_Utils) {
                            const pkField = window.Schema_Utils.getPrimaryKey('Taxonomia');
                            if (pkField) {
                                // 1. Try global DataStore
                                let dataBase = (window.DataStore && window.DataStore.get('Taxonomia')) ? window.DataStore.get('Taxonomia') : [];
                                recordData = dataBase.find(item => String(item[pkField]) === String(recordId));
                                
                                // 2. Fallback to DataViewEngine state if DataStore was wiped
                                if (!recordData && window.DataViewEngine && window.DataViewEngine._state && window.DataViewEngine._state.data) {
                                    recordData = window.DataViewEngine._state.data.find(item => String(item[pkField]) === String(recordId));
                                }

                                if (!recordData) {
                                    console.warn(`[UI_Router] ALERTA: No se encontró el registro ${recordId} en DataStore ni DataViewEngine.`);
                                }
                            }
                        }

                        window.renderForm('Taxonomia', recordData, null, { 
                            customContainer: colRight,
                            customSidebarSteps: localSidebarList,
                            customFooterContainer: footerZone
                        })
                            .then(() => {
                                // S49.2 Fix: Delegate DOM population to the Form Engine Hydrator.
                                // renderForm ONLY builds DOM structure. Values must be hydrated AFTER building.
                                if (recordData && window.FormEngine_Hydrator) {
                                    return window.FormEngine_Hydrator(colRight, recordData, 'Taxonomia');
                                }
                            })
                            .catch(e => console.error("[UI_Router] Error asíncrono inicializando Wizard:", e));
                    } else {
                        console.error("renderForm no está disponible globalmente.");
                    }
                }
            }
            else if (viewType === 'dataview' && entityKey) {
                if (headerTitle && window.ENTITY_META && window.ENTITY_META[entityKey]) {
                    headerTitle.textContent = window.ENTITY_META[entityKey].label;
                }
                
                // Regla 5: Escape Routing
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); };
                }
                
                var entityBtn = document.getElementById('nav-item-' + entityKey);
                if (entityBtn) entityBtn.classList.add('active');
                
                // eslint-disable-next-line arch // Justified: Router triggers controller render
                if (window.DataViewEngine && typeof window.DataViewEngine.render === 'function') {
                    window.DataViewEngine.render(entityKey, 'app-container', payload);
                }
            } 

            else if (viewType === 'designkit') {
                if (headerTitle) headerTitle.textContent = 'Design System Kit';
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); };
                }
                var settingsBtn = document.getElementById('nav-item-settings');
                if (settingsBtn) settingsBtn.classList.add('active');
                
                if (container) {
                    var tmpl = document.getElementById('tmpl-designkit');
                    if (tmpl) {
                        window.DOM.clear(container);
                        container.appendChild(tmpl.content.cloneNode(true));
                        if (typeof window.mountDesignKit === 'function') window.mountDesignKit();
                    }
                }
            } 
            else if (viewType === 'governance') {
                if (headerTitle) headerTitle.textContent = 'Centro de Mando: Matriz ABAC';
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); };
                }
                var govBtn = document.getElementById('nav-item-governance');
                if (govBtn) govBtn.classList.add('active');
                
                if (container) {
                    var tmpl = document.getElementById('tmpl-governance-admin');
                    if (tmpl) {
                        window.DOM.clear(container);
                        container.appendChild(tmpl.content.cloneNode(true));
                        if (typeof window.GovernanceEngine !== 'undefined') {
                            window.GovernanceEngine.renderMatrix(container);
                        }
                    }
                }
            } 

            // [E31-S31.5] Schema Config Studio — SUPER_ADMIN only
            else if (viewType === 'sistema') {
                if (headerTitle) headerTitle.textContent = 'Sistema · Schema Governance Studio';
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); };
                }
                if (container) {
                    var tmpl = document.getElementById('tmpl-schema-studio');
                    if (tmpl) {
                        window.DOM.clear(container);
                        container.appendChild(tmpl.content.cloneNode(true));
                        if (typeof window.SchemaStudio !== 'undefined' && typeof window.SchemaStudio.mount === 'function') {
                            window.SchemaStudio.mount();
                        }
                    }
                }
            }
        },

        renderMainNav: function() {
            var navList  = document.getElementById('main-nav-list');
            var formList = document.getElementById('sidebarList');
            if (!navList || !formList) return;
            navList.classList.remove('ion-hide');
            formList.classList.add('ion-hide');
            
            window.DOM.clear(navList);
            var headerPrincipal = document.createElement('div');
            headerPrincipal.className = 'sidebar-heading';
            var spanPrincipal = document.createElement('span');
            spanPrincipal.textContent = 'PRINCIPAL';
            headerPrincipal.appendChild(spanPrincipal);
            navList.appendChild(headerPrincipal);
            
            var homeItem = document.createElement('div');
            homeItem.className = 'nav-item';
            homeItem.id = 'nav-item-dashboard';
            homeItem.title = 'Inicio';
            homeItem.addEventListener('click', function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); });
            var homeIcon = document.createElement('ion-icon');
            homeIcon.setAttribute('name', 'grid-outline');
            var homeLabel = document.createElement('ion-label');
            homeLabel.textContent = 'Inicio';
            homeItem.appendChild(homeIcon);
            homeItem.appendChild(homeLabel);
            navList.appendChild(homeItem);

            // Dynamically inject Taxonomia in the 2nd position
            if (window.APP_SCHEMAS && window.APP_SCHEMAS.Taxonomia && window.APP_SCHEMAS.Taxonomia.metadata) {
                var taxMeta = window.APP_SCHEMAS.Taxonomia.metadata;
                var taxItem = document.createElement('div');
                taxItem.className = 'nav-item';
                taxItem.id = 'nav-item-Taxonomia';
                taxItem.title = taxMeta.label;
                taxItem.addEventListener('click', function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dataview', entityKey: 'Taxonomia'}); });
                var taxIcon = document.createElement('ion-icon');
                taxIcon.setAttribute('name', taxMeta.iconName);
                var taxLabel = document.createElement('ion-label');
                taxLabel.textContent = taxMeta.label;
                taxItem.appendChild(taxIcon);
                taxItem.appendChild(taxLabel);
                navList.appendChild(taxItem);
            }
                
            var headerEntidades = document.createElement('div');
            headerEntidades.className = 'sidebar-heading';
            var spanEntidades = document.createElement('span');
            spanEntidades.textContent = 'ENTIDADES';
            headerEntidades.appendChild(spanEntidades);
            navList.appendChild(headerEntidades);
            
            var sorted = window.getEntitiesByFlag('showInMenu');
            sorted.forEach(function(entry) {
                var key = entry[0]; var meta = entry[1];
                if(meta.hideFromMenu === true || key === 'Taxonomia') return;
                
                var item = document.createElement('div');
                item.className = 'nav-item';
                item.id = 'nav-item-' + key;
                item.title = meta.label;
                item.addEventListener('click', function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dataview', entityKey: key}); });
                
                var icon = document.createElement('ion-icon');
                icon.setAttribute('name', meta.iconName);
                var label = document.createElement('ion-label');
                label.textContent = meta.label;
                item.appendChild(icon);
                item.appendChild(label);
                
                navList.appendChild(item);
            });
        },

        showHomeSidebar: function() { 
            this.renderMainNav(); 
        },

        showListSidebar: function(entityKey) {
            this.renderMainNav();
            var navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(function(item) { item.classList.remove('active'); });
            var btn = document.getElementById('nav-item-' + entityKey);
            if (btn) btn.classList.add('active');
        },

        returnToDashboard: function() { 
            this.navigateTo('dashboard'); 
        },

        showFormSidebar: function(entityName) {
            var navList  = document.getElementById('main-nav-list');
            var formList = document.getElementById('sidebarList');
            if (!navList || !formList) return;
            navList.classList.add('ion-hide');
            formList.classList.remove('ion-hide');
            
            window.DOM.clear(formList);
            var homeItem = document.createElement('div');
            homeItem.className = 'nav-item';
            homeItem.id = 'nav-item-dashboard';
            homeItem.title = 'Inicio';
            homeItem.addEventListener('click', function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); });
            var homeIcon = document.createElement('ion-icon');
            homeIcon.setAttribute('name', 'grid-outline');
            var homeLabel = document.createElement('ion-label');
            homeLabel.textContent = 'Inicio';
            homeItem.appendChild(homeIcon);
            homeItem.appendChild(homeLabel);
            
            var formStepsContainer = document.createElement('div');
            formStepsContainer.id = 'form-steps-container';
            
            formList.appendChild(homeItem);
            formList.appendChild(formStepsContainer);
        }
    };