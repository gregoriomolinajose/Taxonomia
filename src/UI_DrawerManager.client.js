/**
 * UI_DrawerManager.client.js
 * S25.2: Mobile-First Sliding Drawer Architecture.
 * Replaces ion-modal for forms to fix DOM hijacking and memory leaks.
 */
(function (global) {
    global.DrawerStackController = (function() {
        const stack = [];
        const MAX_DEPTH = 6; // Sincronizado con Schema_Engine.topologyRules.maxDepth
        
        function getRootContainer() {
            let container = document.getElementById('drawer-root-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'drawer-root-container';
                container.className = 'ion-page'; // Ensures proper global typography inheritance
                
                const backdrop = document.createElement('div');
                backdrop.className = 'drawer-backdrop';
                backdrop.id = 'drawer-backdrop';
                backdrop.onclick = () => {
                    // Close top on backdrop click
                    if(global.DrawerStackController.getDepth() > 0) {
                        global.DrawerStackController.closeTop();
                    }
                };
                container.appendChild(backdrop);
                
                const appRoot = document.querySelector('ion-app') || document.body;
                appRoot.appendChild(container);
            }
            return container;
        }

        return {
            push: function(drawerNode) {
                if (stack.length >= MAX_DEPTH) {
                    const alert = document.createElement('ion-alert');
                    alert.header = 'Límite Alcanzado';
                    alert.message = 'Por favor finaliza el formulario actual antes de abrir otro nivel.';
                    alert.buttons = ['Entendido'];
                    document.body.appendChild(alert);
                    if(window.PresentSafe) window.PresentSafe(alert);
                    return false;
                }
                
                const root = getRootContainer();
                root.classList.add('active');
                
                // Notificar que la profundidad de Drawers ha cambiado (Disable forms if max level approached)
                if (window.AppEventBus) {
                    window.AppEventBus.publish('DRAWER::DEPTH_CHANGED', stack.length + 1);
                }
                document.body.classList.toggle('drawer-max-depth', (stack.length + 1) >= MAX_DEPTH);
                document.body.classList.toggle('drawer-open', true);
                
                const backdrop = document.getElementById('drawer-backdrop');
                if(backdrop) backdrop.classList.add('active');
                
                drawerNode.classList.add('drawer-panel');
                drawerNode.setAttribute('data-depth', String(stack.length + 1));
                
                root.appendChild(drawerNode);
                
                // Animate entry
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        drawerNode.classList.add('active');
                    });
                });
                
                stack.push(drawerNode);
                global.currentFormDrawer = drawerNode;
                return true;
            },
            
            closeTop: async function() {
                if (stack.length > 0) {
                    const topDrawer = stack.pop();
                    
                    // Animate exit
                    topDrawer.classList.remove('active');
                    
                    // Wait for CSS transition (350ms)
                    await new Promise(r => setTimeout(r, 350));
                    
                    if (topDrawer && topDrawer.isConnected) {
                        topDrawer.innerHTML = '';
                        if(topDrawer.__onSaveSuccessFallback) topDrawer.__onSaveSuccessFallback = null;
                        topDrawer.remove();
                    }
                    
                    global.currentFormDrawer = stack.length > 0 ? stack[stack.length - 1] : null;
                    
                    if (stack.length === 0) {
                        global.currentEditId = null;
                        const root = getRootContainer();
                        root.classList.remove('active');
                        const backdrop = document.getElementById('drawer-backdrop');
                        if(backdrop) backdrop.classList.remove('active');
                    }

                    if (window.AppEventBus) {
                        window.AppEventBus.publish('DRAWER::DEPTH_CHANGED', stack.length);
                    }
                    document.body.classList.toggle('drawer-max-depth', stack.length >= MAX_DEPTH);
                    document.body.classList.toggle('drawer-open', stack.length > 0);
                }
            },
            clearAllSync: function() {
                while(stack.length > 0) {
                    const topDrawer = stack.pop();
                    if (topDrawer && topDrawer.isConnected) {
                        topDrawer.innerHTML = '';
                        if(topDrawer.__onSaveSuccessFallback) topDrawer.__onSaveSuccessFallback = null;
                        topDrawer.remove();
                    }
                }
                global.currentFormDrawer = null;
                global.currentEditId = null;
                const root = getRootContainer();
                root.classList.remove('active');
                if (window.AppEventBus) window.AppEventBus.publish('DRAWER::DEPTH_CHANGED', 0);
                document.body.classList.toggle('drawer-max-depth', false);
                document.body.classList.toggle('drawer-open', false);
            },
            getDepth: () => stack.length,
            clearAll: function() {
                while(stack.length > 0) {
                    this.closeTop();
                }
            }
        };
    })();

    // Backward compatibility con componentes antiguos
    global._closeTopModal = global.DrawerStackController.closeTop;
    global.ModalStackController = global.DrawerStackController;

    document.addEventListener('DOMContentLoaded', () => {
        if (global.AppEventBus) {
            global.AppEventBus.subscribe('MODAL::CLOSE_REQUEST', function() {
                global.DrawerStackController.closeTop();
            });
        }
        setTimeout(() => {
            if (window.AppEventBus && !window._drawerNavListenerAttached) {
                window.AppEventBus.subscribe('NAV::CHANGE', function() {
                    if (global.DrawerStackController && global.DrawerStackController.getDepth() > 0) {
                        global.DrawerStackController.clearAllSync();
                    }
                });
                window._drawerNavListenerAttached = true;
            }
        }, 1000);
    });

})(typeof window !== 'undefined' ? window : this);
