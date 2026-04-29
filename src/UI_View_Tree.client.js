/**
 * UI_View_Tree: Módulo encargado de renderizar el diagrama de jerarquía (Organigrama).
 * Separa la complejidad de configuración de ApexTree del orquestador DataView_UI.
 */
(function(global) {
    if (global.UI_View_Tree) return;

    global.UI_View_Tree = {
        /**
         * Renderiza el árbol en el contenedor proporcionado basándose en el estado.
         * @param {HTMLElement} dataZone El contenedor principal donde inyectar el diagrama.
         * @param {Object} state El estado actual de DataView (_state).
         */
        render: function(dataZone, state) {
            const treeContainer = document.createElement('div');
            treeContainer.id = 'org-chart-container';
            treeContainer.style.width = '100%';
            treeContainer.style.height = 'calc(100vh - 150px)';
            dataZone.appendChild(treeContainer);
            
            if (typeof global.ApexTree !== 'undefined' && global.DataEngine && global.DataEngine.buildHierarchyTree) {
                // Utiliza requestAnimationFrame para asegurar que el contenedor tenga dimensiones reales antes de leer offsetWidth
                requestAnimationFrame(() => {
                    // Previene race condition si el usuario cambia de vista antes de que se ejecute el frame
                    if (!document.getElementById('org-chart-container')) return;
                    
                    const perNodeOpts = state.entityName === 'Capacidad' ? { nodeTemplate: this._buildCapacidadNodeTemplate } : undefined;
                    const treeData = global.DataEngine.buildHierarchyTree(state.filtered, state.entityName, perNodeOpts);
                    
                    if (treeData) {
                        const options = {
                            contentKey: 'data',
                            width: treeContainer.offsetWidth || 800,
                            height: treeContainer.offsetHeight || 600,
                            nodeWidth: 260,
                            nodeHeight: 90,
                            childrenSpacing: 60,
                            siblingSpacing: 24,
                            direction: 'top',
                            enableToolbar: true,
                            enableSearch: true,
                            nodeTemplate: this._buildNodeTemplate
                        };
                        try {
                            const tree = new global.ApexTree(document.getElementById('org-chart-container'), options);
                            tree.render(treeData);
                        } catch(e) {
                            treeContainer.innerHTML = `<div class="dv-empty">Error renderizando ApexTree: ${e.message}</div>`;
                        }
                    } else {
                        treeContainer.innerHTML = `<div class="dv-empty">No hay datos jerárquicos o no hay líder definido.</div>`;
                    }
                });
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'dv-empty';
                placeholder.textContent = 'Diagrama de Árbol / Organigrama (Motor no disponible)';
                treeContainer.appendChild(placeholder);
            }
        },

        /**
         * Template HTML para Capacidad (Inyectado via Per Node Options)
         */
        _buildCapacidadNodeTemplate: function(content) {
            const escapeHTML = (str) => String(str || '').replace(/[&<>'"]/g, 
                tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag])
            );
            const nombre = escapeHTML(content.nombre || 'Capacidad Desconocida');
            const nivel = escapeHTML(content.nivel_tipo || '');
            const codigo = escapeHTML(content.abreviacion || content.id_externo || '');
            const path = escapeHTML(content.path_completo_es || '');
            
            const bgColors = {
                '1': '#1976d2', // Macrocapacidad (Azul oscuro)
                '2': '#0288d1', // Capacidad
                '3': '#0097a7', // Subcapacidad
                '4': '#00796b'  // Componente (Verde azulado)
            };
            const bgColor = bgColors[nivel] || '#455a64';
            
            return `<div class="org-node-card" style="border-left: 5px solid ${bgColor}; padding: 10px; min-width: 240px; background: white; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 11px; color: ${bgColor}; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Nivel ${nivel} ${codigo ? ` • ${codigo}` : ''}</div>
                <div class="org-node-name" style="font-size: 14px; font-weight: bold; color: #333; margin-bottom: 6px;" title="${nombre}">${nombre}</div>
                <div class="org-node-dept" style="font-size: 10px; color: #777; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${path}">${path}</div>
            </div>`;
        },

        /**
         * Generador puro del HTML de un nodo de ApexTree (Por defecto Persona).
         * Extraído para mantener la cohesión de render().
         */
        _buildNodeTemplate: function(content) {
            const escapeHTML = (str) => String(str || '').replace(/[&<>'"]/g, 
                tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag])
            );
            
            const getInitials = (name) => {
                if (!name) return '?';
                const parts = name.split(' ').filter(Boolean);
                return parts.length > 1 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
            };

            const getDeptColor = (dept) => {
                if (!dept) return '#607d8b'; // Default Grey
                let hash = 0;
                for (let i = 0; i < dept.length; i++) {
                    hash = dept.charCodeAt(i) + ((hash << 5) - hash);
                }
                return `hsl(${Math.abs(hash % 360)}, 65%, 45%)`;
            };

            const nombre = escapeHTML(content._nombre_completo || content.nombre || 'Desconocido');
            const cargo = escapeHTML(content.cargo || '');
            const dept = escapeHTML(content['Área'] || content.departamento || '');
            
            let avatarUrl = '';
            if (content.Avatar) {
                avatarUrl = Array.isArray(content.Avatar) ? (content.Avatar[0]?.url || '') : content.Avatar;
            }
            const avatarHTML = avatarUrl ? `<img src="${escapeHTML(avatarUrl)}" alt="Avatar" onerror="this.style.display='none'">` : getInitials(nombre);
            const accentColor = getDeptColor(content['Área'] || content.departamento);

            return `<div class="org-node-card">
                <div class="org-node-accent" style="background-color: ${accentColor}"></div>
                <div class="org-node-avatar" style="background-color: ${avatarUrl ? 'transparent' : accentColor}">${avatarHTML}</div>
                <div class="org-node-content">
                    <div class="org-node-name" title="${nombre}">${nombre}</div>
                    <div class="org-node-role" title="${cargo}">${cargo}</div>
                    ${dept ? `<div class="org-node-dept" style="color: ${accentColor}; border: 1px solid ${accentColor}" title="${dept}">${dept}</div>` : ''}
                </div>
            </div>`;
        }
    };
})(window);
