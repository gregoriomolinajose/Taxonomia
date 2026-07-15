/**
 * UI_PanZoomManager.client.js
 * 
 * Centralized utility for handling Canvas Pan & Zoom interactions.
 * Implements Miro-like dragging and mouse-wheel zooming logic.
 */
window.UI_PanZoomManager = (function() {
    // Polyfill fallback in case Math_Engine is missing
    const getCanvasMath = () => {
        return window.Math_Engine && window.Math_Engine.CanvasMath ? window.Math_Engine.CanvasMath : {
            calculateMiroZoom: (mx, my, os, ns, ox, oy) => {
                const sr = ns / os;
                return { translateX: mx - (mx - ox) * sr, translateY: my - (my - oy) * sr };
            }
        };
    };

    function bind(viewport, canvas, prefixId = 'tax') {
        // Estado interno por viewport
        if (!viewport._transformState) {
            viewport._transformState = { scale: 1, translateX: 0, translateY: 0 };
        }
        const state = viewport._transformState;

        // Apply visual transform to canvas
        const applyTransform = () => {
            if (canvas) {
                canvas.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
            }
            const label = document.getElementById(`${prefixId}-zoom-label`);
            if (label) {
                label.innerText = Math.round(state.scale * 100) + '%';
            }
        };

        const zoomToCenter = (newScale) => {
            const rect = viewport.getBoundingClientRect();
            const mouseX = rect.width / 2;
            const mouseY = rect.height / 2;
            
            const newTransforms = getCanvasMath().calculateMiroZoom(mouseX, mouseY, state.scale, newScale, state.translateX, state.translateY);
            state.translateX = newTransforms.translateX;
            state.translateY = newTransforms.translateY;
            state.scale = newScale;
            applyTransform();
        };

        const btnZoomOut = document.getElementById(`${prefixId}-zoom-out`);
        const btnZoomIn = document.getElementById(`${prefixId}-zoom-in`);
        
        if (btnZoomOut) {
            btnZoomOut.onclick = (e) => {
                e.stopPropagation();
                const newScale = Math.max(0.2, state.scale - 0.15);
                zoomToCenter(newScale);
            };
        }
        if (btnZoomIn) {
            btnZoomIn.onclick = (e) => {
                e.stopPropagation();
                const newScale = Math.min(2.0, state.scale + 0.15);
                zoomToCenter(newScale);
            };
        }

        // Initialize state visually
        applyTransform();

        // Evitar múltiples bindings en el mismo viewport
        if (viewport._panZoomBound) {
            viewport._applyTransform = applyTransform; // Update reference if canvas changed
            return viewport;
        }
        viewport._panZoomBound = true;
        viewport._applyTransform = applyTransform;

        viewport.addEventListener('mousedown', (e) => {
            // Ignorar clicks en botones, inputs o elementos interactivos
            if (e.target.closest('button') || e.target.closest('.tax-node') || e.target.closest('input') || e.target.closest('.vs-step') || e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
            
            let isDragging = true;
            let startX = e.clientX;
            let startY = e.clientY;
            let initialX = state.translateX;
            let initialY = state.translateY;
            
            viewport.style.cursor = 'grabbing';
            
            const onMouseMove = (ev) => {
                if (!isDragging) return;
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                state.translateX = initialX + dx;
                state.translateY = initialY + dy;
                viewport._applyTransform();
            };
            
            const onMouseUp = () => {
                isDragging = false;
                viewport.style.cursor = 'grab';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        viewport.addEventListener('wheel', (e) => {
            // Prevenir scroll nativo
            if (e.target.closest('.vs-step') || e.target.tagName === 'INPUT') return; // Do not zoom if scrolling inside step
            e.preventDefault();
            
            if (e.ctrlKey || e.metaKey) {
                // Zoom
                const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
                const newScale = Math.min(Math.max(0.2, state.scale * zoomFactor), 10.0);
                
                const rect = viewport.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const newTransforms = getCanvasMath().calculateMiroZoom(mouseX, mouseY, state.scale, newScale, state.translateX, state.translateY);
                
                state.translateX = newTransforms.translateX;
                state.translateY = newTransforms.translateY;
                state.scale = newScale;
            } else {
                // Pan
                state.translateX -= e.deltaX;
                state.translateY -= e.deltaY;
            }
            
            viewport._applyTransform();
        }, { passive: false });

        return viewport;
    }

    function createZoomControlHTML(prefixId = 'tax') {
        return `
            <div class="tax-zoom-ctrl" style="position: absolute; bottom: 20px; left: 20px; display: flex; align-items: center; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 4px; z-index: 1000;">
                <button class="tax-zoom-btn" id="${prefixId}-zoom-out" style="background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: var(--ion-color-medium); display: flex; align-items: center; justify-content: center; border-radius: 4px;"><ion-icon name="remove-outline"></ion-icon></button>
                <span class="tax-zoom-label" id="${prefixId}-zoom-label" style="font-size: 0.8rem; font-weight: 600; color: #444; width: 45px; text-align: center; user-select: none;">100%</span>
                <button class="tax-zoom-btn" id="${prefixId}-zoom-in" style="background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: var(--ion-color-medium); display: flex; align-items: center; justify-content: center; border-radius: 4px;"><ion-icon name="add-outline"></ion-icon></button>
            </div>
        `;
    }

    return {
        bind: bind,
        createZoomControlHTML: createZoomControlHTML
    };
})();
