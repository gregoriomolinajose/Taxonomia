/**
 * UI_FormStepper.html (S14.1 / S49.11)
 *
 * Micro-Frontend / Clase dedicada exclusivamente a gestionar la lógica 
 * topológica de navegación (wizards/tabs) dentro de un Modal.
 * Respeta el SRP y previene conflictos en Modales apilados.
 *
 * S49.11: Refinamiento visual — subtítulos en sidebar, badge pill,
 *         dot indicators, progress bar interna, schema-driven descriptions.
 */

window.UI_FormStepper = class UI_FormStepper {
    constructor(config) {
        this.steps = config.steps || ['Configuración General'];
        this.cardContent = config.cardContent;
        this.sidebarSteps = config.sidebarSteps;
        this.btnPrev = config.btnPrev;
        this.btnNext = config.btnNext;
        this.btnSubmit = config.btnSubmit;
        this.progressLabel = config.progressLabel;
        this.isStateful = config.stateful || false;
        this.entityName = config.entityName || null;
        this.onStepChange = config.onStepChange || null; // S49.12
        
        // Estado Interno (Scoped a la Instancia del Modal)
        this.currentStepIndex = 0;
        this.totalSteps = this.steps.length;
        this.stepContainers = {};
        this.menuItems = {};
        this.rows = {};
        
        // S49.11: Schema-driven descriptions (R1 fix — single source of truth)
        this._descriptions = this._loadDescriptions();

        this._initializeDOM();
        this._attachListeners();
    }

    /**
     * S49.11: Carga descripciones desde Schema_Engine si están disponibles,
     * con fallback genérico para entidades sin stepDescriptions.
     */
    _loadDescriptions() {
        if (this.entityName && window.APP_SCHEMAS && window.APP_SCHEMAS[this.entityName]) {
            const schema = window.APP_SCHEMAS[this.entityName];
            if (schema.stepDescriptions) return schema.stepDescriptions;
        }
        // Fallback genérico
        return {};
    }

    _getStepDescription(stepName) {
        return this._descriptions[stepName] || 'Complete la información solicitada en esta sección.';
    }

    _initializeDOM() {
        if (this.sidebarSteps) this.sidebarSteps.innerHTML = '';

        // S54.5: Configure split view structure
        this.splitContainer = document.createElement('div');
        this.splitContainer.className = 'wizard-split-container';
        this.splitContainer.style.position = 'relative';
        
        this.splitLeft = document.createElement('div');
        this.splitLeft.className = 'wizard-split-left';
        
        this.splitRight = document.createElement('div');
        this.splitRight.className = 'wizard-split-right';
        this.splitRight.id = 'wizard-canvas-wrapper';
        this.splitRight.style.position = 'relative';

        this.btnFullscreen = document.createElement('ion-fab-button');
        this.btnFullscreen.size = "small";
        this.btnFullscreen.color = "light";
        this.btnFullscreen.style.cssText = "position: absolute; top: 10px; right: 10px; z-index: 1000;";
        this.btnFullscreen.innerHTML = '<ion-icon name="expand-outline"></ion-icon>';
        
        this.btnFullscreen.onclick = () => {
            const drawerNode = this.cardContent ? this.cardContent.closest('.drawer-panel') : null;
            if (drawerNode) {
                const isFullscreen = drawerNode.classList.toggle('fullscreen-wizard');
                this.btnFullscreen.innerHTML = isFullscreen ? '<ion-icon name="contract-outline"></ion-icon>' : '<ion-icon name="expand-outline"></ion-icon>';
                setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
            }
        };

        this.splitContainer.appendChild(this.btnFullscreen);
        
        this.splitContainer.appendChild(this.splitLeft);
        this.splitContainer.appendChild(this.splitRight);
        
        this.cardContent.appendChild(this.splitContainer);

        // S54.5: Reactividad para el lienzo
        const triggerRefresh = () => {
            if (this._canvasInstanceMounted && typeof window.UI_View_SwimlaneGrid !== 'undefined') {
                window.UI_View_SwimlaneGrid.refresh();
            }
        };
        this.splitLeft.addEventListener('ionChange', triggerRefresh);
        this.splitLeft.addEventListener('UI_GraphEdge::Changed', triggerRefresh);
        this.splitLeft.addEventListener('input', triggerRefresh);

        this.steps.forEach((stepName, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.id = 'form-section-' + stepName.replace(/\s+/g, '-');
            stepDiv.classList.toggle('ion-hide', index !== 0);
            this.stepContainers[stepName] = stepDiv;

            if (this.sidebarSteps) {
                const item = document.createElement('ion-item');
                item.button = true; // Efecto Ripple interactivo
                item.setAttribute('lines', 'none');
                item.style.borderRadius = 'var(--rounded-sm)';
                item.style.margin = 'var(--spacing-1) 0';
                item.style.setProperty('--min-height', '52px');
                item.style.setProperty('--padding-start', 'var(--spacing-3)');
                item.style.setProperty('--padding-end', 'var(--spacing-3)');
                if (index === 0) item.style.setProperty('--background', 'var(--dv-primary-light, rgba(28, 66, 232, 0.06))');
                
                item.onclick = () => {
                    this.goToSection(stepName);
                };

                // S49.6: Número circular dinámico
                const iconContainer = document.createElement('div');
                iconContainer.setAttribute('slot', 'start');
                iconContainer.style.cssText = 'width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;margin-right:var(--spacing-3);flex-shrink:0;transition:all 0.2s ease;';
                
                if (index === 0) {
                    iconContainer.style.backgroundColor = 'var(--ion-color-primary)';
                    iconContainer.style.color = 'var(--ion-color-primary-contrast)';
                } else {
                    iconContainer.style.backgroundColor = 'var(--ion-color-step-150, #e0e0e0)';
                    iconContainer.style.color = 'var(--ion-color-medium)';
                }
                iconContainer.textContent = (index + 1).toString();

                // S49.11: Label con subtítulo descriptivo
                const labelWrap = document.createElement('ion-label');
                labelWrap.style.fontFamily = 'var(--sys-font-family-body, system-ui, -apple-system, sans-serif)';
                
                const titleSpan = document.createElement('span');
                titleSpan.textContent = stepName;
                titleSpan.style.cssText = 'display:block;font-weight:600;font-size:var(--sys-font-body);line-height:1.3;';
                if (index === 0) titleSpan.style.color = 'var(--ion-color-primary)';
                
                const subtitleSpan = document.createElement('span');
                subtitleSpan.textContent = this._getStepDescription(stepName);
                subtitleSpan.style.cssText = 'display:block;font-size:var(--sys-font-caption, 0.75rem);color:var(--ion-color-step-500, #888);font-weight:400;line-height:1.3;margin-top:2px;';
                subtitleSpan.className = 'stepper-sidebar-subtitle';
                
                labelWrap.appendChild(titleSpan);
                labelWrap.appendChild(subtitleSpan);

                item.appendChild(iconContainer);
                item.appendChild(labelWrap);
                this.sidebarSteps.appendChild(item);

                this.menuItems[stepName] = { item, icon: iconContainer, label: labelWrap, titleSpan, subtitleSpan, stepNumber: index + 1 };
            }

            stepDiv.style.display = index === 0 ? 'flex' : 'none';
            stepDiv.style.flexDirection = 'column';
            stepDiv.style.justifyContent = 'flex-start';
            stepDiv.style.minHeight = '60vh';
            stepDiv.style.maxWidth = '600px';
            stepDiv.style.margin = '0 auto';
            stepDiv.style.paddingTop = 'var(--spacing-6)';

            this.splitLeft.appendChild(stepDiv);

            // S49.11: Badge pill con punto pulsante + fondo semitransparente
            const badgePill = document.createElement('span');
            badgePill.className = 'wizard-step-badge';
            badgePill.style.cssText = 'display:inline-flex;align-items:center;gap:var(--spacing-2);padding:var(--spacing-1) var(--spacing-3);border-radius:var(--rounded-full);background:rgba(var(--ion-color-primary-rgb, 28, 66, 232), 0.08);color:var(--ion-color-primary);font-size:var(--sys-font-caption, 0.75rem);font-weight:600;font-family:var(--ion-font-family, system-ui, sans-serif);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:var(--spacing-3);width:fit-content;';
            
            const pulseDot = document.createElement('span');
            pulseDot.className = 'pulse-dot';
            
            const badgeText = document.createElement('span');
            badgeText.textContent = `PASO ${index + 1} DE ${this.totalSteps}`;
            
            badgePill.appendChild(pulseDot);
            badgePill.appendChild(badgeText);
            
            // Header del Content Area
            const headerWrap = document.createElement('div');
            headerWrap.style.marginBottom = 'var(--spacing-5)';
            headerWrap.style.textAlign = 'left';

            headerWrap.appendChild(badgePill);

            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = (stepName === 'default' ? 'Configuración General' : stepName);
            sectionTitle.style.cssText = 'color:var(--ion-text-color);font-size:var(--sys-font-h2, 1.5rem);font-family:var(--font-display, var(--ion-font-family, system-ui, sans-serif));font-weight:700;margin:0 0 var(--spacing-2) 0;';
            headerWrap.appendChild(sectionTitle);

            // Descripción del paso en el content area
            const desc = document.createElement('p');
            desc.style.cssText = 'margin:0;font-size:var(--sys-font-body);max-width:100%;color:var(--ion-color-step-600, #666);line-height:1.5;';
            desc.textContent = this._getStepDescription(stepName);
            headerWrap.appendChild(desc);

            stepDiv.appendChild(headerWrap);

            // Grid para inyección de campos
            const grid = document.createElement('ion-grid');
            grid.style.padding = 'var(--spacing-0)';
            grid.style.width = '100%';
            const row = document.createElement('ion-row');
            grid.appendChild(row);

            stepDiv.appendChild(grid);
            this.rows[stepName] = row;

            // Guardamos referencia al badge para actualizar dinámicamente
            this.stepContainers[stepName]._badge = badgePill;
        });

        // S49.11: Barra de progreso al pie del sidebar
        if (this.sidebarSteps) {
            const progressWrap = document.createElement('div');
            progressWrap.style.cssText = 'margin-top:auto;padding:var(--spacing-4) 0 0 0;';

            const progressText = document.createElement('div');
            progressText.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-2);';
            
            const progLabel = document.createElement('span');
            progLabel.style.cssText = 'font-size:var(--sys-font-caption, 0.75rem);font-weight:600;color:var(--ion-text-color);';
            progLabel.textContent = 'Progreso';
            
            const progCount = document.createElement('span');
            progCount.style.cssText = 'font-size:var(--sys-font-caption, 0.75rem);color:var(--ion-color-step-500, #888);';
            progCount.textContent = `1 de ${this.totalSteps}`;
            
            progressText.appendChild(progLabel);
            progressText.appendChild(progCount);

            const progressBarContainer = document.createElement('div');
            progressBarContainer.style.cssText = 'width:100%;height:4px;border-radius:var(--rounded-full);background:var(--ion-color-step-150, #e0e0e0);overflow:hidden;';
            
            const progressFill = document.createElement('div');
            progressFill.style.cssText = 'height:100%;border-radius:var(--rounded-full);background:var(--ion-color-primary);transition:width 0.3s ease;';
            progressFill.style.width = `${(1 / this.totalSteps) * 100}%`;
            
            progressBarContainer.appendChild(progressFill);
            progressWrap.appendChild(progressText);
            progressWrap.appendChild(progressBarContainer);
            this.sidebarSteps.appendChild(progressWrap);

            // Guardar referencias para actualización dinámica
            this._sidebarProgressCount = progCount;
            this._sidebarProgressFill = progressFill;
        }
    }

    _attachListeners() {
        this.btnPrev.addEventListener('click', () => {
            if (this.currentStepIndex > 0) this.goToSection(this.steps[this.currentStepIndex - 1]);
        });

        this.btnNext.addEventListener('click', () => {
            const currentContainer = this.stepContainers[this.steps[this.currentStepIndex]];
            const isValid = window.UI_FormUtils ? window.UI_FormUtils.validateRequiredFields(currentContainer) : true;

            if (isValid && this.currentStepIndex < this.totalSteps - 1) {
                this.goToSection(this.steps[this.currentStepIndex + 1]);
            }
        });

        if (this.isStateful) {
            // S49.2: Escuchar cambios para actualizar estado visual de las secciones
            const recalcFn = () => this.recalculateAllStatuses();
            this.cardContent.addEventListener('input', recalcFn);
            this.cardContent.addEventListener('ionChange', recalcFn);
            this.cardContent.addEventListener('UI_GraphEdge::Changed', recalcFn);
        }
    }

    recalculateAllStatuses() {
        if (!this.isStateful || !this.sidebarSteps) return;

        this.steps.forEach((stepName, idx) => {
            const mi = this.menuItems[stepName];
            if (!mi) return;

            const container = this.stepContainers[stepName];
            // S49.6: Ampliado para incluir tx-searchable
            const inputs = container.querySelectorAll('ion-input, ion-textarea, ion-select, input, .subgrid-container, tx-searchable');
            
            let hasData = false;
            inputs.forEach(el => {
                if (el.classList.contains('subgrid-container')) {
                    const items = el.querySelectorAll('ion-item');
                    if (items.length > 0) hasData = true;
                } else if (Array.isArray(el.value)) {
                    if (el.value.length > 0) hasData = true;
                } else if (el.value !== undefined && el.value !== null && String(el.value).trim() !== '' && String(el.value).trim() !== '[]') {
                    hasData = true;
                }
            });

            const isCurrent = (idx === this.currentStepIndex);

            // S49.6: Lógica de actualización para Avatar Chips / Iconos Numéricos
            if (hasData) {
                // Completado -> Mostrar icono Check
                mi.icon.innerHTML = '<ion-icon name="checkmark"></ion-icon>';
                mi.icon.style.backgroundColor = 'var(--ion-color-success)';
                mi.icon.style.color = 'var(--ion-color-success-contrast, #fff)';
            } else {
                // Incompleto -> Mostrar número
                mi.icon.innerHTML = '';
                mi.icon.textContent = mi.stepNumber.toString();
                if (isCurrent) {
                    mi.icon.style.backgroundColor = 'var(--ion-color-primary)';
                    mi.icon.style.color = 'var(--ion-color-primary-contrast)';
                } else {
                    mi.icon.style.backgroundColor = 'var(--ion-color-step-150, #e0e0e0)';
                    mi.icon.style.color = 'var(--ion-color-medium)';
                }
            }
            
            // S49.11: Actualizar color del título del sidebar
            mi.titleSpan.style.color = isCurrent ? 'var(--ion-color-primary)' : (hasData ? 'var(--ion-color-success)' : '');
        });
    }

    goToSection(targetSectionName) {
        let newIdx = this.steps.indexOf(targetSectionName);
        if (newIdx === -1) newIdx = 0;

        // S55.6: Autoguardado Universal para transiciones de Wizard
        if (this.btnSubmit && this.btnSubmit._formSubmitterInstance && newIdx !== this.currentStepIndex) {
            if (this.btnNext) this.btnNext.disabled = true;
            this.btnSubmit.disabled = true;
            
            const submitter = this.btnSubmit._formSubmitterInstance;
            submitter._isSilent = true; // Auto-guardar silenciosamente (isFormModal = false virtual)
            
            // Suscribirse a los eventos de éxito o error
            const unsubSuccess = window.AppEventBus.subscribe('FORM::SUBMIT_SUCCESS', () => {
                cleanup();
                this._executeSectionTransition(newIdx, targetSectionName);
            });
            
            const unsubError = window.AppEventBus.subscribe('FORM::SUBMIT_ERROR', () => {
                cleanup();
                console.warn("[Stepper] Autoguardado Universal: Fallo el autoguardado en la transición de paso.");
            });
            
            const cleanup = () => {
                if (typeof unsubSuccess === 'function') unsubSuccess();
                if (typeof unsubError === 'function') unsubError();
                submitter._isSilent = false;
                if (this.btnNext) this.btnNext.disabled = false;
                if (this.btnSubmit) this.btnSubmit.disabled = false;
            };

            // Disparar envío optimista asincrono
            this.btnSubmit.click();
            return;
        }

        this._executeSectionTransition(newIdx, targetSectionName);
    }

    _executeSectionTransition(newIdx, targetSectionName) {
        this.currentStepIndex = newIdx;

        Object.keys(this.stepContainers).forEach(key => {
            const isTarget = key === targetSectionName;
            const container = this.stepContainers[key];
            
            // Si usamos Flex, no podemos usar ion-hide que fuerza display:none vs flex
            if (isTarget) {
                container.classList.remove('ion-hide');
                container.style.display = 'flex';
            } else {
                container.classList.add('ion-hide');
                container.style.display = 'none';
            }
        });

        // S54.5: Fullscreen Drawer & Canvas Orchestration
        const drawerNode = this.cardContent ? this.cardContent.closest('.drawer-panel') : null;
        const isFullscreenZone = this.cardContent ? this.cardContent.closest('#wizard-fullscreen-zone') !== null : false;
        
        // Find the main layout columns to toggle sidebar visibility
        const layoutColLeft = document.getElementById('wizard-col-left');
        const layoutColRight = document.getElementById('wizard-col-right');
        
        if ((drawerNode || isFullscreenZone) && this.entityName === 'Taxonomia') {
            if (this.currentStepIndex >= 1) { // Paso 2+
                if (drawerNode) {
                    drawerNode.classList.add('fullscreen');
                    drawerNode.classList.add('drawer-fullscreen'); // Para reglas específicas del split
                }
                
                // S55.2: Ocultar panel izquierdo completamente en el Canvas para maximizar espacio
                this.splitLeft.style.display = 'none';
                
                // S55.2: Ocultar el sidebar de pasos si estamos en Landing Page (Fullscreen Zone)
                if (isFullscreenZone) {
                    if (layoutColLeft) layoutColLeft.style.display = 'none';
                    if (layoutColRight) {
                        layoutColRight.setAttribute('size-md', '12');
                        layoutColRight.setAttribute('size-lg', '12');
                        layoutColRight.setAttribute('size-xl', '12');
                    }
                }
                
                this.splitRight.style.display = 'flex';
                this.splitRight.style.flex = '1';
                this.splitRight.style.width = '100%';
                
                if (this.btnFullscreen) {
                    // En Landing Page ya es fullscreen absoluto, ocultamos el botón de expandir
                    this.btnFullscreen.style.display = isFullscreenZone ? 'none' : 'block';
                }
                this._mountCanvasViewer();
            } else {
                if (drawerNode) {
                    drawerNode.classList.remove('fullscreen');
                    drawerNode.classList.remove('drawer-fullscreen');
                }
                
                // Restaurar panel izquierdo
                this.splitLeft.style.display = '';
                
                // Restaurar layout original del sidebar
                if (isFullscreenZone) {
                    if (layoutColLeft) layoutColLeft.style.display = '';
                    if (layoutColRight) {
                        layoutColRight.setAttribute('size-md', '8');
                        layoutColRight.setAttribute('size-lg', '9');
                        layoutColRight.setAttribute('size-xl', '10');
                    }
                }
                
                this.splitRight.style.display = 'none';
                if (this.btnFullscreen) this.btnFullscreen.style.display = 'none';
                this._unmountCanvasViewer();
            }
        }

        if (this.sidebarSteps) {
            this.steps.forEach((stepName, idx) => {
                const mi = this.menuItems[stepName];
                if (!mi) return;
                
                mi.item.style.setProperty('--background', 'transparent');

                if (!this.isStateful) {
                    mi.icon.style.backgroundColor = 'var(--ion-color-step-150, #e0e0e0)';
                    mi.icon.style.color = 'var(--ion-color-medium)';
                    mi.titleSpan.style.color = '';

                    if (idx === this.currentStepIndex) {
                        mi.item.style.setProperty('--background', 'var(--dv-primary-light, rgba(28, 66, 232, 0.06))');
                        mi.item.style.borderRadius = 'var(--rounded-sm, 8px)';
                        mi.icon.style.backgroundColor = 'var(--ion-color-primary)';
                        mi.icon.style.color = 'var(--ion-color-primary-contrast)';
                        mi.titleSpan.style.color = 'var(--ion-color-primary)';
                    }
                } else {
                    if (idx === this.currentStepIndex) {
                        mi.item.style.setProperty('--background', 'var(--dv-primary-light, rgba(28, 66, 232, 0.06))');
                        mi.item.style.borderRadius = 'var(--rounded-sm, 8px)';
                    }
                }
            });
            if (this.isStateful) this.recalculateAllStatuses();
        }

        // S49.11: Badge text ya no necesita actualización dinámica (es estático por paso)

        // S49.11: Actualizar progress bar del sidebar
        if (this._sidebarProgressCount) {
            this._sidebarProgressCount.textContent = `${this.currentStepIndex + 1} de ${this.totalSteps}`;
        }
        if (this._sidebarProgressFill) {
            this._sidebarProgressFill.style.width = `${((this.currentStepIndex + 1) / this.totalSteps) * 100}%`;
        }

        if (this.progressLabel) {
            this.progressLabel.textContent = `Paso ${this.currentStepIndex + 1} de ${this.totalSteps}`;
        }

        if (this.progressBar) {
            // S49.6: Progreso incremental en la barra 
            const progressRatio = (this.currentStepIndex + 1) / this.totalSteps;
            this.progressBar.value = progressRatio;
        }
        
        if (this.btnPrev) {
            this.btnPrev.classList.toggle('ion-hide', this.currentStepIndex === 0);
        }

        const isLastStep = (this.currentStepIndex === this.totalSteps - 1);
        if (this.btnNext) this.btnNext.classList.toggle('ion-hide', isLastStep);
        if (this.btnSubmit) this.btnSubmit.classList.toggle('ion-hide', !isLastStep);
        
        // S49.12: Despachar evento nativo al container/renderizador
        if (typeof this.onStepChange === 'function') {
            this.onStepChange(this.currentStepIndex, this.totalSteps);
        }
    }

    // Exponer Rows para que FormRenderer sepa donde inyectar inputs
    getRows() {
        return this.rows;
    }
    
    // S54.5: Canvas Mount/Unmount Orchestration
    _mountCanvasViewer() {
        if (!this.splitRight) return;
        if (this._canvasInstanceMounted) return;

        // The optimistic ID is the primary key assigned by UI_FormSubmitter in step 1
        const taxonomyId = this.cardContent.getAttribute('data-edit-id') || null;
        
        if (taxonomyId && typeof window.UI_View_SwimlaneGrid !== 'undefined' && typeof window.UI_View_SwimlaneGrid.render === 'function') {
            this.splitRight.innerHTML = '';
            
            // Use the standard template for the canvas
            const tmpl = document.getElementById('tmpl-taxonomia-canvas');
            if (tmpl && tmpl.content) {
                this.splitRight.appendChild(tmpl.content.cloneNode(true));
            } else {
                console.error("[Wizard] tmpl-taxonomia-canvas no encontrado o sin content.");
                this.splitRight.innerHTML = '<div style="padding: 20px; color: red;">Error: Plantilla de Canvas no encontrada.</div>';
                return;
            }
            
            // Initialize the canvas
            window.UI_View_SwimlaneGrid.render(this.splitRight, taxonomyId);
            this._canvasInstanceMounted = true;
        }
    }

    _unmountCanvasViewer() {
        if (this.splitRight && this._canvasInstanceMounted) {
            this.splitRight.innerHTML = '';
            this._canvasInstanceMounted = false;
        }
    }

    start() {
        this.goToSection(this.steps[0]);
    }
};