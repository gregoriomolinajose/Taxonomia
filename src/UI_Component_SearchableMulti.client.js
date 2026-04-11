/**
     * UI_Component_SearchableMulti.html
     * 
     * Implementa un modal buscador de catálogo para selecciones M:N (subgrids falsos).
     */
    (function (global) {
        
        global.UI_Factory = global.UI_Factory || {};

        global.UI_Factory.buildSearchableMulti = function(fieldDef, dataset, initialSelection, localEventBus) {
            const mainContainer = document.createElement('div');
            
            let selectedIds = [];
            if (Array.isArray(initialSelection)) {
                selectedIds = [...initialSelection];
            } else if (typeof initialSelection === 'string') {
                try {
                    const parsed = JSON.parse(initialSelection);
                    selectedIds = Array.isArray(parsed) ? parsed : [parsed];
                } catch(e) {
                    console.warn(`[SearchableMulti] Fallback parsing for ${fieldDef.name}`);
                    selectedIds = initialSelection.trim() ? [initialSelection] : [];
                }
            } else if (initialSelection) {
                selectedIds = [String(initialSelection)];
            }
            
            mainContainer.setAttribute('data-searchable-multi', fieldDef.name);

            // S30.3 - Local State Sync Architecture
            const getActiveForm = () => mainContainer.closest('ion-modal') || document.getElementById('app-container');
            const syncToLocalState = () => {
                const activeForm = getActiveForm();
                if (activeForm) {
                    activeForm._LocalState = activeForm._LocalState || {};
                    activeForm._LocalState[fieldDef.name] = selectedIds;
                }
            };

            const visualWrapper = document.createElement('div');
            visualWrapper.style.width = '100%';
            visualWrapper.style.marginBottom = '16px';
            
            const headerRow = document.createElement('div');
            headerRow.classList.remove('ion-hide');
            headerRow.style.justifyContent = 'space-between';
            headerRow.style.alignItems = 'center';
            headerRow.style.width = '100%';
            headerRow.style.marginBottom = '8px';
            
            const label = document.createElement('div');
            label.style.fontSize = 'var(--sys-font-small)';
            label.style.color = 'var(--ion-color-medium)';
            label.style.fontWeight = 'bold';
            label.textContent = fieldDef.label + (fieldDef.required ? ' *' : '');
            
            const addBtn = document.createElement('ion-button');
            addBtn.fill = 'clear';
            addBtn.size = 'small';
            addBtn.style.fontFamily = 'var(--sys-font-family, inherit)';
            const addIco2 = document.createElement('ion-icon');
            addIco2.setAttribute('name', 'add');
            addIco2.setAttribute('slot', 'start');
            addBtn.appendChild(addIco2);
            addBtn.appendChild(document.createTextNode(' AGREGAR'));

            headerRow.appendChild(label);
            headerRow.appendChild(addBtn);

            const chipsBox = document.createElement('div');
            chipsBox.classList.remove('ion-hide');
            chipsBox.style.flexWrap = 'wrap';
            chipsBox.style.gap = '8px';
            chipsBox.style.minHeight = '32px';

            visualWrapper.appendChild(headerRow);
            visualWrapper.appendChild(chipsBox);
            mainContainer.appendChild(visualWrapper);

            addBtn.onclick = () => {
                let draftIds = [...selectedIds];
                
                const pickerModal = document.createElement('ion-modal');
                pickerModal.isOpen = true;
                
                const header = document.createElement('ion-header');
                const toolbar = document.createElement('ion-toolbar');
                const title = document.createElement('ion-title');
                title.textContent = `Seleccionar ${fieldDef.targetEntity}`;
                
                const buttonsStart = document.createElement('ion-buttons');
                buttonsStart.slot = 'start';
                const cancelBtn = document.createElement('ion-button');
                cancelBtn.textContent = 'Cerrar';
                pickerModal.addEventListener('ionModalDidDismiss', () => pickerModal.remove(), { once: true });
                cancelBtn.onclick = () => { pickerModal.isOpen = false; };
                buttonsStart.appendChild(cancelBtn);

                const buttonsEnd = document.createElement('ion-buttons');
                buttonsEnd.slot = 'end';
                const confirmBtn = document.createElement('ion-button');
                confirmBtn.textContent = 'Confirmar';
                confirmBtn.color = 'primary';
                confirmBtn.onclick = () => {
                    selectedIds = [...draftIds];
                    syncToLocalState(); // S30.3 Local State Sync
                    renderChips();
                    pickerModal.isOpen = false;
                    
                    if (localEventBus && typeof localEventBus.publish === 'function') {
                        localEventBus.publish('MULTISELECT_CHANGED', { fieldName: fieldDef.name, value: selectedIds });
                    }
                };
                buttonsEnd.appendChild(confirmBtn);

                toolbar.appendChild(buttonsStart);
                toolbar.appendChild(title);
                toolbar.appendChild(buttonsEnd);
                header.appendChild(toolbar);

                const content = document.createElement('ion-content');
                content.classList.add('ion-padding');
                
                const searchbar = document.createElement('ion-searchbar');
                searchbar.placeholder = `Buscar ${fieldDef.targetEntity}...`;
                searchbar.debounce = 100;

                const draftChipsBox = document.createElement('div');
                draftChipsBox.classList.remove('ion-hide');
                draftChipsBox.style.flexWrap = 'wrap';
                draftChipsBox.style.gap = '8px';
                draftChipsBox.style.marginBottom = '16px';
                
                const renderDraftChips = () => {
                    draftChipsBox.innerHTML = '';
                    draftIds.forEach(id => {
                        const match = dataset.find(d => String(d[fieldDef.valueField]) === String(id));
                        const labelText = match && match[fieldDef.labelField] ? `${match[fieldDef.valueField]} - ${match[fieldDef.labelField]}` : id;
                        const chip = global.UI_Factory.drawChip(id, labelText, (e, chipId) => {
                            draftIds = draftIds.filter(sid => sid !== chipId);
                            renderDraftChips();
                        });
                        draftChipsBox.appendChild(chip);
                    });
                };
                renderDraftChips();

                const list = document.createElement('ion-list');

                searchbar.addEventListener('ionInput', (e) => {
                    const term = (e.detail.value || '').toLowerCase().trim();
                    list.innerHTML = '';
                    if (!term) return;
                    
                    const matches = dataset.filter(d => {
                        const l = d[fieldDef.labelField] || '';
                        return String(l).toLowerCase().includes(term) && !draftIds.includes(String(d[fieldDef.valueField]));
                    }).slice(0, 15);
                    
                    matches.forEach(m => {
                        const item = document.createElement('ion-item');
                        item.button = true;
                        item.textContent = `${m[fieldDef.valueField]} - ${m[fieldDef.labelField]}`;
                        item.onclick = () => {
                            draftIds.push(String(m[fieldDef.valueField]));
                            searchbar.value = '';
                            list.innerHTML = '';
                            renderDraftChips();
                        };
                        list.appendChild(item);
                    });
                });

                content.appendChild(searchbar);
                content.appendChild(draftChipsBox);
                content.appendChild(list);

                pickerModal.appendChild(header);
                pickerModal.appendChild(content);
                // Utilizando el scope global para inyectar modals flotantes
                document.body.appendChild(pickerModal);
            };
            
            const renderChips = () => {
                chipsBox.innerHTML = '';
                syncToLocalState();
                
                if (selectedIds.length === 0) {
                    const emptyNode = document.createElement('div');
                    emptyNode.style.width = '100%';
                    emptyNode.style.textAlign = 'center';
                    emptyNode.style.color = 'var(--ion-color-medium)';
                    emptyNode.style.padding = '16px';
                    emptyNode.style.border = '1px dashed var(--ion-color-step-300, #c8c7cc)';
                    emptyNode.style.borderRadius = '8px';
                    
                    const emptyIcon = document.createElement('ion-icon');
                    emptyIcon.setAttribute('name', 'layers-outline');
                    emptyIcon.style.fontSize = '24px';
                    
                    const emptyText = document.createElement('div');
                    emptyText.style.fontSize = '14px';
                    emptyText.style.marginTop = '8px';
                    emptyText.textContent = 'Sin registros vinculados';
                    
                    emptyNode.appendChild(emptyIcon);
                    emptyNode.appendChild(emptyText);
                    
                    // Asegurar que usamos window.DOM si existe
                    if (window.DOM && window.DOM.clear) { window.DOM.clear(chipsBox); }
                    else { chipsBox.innerHTML = ''; }
                    
                    chipsBox.appendChild(emptyNode);
                    return;
                }

                selectedIds.forEach(id => {
                    const match = dataset.find(d => String(d[fieldDef.valueField]) === String(id));
                    const labelText = match && match[fieldDef.labelField] ? `${match[fieldDef.valueField]} - ${match[fieldDef.labelField]}` : id;
                    
                    const chip = global.UI_Factory.drawChip(id, labelText, (e, chipId) => {
                        e.stopPropagation();
                        selectedIds = selectedIds.filter(sid => sid !== chipId);
                        renderChips();
                        
                        if (localEventBus && typeof localEventBus.publish === 'function') {
                            localEventBus.publish('MULTISELECT_CHANGED', { fieldName: fieldDef.name, value: selectedIds });
                        }
                    });
                    chipsBox.appendChild(chip);
                });
            };
            
            renderChips();
            return mainContainer;
        };

    })(typeof window !== 'undefined' ? window : this);