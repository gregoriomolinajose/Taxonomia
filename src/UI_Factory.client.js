window.UI_Factory = {
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
    buildDrawerHeader: function(config) {
        const { entityName, data, localEditId, onClose, actions } = config;

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

        const closeBtn = document.createElement('ion-button');
        closeBtn.setAttribute('fill', 'clear');
        closeBtn.setAttribute('color', 'medium');
        closeBtn.style.margin = '0 -8px 0 0';
        closeBtn.className = 'btn-close-drawer';
        closeBtn.innerHTML = '<ion-icon slot="icon-only" name="close-outline"></ion-icon>';
        if (onClose) {
            closeBtn.addEventListener('click', onClose);
        }
        
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
        let semanticName = 'Creando Registro';
        if (window.Schema_Utils && window.Schema_Utils.getSemanticTitle) {
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
        } else {
            // Generate Initials
            if (window.Schema_Utils && window.Schema_Utils.getAvatarInitials) {
                avatarBox.textContent = window.Schema_Utils.getAvatarInitials(semanticName);
            } else {
                avatarBox.textContent = semanticName ? semanticName.substring(0, 2).toUpperCase() : '??';
            }
        }

        identityRow.appendChild(avatarBox);

        // Info Column
        const infoCol = document.createElement('div');
        infoCol.style.display = 'flex';
        infoCol.style.flexDirection = 'column';
        infoCol.style.justifyContent = 'center';
        infoCol.style.gap = '4px';

        const recordNameTitle = document.createElement('h1');
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
        
        let displayBadge = localEditId || '(Autogenerado)';
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
