/**
 * @file UI_UniversalFilter.client.js
 * @description Componente visual para el Drawer lateral de filtros universales.
 */

const UI_UniversalFilter = {
    
    /**
     * Retorna el HTML estático (skeleton) del drawer de filtros.
     * En esta fase (S54.1), utiliza mocks para visualizar la estructura.
     */
    renderDrawerSkeleton: function() {
        return `
            <!-- Overlay -->
            <div class="tx-filter-overlay active" id="txFilterOverlay"></div>
            
            <!-- Drawer -->
            <div class="tx-filter-drawer active" id="txFilterDrawer">
                
                <!-- Header -->
                <div class="drawer-header">
                    <h2>Filtros</h2>
                    <button class="close-btn" id="txFilterCloseBtn" aria-label="Cerrar">&times;</button>
                </div>
                
                <!-- Body -->
                <div class="drawer-body">
                    
                    <!-- Dropdown Seleccionador -->
                    <div class="field-selector">
                        <label>Selecciona un campo para filtrar</label>
                        <select>
                            <option value="">Buscar campos...</option>
                            <option value="estado">Estado</option>
                            <option value="responsable">Responsable</option>
                            <option value="fecha">Fecha de creación</option>
                        </select>
                    </div>

                    <!-- MOCK CARD 1: Área de producto (Expandido) -->
                    <div class="filter-card expanded">
                        <div class="filter-card-header">
                            <h3>Área de producto</h3>
                            <a class="clear-link">Borrar</a>
                        </div>
                        <div class="filter-card-body">
                            <input type="search" class="internal-search" placeholder="Buscar opciones..." />
                            <div class="checkbox-list">
                                <div class="checkbox-item">
                                    <input type="checkbox" id="chk-ap-1" />
                                    <label for="chk-ap-1">Seleccionar todo</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="chk-ap-2" checked />
                                    <label for="chk-ap-2">Identidad</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="chk-ap-3" />
                                    <label for="chk-ap-3">Colaboración</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="chk-ap-4" />
                                    <label for="chk-ap-4">Sin valor</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MOCK CARD 2: Estado (Contraído) -->
                    <div class="filter-card">
                        <div class="filter-card-header">
                            <h3>Estado</h3>
                        </div>
                        <div class="filter-card-body">
                            <div class="checkbox-list">
                                <div class="checkbox-item">
                                    <input type="checkbox" id="chk-es-1" />
                                    <label for="chk-es-1">Activo</label>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="chk-es-2" />
                                    <label for="chk-es-2">Inactivo</label>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Footer -->
                <div class="drawer-footer">
                    <button class="btn-clear-all">Borrar todo</button>
                </div>

            </div>
        `;
    }
};

// Export para el entorno (Local / Testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI_UniversalFilter;
}
