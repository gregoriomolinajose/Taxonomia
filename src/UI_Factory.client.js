window.UI_Factory = {
    /**
     * H8 Fix: Formaliza el patrón de abrir un Drawer con un TXSelect de búsqueda múltiple, 
     * aislando la lógica de "falso field" de los consumidores de la UI.
     */
    openSearchableDrawer: function(config) {
        const { targetEntity, contextId, currentData, title, description, edgeType, onConfirm, localEventBus, parentId } = config;
        if (!window.DrawerStackController) return;
        
        const drawerHeader = window.UI_Factory.buildDrawerHeader({
            entityName: targetEntity,
            titleOverride: `Agregar ${window.formatEntityName ? window.formatEntityName(targetEntity) : targetEntity}s`,
            badgeOverride: '(Búsqueda y Multiselección)',
            onClose: () => window.DrawerStackController.closeTop()
        });
        
        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.height = '100%';
        content.style.background = 'var(--ion-background-color, #fff)';
        
        content.appendChild(drawerHeader);
        
        const scrollableContent = document.createElement('div');
        scrollableContent.style.padding = '24px 16px';
        scrollableContent.style.flex = '1';
        scrollableContent.style.overflowY = 'auto';
        
        if (description) {
            const desc = document.createElement('p');
            desc.textContent = description;
            desc.style.color = 'var(--ion-color-medium)';
            desc.style.fontSize = '0.9rem';
            desc.style.marginBottom = '24px';
            scrollableContent.appendChild(desc);
        }
        
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(targetEntity) : 'id_registro';
        const virtualField = {
            name: 'vincular_multi',
            type: 'relation',
            uiComponent: 'searchable_multi',
            targetEntity: targetEntity,
            valueField: pkField,
            labelField: 'nombre',
            graphEdgeType: edgeType
        };
        
        const virtualData = { vincular_multi: currentData.map(d => String(d[pkField] || d.id_registro || d)) };
        const searchableNode = window.UI_Factory.buildFieldNode(virtualField, targetEntity, virtualData, localEventBus, contextId);
        scrollableContent.appendChild(searchableNode);
        
        content._formSubmitterInstance = {
            executeSave: () => {
                let actualNode = searchableNode;
                if (window.UI_FormUtils && window.UI_FormUtils.unwrapFieldNode) {
                    actualNode = window.UI_FormUtils.unwrapFieldNode(searchableNode);
                }

                if (actualNode && actualNode.getValidatedValue) {
                    const selectedIds = actualNode.getValidatedValue() || [];
                    if (typeof onConfirm === 'function') {
                        onConfirm(selectedIds);
                    } else if (window.Graph_Utils && parentId && edgeType) {
                        const normPK = window.UI_FormUtils ? window.UI_FormUtils.normalizeId(parentId) : String(parentId);
                        const existingIds = currentData.map(d => {
                            const rawId = d[pkField] || d.id_registro || d;
                            return window.UI_FormUtils ? window.UI_FormUtils.normalizeId(rawId) : String(rawId);
                        });
                        
                        // Remove edges that are no longer selected
                        existingIds.forEach(eid => {
                            if (!selectedIds.includes(eid)) window.Graph_Utils.deleteTemporalEdge(normPK, eid, edgeType, contextId);
                        });
                        // Add newly selected edges
                        selectedIds.forEach(eid => {
                            if (!existingIds.includes(eid)) window.Graph_Utils.upsertTemporalEdge(normPK, eid, edgeType, contextId);
                        });
                    }
                }
                return Promise.resolve(true);
            }
        };
        
        content.appendChild(scrollableContent);
        
        window.DrawerStackController.push(content);
    },

    /**
     * Construye un Drawer Header reutilizable con un Breadcrumb (Top Row) y Identity Row (Bottom Row).
     * Aislando el layout CSS y el DOM imperativo original de FormRenderer_UI.
     * 
     * @param {Object} config Configuración de dependencias.
     * @param {String} config.entityName Nombre de entidad (Schema Reference).
     * @param {Object} config.data Objeto de datos activo para binding visual.
     * @param {String} config.localEditId Identity fallback si data no lo provee.
     * @param {Function} config.onClose Función de cierre inyectada.
     * @param {Array} config.actions Array de acciones Opcionales (Próxima Extensión).
     * @returns {HTMLElement} Div container .drawer-header a ensamblar.
     */
    buildDrawerHeader: function(config = {}) {
        const { entityName, data = {}, localEditId, onClose, actions, titleOverride, badgeOverride } = config;

        const header = document.createElement('div');
        header.className = 'drawer-header';
        header.style.flexDirection = 'column';
        header.style.alignItems = 'stretch';
        header.style.justifyContent = 'flex-start';
        header.style.padding = 'var(--spacing-3) var(--spacing-4)';
        header.style.borderBottom = '1px solid var(--color-border, var(--ion-color-light-shade))';

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';
        topRow.style.width = '100%';
        
        // 1) Breadcrumb / Entity Type
        const breadcrumb = document.createElement('div');
        breadcrumb.style.display = 'flex';
        breadcrumb.style.alignItems = 'center';
        breadcrumb.style.gap = '8px';

        const schemaSchemas = window.APP_SCHEMAS || (typeof global !== 'undefined' ? global.APP_SCHEMAS : {});
        const metadata = (schemaSchemas && schemaSchemas[entityName] && schemaSchemas[entityName].metadata) || {};
        const iconName = metadata.iconName || 'folder-outline';

        const headerIcon = document.createElement('ion-icon');
        headerIcon.setAttribute('name', iconName);
        headerIcon.style.color = 'var(--dv-primary, var(--ion-color-medium))';
        headerIcon.style.fontSize = '14px';
        breadcrumb.appendChild(headerIcon);

        const entityTitle = document.createElement('span');
        entityTitle.style.fontSize = '12px';
        entityTitle.style.fontWeight = '500';
        entityTitle.style.color = 'var(--ion-color-medium)';
        entityTitle.textContent = (window.formatEntityName && entityName) ? window.formatEntityName(entityName) : entityName;
        breadcrumb.appendChild(entityTitle);

        const actionsContainer = document.createElement('div');
        actionsContainer.style.display = 'flex';
        actionsContainer.style.alignItems = 'center';
        actionsContainer.style.gap = '8px';

        // Custom Extensible Actions (M:N, S37.6)
        if (actions && Array.isArray(actions)) {
            actions.forEach(action => {
                const actionBtn = document.createElement('ion-button');
                actionBtn.setAttribute('fill', 'clear');
                if (action.color) actionBtn.setAttribute('color', action.color);
                
                if (action.icon) {
                    const actIcon = document.createElement('ion-icon');
                    actIcon.setAttribute('slot', 'icon-only');
                    actIcon.setAttribute('name', action.icon);
                    actionBtn.appendChild(actIcon);
                } else if (action.label) {
                    actionBtn.textContent = action.label;
                }
                
                if (action.onClick) {
                    actionBtn.addEventListener('click', action.onClick);
                }
                actionsContainer.appendChild(actionBtn);
            });
        }

        // S51.6 Fullscreen Toggle Button
        const fullscreenBtn = document.createElement('ion-button');
        fullscreenBtn.setAttribute('fill', 'clear');
        fullscreenBtn.setAttribute('color', 'medium');
        fullscreenBtn.className = 'btn-fullscreen-drawer';
        fullscreenBtn.innerHTML = '<ion-icon slot="icon-only" name="expand-outline"></ion-icon>';
        fullscreenBtn.addEventListener('click', (e) => {
            const drawerPanel = e.target.closest('.drawer-panel');
            if (drawerPanel) {
                const isFullscreen = drawerPanel.classList.toggle('fullscreen');
                const icon = fullscreenBtn.querySelector('ion-icon');
                if (icon) {
                    icon.name = isFullscreen ? 'contract-outline' : 'expand-outline';
                }
            }
        });

        const closeBtn = document.createElement('ion-button');
        closeBtn.setAttribute('fill', 'clear');
        closeBtn.setAttribute('color', 'medium');
        closeBtn.style.margin = '0 -8px 0 0';
        closeBtn.className = 'btn-close-drawer';
        closeBtn.innerHTML = '<ion-icon slot="icon-only" name="close-outline"></ion-icon>';
        if (onClose) {
            closeBtn.addEventListener('click', onClose);
        }
        
        actionsContainer.appendChild(fullscreenBtn);
        actionsContainer.appendChild(closeBtn);

        topRow.appendChild(breadcrumb);
        topRow.appendChild(actionsContainer);
        header.appendChild(topRow);

        // 2) Record Identity Row (Avatar + Name + ID)
        const identityRow = document.createElement('div');
        identityRow.style.display = 'flex';
        identityRow.style.alignItems = 'center';
        identityRow.style.gap = '16px';
        identityRow.style.marginTop = '16px';
        identityRow.style.marginBottom = '8px';

        // Extract Semantic Name early to generate initials
        let semanticName = titleOverride || 'Creando Registro';
        if (!titleOverride && window.Schema_Utils && window.Schema_Utils.getSemanticTitle) {
            semanticName = window.Schema_Utils.getSemanticTitle(entityName, data);
        }

        // Circular Badge / Avatar
        const avatarBox = document.createElement('div');
        avatarBox.style.width = '48px';
        avatarBox.style.height = '48px';
        avatarBox.style.borderRadius = '50%';
        avatarBox.style.display = 'flex';
        avatarBox.style.justifyContent = 'center';
        avatarBox.style.alignItems = 'center';
        avatarBox.style.flexShrink = '0';
        avatarBox.style.border = '1px solid var(--ion-color-step-150, #d7d8da)';
        avatarBox.style.background = 'var(--ion-color-step-50, #f4f5f8)';
        avatarBox.style.color = 'var(--ion-color-dark)';
        avatarBox.style.fontSize = '18px';
        avatarBox.style.fontWeight = '600';
        avatarBox.style.overflow = 'hidden';

        if (data && data.avatar && data.avatar.startsWith('http')) {
            avatarBox.style.backgroundImage = `url('${data.avatar}')`;
            avatarBox.style.backgroundSize = 'cover';
            avatarBox.style.backgroundPosition = 'center';
            avatarBox.style.border = 'none';
        } else {
            // S53: Apply Entity Icon instead of initials
            const schemaDef = schemaSchemas[entityName] || {};
            const entityColor = (schemaDef.metadata && schemaDef.metadata.color) ? schemaDef.metadata.color : 'primary';
            const entityIcon = (schemaDef.metadata && schemaDef.metadata.iconName) ? schemaDef.metadata.iconName : 'folder-outline';

            avatarBox.style.background = `var(--ion-color-${entityColor}, var(--ion-color-primary))`;
            avatarBox.style.color = '#ffffff';
            avatarBox.style.border = 'none';

            const iconEl = document.createElement('ion-icon');
            iconEl.setAttribute('name', entityIcon);
            iconEl.style.fontSize = '24px';
            avatarBox.appendChild(iconEl);
        }

        identityRow.appendChild(avatarBox);

        // Info Column
        const infoCol = document.createElement('div');
        infoCol.style.display = 'flex';
        infoCol.style.flexDirection = 'column';
        infoCol.style.justifyContent = 'center';
        infoCol.style.gap = '4px';

        const recordNameTitle = document.createElement('h1');
        recordNameTitle.className = 'drawer-dynamic-title';
        recordNameTitle.style.margin = '0';
        recordNameTitle.style.fontSize = '18px';
        recordNameTitle.style.fontWeight = '700';
        recordNameTitle.style.color = 'var(--ion-color-dark)';
        recordNameTitle.style.lineHeight = '1.2';
        recordNameTitle.style.wordBreak = 'break-word';
        recordNameTitle.textContent = semanticName;

        const idTag = document.createElement('div');
        idTag.style.display = 'inline-flex';
        idTag.style.background = 'transparent';
        idTag.style.border = '1px solid var(--color-border, var(--ion-color-step-300))';
        idTag.style.borderRadius = '4px';
        idTag.style.padding = '2px 6px';
        idTag.style.fontSize = '11px';
        idTag.style.fontWeight = '600';
        idTag.style.color = 'var(--ion-color-medium)';
        idTag.style.alignSelf = 'flex-start';
        
        let displayBadge = badgeOverride || localEditId || '(Autogenerado)';
        if (data && schemaSchemas && schemaSchemas[entityName]) {
            const schemaDef = schemaSchemas[entityName];
            const targetFields = schemaDef.fields || [];
            
            const badgeField = targetFields.find(f => f.type === 'badge');
            if (badgeField && data[badgeField.name] && String(data[badgeField.name]).trim() !== '') {
                displayBadge = data[badgeField.name];
            } else if (data['lexical_id']) {
                displayBadge = data['lexical_id'];
            }
        }
        idTag.textContent = displayBadge;

        infoCol.appendChild(recordNameTitle);
        infoCol.appendChild(idTag);

        identityRow.appendChild(infoCol);
        header.appendChild(identityRow);

        return header;
    }
};
