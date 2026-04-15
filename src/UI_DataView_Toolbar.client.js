window.UI_DataView_Toolbar = (function () {
    const ENTITY_META = window.ENTITY_META || {};

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
    function buildToolbarHTML(viewType, entityName, onViewToggle) {
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
        // TODO (Future phase): Listeners para abrir panel de filtros
        btnFilter.addEventListener('click', () => {
             console.log('Panel de Filtros Avanzados (Próximamente)');
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
        
        if (entityName === 'Dominio') {
            const btnMap = document.createElement('button');
            btnMap.className = `dv-btn-icon ${viewType === 'map' ? 'active' : ''}`;
            btnMap.id = 'dv-view-map-btn';
            btnMap.title = 'Formato Mapa (Treemap)';
            const iconMap = document.createElement('ion-icon');
            iconMap.setAttribute('name', 'git-network-outline');
            btnMap.appendChild(iconMap);
            btnMap.addEventListener('click', () => onViewToggle('map'));
            left.appendChild(btnMap);
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
        
        rightDiv.appendChild(btnExp);
        rightDiv.appendChild(btnImp);
        
        if (canCreate) {
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