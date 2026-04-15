/**
 * UI_Component_SearchableSingle.html
 * 
 * Implementa un selector único reactivo (Typeahead Autocomplete / Combobox Nativo).
 * Gobernanza Estricta E30: El input físico captura búsqueda textual, pero fuerza 
 * una validación vinculada al dataset (elimina datos no correlacionados o libres).
 */
(function (global) {
    global.UI_Factory = global.UI_Factory || {};

    global.UI_Factory.buildSearchableSingle = (fieldDef, dataset = [], initialSelection, localEventBus, visualTokens = {}) => {
        const mainContainer = document.createElement('div');
        mainContainer.setAttribute('data-searchable-single', fieldDef.name);
        mainContainer.setAttribute('data-form-component', fieldDef.name);
        mainContainer.className = 'searchable-single-container';
        mainContainer.style.position = 'relative';
        mainContainer.style.width = '100%';
        mainContainer.style.marginBottom = 'var(--spacing-3)';
        
        let selectedId = null;
        if (Array.isArray(initialSelection)) {
             selectedId = initialSelection.length > 0 ? initialSelection[0] : null;
        } else if (initialSelection) {
             selectedId = String(initialSelection).trim() !== '' ? String(initialSelection) : null;
        }

        // Extracción Nodal: Ocultamos el campo visual en favor del payload
        mainContainer.getValidatedValue = () => selectedId;
        Object.defineProperty(mainContainer, 'value', {
            get: () => selectedId,
            set: (val) => {
                selectedId = val === '' ? null : val;
                renderState();
            }
        });

        // ==========================================
        // 0. Metadatos Inyectados (Inversion of Control)
        // ==========================================
        const baseEntityIcon = visualTokens.iconName || 'folder-outline';
        const baseColorTheme = visualTokens.color ? `var(--ion-color-${visualTokens.color})` : 'var(--ion-color-step-300)';

        // ==========================================
        // 1. Instanciación del Combobox (<ion-input>)
        // ==========================================
        const realInputId = 'combobox-' + Math.random().toString(36).substr(2,9);
        const realInput = document.createElement('ion-input');
        realInput.id = realInputId;
        realInput.setAttribute('fill', 'outline');
        realInput.setAttribute('mode', 'md'); // Forzamos estilo material limpio
        realInput.setAttribute('clear-input', 'true');
        
        // Transformar en Floating Label (Patrón estándar de formularios)
        realInput.setAttribute('label', fieldDef.label + (fieldDef.required ? ' *' : ''));
        realInput.setAttribute('label-placement', 'floating');
        // El label floating actúa como el único placeholder visual, descartamos textos foráneos.

        // Slot Izquierdo: Solo lo mostramos cuando haya identidad definida (quitamos la lupa inactiva)
        const iconStartBox = document.createElement('div');
        iconStartBox.slot = 'start';
        iconStartBox.style.width = '24px';
        iconStartBox.style.height = '24px';
        iconStartBox.style.background = 'var(--ion-color-step-200)';
        iconStartBox.style.borderRadius = '4px';
        iconStartBox.style.display = 'inline-flex';
        iconStartBox.style.justifyContent = 'center';
        iconStartBox.style.alignItems = 'center';
        iconStartBox.style.marginLeft = '8px';
        iconStartBox.style.marginRight = '8px';
        
        const runtimeIcon = document.createElement('ion-icon');
        runtimeIcon.style.color = 'var(--ion-color-medium)';
        runtimeIcon.style.fontSize = '14px';
        runtimeIcon.setAttribute('name', 'search-outline');
        
        iconStartBox.appendChild(runtimeIcon);
        // No lo adjuntamos directamente aún para no destruir la animación Floating Label de Ionic
        // realInput.appendChild(iconStartBox); 
        mainContainer.appendChild(realInput);

        // Variables de Motor De Búsqueda Dinámica
        const isMobile = () => window.innerWidth <= 768;
        let popoverNode = null;
        let isDropdownOpen = false;
        let currentSearchTerm = '';
        /**
         * [S35.4] BLUR RACE CONDITION GUARD (Patrón Estándar de Proyecto)
         *
         * Problema: En Desktop, el clic en una opción de la lista dispara primero
         * el `ionBlur` del ion-input ANTES de que el `onclick` del item se ejecute.
         * Esto provoca que `closeDropdown()` cierre la lista antes de que se pueda
         * registrar la selección del usuario.
         *
         * Solución: `temporaryBlurFlag` se activa en `onmousedown` (que ocurre antes
         * del blur) y se desactiva en `onclick` (tras capturar la selección).
         * El listener de `ionBlur` respeta esta guardia con un delay de 180ms.
         *
         * NOTA: NO eliminar este flag. Es la guardia crítica contra la carrera de
         * eventos Blur→Click que afecta a todos los Combobox nativos en Ionic/Desktop.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/mousedown_event
         */
        let temporaryBlurFlag = false;

        // ==========================================
        // 2. Transductor de Visibilidad (Estado Seguro)
        // ==========================================
        const getMatchTarget = (idToSearch) => {
            if (!Array.isArray(dataset)) return null;
            return dataset.find(d => String(typeof d[fieldDef.valueField] !== 'undefined' ? d[fieldDef.valueField] : d.id_registro) === String(idToSearch));
        };

        const renderState = () => {
            if (mainContainer.hasAttribute('disabled')) {
                realInput.setAttribute('disabled', 'true');
            } else {
                realInput.removeAttribute('disabled');
            }

            // Sensado dinámico de dispositivo (Quality Review Fix)
            if (isMobile()) {
                realInput.setAttribute('readonly', 'true');
            } else {
                realInput.removeAttribute('readonly');
            }

            if (!selectedId) {
                // Estado Inactivo: Desconectamos orgánicamente el slot radicalmente.
                if (iconStartBox.parentNode) {
                    iconStartBox.remove();
                }
                // Limpiar el texto si no hay búsqueda activa (esto garantiza que baje y actúe de placeholder)
                realInput.value = currentSearchTerm || ''; 
                return;
            }

            const match = getMatchTarget(selectedId);
            const lexicalId = match ? (match.id_numero || selectedId) : selectedId;
            const semanticName = match ? (typeof match[fieldDef.labelField] !== 'undefined' ? match[fieldDef.labelField] : match.nombre) : 'Sin Encontrar';

            // Pintar de vuelta la seguridad gráfica
            realInput.value = `${lexicalId} - ${semanticName}`;
            
            // Reaparecer caja decorativa inyectando al HTML nuevamente
            if (iconStartBox.parentNode !== realInput) {
                realInput.appendChild(iconStartBox);
            }
            iconStartBox.style.display = 'inline-flex';
            runtimeIcon.setAttribute('name', baseEntityIcon);
            runtimeIcon.style.color = 'var(--ion-color-light, white)';
            iconStartBox.style.background = baseColorTheme;
        };

        // ==========================================
        // 3. Orquestador Typeahead Nativo (Filtro sin Focus Trap)
        // ==========================================
        const closeDropdown = () => {
            if (popoverNode && isDropdownOpen) {
                isDropdownOpen = false;
                const nodeRef = popoverNode;
                popoverNode = null;
                
                if (nodeRef.tagName === 'ION-MODAL') {
                    // Cierre nativo fluido de Capacitor/Ionic
                    if (typeof nodeRef.dismiss === 'function') {
                        nodeRef.dismiss().then(() => { if(nodeRef.parentNode) nodeRef.parentNode.removeChild(nodeRef); });
                    } else {
                        nodeRef.remove();
                    }
                } else {
                    nodeRef.remove();
                }
            }
        };

        const getMatches = (term) => {
            return dataset.map(d => {
                const lId = d.id_numero || (typeof d[fieldDef.valueField] !== 'undefined' ? d[fieldDef.valueField] : d.id_registro);
                const lName = typeof d[fieldDef.labelField] !== 'undefined' ? d[fieldDef.labelField] : d.nombre;
                return { raw: d, key: String(lId), label: String(lName) };
            })
            .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
            .filter(item => {
                if(!term) return true;
                return item.label.toLowerCase().includes(term.toLowerCase()) || item.key.toLowerCase().includes(term.toLowerCase());
            });
        };

        const buildListItems = async (listElement, term) => {
            listElement.innerHTML = '';
            
            let matches = getMatches(term);
            if (matches.length > 50) matches = matches.slice(0, 50); // Hard limiter

            if (matches.length === 0) {
                const item = document.createElement('ion-item');
                item.textContent = 'No se encontraron registros.';
                item.disabled = true;
                listElement.appendChild(item);
                return;
            }

            matches.forEach(m => {
                const item = document.createElement('ion-item');
                item.button = true;
                
                // Color Box Icon
                const iBox = document.createElement('div');
                iBox.slot = 'start';
                iBox.style.width = '32px';
                iBox.style.height = '32px';
                iBox.style.background = baseColorTheme;
                iBox.style.borderRadius = '6px';
                iBox.style.display = 'inline-flex';
                iBox.style.justifyContent = 'center';
                iBox.style.alignItems = 'center';
                iBox.style.marginRight = '12px';
                
                const internalIcon = document.createElement('ion-icon');
                internalIcon.setAttribute('name', baseEntityIcon);
                internalIcon.style.color = 'var(--ion-color-light, white)';
                internalIcon.style.fontSize = '18px';
                iBox.appendChild(internalIcon);

                const labelNode = document.createElement('ion-label');
                const titleText = document.createElement('h3');
                titleText.textContent = `${m.label}`;
                titleText.style.fontWeight = 'bold';
                titleText.style.color = 'var(--ion-color-dark)';
                
                const subText = document.createElement('p');
                const targetEntityStr = fieldDef.targetEntity || fieldDef.name || 'Registro';
                subText.textContent = `${targetEntityStr} • ${m.key}`;
                subText.style.fontSize = '11px';
                
                labelNode.appendChild(titleText);
                labelNode.appendChild(subText);
                
                item.appendChild(iBox);
                item.appendChild(labelNode);

                if (selectedId === m.key) {
                    const checkIcon = document.createElement('ion-icon');
                    checkIcon.setAttribute('name', 'checkmark-outline');
                    checkIcon.setAttribute('slot', 'end');
                    checkIcon.style.color = 'var(--ion-color-primary)';
                    item.appendChild(checkIcon);
                }

                item.onmousedown = (e) => { 
                    e.preventDefault(); // Impide Blur prematuro de realInput en Desktop
                    temporaryBlurFlag = true; 
                };
                
                item.onclick = () => {
                    selectedId = m.key;
                    currentSearchTerm = '';
                    renderState();
                    dispatchSelection();
                    closeDropdown();
                    temporaryBlurFlag = false;
                };
                
                listElement.appendChild(item);
            });
        };

        const executeSearchAndOpen = async (ev) => {
            if (mainContainer.hasAttribute('disabled')) return;
            
            if (isDropdownOpen && popoverNode) {
                const listEl = popoverNode.querySelector('ion-list');
                if (listEl) await buildListItems(listEl, currentSearchTerm);
                return;
            }
            
            isDropdownOpen = true;

            // DRY [H9] Instancia base unificada
            const commonList = document.createElement('ion-list');
            commonList.lines = 'full';
            commonList.style.margin = '0';
            commonList.style.padding = '0';
            await buildListItems(commonList, currentSearchTerm);

            if (isMobile()) {
                // UX Móvil (Bottom Sheet)
                popoverNode = document.createElement('ion-modal');
                popoverNode.breakpoints = [0, 0.5, 0.85, 1];
                popoverNode.initialBreakpoint = 0.85;
                popoverNode.setAttribute('handle', 'true'); // Barra gestual UX para ayudar al swipe-down nativo
                popoverNode.style.overscrollBehaviorY = 'none'; // CRÍTICO: Evita Pull-to-Refresh en Chrome mobile

                popoverNode.addEventListener('ionModalDidDismiss', () => {
                    // El usuario hizo swipe down
                    if (isDropdownOpen) {
                        isDropdownOpen = false;
                        popoverNode = null;
                        strictBlurValidation();
                    }
                });
                
                const header = document.createElement('ion-header');
                const toolbar = document.createElement('ion-toolbar');
                const searchbar = document.createElement('ion-searchbar');
                searchbar.placeholder = fieldDef.label || 'Buscar...';
                searchbar.value = currentSearchTerm;
                
                searchbar.addEventListener('ionInput', async (e) => {
                    const term = (e.detail.value || '').trim();
                    const listEl = popoverNode.querySelector('ion-list');
                    if (listEl) await buildListItems(listEl, term);
                });

                toolbar.appendChild(searchbar);
                header.appendChild(toolbar);

                const content = document.createElement('ion-content');
                // Detener el sangrado de overscroll fuera del wrapper hacia el app shell de Chrome
                content.style.overscrollBehaviorY = 'contain';
                content.appendChild(commonList);
                
                popoverNode.appendChild(header);
                popoverNode.appendChild(content);

                document.body.appendChild(popoverNode);
                
                // Presentación: Al usar await, la animación del Bottom-Sheet ya tomó ~300ms.
                // Disparemos el foco de la caja asíncronamente sin bloqueadores agresivos.
                await popoverNode.present();
                
                if (searchbar.getInputElement) {
                    searchbar.getInputElement().then(el => el.focus());
                }

            } else {
                // UX Desktop (Div Absoluto flotante)
                popoverNode = document.createElement('div');
                popoverNode.style.position = 'absolute';
                popoverNode.style.zIndex = '999999';
                popoverNode.style.background = 'var(--ion-background-color, #fff)';
                popoverNode.style.borderRadius = '8px';
                popoverNode.style.border = '1px solid var(--sidebar-border, #ccc)';
                popoverNode.style.boxShadow = 'var(--shadow-floating)';
                popoverNode.style.maxHeight = '350px';
                popoverNode.style.overflowY = 'auto'; // habilitar scroll local
                
                const boxRect = realInput.getBoundingClientRect();
                // Evitar desbordes verticales y anclar directo al padre rect
                popoverNode.style.width = `${boxRect.width}px`;
                popoverNode.style.top = `${boxRect.bottom + 4 + window.scrollY}px`;
                popoverNode.style.left = `${boxRect.left + window.scrollX}px`;
                
                popoverNode.appendChild(commonList);

                document.body.appendChild(popoverNode);
            }
        };

        const strictBlurValidation = () => {
            if (!selectedId) {
                // Nunca se seleccionó formalmente, borramos basura tipeada.
                realInput.value = '';
                currentSearchTerm = '';
            } else {
                if (String(realInput.value).trim() === '') {
                    // El usuario limpió el campo intencionalmente con retroceso (backspace).
                    selectedId = null;
                    currentSearchTerm = '';
                    dispatchSelection();
                } else {
                    // Tenía selección antes. Evaluamos si el texto encaja exactamente con su registro o fue estropeado.
                    const match = getMatchTarget(selectedId);
                    const lexicalId = match ? (match.id_numero || selectedId) : selectedId;
                    const semanticName = match ? (typeof match[fieldDef.labelField] !== 'undefined' ? match[fieldDef.labelField] : match.nombre) : 'Sin Encontrar';
                    const idealStr = `${lexicalId} - ${semanticName}`;
                    
                    if (String(realInput.value).trim() !== idealStr.trim()) {
                        // Trató de escribir texto libre, lo ignoramos retrocediendo a su selección segura.
                        realInput.value = idealStr;
                    }
                }
            }
            renderState(); // Refuerza gráfico de iconos
        };

        const dispatchSelection = () => {
            mainContainer.dispatchEvent(new CustomEvent('ionChange', { detail: { value: selectedId } }));
            if (localEventBus && typeof localEventBus.publish === 'function') {
                localEventBus.publish('SINGLESELECT_CHANGED', { fieldName: fieldDef.name, value: selectedId });
            }
        };

        // ==========================================
        // 4. Integraciones (Event Listeners del Input)
        // ==========================================
        
        mainContainer.onclick = (ev) => {
            // Un clic general asegura que abra (como combobox nativo)
            if (!isDropdownOpen) {
                currentSearchTerm = ''; // Al clic, abre opciones completas (requisito usuario)
                executeSearchAndOpen(ev);
            }
        };

        realInput.addEventListener('ionInput', (ev) => {
            if (!isMobile()) {
                currentSearchTerm = (ev.detail.value || '').trim();
                // Disparar redibujado de lista dinámico
                executeSearchAndOpen(ev);
            }
        });

        // BLOQUEO DE DOBLE-BURBUJA: El <ion-input> nativamente dispara ionChange al perder el foco si su texto cambió.
        // Lo silenciamos para que no se filtre hacia el formulario padre, ya que nosotros despachamos el ionChange "oficial" en dispatchSelection().
        realInput.addEventListener('ionChange', (ev) => {
            ev.stopPropagation();
        });

        realInput.addEventListener('ionClear', (ev) => {
            selectedId = null;
            currentSearchTerm = '';
            renderState();
            dispatchSelection();
            
            // Re-abrir sugerencias ahora en blanco
            setTimeout(()=> {
               if(realInput.getInputElement) realInput.getInputElement().then(el => el.focus());
               executeSearchAndOpen(null);
            }, 50);
        });

        // Evento crítico para disparar validación si el usuario scrollea o hace clic afuera
        realInput.addEventListener('ionBlur', () => {
            if (isMobile()) return; // En móvil, el Modal roba el foco. Su propia clausura gestiona la limpieza.
            
            setTimeout(() => {
                if (!temporaryBlurFlag) {
                    closeDropdown();
                    strictBlurValidation();
                }
            }, 180); // Retraso prudente para que list.onclick gane la carrera en desktop
        });

        // ==========================================
        // API Expuesta
        // ==========================================
        mainContainer.updateConfig = function(newDataset, isDisabled, placeholderTextStr) {
            dataset = newDataset;
            if (isDisabled) {
                mainContainer.setAttribute('disabled', 'true');
            } else {
                mainContainer.removeAttribute('disabled');
            }
            renderState();
        };

        // Pintado Inicial Seguro
        setTimeout(() => renderState(), 0);

        return mainContainer;
    };
})(typeof window !== 'undefined' ? window : this);
