/* ============================================================
   UI_Component_CanvasLauncher.client.js
   Miniatura de vista previa de un Canvas que, al darle clic,
   abre el visor de canvas completo.
   ============================================================ */

window.UI_Component_CanvasLauncher = {
    build: function(field, container, data, entityName, localEventBus, modalContext, config = {}) {
        const isReadonly = config.readonly === true || field.readonly === true;
        
        // Determinar el contexto principal
        const explicitContext = (modalContext && modalContext.dataset && modalContext.dataset.taxonomiaContext) ? modalContext.dataset.taxonomiaContext : null;
        let currentPK = data ? (data[window.Schema_Utils.getPrimaryKey(entityName)] || data.id_registro) : null;
        const fallbackContext = window.UI_FormUtils ? window.UI_FormUtils.extractDraftContext(entityName, currentPK) : null;
        const contextId = explicitContext || fallbackContext || currentPK;

        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-launcher-wrapper';
        wrapper.setAttribute('data-form-component', field.name);
        wrapper.style.cssText = `
            width: 100%;
            border-radius: var(--sys-radius-lg, 12px);
            border: 1px dashed var(--ion-color-step-300, #cbd5e1);
            background: var(--ion-color-step-50, #f8fafc);
            padding: var(--spacing-4, 16px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--spacing-3, 12px);
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            min-height: 180px;
            position: relative;
            overflow: hidden;
        `;

        wrapper.addEventListener('mouseenter', () => {
            wrapper.style.borderColor = 'var(--ion-color-primary, #3880ff)';
            wrapper.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
            wrapper.style.background = 'var(--color-bg-card, #ffffff)';
        });
        wrapper.addEventListener('mouseleave', () => {
            wrapper.style.borderColor = 'var(--ion-color-step-300, #cbd5e1)';
            wrapper.style.boxShadow = 'none';
            wrapper.style.background = 'var(--ion-color-step-50, #f8fafc)';
        });

        // Icon representation
        const iconWrapper = document.createElement('div');
        iconWrapper.style.cssText = `
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.1);
            color: var(--ion-color-primary, #3880ff);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        `;
        const icon = document.createElement('ion-icon');
        icon.setAttribute('name', 'color-palette-outline'); // Chevron-like mapping visual
        iconWrapper.appendChild(icon);

        const title = document.createElement('h3');
        title.textContent = field.label || 'Modelador Gráfico';
        title.style.cssText = `
            margin: 0;
            font-size: var(--sys-font-h3, 1.1rem);
            font-weight: 600;
            color: var(--ion-color-step-800, #333);
        `;

        const subtitle = document.createElement('span');
        subtitle.textContent = contextId ? 'Clic para abrir el lienzo interactivo' : 'Guarde el registro antes de abrir el lienzo';
        subtitle.style.cssText = `
            font-size: var(--sys-font-body, 0.9rem);
            color: var(--ion-color-step-500, #888);
            text-align: center;
            max-width: 80%;
        `;

        wrapper.appendChild(iconWrapper);
        wrapper.appendChild(title);
        wrapper.appendChild(subtitle);

        // Click logic
        wrapper.addEventListener('click', () => {
            if (!contextId) {
                if (window.UI_Factory && window.UI_Factory.toast) {
                    window.UI_Factory.toast('Debe guardar el registro base antes de abrir el Canvas.', 'warning');
                }
                return;
            }

            openCanvasModal(contextId, entityName, explicitContext);
        });

        // Validador dummy
        wrapper.getValidatedValue = () => null;

        container.appendChild(wrapper);

        function openCanvasModal(id, sourceEntity, passedExplicitContext) {
            if (sourceEntity === 'Value_Stream') {
                if (typeof window.UI_View_ValueStreamCanvas !== 'undefined') {
                    window.UI_View_ValueStreamCanvas.buildModal(id, passedExplicitContext);
                } else {
                    console.warn('UI_View_ValueStreamCanvas no está cargado');
                    if (window.UI_Factory && window.UI_Factory.toast) window.UI_Factory.toast('Motor de canvas no disponible.', 'error');
                }
            } else {
                if (window.UI_Factory && window.UI_Factory.toast) {
                    window.UI_Factory.toast('Lienzo no implementado para ' + sourceEntity, 'warning');
                }
            }
        }
    }
};
