/**
 * UI_Component_EntityDirectory.client.js
 * 
 * Generador genérico de directorios interactivos estilo Dashboard.
 */
(function(global) {

  // Almacena las instancias de directorios activos para su repintado dinámico
  global._directoryInstances = global._directoryInstances || {};

  /**
   * Refresca un directorio específico basado en su entidad
   */
  global.refreshDashboardDirectory = function(entityName) {
      var instance = global._directoryInstances[entityName];
      if (instance) {
          global.UI_Factory.buildEntityDirectory(instance.config, instance.containerId);
      }
  };

  if (!global.UI_Factory) global.UI_Factory = {};

  global.UI_Factory.buildEntityDirectory = function(config, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    // Guardar instancia
    global._directoryInstances[config.entityName] = {
        config: config,
        containerId: containerId
    };
    
    var dshConfig = config.uiConfig || {};
    var parentEntityName = config.entityName; // Ej: 'Rol'
    var targetEntityName = dshConfig.targetEntity || 'Persona'; // Ej: 'Persona'
    var edgeType = dshConfig.edgeType || 'PERSONA_ROL'; 
    var subtitleEdge = dshConfig.subtitleFallbackEdge; // Ej: 'PERSONA_EQUIPO'
    var subtitleEntityName = dshConfig.subtitleFallbackEntity; // Ej: 'Equipo'

    // Si no hay datos hidratados todavía, ignoramos y mostramos skeleton
    if (!global.DataStore || !global.DataStore._cache || Object.keys(global.DataStore._cache).length === 0) {
        global.DOM.clear(container);
        container.innerHTML = `
            <div style="width: 100%; padding: 24px;">
                <div style="width: 300px; height: 32px; background: var(--color-bg-alt, #f0f2f5); border-radius: 8px; margin-bottom: 8px; animation: pulse 1.5s infinite;"></div>
                <div style="width: 200px; height: 16px; background: var(--color-bg-alt, #f0f2f5); border-radius: 8px; margin-bottom: 24px; animation: pulse 1.5s infinite;"></div>
                <div style="width: 100%; height: 50px; background: var(--color-bg-alt, #f0f2f5); border-radius: 30px; margin-bottom: 24px; animation: pulse 1.5s infinite;"></div>
                <ion-row>
                    <ion-col size="12" size-sm="6" size-md="4" size-lg="3">
                        <div style="width: 100%; height: 80px; background: var(--color-bg-alt, #f0f2f5); border-radius: 12px; animation: pulse 1.5s infinite;"></div>
                    </ion-col>
                </ion-row>
            </div>
            <style>
                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
            </style>
        `;
        return;
    }

    var parents = global.DataStore.get(parentEntityName) || [];
    parents = parents.filter(function(r) { return r.estado !== 'Eliminado'; });

    var targets = global.DataStore.get(targetEntityName) || [];
    targets = targets.filter(function(p) { return p.estado !== 'Eliminado'; });

    var subtitles = [];
    if (subtitleEntityName) {
        subtitles = global.DataStore.get(subtitleEntityName) || [];
        subtitles = subtitles.filter(function(e) { return e.estado !== 'Eliminado'; });
    }
    
    var edges = global.DataStore.get('Sys_Graph_Edges') || [];
    edges = edges.filter(function(e) { return e.estado !== 'Eliminado'; });

    var primaryEdges = edges.filter(function(e) { return e.tipo_relacion === edgeType; });
    var subEdges = subtitleEdge ? edges.filter(function(e) { return e.tipo_relacion === subtitleEdge; }) : [];

    // Mapear conteo de targets por parent
    var parentCounts = {};
    var parentMembers = {};
    
    primaryEdges.forEach(function(edge) {
        var idPadre = edge.id_nodo_padre;
        var idHijo = edge.id_nodo_hijo;

        // La arista puede estar en un sentido u otro, determinamos cuál es target
        // Asumimos id_nodo_hijo es el Target, pero si edgeType es invertido...
        // Por seguridad, buscamos si el hijo o el padre está en la lista de Targets
        var targetIdStr = String(idHijo);
        var parentIdStr = String(idPadre);

        // Validar si la entidad padre es el nodo padre
        var isParentNodePadre = parents.some(function(p) { return String(p[global.APP_SCHEMAS[parentEntityName].primaryKey]) === parentIdStr; });
        var isTargetNodeHijo = targets.some(function(t) { return String(t[global.APP_SCHEMAS[targetEntityName].primaryKey]) === targetIdStr; });

        if (!isParentNodePadre && !isTargetNodeHijo) {
             // Inverted Edge?
             targetIdStr = String(idPadre);
             parentIdStr = String(idHijo);
        }

        if (!parentCounts[parentIdStr]) {
            parentCounts[parentIdStr] = 0;
            parentMembers[parentIdStr] = [];
        }
        
        var targetPK = global.APP_SCHEMAS[targetEntityName].primaryKey;
        var isAlreadyMember = parentMembers[parentIdStr].some(function(m) { return String(m[targetPK]) === String(targetIdStr); });
        
        if (!isAlreadyMember) {
            var targetInfo = targets.find(function(p) { return String(p[targetPK]) === String(targetIdStr); });
            if (targetInfo) {
                parentCounts[parentIdStr]++;
                parentMembers[parentIdStr].push(targetInfo);
            }
        }
    });

    // Mapear fallback subtitle
    var targetSubtitleMap = {};
    subEdges.forEach(function(edge) {
        var idSubPadre = edge.id_nodo_padre;
        var idSubHijo = edge.id_nodo_hijo;
        
        // Target is usually the person. Subtitle entity is usually Equipo or Rol.
        var targetIdStr = String(idSubHijo);
        var subIdStr = String(idSubPadre);
        
        var isTargetHijo = targets.some(function(t) { return String(t[global.APP_SCHEMAS[targetEntityName].primaryKey]) === targetIdStr; });
        if (!isTargetHijo) {
            targetIdStr = String(idSubPadre);
            subIdStr = String(idSubHijo);
        }

        if (!targetSubtitleMap[targetIdStr]) {
            targetSubtitleMap[targetIdStr] = [];
        }
        
        var subPK = global.APP_SCHEMAS[subtitleEntityName].primaryKey;
        var subSchema = global.APP_SCHEMAS[subtitleEntityName];
        var titleField = subSchema.titleField || (subSchema.metadata && subSchema.metadata.titleField) || 'nombre';
        var sub = subtitles.find(function(e) { return String(e[subPK]) === String(subIdStr); });
        if (sub) {
            var subName = sub[titleField] || 'Desconocido';
            if (targetSubtitleMap[targetIdStr].indexOf(subName) === -1) {
                targetSubtitleMap[targetIdStr].push(subName);
            }
        }
    });

    // Filtrar parents activos
    var parentPK = global.APP_SCHEMAS[parentEntityName].primaryKey;
    var activeParents = parents.filter(function(r) { return parentCounts[r[parentPK]] > 0; });
    
    // Sort descending
    activeParents.sort(function(a,b) { return parentCounts[b[parentPK]] - parentCounts[a[parentPK]]; });

    if (activeParents.length === 0) {
        global.DOM.clear(container);
        container.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 32px; margin-bottom: 32px; background: var(--ion-color-light, #f8f9fa); border-radius: 24px; border: 1px dashed rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: all 0.3s ease;">
            <h2 style="font-size: var(--sys-font-display, 26px); font-weight: 800; color: var(--ion-color-dark); margin: 0 0 24px 0; letter-spacing: -0.5px;">
                ${dshConfig.title || 'Directorio'} <span style="color: var(--ion-color-primary);">${dshConfig.titleHighlight || ''}</span>
            </h2>
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                <ion-icon name="people-circle-outline" style="font-size: 42px; color: var(--ion-color-primary);"></ion-icon>
            </div>
            <p style="margin:0; font-size: 16px; color: var(--ion-color-medium); font-weight: 500; text-align: center; max-width: 400px; line-height: 1.5;">${dshConfig.emptyMessage || 'No hay información en este momento.'}</p>
        </div>`;
        return; 
    }

    // --- State ---
    var stateKeyRole = 'data-selected-' + parentEntityName;
    var stateKeySearch = 'data-search-' + parentEntityName;
    var currentParentId = container.getAttribute(stateKeyRole) || activeParents[0][parentPK];
    var searchTerm = container.getAttribute(stateKeySearch) || '';

    // --- UI Construction ---
    global.DOM.clear(container);

    var wrapperCard = document.createElement('ion-card');
    wrapperCard.style.width = '100%';
    wrapperCard.style.margin = '0 0 32px 0';
    wrapperCard.style.padding = '24px';
    wrapperCard.style.borderRadius = 'var(--rounded-md, 16px)';
    wrapperCard.style.boxShadow = 'var(--shadow-default)';
    wrapperCard.style.background = 'var(--ion-card-background, #ffffff)';

    // Title
    var headerDiv = document.createElement('div');
    headerDiv.style.width = '100%';
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'flex-start';
    headerDiv.style.flexWrap = 'wrap';
    headerDiv.style.gap = '16px';
    headerDiv.style.marginBottom = '24px';
    
    var titleLeft = document.createElement('div');
    titleLeft.innerHTML = `
        <h2 style="font-size: var(--sys-font-display, 28px); font-weight: 700; color: var(--ion-color-dark); margin: 0;">
            ${dshConfig.title} <span style="color: var(--ion-color-primary);">${dshConfig.titleHighlight || ''}</span>
        </h2>
        <p style="font-size: var(--sys-font-body, 14px); color: var(--ion-color-medium); margin-top: 8px;">
            ${dshConfig.description || ''}
        </p>
    `;
    headerDiv.appendChild(titleLeft);
    wrapperCard.appendChild(headerDiv);

    // Pills
    var ribbonCard = document.createElement('ion-card');
    ribbonCard.style.width = '100%';
    ribbonCard.style.margin = '0 0 24px 0';
    ribbonCard.style.borderRadius = '30px'; 
    ribbonCard.style.boxShadow = 'none'; 
    ribbonCard.style.border = 'none';
    ribbonCard.style.background = '#ffffff';
    
    var ribbonScroll = document.createElement('div');
    ribbonScroll.style.display = 'flex';
    ribbonScroll.style.overflowX = 'auto';
    ribbonScroll.style.padding = '16px 24px';
    ribbonScroll.style.gap = '12px';
    ribbonScroll.style.alignItems = 'center';
    
    ribbonScroll.style.scrollbarWidth = 'none';
    ribbonScroll.style.msOverflowStyle = 'none';
    ribbonScroll.classList.add('hide-scrollbar'); 

    var parentSchema = global.APP_SCHEMAS[parentEntityName];
    var parentTitleField = parentSchema.titleField || (parentSchema.metadata && parentSchema.metadata.titleField) || 'nombre';

    activeParents.forEach(function(parent) {
        var pId = parent[parentPK];
        var isSelected = (String(pId) === String(currentParentId));
        
        var pill = document.createElement('div');
        pill.style.display = 'flex';
        pill.style.alignItems = 'center';
        pill.style.padding = '8px 16px';
        pill.style.borderRadius = '20px';
        pill.style.cursor = 'pointer';
        pill.style.whiteSpace = 'nowrap';
        pill.style.transition = 'all 0.2s ease';
        
        if (isSelected) {
            pill.style.background = 'var(--ion-color-accent, #FFCE00)';
            pill.style.color = '#000000';
            pill.style.fontWeight = '600';
        } else {
            pill.style.background = 'transparent';
            pill.style.color = 'var(--ion-color-dark)';
            pill.style.fontWeight = '500';
        }

        var labelSpan = document.createElement('span');
        labelSpan.textContent = parent[parentTitleField];
        labelSpan.style.fontSize = '14px';

        var badge = document.createElement('span');
        badge.textContent = parentCounts[pId];
        badge.style.marginLeft = '8px';
        badge.style.fontSize = '12px';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '10px';
        
        if (isSelected) {
            badge.style.background = 'rgba(0,0,0,0.15)';
            badge.style.color = '#000000';
        } else {
            badge.style.background = 'var(--color-bg-alt, #f0f2f5)';
            badge.style.color = 'var(--ion-color-medium)';
        }

        pill.appendChild(labelSpan);
        pill.appendChild(badge);

        pill.onclick = function() {
            container.setAttribute(stateKeyRole, pId);
            container.setAttribute(stateKeySearch, ''); 
            global.refreshDashboardDirectory(parentEntityName);
        };

        ribbonScroll.appendChild(pill);
    });

    ribbonCard.appendChild(ribbonScroll);
    wrapperCard.appendChild(ribbonCard);

    // Search
    var currentParentObj = activeParents.find(function(r) { return String(r[parentPK]) === String(currentParentId); });
    var pName = currentParentObj ? currentParentObj[parentTitleField] : 'la entidad';
    
    var members = parentMembers[currentParentId] || [];
    var targetPK = global.APP_SCHEMAS[targetEntityName].primaryKey;

    var filteredMembers = members.filter(function(m) {
        if (!searchTerm) return true;
        var q = searchTerm.toLowerCase();
        var name = (m._nombre_completo || m.nombre || m.nombres).toLowerCase();
        return name.indexOf(q) > -1;
    });

    var searchRight = document.createElement('div');
    searchRight.style.display = 'flex';
    searchRight.style.flexDirection = 'column';
    searchRight.style.alignItems = 'flex-end';
    searchRight.style.flex = '1';
    searchRight.style.minWidth = '280px';
    searchRight.style.maxWidth = '400px';

    var searchbar = document.createElement('ion-searchbar');
    searchbar.placeholder = 'Buscar en ' + pName + '...';
    searchbar.value = searchTerm;
    searchbar.style.padding = '0';
    searchbar.style.width = '100%';
    searchbar.style.setProperty('--border-radius', 'var(--border-radius, 8px)');
    searchbar.style.setProperty('--box-shadow', 'none');
    searchbar.style.setProperty('--background', '#ffffff');
    searchbar.style.border = '1px solid var(--color-border, #e0e0e0)';
    searchbar.style.borderRadius = 'var(--border-radius, 8px)';
    searchbar.style.height = '38px';

    searchbar.addEventListener('ionInput', function(e) {
        var val = e.target.value.toLowerCase();
        container.setAttribute(stateKeySearch, val);
        
        var cols = gridRow.querySelectorAll('ion-col:not(.dir-empty-state)');
        var matchCount = 0;
        
        cols.forEach(function(col) {
            var nameAttr = col.getAttribute('data-search-name') || '';
            if (val === '' || nameAttr.indexOf(val) > -1) {
                col.style.display = '';
                matchCount++;
            } else {
                col.style.display = 'none';
            }
        });
        
        countText.textContent = matchCount + ' de ' + members.length + ' integrantes';
        
        var emptyNode = gridRow.querySelector('.dir-empty-state');
        if (matchCount === 0) {
            if (!emptyNode) {
                emptyNode = document.createElement('ion-col');
                emptyNode.size = '12';
                emptyNode.className = 'dir-empty-state';
                emptyNode.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--ion-color-medium); background: #ffffff; border-radius: 12px; border: 1px dashed var(--color-border, #ccc);">
                        <ion-icon name="search-outline" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;"></ion-icon>
                        <div>No se encontraron registros que coincidan con la búsqueda.</div>
                    </div>`;
                gridRow.appendChild(emptyNode);
            }
            emptyNode.style.display = '';
        } else if (emptyNode) {
            emptyNode.style.display = 'none';
        }
    });

    var countText = document.createElement('div');
    countText.style.fontSize = '12px';
    countText.style.color = 'var(--ion-color-medium)';
    countText.style.marginTop = '6px';
    countText.style.paddingRight = '12px';
    countText.style.whiteSpace = 'nowrap';
    countText.textContent = filteredMembers.length + ' de ' + members.length + ' integrantes';
    
    searchRight.appendChild(searchbar);
    searchRight.appendChild(countText);
    headerDiv.appendChild(searchRight);

    // Cards Grid
    var gridRow = document.createElement('ion-row');
    gridRow.style.width = '100%';
    gridRow.style.maxHeight = '360px'; 
    gridRow.style.overflowY = 'auto';
    gridRow.style.overflowX = 'hidden';
    gridRow.style.alignContent = 'flex-start';

    if (filteredMembers.length === 0) {
        var emptyCol = document.createElement('ion-col');
        emptyCol.size = '12';
        emptyCol.className = 'dir-empty-state';
        emptyCol.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--ion-color-medium); background: #ffffff; border-radius: 12px; border: 1px dashed var(--color-border, #ccc);">
                <ion-icon name="search-outline" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;"></ion-icon>
                <div>No se encontraron integrantes que coincidan con "${searchTerm}".</div>
            </div>
        `;
        gridRow.appendChild(emptyCol);
    } else {
        filteredMembers.forEach(function(member) {
            var col = document.createElement('ion-col');
            col.size = '12';
            col.sizeSm = '6';
            col.sizeMd = '4';
            col.sizeLg = '3';

            var isInternal = (!member.tipo_recurso || member.tipo_recurso.toLowerCase() === 'interno');
            var dotColor = isInternal ? 'var(--ion-color-primary)' : 'var(--ion-color-warning)';
            var typeLabel = isInternal ? 'Interno' : 'Externo';
            
            var memberEmail = member.email || member.correo_corporativo || member.correo || '';
            
            var initials = '';
            var nom = (member.nombres || '').trim();
            var ape = (member.apellidos || '').trim();
            
            if (nom && ape) {
                initials = nom.charAt(0) + ape.charAt(0);
            } else if (nom || ape) {
                var singleName = nom || ape;
                var parts = singleName.split(' ').filter(Boolean);
                if (parts.length > 1) {
                    initials = parts[0].charAt(0) + parts[1].charAt(0);
                } else {
                    initials = singleName.substring(0, 2);
                }
            } else if (memberEmail) {
                initials = memberEmail.trim().substring(0, 2);
            } else {
                initials = '??';
            }
            
            var fullName = member._nombre_completo || member.nombre || '';
            if (!fullName) {
                if (member.nombres || member.apellidos) {
                    fullName = [member.nombres, member.apellidos].filter(Boolean).join(' ');
                } else if (memberEmail) {
                    fullName = memberEmail;
                } else {
                    fullName = 'Desconocido';
                }
            }
            
            var fallbackLabels = targetSubtitleMap[member[targetPK]] || ['Sin asignar'];
            var subtitleHtml = fallbackLabels.map(function(l) { return '<div style="margin-bottom:2px;">' + l + '</div>'; }).join('');

            var avatarHtml = '';
            if (member.avatar && member.avatar.indexOf('http') === 0) {
                avatarHtml = `<img src="${member.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />`;
            } else {
                avatarHtml = initials.toUpperCase();
            }

            col.setAttribute('data-search-name', fullName.toLowerCase());
            
            var cardNode = document.createElement('ion-card');
            cardNode.className = "ion-activatable ripple-parent";
            cardNode.style.cssText = "margin: 0; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; align-items: center; background: #ffffff; height: 100%; cursor: pointer;";
            
            var badgeHtml = '';
            if (targetEntityName === 'Persona') {
                badgeHtml = `<div style="display: flex; align-items: center; font-size: 11px; color: var(--ion-color-medium); font-weight: 500; background: var(--color-bg-alt, #f4f5f8); padding: 2px 8px; border-radius: 10px; width: fit-content;">
                                <span style="color: ${dotColor}; margin-right: 4px; font-size: 14px;">●</span> ${typeLabel}
                             </div>`;
            }

            cardNode.innerHTML = `
                <ion-ripple-effect></ion-ripple-effect>
                <div style="width: 48px; height: 48px; min-width: 48px; border-radius: 50%; background: var(--ion-color-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; margin-right: 16px; overflow: hidden;">
                    ${avatarHtml}
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-weight: 600; font-size: 14px; color: var(--ion-color-dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">
                        ${fullName}
                    </div>
                    <div style="font-size: 12px; color: var(--ion-color-medium); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;">
                        ${subtitleHtml}
                    </div>
                    ${badgeHtml}
                </div>
            `;
            
            cardNode.onclick = function() {
                if (window.renderForm) {
                    var rec = window.DataStore.get(targetEntityName).find(function(p){ return String(p[targetPK]) === String(member[targetPK]) });
                    if (rec) {
                        window.renderForm(targetEntityName, rec).then(function() {
                            if (window.FormEngine_Hydrator) {
                                var cont = window.currentFormDrawer || document.getElementById('app-container');
                                window.FormEngine_Hydrator(cont, rec, targetEntityName);
                            }
                        });
                    }
                }
            };
            
            col.appendChild(cardNode);
            gridRow.appendChild(col);
        });
    }

    wrapperCard.appendChild(gridRow);
    container.appendChild(wrapperCard);
  };

})(typeof window !== 'undefined' ? window : this);
