/**
 * UI_DrawerManager.client.js
 * S25.2: Mobile-First Sliding Drawer Architecture.
 * Replaces ion-modal for forms to fix DOM hijacking and memory leaks.
 */
(function (global) {
    global.DrawerStackController = (function() {
        const stack = [];
        const MAX_DEPTH = 3;
        
        function getRootContainer() {
            let container = document.getElementById('drawer-root-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'drawer-root-container';
                
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
                document.body.appendChild(container);
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
                global.currentFormModal = drawerNode; // Compatibilidad Polyfill para validadores viejos
                return true;
            },
            
            closeTop: async function() {
                if (stack.length > 0) {
                    const topDrawer = stack.pop();
                    
                    // Animate exit
                    topDrawer.classList.remove('active');
                    
                    // Wait for CSS transition (350ms)
                    await new Promise(r => setTimeout(r, 350));
                    
                    try {
                        topDrawer.innerHTML = '';
                        if(topDrawer.__onSaveSuccessFallback) topDrawer.__onSaveSuccessFallback = null;
                        topDrawer.remove();
                    } catch (e) {}
                    
                    global.currentFormDrawer = stack.length > 0 ? stack[stack.length - 1] : null;
                    global.currentFormModal = global.currentFormDrawer;
                    
                    if (stack.length === 0) {
                        global.currentEditId = null;
                        const root = getRootContainer();
                        root.classList.remove('active');
                        const backdrop = document.getElementById('drawer-backdrop');
                        if(backdrop) backdrop.classList.remove('active');
                    }
                }
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
    });

})(typeof window !== 'undefined' ? window : this);
