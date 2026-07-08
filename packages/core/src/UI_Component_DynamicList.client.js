/**
     * UI_Component_DynamicList.html
     * 
     * Constructor Atómico para Grid anidado de Formulario (Subformularios n-dimensionales).
     * Aisla la complejidad de la iteración profunda del DOM.
     * Principio Abierto-Cerrado (Auto-Registro en UI_Factory).
     */
    (function (global) {
        
        // Ensure UI_Factory exists to attach auto-registry hooks
        global.UI_Factory = global.UI_Factory || {};

        function buildDynamicList(field, entityName, data = null) {
            const inputEl = document.createElement('div');
            inputEl.setAttribute('data-dynamic-list', field.name);
            inputEl.style.border = '0px solid var(--ion-border-color)';
            inputEl.style.padding = 'var(--spacing-0)';
            inputEl.style.marginBottom = 'var(--spacing-4)';
            inputEl.setAttribute('data-form-component', field.name);
            
            // S30.11 Nodal Protocol
            inputEl.getValidatedValue = () => {
                const rows = inputEl.querySelectorAll('.dynamic-list-row');
                const jsonArray = [];
                rows.forEach(r => {
                    const rd = {};
                    const rInputs = r.querySelectorAll('ion-input, ion-select');
                    rInputs.forEach(inp => {
                        if (inp.name) rd[inp.name] = inp.value;
                    });
                    jsonArray.push(rd);
                });
                return jsonArray;
            };
            
            const dlHeader = document.createElement('div');
            dlHeader.style.fontSize = 'var(--sys-font-small)';
            dlHeader.style.color = 'var(--ion-color-medium)';
            dlHeader.style.marginBottom = 'var(--spacing-2)';
            dlHeader.style.paddingLeft = 'var(--spacing-1)';
            dlHeader.textContent = field.label + (field.required ? ' *' : '');
            inputEl.appendChild(dlHeader);

            const listRowsContainer = document.createElement('div');
            inputEl.appendChild(listRowsContainer);

            const addBtn = document.createElement('ion-button');
            addBtn.setAttribute('fill', 'outline');
            addBtn.setAttribute('size', 'small');
            const addIcon = document.createElement('ion-icon');
            addIcon.setAttribute('slot', 'start');
            addIcon.setAttribute('name', 'add');
            addBtn.appendChild(addIcon);
            addBtn.appendChild(document.createTextNode(' Agregar'));
            
            let initialData = [];
            if (data && data[field.name]) {
                try {
                    initialData = typeof data[field.name] === 'string' ? JSON.parse(data[field.name]) : data[field.name];
                } catch(e) {}
            }
            
            const createRow = (rowData = {}) => {
                const activeForm = inputEl.closest('ion-modal') || document.getElementById('app-container');
                const syncState = () => {
                    // Estado delegado a inputEl.getValidatedValue() (S30.11 Nodal)
                };

                const row = document.createElement('ion-row');
                row.classList.add('dynamic-list-row');
                row.style.alignItems = 'center';
                row.style.marginBottom = 'var(--spacing-2)';

                field.subFields.forEach(sub => {
                    const col = document.createElement('ion-col');
                    col.setAttribute('size-md', String(sub.width || 12));
                    col.setAttribute('size', '12');

                    const subInput = document.createElement(sub.type === 'select' ? 'ion-select' : 'ion-input');
                    subInput.setAttribute('name', sub.name);
                    subInput.setAttribute('label', sub.label);
                    subInput.setAttribute('label-placement', 'floating');
                    subInput.setAttribute('fill', 'outline');
                    subInput.style.setProperty('--background', 'var(--ion-color-step-100)');
                    
                    if (rowData[sub.name]) {
                        subInput.value = rowData[sub.name];
                    }

                    if (sub.type === 'select' && sub.lookupSource) {
                        subInput.setAttribute('interface', window.innerWidth < 768 ? 'action-sheet' : 'popover');
                        if (sub.options && Array.isArray(sub.options)) {
                            sub.options.forEach(opt => {
                                const ionOption = document.createElement('ion-select-option');
                                ionOption.value = (typeof opt === 'object' && opt !== null) ? opt.value : opt;
                                ionOption.textContent = (typeof opt === 'object' && opt !== null) ? opt.label : opt;
                                subInput.appendChild(ionOption);
                            });
                        }
                    }
                    
                    subInput.addEventListener('ionChange', syncState);
                    subInput.addEventListener('input', syncState); // Respaldo para browsers lentos
                    
                    col.appendChild(subInput);
                    row.appendChild(col);
                });

                const delCol = document.createElement('ion-col');
                delCol.setAttribute('size-md', '1');
                delCol.setAttribute('size', '2');
                const delBtn = document.createElement('ion-button');
                delBtn.setAttribute('color', 'danger');
                delBtn.setAttribute('fill', 'clear');
                const delIcon = document.createElement('ion-icon');
                delIcon.setAttribute('name', 'trash-outline');
                delBtn.appendChild(delIcon);
                delBtn.onclick = () => { row.remove(); syncState(); };
                
                delCol.appendChild(delBtn);
                row.appendChild(delCol);

                listRowsContainer.appendChild(row);
                syncState(); // Sincroniza al añadir una fila inicial
            };

            if (initialData.length > 0 && Array.isArray(initialData)) {
                initialData.forEach(item => createRow(item));
            }

            addBtn.onclick = () => createRow();

            inputEl.appendChild(addBtn);
            return inputEl;
        }

        // AUTO-REGISTRATION (Plugin Architecture)
        // Se ejecuta globalmente cuando el SCRIPT_TAG es procesado por Google Apps Script
        if (typeof global.UI_Factory.registerBuilder === 'function') {
            global.UI_Factory.registerBuilder('dynamic_list', buildDynamicList);
        } else {
            console.warn('[UI_Component_DynamicList] Esperando a UI_Factory.registerBuilder para inicializarse, este script debió cargar luego de FormBuilder_Inputs.');
        }

    })(typeof window !== 'undefined' ? window : this);