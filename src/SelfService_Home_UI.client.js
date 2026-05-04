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
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100%;
                    width: 100%;
                    background-color: #fafbfc;
                    position: relative;
                    overflow: hidden;
                    padding: var(--spacing-6);
                    z-index: 0;
                }

                /* Orbs for iOS style background blur */
                .self-service-container::before,
                .self-service-container::after {
                    content: '';
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    -webkit-filter: blur(80px);
                    z-index: -1;
                    opacity: 0.6;
                }

                .self-service-container::before {
                    width: 60vw;
                    height: 60vw;
                    background: radial-gradient(circle, rgba(235,225,255,1) 0%, rgba(250,251,252,0) 70%);
                    top: -20vh;
                    left: -10vw;
                }

                .self-service-container::after {
                    width: 50vw;
                    height: 50vw;
                    background: radial-gradient(circle, rgba(250,230,250,1) 0%, rgba(250,251,252,0) 70%);
                    bottom: -10vh;
                    right: -10vw;
                }

                body.dark .self-service-container {
                    background-color: #0b0c10;
                }

                body.dark .self-service-container::before {
                    background: radial-gradient(circle, rgba(60,40,90,0.5) 0%, rgba(11,12,16,0) 70%);
                }

                body.dark .self-service-container::after {
                    background: radial-gradient(circle, rgba(80,30,80,0.5) 0%, rgba(11,12,16,0) 70%);
                }

                .hero-content {
                    text-align: center;
                    max-width: 800px;
                    width: 100%;
                    z-index: 1;
                }

                .premium-title {
                    font-size: clamp(2.5rem, 5vw, 4rem);
                    font-family: var(--sys-font-family-display), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-weight: 800;
                    margin-bottom: var(--spacing-4);
                    color: #2b2161;
                    line-height: 1.1;
                    letter-spacing: -1.5px;
                }

                body.dark .premium-title {
                    color: #ffffff;
                }

                .premium-subtitle {
                    font-size: clamp(1rem, 2vw, 1.25rem);
                    font-family: var(--sys-font-family-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-weight: 400;
                    margin-bottom: var(--spacing-8);
                    color: #5f6368;
                    line-height: 1.6;
                    max-width: 600px;
                    margin-left: auto;
                    margin-right: auto;
                }

                body.dark .premium-subtitle {
                    color: #9aa0a6;
                }

                .ios-btn {
                    --background: #2b2161;
                    --background-hover: #1e164a;
                    --color: #ffffff;
                    --border-radius: 8px;
                    --padding-top: 16px;
                    --padding-bottom: 16px;
                    --padding-start: 32px;
                    --padding-end: 32px;
                    font-weight: 600;
                    letter-spacing: 0.2px;
                    font-size: 1rem;
                    text-transform: none;
                    box-shadow: 0 4px 14px 0 rgba(43, 33, 97, 0.39);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .ios-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(43, 33, 97, 0.5);
                }

                body.dark .ios-btn {
                    --background: #ffffff;
                    --background-hover: #e0e0e0;
                    --color: #2b2161;
                    box-shadow: 0 4px 14px 0 rgba(255, 255, 255, 0.2);
                }
                
                body.dark .ios-btn:hover {
                    box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
                }
            \`;
            document.head.appendChild(style);
        }

        // Estructura DOM
        const wrapper = document.createElement('div');
        wrapper.className = 'self-service-container';
        wrapper.innerHTML = \`
            <div class="hero-content">
                <h1 class="premium-title">Taxonomía Organizacional para Negocios</h1>
                <p class="premium-subtitle">Descubre el poder del diseño organizacional guiado. Orquesta portafolios, productos y capacidades en un entorno fluido y enfocado.</p>
                <ion-button id="btn-start-wizard" class="ios-btn">
                    Diseñar Nueva Taxonomía
                    <ion-icon name="arrow-forward-outline" slot="end"></ion-icon>
                </ion-button>
            </div>
        \`;

        containerElement.appendChild(wrapper);

        // Bindings
        const btnStart = wrapper.querySelector('#btn-start-wizard');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                if (window.AppEventBus) {
                    window.AppEventBus.publish('NAV::CHANGE', {viewType: 'wizard'});
                }
            });
        }
    }
};
