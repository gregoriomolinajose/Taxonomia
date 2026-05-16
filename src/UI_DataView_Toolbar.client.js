window.UI_DataView_Toolbar = (function () {
    const ENTITY_META = window.ENTITY_META || {};
    let isGlobalFullscreen = false;

    /* ────────────────────────────────────────────
       1. Column Popover (Configuraciones de Visibilidad)
    ───────────────────────────────────────────── */
    function buildColPopoverContentHTML(columns) {
        const content = document.createElement('ion-content');
        content.className = 'dv-popover-content';
        
        const header = document.createElement('ion-list-header');
        header.className = 'dv-popover-header';
        const labelContent = document.createElement('ion-label');
        labelContent.className = 'dv-sub-label';
        labelContent.textContent = 'Columnas visibles';
        header.appendChild(labelContent);
        content.appendChild(header);
        
        const list = document.createElement('ion-list');
        list.setAttribute('lines', 'none');
        
        (columns || []).forEach((col, i) => {
            // S40.5 QA Fix: Desplegar el Selector de Columnas excluyendo herramientas maestras de UX
            if (col.uiType === 'system-checkbox' || col.uiType === 'system-num') return;

            const item = document.createElement('ion-item');
            item.className = 'dv-popover-item';
            item.setAttribute('lines', 'none');
            
            const cb = document.createElement('ion-checkbox');
            cb.setAttribute('slot', 'start');
            cb.dataset.colidx = i;
            cb.checked = col.visible;
            cb.className = 'dv-popover-checkbox';
            item.appendChild(cb);
            
            const lbl = document.createElement('ion-label');
            lbl.className = 'dv-popover-label';
            lbl.textContent = col.label;
            item.appendChild(lbl);
            
            list.appendChild(item);
        });
        content.appendChild(list);
        return content;
    }

    function ensureColPopover(columns, onColToggle) {
        let pop = document.getElementById('dv-col-ion-popover');
        
        // S24.8 Fix (Rai-Debug): Ionic 'insertBefore' Crash on ViewChange
        // Root Cause: Destruir un Overlay <ion-popover> usando .remove() brutalmente puentea el ciclo 
        // de vida (disconnectedCallback) que llama internamente a B.dismiss(), crasheando el render de Ionic.
        // Fix: Si ya existe, simplemente actualizamos su DOM interno en lugar de destruirlo.
        if (pop) { 
            pop.innerHTML = '';
            pop.appendChild(buildColPopoverContentHTML(columns));
        } else {
            pop = document.createElement('ion-popover');
            pop.id = 'dv-col-ion-popover';
            pop.setAttribute('trigger', 'dv-col-trigger-btn');
            pop.setAttribute('trigger-action', 'click');
            pop.setAttribute('dismiss-on-select', 'false');
            pop.setAttribute('side', 'bottom');
            pop.setAttribute('alignment', 'end');
            pop.setAttribute('show-backdrop', 'false');
            document.body.appendChild(pop);
            
            pop.appendChild(buildColPopoverContentHTML(columns));
        }

        pop.querySelectorAll('ion-checkbox').forEach(function (cb) {
            const idx = parseInt(cb.getAttribute('data-colidx'), 10);
            cb.addEventListener('ionChange', function (e) {
                if (typeof onColToggle === 'function') onColToggle(idx, e.detail.checked);
            });
        });
    }

    /* ────────────────────────────────────────────
       2. DataView Toolbar (Buscador y Toggles)
    ───────────────────────────────────────────── */
    function buildToolbarHTML(viewType, entityName, onViewToggle, onFilterToggle) {
        const toolbar = document.createElement('div');
        toolbar.className = 'dv-toolbar';
        
        const left = document.createElement('div');
        left.className = 'dv-toolbar-left';
        
        const btnCols = document.createElement('button');
        btnCols.className = 'dv-btn dv-btn-ghost';
        btnCols.id = 'dv-col-trigger-btn';
        btnCols.title = 'Configurar columnas';
        const colIcon = document.createElement('ion-icon');
        colIcon.className = 'dv-options-icon';
        colIcon.setAttribute('name', 'options-outline');
        colIcon.setAttribute('slot', 'start');
        btnCols.appendChild(colIcon);
        btnCols.appendChild(document.createTextNode(' Columnas'));
        left.appendChild(btnCols);
        
        const btnFilter = document.createElement('button');
        btnFilter.className = 'dv-btn dv-btn-ghost';
        btnFilter.id = 'dv-filter-trigger-btn';
        btnFilter.title = 'Filtros avanzados';
        const filterIcon = document.createElement('ion-icon');
        filterIcon.className = 'dv-options-icon';
        filterIcon.setAttribute('name', 'filter-outline');
        filterIcon.setAttribute('slot', 'start');
        btnFilter.appendChild(filterIcon);
        btnFilter.appendChild(document.createTextNode(' Filtros'));
        btnFilter.addEventListener('click', () => {
             if (typeof onFilterToggle === 'function') onFilterToggle();
        });
        left.appendChild(btnFilter);
        
        const btnTable = document.createElement('button');
        btnTable.className = `dv-btn-icon ${viewType === 'table' ? 'active' : ''}`;
        btnTable.id = 'dv-view-table-btn';
        btnTable.title = 'Vista de lista';
        btnTable.textContent = '☰';
        btnTable.addEventListener('click', () => onViewToggle('table'));
        left.appendChild(btnTable);
        
        const btnGrid = document.createElement('button');
        btnGrid.className = `dv-btn-icon ${viewType === 'grid' ? 'active' : ''}`;
        btnGrid.id = 'dv-view-grid-btn';
        btnGrid.title = 'Vista de cuadrícula';
        btnGrid.textContent = '⊞';
        btnGrid.addEventListener('click', () => onViewToggle('grid'));
        left.appendChild(btnGrid);
        
        if (entityName === 'Persona' || entityName === 'Capacidad' || entityName === 'Dominio') {
            const btnTree = document.createElement('button');
            btnTree.className = `dv-btn-icon ${viewType === 'tree' ? 'active' : ''}`;
            btnTree.id = 'dv-view-tree-btn';
            btnTree.title = (entityName === 'Capacidad' || entityName === 'Dominio') ? `Jerarquía de ${entityName}s` : 'Diagrama de Organigrama';
            const iconTree = document.createElement('ion-icon');
            iconTree.setAttribute('name', 'git-network-outline');
            iconTree.setAttribute('name', 'git-network-outline');
            btnTree.appendChild(iconTree);
            btnTree.addEventListener('click', () => onViewToggle('tree'));
            left.appendChild(btnTree);
        }



        const right = document.createElement('div');
        right.className = 'dv-toolbar-right';
        
        const searchWrap = document.createElement('div');
        searchWrap.className = 'dv-search-wrap';
        const sb = document.createElement('ion-searchbar');
        sb.id = 'dv-search-input';
        sb.placeholder = 'Buscar en todos los campos…';
        sb.setAttribute('animated', 'true');
        sb.setAttribute('show-clear-button', 'focus');
        sb.setAttribute('debounce', '120');
        searchWrap.appendChild(sb);
        right.appendChild(searchWrap);
        
        toolbar.appendChild(left);
        toolbar.appendChild(right);
        return toolbar;
    }

    /* ────────────────────────────────────────────
       3. DataView Header Global
    ───────────────────────────────────────────── */
    function buildHeader(entityName, totalRecords, canCreate, onExportCSV, onImportCSVTrigger, onAddClick) {
        const meta = ENTITY_META[entityName] || { iconName: 'document-text-outline', color: 'medium', label: window.formatEntityName ? window.formatEntityName(entityName) : entityName };
        const displayLabel = window.formatEntityName ? window.formatEntityName(meta.label || entityName) : entityName;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'dv-header';
        
        const leftDiv = document.createElement('div');
        leftDiv.className = 'dv-header-left';
        
        const h2 = document.createElement('h2');
        const icon = document.createElement('ion-icon');
        icon.className = 'dv-title-icon';
        icon.setAttribute('name', meta.iconName);
        h2.appendChild(icon);
        h2.appendChild(document.createTextNode(' ' + displayLabel));
        
        const p = document.createElement('p');
        p.textContent = `${totalRecords} registro${totalRecords !== 1 ? 's' : ''} en total`;
        
        leftDiv.appendChild(h2);
        leftDiv.appendChild(p);
        
        const rightDiv = document.createElement('div');
        rightDiv.className = 'dv-header-actions';
        
        // Import Input Helper se ha eliminado. Su lógica ahora reside en UI_ETL_Modal
        
        const btnExp = document.createElement('button');
        btnExp.className = 'dv-btn dv-btn-ghost';
        if (typeof onExportCSV === 'function') btnExp.addEventListener('click', onExportCSV);
        const iconExp = document.createElement('ion-icon');
        iconExp.setAttribute('name', 'download-outline');
        iconExp.setAttribute('slot', 'start');
        btnExp.appendChild(iconExp);
        btnExp.appendChild(document.createTextNode(' Exportar CSV'));
        
        // Botón Fullscreen JIRA Style
        const btnExpFull = document.createElement('button');
        btnExpFull.className = 'dv-btn dv-btn-ghost';
        btnExpFull.id = 'dv-global-fullscreen-btn';
        btnExpFull.innerHTML = isGlobalFullscreen 
            ? '<ion-icon name="contract-outline" slot="start"></ion-icon> Colapsar' 
            : '<ion-icon name="expand-outline" slot="start"></ion-icon> Expandir';
            
        btnExpFull.onclick = () => {
            isGlobalFullscreen = !isGlobalFullscreen;
            const toolbar = document.querySelector('.dv-toolbar');
            const menu = document.querySelector('ion-menu');
            const splitPane = document.querySelector('ion-split-pane');
            const globalHeader = document.querySelector('#main-content > ion-header');
            const appContainer = document.getElementById('app-container');
            
            if (isGlobalFullscreen) {
                btnExpFull.innerHTML = '<ion-icon name="contract-outline" slot="start"></ion-icon> Colapsar';
                if (menu) menu.style.display = 'none';
                if (splitPane) {
                    splitPane.style.setProperty('--side-width', '0px');
                    splitPane.style.setProperty('--side-min-width', '0px');
                    splitPane.style.setProperty('--side-max-width', '0px');
                }
                if (appContainer) {
                    appContainer.style.paddingLeft = '24px';
                    appContainer.style.paddingRight = '24px';
                }
                if (globalHeader) {
                    globalHeader.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                    globalHeader.style.transform = 'translateY(-100%)';
                    globalHeader.style.opacity = '0';
                    setTimeout(() => { globalHeader.style.display = 'none'; window.dispatchEvent(new Event('resize')); }, 300);
                } else {
                    window.dispatchEvent(new Event('resize'));
                }
            } else {
                btnExpFull.innerHTML = '<ion-icon name="expand-outline" slot="start"></ion-icon> Expandir';
                if (menu) menu.style.display = '';
                if (splitPane) {
                    splitPane.style.removeProperty('--side-width');
                    splitPane.style.removeProperty('--side-min-width');
                    splitPane.style.removeProperty('--side-max-width');
                }
                if (appContainer) {
                    appContainer.style.removeProperty('padding-left');
                    appContainer.style.removeProperty('padding-right');
                }
                if (globalHeader) {
                    globalHeader.style.display = '';
                    setTimeout(() => {
                        globalHeader.style.transform = 'translateY(0)';
                        globalHeader.style.opacity = '1';
                        window.dispatchEvent(new Event('resize'));
                    }, 10);
                } else {
                    window.dispatchEvent(new Event('resize'));
                }
            }
            
        };
        
        const btnImp = document.createElement('button');
        btnImp.className = 'dv-btn dv-btn-ghost';
        if (typeof onImportCSVTrigger === 'function') btnImp.addEventListener('click', onImportCSVTrigger);
        const iconImp = document.createElement('ion-icon');
        iconImp.setAttribute('name', 'cloud-upload-outline');
        iconImp.setAttribute('slot', 'start');
        btnImp.appendChild(iconImp);
        btnImp.appendChild(document.createTextNode(' Importar CSV'));
        
        const btnAdd = document.createElement('button');
        btnAdd.className = 'dv-btn dv-btn-outline';
        if (typeof onAddClick === 'function') btnAdd.addEventListener('click', onAddClick);
        const iconAdd = document.createElement('ion-icon');
        iconAdd.setAttribute('name', 'add-outline');
        iconAdd.setAttribute('slot', 'start');
        btnAdd.appendChild(iconAdd);
        btnAdd.appendChild(document.createTextNode(` Crear ${displayLabel.replace(/s$/, '')}`));
        
        rightDiv.appendChild(btnExpFull);
        rightDiv.appendChild(btnExp);
        // btnImp se inyecta condicionalmente más abajo

        if (canCreate) {
            rightDiv.appendChild(btnImp);
            rightDiv.appendChild(btnAdd);
        }
        
        headerDiv.appendChild(leftDiv);
        headerDiv.appendChild(rightDiv);
        
        return headerDiv;
    }

    return {
        buildColPopoverContentHTML,
        ensureColPopover,
        buildToolbarHTML,
        buildHeader
    };
})();