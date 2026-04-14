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
            
            // 1. Quitar la clase .active de todos los items
            var navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(function(item) { item.classList.remove('active'); });
            
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
            else if (viewType === 'capacitymap') {
                if (headerTitle) headerTitle.textContent = 'Mapa de Capacidad As-Is';
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); };
                }
                
                var capBtn = document.getElementById('nav-item-capacitymap');
                if (capBtn) capBtn.classList.add('active');
                
                if (container) {
                    var tmpl = document.getElementById('tmpl-capacity-map');
                    if (tmpl) {
                        window.DOM.clear(container);
                        container.appendChild(tmpl.content.cloneNode(true));
                        if (typeof window.CapacityMapEngine !== 'undefined' && typeof window.CapacityMapEngine.render === 'function') {
                            window.CapacityMapEngine.render(container);
                        }
                    }
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
            else if (viewType === 'domainmap') {
                if (headerTitle) headerTitle.textContent = 'Mapa M/N: Dominios';
                if (backBtn) {
                    backBtn.classList.remove('ion-hide');
                    backBtn.onclick = function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dashboard'}); };
                }
                
                var mapBtn = document.getElementById('nav-item-domainmap');
                if (mapBtn) mapBtn.classList.add('active');
                
                if (container && typeof window.renderDomainMap === 'function') {
                    window.renderDomainMap(container);
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

            var mapCapItem = document.createElement('div');
            mapCapItem.className = 'nav-item';
            mapCapItem.id = 'nav-item-capacitymap';
            mapCapItem.title = 'Visualizador de Capacidad';
            mapCapItem.addEventListener('click', function() { window.AppEventBus.publish('NAV::CHANGE', {viewType: 'capacitymap'}); });
            var mapCapIcon = document.createElement('ion-icon');
            mapCapIcon.setAttribute('name', 'map-outline');
            var mapCapLabel = document.createElement('ion-label');
            mapCapLabel.textContent = 'Mapa E2E';
            mapCapItem.appendChild(mapCapIcon);
            mapCapItem.appendChild(mapCapLabel);
            navList.appendChild(mapCapItem);
                
            var headerEntidades = document.createElement('div');
            headerEntidades.className = 'sidebar-heading';
            var spanEntidades = document.createElement('span');
            spanEntidades.textContent = 'ENTIDADES';
            headerEntidades.appendChild(spanEntidades);
            navList.appendChild(headerEntidades);
            
            var sorted = window.getEntitiesByFlag('showInMenu');
            sorted.forEach(function(entry) {
                var key = entry[0]; var meta = entry[1];
                if(meta.hideFromMenu === true) return;
                
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