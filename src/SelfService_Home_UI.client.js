/**
 * SelfService_Home_UI.client.js
 * 
 * Portal de autoservicio (Modo Negocio) para Taxonomia Project.
 * Proporciona una interfaz limpia y "Premium" separada del entorno administrativo.
 */

window.SelfService_Home_UI = {
    render: function(containerElement) {
        // Limpiar el contenedor actual
        containerElement.innerHTML = '';
        
        // Estilos Inyectados (Aislamiento de Componente)
        const styleId = 'self-service-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .self-service-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100%;
                    width: 100%;
                    background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-tertiary) 100%);
                    background-size: 200% 200%;
                    animation: gradient-flow 15s ease infinite;
                    padding: var(--spacing-6);
                }

                @keyframes gradient-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                .hero-glass {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: var(--rounded-md);
                    padding: var(--spacing-8);
                    text-align: center;
                    max-width: 800px;
                    width: 100%;
                    box-shadow: var(--shadow-floating);
                    color: white;
                }
                
                body.dark .hero-glass {
                    background: rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .premium-title {
                    font-size: var(--sys-font-display);
                    font-family: var(--sys-font-family-display);
                    font-weight: 700;
                    margin-bottom: var(--spacing-3);
                    color: white;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .premium-subtitle {
                    font-size: var(--sys-font-subheader);
                    font-weight: 400;
                    margin-bottom: var(--spacing-8);
                    opacity: 0.9;
                    line-height: 1.5;
                }

                .glow-btn {
                    --box-shadow: 0 8px 24px rgba(28, 168, 247, 0.4);
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .glow-btn:hover {
                    transform: translateY(-2px);
                }
                
                .glow-btn ion-icon {
                    transition: transform 0.2s ease;
                }
                
                .glow-btn:hover ion-icon {
                    transform: translateX(4px);
                }
            `;
            document.head.appendChild(style);
        }

        // Estructura DOM
        const wrapper = document.createElement('div');
        wrapper.className = 'self-service-container';
        wrapper.innerHTML = `
            <div class="hero-glass">
                <h1 class="premium-title">Taxonomía Organizacional</h1>
                <p class="premium-subtitle">Orquesta portafolios, productos y capacidades en un solo lugar. Diseña la estructura de tu negocio de forma interactiva.</p>
                <ion-button id="btn-start-wizard" shape="round" color="light" size="large" class="glow-btn">
                    <ion-text color="primary">Diseñar Nueva Taxonomía</ion-text>
                    <ion-icon name="arrow-forward-outline" slot="end" color="primary"></ion-icon>
                </ion-button>
            </div>
        `;

        containerElement.appendChild(wrapper);

        // Bindings
        const btnStart = wrapper.querySelector('#btn-start-wizard');
        if (btnStart) {
            btnStart.addEventListener('click', async () => {
                // S49.4: Crear modal de Ionic Fullscreen
                const modal = document.createElement('ion-modal');
                modal.innerHTML = `
                  <ion-header class="ion-no-border">
                    <ion-toolbar style="--background: var(--ion-background-color)">
                      <ion-title style="color: var(--ion-text-color)">Asistente de Diseño Organizacional</ion-title>
                      <ion-buttons slot="end">
                        <ion-button onclick="this.closest('ion-modal').dismiss()">Cerrar</ion-button>
                      </ion-buttons>
                    </ion-toolbar>
                  </ion-header>
                  <ion-content class="ion-padding" style="--background: var(--ion-color-secondary)">
                    <div id="wizard-render-zone" style="max-width: 800px; margin: 2rem auto; background: var(--ion-card-background); border-radius: var(--rounded-md); box-shadow: var(--shadow-floating); padding: var(--spacing-6);">
                      <!-- El motor inserta el stepper aquí -->
                    </div>
                  </ion-content>
                `;
                document.body.appendChild(modal);
                await window.PresentSafe(modal);

                // Escucha de éxito global
                let unsubscribe = null;
                if (window.AppEventBus) {
                    unsubscribe = window.AppEventBus.subscribe('FORM::SUBMIT_SUCCESS', (payload) => {
                        if (payload.entityName === 'Wizard_Taxonomia') {
                            modal.dismiss();
                            if (unsubscribe) unsubscribe();
                            // Alerta Premium
                            const toast = document.createElement('ion-toast');
                            toast.message = '¡Taxonomía orquestada con éxito!';
                            toast.duration = 4000;
                            toast.color = 'success';
                            document.body.appendChild(toast);
                            window.PresentSafe(toast);
                        }
                    });
                }

                // Limpiar la subscripción si el usuario cierra manualmente el modal
                modal.addEventListener('ionModalDidDismiss', () => {
                    if (unsubscribe) unsubscribe();
                    modal.remove(); // Evitar memory leak del DOM
                });

                // Renderizar
                if (window.FormRenderer_UI) {
                    window.FormRenderer_UI.renderForm('Wizard_Taxonomia', null, modal.querySelector('#wizard-render-zone'));
                } else {
                    console.error("FormRenderer_UI no está disponible.");
                }
            });
        }
    }
};
