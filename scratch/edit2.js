const fs = require('fs');
let code = fs.readFileSync('src/UI_View_Organigrama.client.js', 'utf8');

// 1. Reemplazar contenedor
code = code.replace(
    `<div id="apextree-container" style="flex: 1; width: 100%; position: relative; overflow: hidden;"></div>`,
    `<div id="apextree-viewport" style="flex: 1; width: 100%; position: relative; overflow: hidden; background: transparent; cursor: grab;">
                    <div id="apextree-canvas" style="transform-origin: 0 0; width: 100%; height: 100%;">
                        <div id="apextree-container" style="width: 100%; height: 100%;"></div>
                    </div>
                    <!-- Controlador de Zoom -->
                    <div class="tax-zoom-ctrl" style="position: absolute; bottom: 20px; left: 20px; display: flex; align-items: center; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 4px; z-index: 1000;">
                        <button id="org-zoom-out" style="background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: var(--ion-color-medium); display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                            <ion-icon name="remove-outline"></ion-icon>
                        </button>
                        <div id="org-zoom-label" style="font-size: 0.8rem; font-weight: 600; color: #444; width: 45px; text-align: center; user-select: none;">100%</div>
                        <button id="org-zoom-in" style="background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: var(--ion-color-medium); display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                            <ion-icon name="add-outline"></ion-icon>
                        </button>
                    </div>
                </div>`
);

// 2. Modificar stylesOverride y add pointer-events logic
code = code.replace(
    `#apextree-container #toolbar {
                top: auto !important;
                bottom: 20px !important;
                right: auto !important;
                left: 20px !important;
            }`,
    `#apextree-container #toolbar { display: none !important; }
            #apextree-container > svg { pointer-events: none; }
            #apextree-container > svg foreignObject { pointer-events: auto; }`
);

// 3. disable toolbar in options
code = code.replace(`enableToolbar: true,`, `enableToolbar: false,`);

// 4. Update Node onclick
code = code.replace(
    `// Custom card template for HR Graph
                        return \`
                            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 8px; font-family: system-ui, sans-serif; box-sizing: border-box;">`,
    `// Custom card template for HR Graph
                        const recId = String(content.recordId || content.id || '').replace('hr_', '');
                        return \`
                            <div onclick="if(window.openEditForm) window.openEditForm('\${recId}', 'Persona')" style="cursor: pointer; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 8px; font-family: system-ui, sans-serif; box-sizing: border-box;">`
);

// 5. Initialize PanZoom right after tree.render
code = code.replace(
    `tree.render(finalData);`,
    `tree.render(finalData);
                this._initPanZoom(container.querySelector('#apextree-viewport'), container.querySelector('#apextree-canvas'));`
);

// 6. Fix ID checking
code = code.replace(
    `const pObj = fetchContextual('Persona').find(p => p.id_registro === pid);`,
    `const pObj = fetchContextual('Persona').find(p => String(p.id_registro) === String(pid) || String(p.id_persona) === String(pid) || String(p.id) === String(pid));`
);

// 7. Add _initPanZoom at the end of the file
const panZoomMethod = `,

    _initPanZoom: function(viewport, canvas) {
        this._currentCanvas = canvas;
        if (!this._transformState) {
            this._transformState = { scale: 1, translateX: 0, translateY: 0 };
        }
        const state = this._transformState;

        this._applyTransform = () => {
            if (this._currentCanvas) {
                this._currentCanvas.style.transform = \`translate(\${state.translateX}px, \${state.translateY}px) scale(\${state.scale})\`;
            }
            const label = document.getElementById('org-zoom-label');
            if (label) {
                label.innerText = Math.round(state.scale * 100) + '%';
            }
        };

        this._zoomToCenter = (newScale) => {
            const rect = viewport.getBoundingClientRect();
            const mouseX = rect.width / 2;
            const mouseY = rect.height / 2;
            const CanvasMath = window.Math_Engine && window.Math_Engine.CanvasMath ? window.Math_Engine.CanvasMath : {
                calculateMiroZoom: (mx, my, os, ns, ox, oy) => {
                    const sr = ns / os;
                    return { translateX: mx - (mx - ox) * sr, translateY: my - (my - oy) * sr };
                }
            };
            const newTransforms = CanvasMath.calculateMiroZoom(mouseX, mouseY, state.scale, newScale, state.translateX, state.translateY);
            state.translateX = newTransforms.translateX;
            state.translateY = newTransforms.translateY;
            state.scale = newScale;
            this._applyTransform();
        };

        const btnZoomOut = document.getElementById('org-zoom-out');
        const btnZoomIn = document.getElementById('org-zoom-in');
        
        if (btnZoomOut) {
            btnZoomOut.onclick = (e) => {
                e.stopPropagation();
                const newScale = Math.max(0.2, state.scale - 0.15);
                this._zoomToCenter(newScale);
            };
        }
        if (btnZoomIn) {
            btnZoomIn.onclick = (e) => {
                e.stopPropagation();
                const newScale = Math.min(2.0, state.scale + 0.15);
                this._zoomToCenter(newScale);
            };
        }
        
        this._applyTransform();

        if (viewport._panZoomBound) return;
        viewport._panZoomBound = true;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        viewport.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('.apex-tree-node') || e.target.closest('foreignObject')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = state.translateX;
            initialY = state.translateY;
            viewport.style.cursor = 'grabbing';
            e.preventDefault(); // Evitar seleccion de texto
        }, { capture: true });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            state.translateX = initialX + dx;
            state.translateY = initialY + dy;
            if (this._applyTransform) this._applyTransform();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            viewport.style.cursor = 'grab';
        });

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Evitar que D3 zoom procese el wheel
            if (e.ctrlKey || e.metaKey) {
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.min(Math.max(0.2, state.scale * zoomFactor), 2.0);
                const rect = viewport.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const CanvasMath = window.Math_Engine && window.Math_Engine.CanvasMath ? window.Math_Engine.CanvasMath : {
                    calculateMiroZoom: (mx, my, os, ns, ox, oy) => {
                        const sr = ns / os;
                        return { translateX: mx - (mx - ox) * sr, translateY: my - (my - oy) * sr };
                    }
                };
                const newTransforms = CanvasMath.calculateMiroZoom(mouseX, mouseY, state.scale, newScale, state.translateX, state.translateY);
                state.translateX = newTransforms.translateX;
                state.translateY = newTransforms.translateY;
                state.scale = newScale;
                if (this._applyTransform) this._applyTransform();
            } else {
                state.translateX -= e.deltaX;
                state.translateY -= e.deltaY;
                if (this._applyTransform) this._applyTransform();
            }
        }, { passive: false, capture: true });
    }
};
`;

code = code.replace(/};\s*$/, panZoomMethod);

fs.writeFileSync('src/UI_View_Organigrama.client.js', code);
