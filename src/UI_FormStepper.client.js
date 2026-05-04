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

                const icon = document.createElement('ion-icon');
                const iconName = this.semanticIcons[stepName] || this.defaultIcons[index % this.defaultIcons.length];
                icon.setAttribute('name', iconName);
                icon.setAttribute('slot', 'start');
                if (index === 0) icon.setAttribute('color', 'primary');

                const label = document.createElement('ion-label');
                label.textContent = stepName;
                label.style.fontWeight = '500';
                if (index === 0) label.setAttribute('color', 'primary');

                item.appendChild(icon);
                item.appendChild(label);
                this.sidebarSteps.appendChild(item);

                this.menuItems[stepName] = { item, icon, label };
            }

            this.cardContent.appendChild(stepDiv);

            // Iniciar Grillas Responsivas (Rule 5.2) por contenedor lógico
            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = (stepName === 'default' ? 'Configuración General' : stepName);
            sectionTitle.style.color = 'var(--ion-text-color)';
            sectionTitle.style.fontSize = 'var(--sys-font-h3)';
            sectionTitle.style.fontWeight = '600';
            sectionTitle.style.marginTop = '0';
            sectionTitle.style.marginBottom = 'var(--spacing-5)';
            stepDiv.appendChild(sectionTitle);

            const grid = document.createElement('ion-grid');
            grid.style.padding = 'var(--spacing-0)';
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
            const inputs = container.querySelectorAll('ion-input, ion-textarea, ion-select, input, .subgrid-container');
            
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
            const defaultIcon = this.semanticIcons[stepName] || this.defaultIcons[idx % this.defaultIcons.length];

            if (hasData) {
                mi.icon.setAttribute('name', 'checkmark-circle');
                mi.icon.setAttribute('color', 'success');
            } else {
                mi.icon.setAttribute('name', defaultIcon);
                mi.icon.setAttribute('color', isCurrent ? 'primary' : 'medium');
            }
            
            mi.label.setAttribute('color', isCurrent ? 'primary' : (hasData ? 'success' : 'medium'));
        });
    }

    goToSection(targetSectionName) {
        let newIdx = this.steps.indexOf(targetSectionName);
        if (newIdx === -1) newIdx = 0;
        this.currentStepIndex = newIdx;

        Object.keys(this.stepContainers).forEach(key => {
            this.stepContainers[key].classList.toggle('ion-hide', key !== targetSectionName);
        });

        if (this.sidebarSteps) {
            this.steps.forEach((stepName, idx) => {
                const mi = this.menuItems[stepName];
                if (!mi) return;
                
                mi.item.style.setProperty('--background', 'transparent');

                if (!this.isStateful) {
                    mi.icon.setAttribute('color', 'medium');
                    mi.label.setAttribute('color', 'medium');

                    if (idx === this.currentStepIndex) {
                        mi.item.style.setProperty('--background', 'var(--ion-color-step-100)');
                        mi.icon.setAttribute('color', 'primary');
                        mi.label.setAttribute('color', 'primary');
                    }
                } else {
                    if (idx === this.currentStepIndex) {
                        mi.item.style.setProperty('--background', 'var(--ion-color-step-100)');
                    }
                }
            });
            if (this.isStateful) this.recalculateAllStatuses();
        }

        if (this.progressLabel) {
            this.progressLabel.textContent = `PASO ${this.currentStepIndex + 1} DE ${this.totalSteps}: ${targetSectionName.toUpperCase()}`;
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