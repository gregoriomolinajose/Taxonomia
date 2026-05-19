window.UI_View_ECharts = (function() {
    return {
        render: function(dataZone, state) {
            const wrapper = document.createElement('div');
            wrapper.style.width = '100%';
            wrapper.style.height = 'calc(100vh - 220px)';
            wrapper.style.overflow = 'hidden';
            wrapper.style.position = 'relative';
            wrapper.style.backgroundColor = 'transparent';

            const chartContainer = document.createElement('div');
            chartContainer.id = 'echarts-container';
            chartContainer.style.width = '100%';
            chartContainer.style.height = '100%';
            wrapper.appendChild(chartContainer);

            dataZone.appendChild(wrapper);

            if (typeof echarts === 'undefined') {
                chartContainer.innerHTML = '<div class="dv-empty">Error: ECharts no está cargado en el entorno.</div>';
                return;
            }

            const chart = echarts.init(chartContainer);

            let option = {};
            if (state.entityName === 'Capacidad' || state.entityName === 'Dominio') {
                if (window.DataEngine && window.DataEngine.buildHierarchyTree) {
                    const treeData = window.DataEngine.buildHierarchyTree(state.data, state.entityName);
                    
                    function convertNode(node, depth = 1) {
                        const rec = node.data || {};
                        const childrenNodes = (node.children || []).map(c => convertNode(c, depth + 1));
                        
                        const result = {
                            name: (rec.nombre || rec.n0_es || 'Taxonomía Global').trim(),
                            descripcion: rec.descripcion || rec.description || '',
                            _record: rec
                        };
                        
                        if (childrenNodes.length > 0) {
                            result.children = childrenNodes;
                        }
                        
                        // Nivel 0 (Depth 1 = Dominios): Su peso es la cantidad exacta de hijos directos (Nivel 1)
                        if (depth === 1) {
                            result.value = childrenNodes.length > 0 ? childrenNodes.length : 1;
                        } else {
                            // Nivel 1, 2, 3... Las cajas miden exactamente lo mismo internamente (valor uniforme)
                            result.value = 1;
                        }
                        
                        return result;
                    }
                    
                    const eChartsData = treeData ? (treeData.id === 'root-company' ? treeData.children.map(c => convertNode(c, 1)) : [convertNode(treeData, 1)]) : [];

                    // Forzar igual peso visual (tiling) ignorando densidad de hijos
                    function normalizeTree(nodes, targetWeight) {
                        if (!nodes || nodes.length === 0) return;
                        const weight = targetWeight / nodes.length;
                        nodes.forEach(n => {
                            n.value = weight; // ECharts overrides this internally IF we don't clear children for leaves, but here we provide it
                            if (n.children && n.children.length > 0) {
                                normalizeTree(n.children, weight);
                            }
                        });
                    }
                    normalizeTree(eChartsData, 100000);

                    const isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
                    const gapColor = isDark ? '#000000' : '#ffffff'; // Transparent/White gap color for cleaner background
                    
                    // Extraemos los colores del CSS del diseño principal (Tokens)
                    const computedStyle = getComputedStyle(document.body);
                    const textColor = computedStyle.getPropertyValue('--ion-text-color').trim() || (isDark ? '#ffffff' : '#4a4a4a');
                    const borderColor = computedStyle.getPropertyValue('--ion-color-step-300').trim() || (isDark ? '#444444' : '#cccccc');
                    const primaryColor = computedStyle.getPropertyValue('--ion-color-primary').trim() || '#3880ff';
                    const primaryContrast = computedStyle.getPropertyValue('--ion-color-primary-contrast').trim() || '#ffffff';

                    // Using Math_Engine to build the ECharts option!
                    if (window.Math_Engine && window.Math_Engine.buildEChartsCapacidadesOption) {
                        option = window.Math_Engine.buildEChartsCapacidadesOption(eChartsData, true, gapColor, textColor, borderColor, primaryColor, primaryContrast, state.entityName);
                    } else {
                        chartContainer.innerHTML = '<div class="dv-empty">Error: Math_Engine.buildEChartsCapacidadesOption no disponible.</div>';
                        return;
                    }
                } else {
                    chartContainer.innerHTML = '<div class="dv-empty">Error: DataEngine.buildHierarchyTree no disponible.</div>';
                    return;
                }
            } else {
                chartContainer.innerHTML = '<div class="dv-empty">Error: Diagrama ECharts no configurado para esta entidad.</div>';
                return;
            }

            chart.setOption(option);

            window.addEventListener('resize', () => {
                if (chart) chart.resize();
            });
        }
    };
})();
