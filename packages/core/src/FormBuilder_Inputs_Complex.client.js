/* ============================================================
       FormBuilder_Inputs_Complex.html
       Micro-Frontend: Componentes Estructurados y Compuestos
       ============================================================ */
    (function (global) {
        global.UI_Factory = global.UI_Factory || {};
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
            chipContainer.setAttribute('data-form-component', field.name);
            chipContainer.classList.remove('ion-hide');
            chipContainer.style.flexWrap = 'wrap';
            chipContainer.style.gap = 'var(--spacing-2)';
            
            // S30.11 Nodal Protocol
            chipContainer.getValidatedValue = () => {
                return Array.from(chipContainer.querySelectorAll('ion-label')).map(l => l.textContent).join(', ');
            };

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

        // NOTA S30.11: La implementación redundante global.UI_Factory.buildDynamicList 
        // ha sido extirpada para mantener una única fuente de verdad en UI_Component_DynamicList.client.js.


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

        // global.UI_Factory.buildSearchableMulti has been extracted to UI_Component_SearchableMulti.html
    })(window);