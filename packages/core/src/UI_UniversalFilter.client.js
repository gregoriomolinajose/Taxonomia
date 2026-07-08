/**
 * @file UI_UniversalFilter.client.js
 * @description Componente clase para el Drawer lateral de filtros universales.
 */

class UI_UniversalFilter {
    /**
     * @param {Object} config
     * @param {string} config.entityName - Nombre de la entidad (ej. "Personas")
     * @param {Object} config.schemaConfig - Referencia a APP_SCHEMAS
     * @param {Array} config.records - Dataset actual en memoria
     * @param {HTMLElement} config.containerEl - Elemento DOM contenedor
     * @param {Function} config.onFilterChange - Callback emitido al cambiar filtros
     */
    constructor(config) {
        this.entityName = config.entityName;
        this.schemaConfig = config.schemaConfig;
        this.records = config.records || [];
        this.containerEl = config.containerEl;
        this.onFilterChange = config.onFilterChange || (() => {});
        this.lookupData = config.lookupData || {}; // S54.4
        
        // State
        this.activeFilters = {}; // ej. { "departamento": ["Identidad"] }
        this.selectedFields = []; // campos agregados al drawer
        
        // Setup cache
        this.availableFields = this._getFilterableFields();
        this.fieldOptions = {}; 
    }
    
    _getFilterableFields() {
        const entitySchema = this.schemaConfig[this.entityName] || { fields: [] };
        return entitySchema.fields.filter(f => !f.hidden && f.type !== 'divider');
    }
    
    _getUniqueValuesForField(fieldKey) {
        if (this.fieldOptions[fieldKey]) return this.fieldOptions[fieldKey];
        
        const values = new Set();
        let hasEmpty = false;
        
        this.records.forEach(r => {
            const val = r[fieldKey];
            if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
                hasEmpty = true;
            } else if (Array.isArray(val)) {
                val.forEach(v => values.add(v));
            } else {
                values.add(val);
            }
        });
        
        const sorted = Array.from(values).sort();
        if (hasEmpty) {
            sorted.push('[Sin Valor]');
        }
        
        this.fieldOptions[fieldKey] = sorted;
        return sorted;
    }
    
    _renderHtml() {
        const fieldOptionsHtml = this.availableFields
            .filter(f => !this.selectedFields.includes(f.name))
            .map(f => `<option value="${f.name}">${f.label || f.name}</option>`)
            .join('');
            
        const cardsHtml = this.selectedFields.map(fieldKey => {
            const fieldDef = this.availableFields.find(f => f.name === fieldKey);
            const options = this._getUniqueValuesForField(fieldKey);
            const lookupArr = this.lookupData[fieldKey]; // S54.4
            
            const checkboxesHtml = options.map((opt, idx) => {
                const id = `tx-chk-${fieldKey}-${idx}`;
                const isChecked = this.activeFilters[fieldKey] && this.activeFilters[fieldKey].includes(opt);
                
                let displayOpt = opt;
                if (lookupArr && opt !== '[Sin Valor]') {
                    const found = lookupArr.find(l => String(l.value) === String(opt));
                    if (found) displayOpt = found.label;
                }
                
                return `
                    <div class="checkbox-item">
                        <input type="checkbox" id="${id}" data-field="${fieldKey}" data-value="${opt}" ${isChecked ? 'checked' : ''} />
                        <label for="${id}">${displayOpt}</label>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="filter-card expanded" data-card-field="${fieldKey}">
                    <div class="filter-card-header">
                        <h3>${fieldDef.label || fieldDef.name}</h3>
                        <a class="clear-link" data-clear-field="${fieldKey}">Borrar</a>
                    </div>
                    <div class="filter-card-body">
                        <input type="search" class="internal-search" placeholder="Buscar opciones..." />
                        <div class="checkbox-list">
                            ${checkboxesHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <!-- Overlay -->
            <div class="tx-filter-overlay active js-filter-overlay"></div>
            
            <!-- Drawer -->
            <div class="tx-filter-drawer active js-filter-drawer">
                <div class="drawer-header">
                    <h2>Filtros</h2>
                    <button class="close-btn js-filter-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="drawer-body">
                    <div class="field-selector">
                        <label>Selecciona un campo para filtrar</label>
                        <select class="js-filter-field-select">
                            <option value="">Buscar campos...</option>
                            ${fieldOptionsHtml}
                        </select>
                    </div>
                    ${cardsHtml}
                </div>
                <div class="drawer-footer">
                    <button class="btn-clear-all js-filter-clear-all">Borrar todo</button>
                </div>
            </div>
        `;
    }
    
    _bindEvents() {
        const doc = this.containerEl;
        
        const closeBtn = doc.querySelector('.js-filter-close');
        const overlay = doc.querySelector('.js-filter-overlay');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
        if (overlay) overlay.addEventListener('click', () => this.hide());
        
        const select = doc.querySelector('.js-filter-field-select');
        if (select) {
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.selectedFields.push(e.target.value);
                    this.render(); 
                }
            });
        }
        
        const checkboxes = doc.querySelectorAll('.checkbox-item input[type="checkbox"]');
        checkboxes.forEach(chk => {
            chk.addEventListener('change', (e) => {
                const field = e.target.getAttribute('data-field');
                const val = e.target.getAttribute('data-value');
                
                if (!this.activeFilters[field]) {
                    this.activeFilters[field] = [];
                }
                
                if (e.target.checked) {
                    this.activeFilters[field].push(val);
                } else {
                    this.activeFilters[field] = this.activeFilters[field].filter(v => v !== val);
                    if (this.activeFilters[field].length === 0) {
                        delete this.activeFilters[field];
                    }
                }
                this.onFilterChange(this.activeFilters);
            });
        });
        
        const clearLinks = doc.querySelectorAll('.clear-link');
        clearLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const field = e.target.getAttribute('data-clear-field');
                delete this.activeFilters[field];
                this.selectedFields = this.selectedFields.filter(f => f !== field);
                this.onFilterChange(this.activeFilters);
                this.render();
            });
        });
        
        const clearAll = doc.querySelector('.js-filter-clear-all');
        if (clearAll) {
            clearAll.addEventListener('click', () => {
                this.activeFilters = {};
                this.selectedFields = [];
                this.onFilterChange(this.activeFilters);
                this.render();
            });
        }
    }
    
    render() {
        if (!this.containerEl) return;
        if (this._hideTimeout) clearTimeout(this._hideTimeout);
        this.containerEl.innerHTML = this._renderHtml();
        this._bindEvents();
    }
    
    hide() {
        const drawer = this.containerEl.querySelector('.tx-filter-drawer');
        const overlay = this.containerEl.querySelector('.tx-filter-overlay');
        if (drawer) drawer.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        if (this._hideTimeout) clearTimeout(this._hideTimeout);
        this._hideTimeout = setTimeout(() => {
            this.containerEl.innerHTML = '';
        }, 300);
    }
}

// Export para el entorno (Local / Testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI_UniversalFilter;
}
window.UI_UniversalFilter = UI_UniversalFilter;
