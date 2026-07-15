/**
 * Componente Treemap Interactivo para Selección de Entidades Jerárquicas (Dominios, Capacidades, etc.)
 * Renderiza un ECharts Treemap que funciona como un input de formulario (Multi-select).
 */

if (typeof window.UI_Factory === 'undefined') window.UI_Factory = {};

window.UI_Factory.buildTreemapSelector = function(field, currentData, initialValues, localEventBus, config) {
    const container = document.createElement('div');
    container.className = 'treemap-selector-container';
    container.style.width = '100%';
    container.style.height = '500px';
    container.style.position = 'relative';
    container.style.border = '1px solid var(--ion-color-light-shade, #e0e0e0)';
    container.style.borderRadius = '8px';
    container.style.overflow = 'hidden';
    container.style.marginBottom = '16px';

    // Propiedad 'value' estándar para formularios
    container.value = Array.isArray(initialValues) ? initialValues.slice() : [];
    let selectedSet = new Set(container.value);

    // Etiqueta superior
    const header = document.createElement('div');
    header.style.padding = '12px 16px';
    header.style.background = 'var(--ion-color-light, #f4f5f8)';
    header.style.borderBottom = '1px solid var(--ion-color-light-shade, #e0e0e0)';
    header.style.fontWeight = 'bold';
    header.style.color = 'var(--ion-color-dark, #222)';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = field.label || 'Seleccionar Elementos';
    header.appendChild(titleSpan);

    const countSpan = document.createElement('ion-badge');
    countSpan.color = 'primary';
    countSpan.textContent = selectedSet.size;
    header.appendChild(countSpan);

    container.appendChild(header);

    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = 'calc(100% - 45px)';
    container.appendChild(chartDiv);

    // Evitar que ECharts atrape eventos de formulario nativos si no está listo
    let chartInstance = null;

    // Función para renderizar el gráfico
    const renderChart = () => {
        if (!window.echarts || !window.DataStore || !window.buildEChartsCapacidadesTreemapData) {
            setTimeout(renderChart, 100); // Esperar dependencias
            return;
        }

        if (!chartInstance) {
            chartInstance = window.echarts.init(chartDiv);
            
            // Responsividad
            const resizeObserver = new ResizeObserver(() => {
                if (chartInstance) chartInstance.resize();
            });
            resizeObserver.observe(container);
        }

        const rawData = window.DataStore.get(field.targetEntity) || [];
        if (rawData.length === 0) {
            chartDiv.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#888;">No hay datos para mostrar</div>';
            return;
        }

        // Construir árbol base
        let treeData = window.buildEChartsCapacidadesTreemapData(rawData, field.targetEntity);

        // Inyectar rawId recursivamente para fácil acceso
        const injectRawId = (nodes) => {
            nodes.forEach(n => {
                // El motor matemático usa pkField dinámico y lo pone en el ID de ECharts (name o _id interno)
                // Pero necesitamos la PK original.
                const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(field.targetEntity) : 'id_dominio';
                const originalRow = rawData.find(r => r[pkField] === n.id || r.nombre === n.name);
                if (originalRow) {
                    n.rawId = originalRow[pkField];
                } else {
                    n.rawId = n.id || n.name;
                }
                if (n.children) injectRawId(n.children);
            });
        };
        injectRawId(treeData);

        const updateVisuals = () => {
            const option = {
                tooltip: {
                    formatter: function (info) {
                        return '<div style="font-weight:bold;">' + info.name + '</div>' + 
                               (selectedSet.has(info.data.rawId) ? '<div style="color:green;">✓ Seleccionado</div>' : '<div style="color:gray;">Haz clic para seleccionar</div>');
                    }
                },
                series: [{
                    type: 'treemap',
                    data: treeData,
                    leafDepth: 2,
                    roam: false,
                    nodeClick: false, // Desactivar zoom on click para usar click como selección
                    breadcrumb: { show: true, top: 0 },
                    label: {
                        show: true,
                        formatter: function(info) {
                            const isSelected = selectedSet.has(info.data.rawId);
                            const icon = isSelected ? '☑ ' : '☐ ';
                            return icon + info.name;
                        },
                        textStyle: {
                            fontSize: 14,
                            fontWeight: 'bold'
                        }
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 2,
                        gapWidth: 2
                    },
                    colorMappingBy: 'value' // Para evitar colores aleatorios confusos
                }]
            };

            // Recursivamente aplicar color a los seleccionados
            const colorizeNodes = (nodes) => {
                nodes.forEach(n => {
                    const isSelected = selectedSet.has(n.rawId);
                    if (isSelected) {
                        n.itemStyle = n.itemStyle || {};
                        n.itemStyle.color = 'var(--ion-color-primary, #3880ff)';
                    } else {
                        n.itemStyle = n.itemStyle || {};
                        n.itemStyle.color = 'var(--ion-color-medium, #92949c)'; // Deseleccionado
                    }
                    if (n.children) colorizeNodes(n.children);
                });
            };
            colorizeNodes(treeData);

            chartInstance.setOption(option);
            countSpan.textContent = selectedSet.size;
            container.value = Array.from(selectedSet);
        };

        updateVisuals();

        chartInstance.off('click');
        chartInstance.on('click', function(params) {
            const id = params.data.rawId;
            if (!id) return;

            if (selectedSet.has(id)) {
                selectedSet.delete(id);
            } else {
                selectedSet.add(id);
            }
            
            // Disparar evento change estándar para que FormSubmitter reaccione si es necesario
            const changeEvent = new Event('change', { bubbles: true });
            container.dispatchEvent(changeEvent);

            updateVisuals();
        });
    };

    // Montar
    setTimeout(renderChart, 100);

    return container;
};

// Registrar en el Factory si el sistema usa BuilderRegistry
if (window.UI_Factory.BuilderRegistry) {
    window.UI_Factory.BuilderRegistry['treemap_selector'] = function(field, entityName, data, localEventBus, currentEditId) {
        let initialValues = [];
        if (data && data[field.name]) {
            try {
                initialValues = Array.isArray(data[field.name]) ? data[field.name] : JSON.parse(data[field.name]);
            } catch(e) { initialValues = (typeof data[field.name] === 'string') ? [data[field.name]] : []; }
        }
        return window.UI_Factory.buildTreemapSelector(field, data, initialValues, localEventBus, {});
    };
}
