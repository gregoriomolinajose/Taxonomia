/**
     * FormBuilder_Inputs.html
     * 
     * [S12.1] Architectural Splitting: Pure Factory Component
     * Responsable único de generar Nodos DOM (document.createElement) a partir de un Schema.
     * Cero dependencias de estado de red ni inyección en el DOM raíz.
     */
    (function (global) {
        
        // Base Initialization si no existe (creado por UI_Components.html previamente)
        global.UI_Factory = global.UI_Factory || {};

        /**
         * Generic Base Configurator for Inputs
         */
        function _applyBaseAttributes(inputEl, field, isComplex = false) {
            if (!isComplex) {
                inputEl.setAttribute('label', field.label + (field.type === 'lookup' ? ' (Buscar ' + field.lookupTarget + ')' : ''));
                inputEl.setAttribute('label-placement', 'floating');
                inputEl.setAttribute('fill', 'outline');
                inputEl.setAttribute('name', field.name);
                inputEl.style.marginBottom = 'var(--spacing-4)';
                inputEl.style.setProperty('--background', 'var(--ion-color-step-100)');
                inputEl.style.borderRadius = 'var(--rounded-sm)';

                if (field.required) inputEl.setAttribute('required', 'true');
                if (field.readonly && field.type !== 'lookup') {
                    inputEl.setAttribute('readonly', 'true');
                    inputEl.readonly = true;
                }
                
                if (field.validators) {
                    inputEl.setAttribute('data-validators', JSON.stringify(field.validators));
                }
                if (field.triggers_workspace_resolve) {
                    inputEl.setAttribute('data-workspace-trigger', 'true');
                }
                
                if (field.helpText && field.type !== 'select') {
                    inputEl.setAttribute('helper-text', field.helpText);
                }
            }
        }

        global.UI_Factory.buildHidden = function(field, entityName, defaultValue) {
            const hiddenInput = document.createElement('input');
            hiddenInput.setAttribute('type', 'hidden');
            hiddenInput.setAttribute('name', field.name);
            
            if (defaultValue !== undefined) {
                hiddenInput.value = defaultValue;
            } else if (field.defaultValue !== undefined) {
                hiddenInput.value = field.defaultValue;
            }
            return hiddenInput;
        };

        global.UI_Factory.buildBadge = function(field) {
            const container = document.createElement('div');
            container.style.marginTop = 'var(--spacing-2)';
            container.style.marginBottom = 'var(--spacing-4)';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'space-between';
            container.style.padding = '0px var(--spacing-2)';

            const labelEl = document.createElement('span');
            labelEl.style.fontSize = 'var(--text-sm)';
            labelEl.style.color = 'var(--ion-color-medium)';
            labelEl.style.textTransform = 'uppercase';
            labelEl.style.letterSpacing = '0.5px';
            labelEl.textContent = field.label || 'Ticket ID';

            const chipEl = document.createElement('ion-chip');
            chipEl.setAttribute('color', 'primary');
            chipEl.style.fontWeight = 'var(--font-weight-bold)';
            chipEl.style.fontFamily = 'var(--font-mono)';
            chipEl.style.border = '1px solid var(--ion-color-primary)';
            
            // The actual value will be populated by hydrateField 
            chipEl.textContent = '...';

            const hiddenInput = document.createElement('input');
            hiddenInput.setAttribute('type', 'hidden');
            hiddenInput.setAttribute('name', field.name);
            hiddenInput.className = 'badge-hidden-input'; 

            const _originalValSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            Object.defineProperty(hiddenInput, 'value', {
                set: function(val) {
                    _originalValSetter.call(this, val);
                    chipEl.textContent = val || 'NUEVO';
                },
                get: function() {
                    return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get.call(this);
                }
            });

            container.appendChild(labelEl);
            container.appendChild(chipEl);
            container.appendChild(hiddenInput);

            return container;
        };

        global.UI_Factory.buildInput = function(field) {
            const inputEl = document.createElement('ion-input');
            inputEl.setAttribute('type', field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : 'text'));
            
            _applyBaseAttributes(inputEl, field);
            return inputEl;
        };

        global.UI_Factory.buildTextarea = function(field) {
            const inputEl = document.createElement('ion-textarea');
            inputEl.setAttribute('rows', '4');
            _applyBaseAttributes(inputEl, field);
            return inputEl;
        };

        global.UI_Factory.buildSelect = function(field) {
            const inputEl = document.createElement('ion-select');
            inputEl.setAttribute('interface', window.innerWidth < 768 ? 'action-sheet' : 'popover');
            
            // Requerido firmemente para que CustomEvents atados a name="field.name" lo alcancen
            inputEl.setAttribute('name', field.name);
            
            const renderOptions = (opts) => {
                inputEl.innerHTML = '';
                if (opts && Array.isArray(opts)) {
                    opts.forEach(opt => {
                        const ionOption = document.createElement('ion-select-option');
                        if (typeof opt === 'object' && opt !== null) {
                            ionOption.value = opt.value || opt.id_registro || 'N/A';
                            ionOption.textContent = opt.label || opt.nombre || 'N/A';
                        } else {
                            ionOption.value = opt;
                            ionOption.textContent = opt;
                        }
                        inputEl.appendChild(ionOption);
                    });
                }
            };

            renderOptions(field.options);

            inputEl.addEventListener('LookupHydrated', (e) => {
                const currentVal = inputEl.value; // Rescue binding state natively managed by Ionic
                renderOptions(e.detail);
                if (currentVal !== undefined && currentVal !== null) {
                    inputEl.value = currentVal;
                }
            });

            _applyBaseAttributes(inputEl, field);
            
            if (field.helpText) {
                const wrapper = document.createElement('div');
                inputEl.style.marginBottom = '2px'; // Reducir margen original
                
                const note = document.createElement('div');
                note.style.fontSize = '12px';
                note.style.color = 'var(--ion-color-medium, #92949c)';
                note.style.padding = '0 16px var(--spacing-4) 16px';
                note.style.lineHeight = '1.2';
                note.textContent = field.helpText;
                
                wrapper.appendChild(inputEl);
                wrapper.appendChild(note);
                return wrapper;
            }
            return inputEl;
        };

        global.UI_Factory.buildLookup = function(field) {
            const inputEl = document.createElement('ion-input');
            inputEl.setAttribute('readonly', 'true');
            _applyBaseAttributes(inputEl, field);
            return inputEl;
        };

        global.UI_Factory.populateSelectOptions = function(selectEl, dataArr, field) {
            if (!Array.isArray(dataArr)) return;
            
            dataArr.forEach(d => {
                const opt = document.createElement('ion-select-option');
                opt.value = typeof d[field.valueField] !== 'undefined' ? d[field.valueField] : d.id_registro;
                opt.textContent = `${opt.value} - ${typeof d[field.labelField] !== 'undefined' ? d[field.labelField] : d.nombre}`;
                selectEl.appendChild(opt);
            });
        };

        global.UI_Factory.buildChipInput = function(field) {
            const inputEl = document.createElement('div');
            inputEl.style.marginBottom = 'var(--spacing-4)';

            const cLabel = document.createElement('div');
            cLabel.style.fontSize = 'var(--sys-font-small)';
            cLabel.style.color = 'var(--ion-color-medium)';
            cLabel.style.marginBottom = 'var(--spacing-1)';
            cLabel.style.paddingLeft = 'var(--spacing-1)';
            cLabel.textContent = field.label + (field.required ? ' *' : '');
            inputEl.appendChild(cLabel);

            const chipItem = document.createElement('ion-item');
            chipItem.setAttribute('lines', 'none');
            chipItem.style.setProperty('--background', 'var(--ion-color-step-100)');
            chipItem.style.borderRadius = 'var(--rounded-sm)';
            chipItem.style.marginBottom = 'var(--spacing-2)';
            chipItem.style.border = '1px solid var(--ion-color-step-300)';

            const innerInput = document.createElement('ion-input');
            innerInput.setAttribute('placeholder', `Añadir ${field.label}...`);

            const addBtn = document.createElement('ion-button');
            addBtn.setAttribute('slot', 'end');
            addBtn.setAttribute('fill', 'clear');
            addBtn.textContent = 'Agregar';

            chipItem.appendChild(innerInput);
            chipItem.appendChild(addBtn);

            const chipContainer = document.createElement('div');
            chipContainer.className = 'chip-container';
            chipContainer.setAttribute('data-chip-name', field.name);
            chipContainer.classList.remove('ion-hide');
            chipContainer.style.flexWrap = 'wrap';
            chipContainer.style.gap = 'var(--spacing-2)';

            inputEl.appendChild(chipItem);
            inputEl.appendChild(chipContainer);

            const addChip = () => {
                const val = innerInput.value.trim();
                if (val) {
                    const chip = document.createElement('ion-chip');
                    chip.setAttribute('color', 'primary');

                    const chipLabel = document.createElement('ion-label');
                    chipLabel.textContent = val;

                    const chipIcon = document.createElement('ion-icon');
                    chipIcon.setAttribute('name', 'close-circle');
                    chipIcon.addEventListener('click', () => { chip.remove(); });

                    chip.appendChild(chipLabel);
                    chip.appendChild(chipIcon);
                    chipContainer.appendChild(chip);

                    innerInput.value = '';
                }
            };

            addBtn.addEventListener('click', addChip);
            innerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addChip();
                }
            });

            return inputEl;
        };

        global.UI_Factory.buildDivider = function(field) {
            const dividerEl = document.createElement('div');
            dividerEl.style.width = '100%';
            dividerEl.style.marginTop = 'var(--spacing-4)';
            dividerEl.style.marginBottom = 'var(--spacing-4)';
            
            if (field.label) {
                const title = document.createElement('h3');
                title.style.margin = '0 0 var(--spacing-2) 0';
                title.style.color = 'var(--ion-color-dark)';
                title.style.fontSize = 'var(--sys-font-sub)';
                title.style.fontWeight = '600';
                title.style.letterSpacing = '0.02em';
                title.textContent = field.label;
                dividerEl.appendChild(title);
            }
            
            const line = document.createElement('hr');
            line.style.border = 'none';
            line.style.borderTop = '1px solid var(--ion-color-step-300, #d7d8da)';
            line.style.margin = '0';
            dividerEl.appendChild(line);
            
            return dividerEl;
        };

        // buildDynamicList extracted to UI_Component_DynamicList.html (Auto-registered Plugin)

        global.UI_Factory.drawChip = function(id, labelText, onRemoveCallback) {
            const chip = document.createElement('ion-chip');
            chip.color = 'primary';
            const lbl = document.createElement('ion-label');
            lbl.textContent = labelText;
            chip.appendChild(lbl);
            if (typeof onRemoveCallback === 'function') {
                const icon = document.createElement('ion-icon');
                icon.name = 'close-circle';
                icon.onclick = (e) => onRemoveCallback(e, id);
                chip.appendChild(icon);
            }
            return chip;
        };

        // buildSearchableMulti extracted to UI_Component_SearchableMulti.html

        // populateSelectOptions and bindLevelChangeRepaint extracted to UI_Component_RelationBuilder.html

        // ==========================================
        // [S16.4] Inversion of Control: Input Builder Registry
        // ==========================================
        global.UI_Factory.BuilderRegistry = {};
        
        global.UI_Factory.registerBuilder = function(type, builderFn) {
            this.BuilderRegistry[type] = builderFn;
        };

        global.UI_Factory.buildAvatar = function(field) {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.padding = 'var(--spacing-2)';
            container.style.width = '100%';

            const avatarWrapper = document.createElement('ion-avatar');
            avatarWrapper.style.width = '72px';
            avatarWrapper.style.height = '72px';
            avatarWrapper.style.margin = '0 auto var(--spacing-2) auto';
            avatarWrapper.style.border = '2px solid var(--ion-color-step-300)';

            const img = document.createElement('img');
            img.src = field.defaultValue || "https://ionicframework.com/docs/img/demos/avatar.svg";
            avatarWrapper.appendChild(img);

            const labelEl = document.createElement('ion-label');
            labelEl.textContent = field.label;
            labelEl.style.fontSize = 'var(--sys-font-small)';
            labelEl.style.color = 'var(--ion-color-medium)';

            const inputEl = document.createElement('ion-input');
            inputEl.setAttribute('name', field.name);
            inputEl.style.display = 'none';

            inputEl.addEventListener('FormHydrated', (e) => {
                if (e.detail) {
                    img.src = e.detail;
                }
            });

            container.appendChild(avatarWrapper);
            container.appendChild(labelEl);
            container.appendChild(inputEl);
            
            return container;
        };

        // --- Core Builders Automatic Registration ---
        global.UI_Factory.registerBuilder('text', (f, e) => {
            if (f.uiBehavior === 'badge') return global.UI_Factory.buildBadge(f);
            return global.UI_Factory.buildInput(f, e);
        });
        global.UI_Factory.registerBuilder('number', (f, e) => global.UI_Factory.buildInput(f, e));
        global.UI_Factory.registerBuilder('date', (f, e) => global.UI_Factory.buildInput(f, e));
        global.UI_Factory.registerBuilder('textarea', (f) => global.UI_Factory.buildTextarea(f));
        global.UI_Factory.registerBuilder('select', (f) => global.UI_Factory.buildSelect(f));
        global.UI_Factory.registerBuilder('divider', (f) => global.UI_Factory.buildDivider(f));
        global.UI_Factory.registerBuilder('avatar', (f) => global.UI_Factory.buildAvatar(f));
        // Specialized builders registrations are now handled by isolated plugins
        // (UI_Component_RelationBuilder, UI_Component_DynamicList, etc.)

        // ==========================================
        // [S16.4] THE DISMANTLED ROUTER
        // ==========================================
        global.UI_Factory.buildFieldNode = function(field, entityName, data, localEventBus, currentEditId) {
            try {
                const builder = global.UI_Factory.BuilderRegistry[field.type] || global.UI_Factory.BuilderRegistry['text'];
                return builder(field, entityName, data, localEventBus, currentEditId);
            } catch (err) {
                console.error("[UI_Factory] Error construyendo FieldNode para:", field.name, err);
                const errDiv = document.createElement('div');
                const errText = document.createElement('ion-text');
                errText.setAttribute('color', 'danger');
                const errSmall = document.createElement('small');
                errSmall.textContent = `⚠ Error UI: ${field.name}`;
                errText.appendChild(errSmall);
                errDiv.appendChild(errText);
                return errDiv;
            }
        };

    })(window);