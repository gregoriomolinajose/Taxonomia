/**
 * UI_FormStepper.html (S14.1)
 *
 * Micro-Frontend / Clase dedicada exclusivamente a gestionar la lógica 
 * topológica de navegación (wizards/tabs) dentro de un Modal.
 * Respeta el SRP y previene conflictos en Modales apilados.
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
        
        // Estado Interno (Scoped a la Instancia del Modal)
        this.currentStepIndex = 0;
        this.totalSteps = this.steps.length;
        this.stepContainers = {};
        this.menuItems = {};
        this.rows = {};
        
        // Iconografía
        this.semanticIcons = {
            'Datos Personales': 'person-outline',
            'Ubicación': 'location-outline',
            'Corporativo': 'business-outline',
            'Operativa': 'briefcase-outline'
        };
        this.defaultIcons = ['folder-open-outline', 'list-outline', 'options-outline', 'analytics-outline'];

        this._initializeDOM();
        this._attachListeners();
    }

    _initializeDOM() {
        if (this.sidebarSteps) this.sidebarSteps.innerHTML = '';

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
                item.style.margin = 'var(--spacing-1) var(--spacing-3)';
                item.style.setProperty('--min-height', '44px');
                if (index === 0) item.style.setProperty('--background', 'var(--ion-color-step-100)');
                
                item.onclick = () => {
                    this.goToSection(stepName);
                };

                // S49.6: Reemplazar icono por número circular dinámico
                const iconContainer = document.createElement('div');
                iconContainer.setAttribute('slot', 'start');
                iconContainer.style.width = '24px';
                iconContainer.style.height = '24px';
                iconContainer.style.borderRadius = '50%';
                iconContainer.style.display = 'flex';
                iconContainer.style.alignItems = 'center';
                iconContainer.style.justifyContent = 'center';
                iconContainer.style.fontSize = '0.75rem';
                iconContainer.style.fontWeight = '700';
                iconContainer.style.marginRight = 'var(--spacing-3)';
                
                if (index === 0) {
                    iconContainer.style.backgroundColor = 'var(--ion-color-primary)';
                    iconContainer.style.color = 'var(--ion-color-primary-contrast)';
                } else {
                    iconContainer.style.backgroundColor = 'var(--ion-color-step-150, #e0e0e0)';
                    iconContainer.style.color = 'var(--ion-color-medium)';
                }
                iconContainer.textContent = (index + 1).toString();

                const label = document.createElement('ion-label');
                label.textContent = stepName;
                label.style.fontWeight = '600';
                label.style.fontFamily = 'var(--sys-font-family, system-ui, -apple-system, sans-serif)';
                if (index === 0) label.setAttribute('color', 'primary');

                item.appendChild(iconContainer);
                item.appendChild(label);
                this.sidebarSteps.appendChild(item);

                this.menuItems[stepName] = { item, icon: iconContainer, label, stepNumber: index + 1 };
            }

            stepDiv.style.display = index === 0 ? 'flex' : 'none';
            stepDiv.style.flexDirection = 'column';
            stepDiv.style.justifyContent = 'center';
            stepDiv.style.minHeight = '60vh';
            stepDiv.style.maxWidth = '600px';
            stepDiv.style.margin = '0 auto';

            this.cardContent.appendChild(stepDiv);

            // Iniciar Grillas Responsivas (Rule 5.2) por contenedor lógico
            const headerWrap = document.createElement('div');
            headerWrap.style.marginBottom = 'var(--spacing-5)';
            headerWrap.style.textAlign = 'left';

            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = (stepName === 'default' ? 'Configuración General' : stepName);
            sectionTitle.style.color = 'var(--ion-text-color)';
            sectionTitle.style.fontSize = 'var(--sys-font-h2, 1.5rem)';
            sectionTitle.style.fontFamily = 'var(--sys-font-heading, system-ui, -apple-system, sans-serif)';
            sectionTitle.style.fontWeight = '700';
            sectionTitle.style.margin = '0 0 var(--spacing-2) 0';
            headerWrap.appendChild(sectionTitle);

            // S49.6: Subtítulos descriptivos
            const desc = document.createElement('p');
            desc.style.margin = '0';
            desc.style.fontSize = '0.9rem';
            desc.style.maxWidth = '100%';
            desc.style.color = 'var(--ion-color-step-600, #666)';
            
            const descriptions = {
                'Taxonomía': 'Defina el nombre y propósito principal de esta estructura organizativa.',
                'Unidad de Negocio': 'Seleccione la unidad de negocio principal a la que pertenece esta taxonomía.',
                'Portafolios Asociados': 'Asocie los portafolios que serán gobernados bajo esta estructura.',
                'Grupo de Productos': 'Vincule los grupos de productos específicos relacionados.',
                'Equipos': 'Seleccione los equipos operativos responsables.',
                'Personas': 'Seleccione los miembros y líderes asociados a esta taxonomía.'
            };
            desc.textContent = descriptions[stepName] || 'Complete la información solicitada en esta sección.';
            headerWrap.appendChild(desc);

            stepDiv.appendChild(headerWrap);

            const grid = document.createElement('ion-grid');
            grid.style.padding = 'var(--spacing-0)';
            grid.style.width = '100%';
            const row = document.createElement('ion-row');
            grid.appendChild(row);

            stepDiv.appendChild(grid);
            this.rows[stepName] = row; // Referencia rápida para inyectar campos
        });

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
            
            mi.label.setAttribute('color', isCurrent ? 'primary' : (hasData ? 'success' : 'medium'));
        });
    }

    goToSection(targetSectionName) {
        let newIdx = this.steps.indexOf(targetSectionName);
        if (newIdx === -1) newIdx = 0;
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

        if (this.sidebarSteps) {
            this.steps.forEach((stepName, idx) => {
                const mi = this.menuItems[stepName];
                if (!mi) return;
                
                mi.item.style.setProperty('--background', 'transparent');

                mi.item.style.setProperty('--background', 'transparent');

                if (!this.isStateful) {
                    mi.icon.style.backgroundColor = 'var(--ion-color-step-150, #e0e0e0)';
                    mi.icon.style.color = 'var(--ion-color-medium)';
                    mi.label.setAttribute('color', 'medium');

                    if (idx === this.currentStepIndex) {
                        mi.item.style.setProperty('--background', 'var(--dv-primary-light)');
                        mi.item.style.borderRadius = 'var(--rounded-md, 8px)';
                        mi.icon.style.backgroundColor = 'var(--ion-color-primary)';
                        mi.icon.style.color = 'var(--ion-color-primary-contrast)';
                        mi.label.setAttribute('color', 'primary');
                    }
                } else {
                    if (idx === this.currentStepIndex) {
                        mi.item.style.setProperty('--background', 'var(--dv-primary-light)');
                        mi.item.style.borderRadius = 'var(--rounded-md, 8px)';
                    }
                }
            });
            if (this.isStateful) this.recalculateAllStatuses();
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
    }

    // Exponer Rows para que FormRenderer sepa donde inyectar inputs
    getRows() {
        return this.rows;
    }
    
    start() {
        this.goToSection(this.steps[0]);
    }
};