/**
 * UI_Component_DashboardCardCont.client.js
 * 
 * Componente factorizado para tarjetas de contadores estadísticos del Dashboard.
 * 
 * Expone un método global en UI_Factory para construir el nodo DOM dinámicamente.
 */
(function (global) {
    global.UI_Factory = global.UI_Factory || {};

    /**
     * Resuelve colores quemados u originarios del sistema de diseño
     */
    function _resolveColor(colorRaw) {
        if (!colorRaw) return 'var(--ion-color-primary)';
        if (['primary','secondary','tertiary','success','warning','danger','light','medium','dark'].includes(colorRaw)) {
            return 'var(--ion-color-' + colorRaw + ')';
        }
        return colorRaw;
    }

    /**
     * Construye y retorna la tarjeta DOM
     * @param {Object} config Configuración { title, iconName, color, totalId, actionData }
     * @returns {HTMLElement} `ion-col` container
     */
    global.UI_Factory.buildDashboardCardCont = function(config) {
        var resolvedColor = _resolveColor(config.color);

        // Contenedor principal responsive (Col)
        var colEl = document.createElement('ion-col');
        colEl.style.flex = '1 1 240px';
        colEl.style.maxWidth = '100%';

        // Tarjeta
        var cardEl = document.createElement('ion-card');
        cardEl.style.borderRadius = 'var(--rounded-md)';
        cardEl.style.background = 'var(--ion-card-background)';
        cardEl.style.marginBottom = '20px';
        cardEl.style.overflow = 'hidden';
        cardEl.style.position = 'relative';

        // Cinta Lateral Izquierda
        var borderEl = document.createElement('div');
        borderEl.style.position = 'absolute';
        borderEl.style.left = '0';
        borderEl.style.top = '0';
        borderEl.style.bottom = '0';
        borderEl.style.width = '6px';
        borderEl.style.backgroundColor = resolvedColor;
        cardEl.appendChild(borderEl);

        // Layout Interno Flex
        var flexParent = document.createElement('div');
        flexParent.style.display = 'flex';
        flexParent.style.alignItems = 'center';
        flexParent.style.padding = '24px 20px 24px 24px';
        flexParent.style.minHeight = '100px';

        // Contenedor Icono
        var iconCol = document.createElement('div');
        iconCol.style.flex = '0 0 90px';
        iconCol.style.textAlign = 'center';
        
        var iconEl = document.createElement('ion-icon');
        iconEl.setAttribute('name', config.iconName || 'apps');
        iconEl.style.fontSize = '58px';
        iconEl.style.opacity = '0.9';
        iconEl.style.color = resolvedColor;
        iconCol.appendChild(iconEl);
        flexParent.appendChild(iconCol);

        // Separador Vertical
        var divider = document.createElement('div');
        divider.style.width = '1px';
        divider.style.height = '50px';
        divider.style.backgroundColor = 'var(--color-border, rgba(0,0,0,0.1))';
        divider.style.margin = '0 5px';
        flexParent.appendChild(divider);

        // Contenedor Textos Derecho
        var textCol = document.createElement('div');
        textCol.style.flex = '1';
        textCol.style.display = 'flex';
        textCol.style.alignItems = 'center';
        textCol.style.justifyContent = 'center';

        var textColInner = document.createElement('div');
        textColInner.style.textAlign = 'center';

        var titleEl = document.createElement('div');
        titleEl.style.fontSize = 'var(--sys-font-subheader, 16px)';
        titleEl.style.color = 'var(--ion-color-medium)';
        titleEl.style.fontWeight = '500';
        titleEl.style.marginBottom = '4px';
        titleEl.textContent = config.title;

        var totalEl = document.createElement('div');
        // El id es crucial para inyección asíncrona de datos desde el controlador principal
        if (config.totalId) {
            totalEl.id = config.totalId;
        }
        totalEl.setAttribute('data-dsh-total', 'true');
        totalEl.style.fontSize = 'var(--sys-font-display, 32px)';
        totalEl.style.fontWeight = '600';
        totalEl.style.color = 'var(--ion-text-color)';
        totalEl.style.lineHeight = '1';
        
        // Carga inicial spin
        var spinEl = document.createElement('ion-spinner');
        spinEl.setAttribute('name', 'dots');
        totalEl.appendChild(spinEl);

        textColInner.appendChild(titleEl);
        textColInner.appendChild(totalEl);
        textCol.appendChild(textColInner);

        flexParent.appendChild(textCol);
        cardEl.appendChild(flexParent);
        colEl.appendChild(cardEl);

        return colEl;
    };

})(typeof window !== 'undefined' ? window : this);
