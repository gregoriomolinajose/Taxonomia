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
                    min-height: calc(100vh - 56px);
                    width: 100%;
                    background-color: #fafbfc;
                    position: relative;
                    overflow: hidden;
                    padding: var(--spacing-6);
                    z-index: 0;
                }

                #taxonomy-network-canvas {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    z-index: 0;
                    pointer-events: none;
                }

                body.dark .self-service-container {
                    background-color: #0b0c10;
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
            `;
            document.head.appendChild(style);
        }

        // Estructura DOM
        const wrapper = document.createElement('div');
        wrapper.className = 'self-service-container';
        wrapper.innerHTML = `
            <canvas id="taxonomy-network-canvas"></canvas>
            <div class="hero-content">
                <h1 class="premium-title">Taxonomía de Portafolio para Negocios</h1>
                <p class="premium-subtitle">Descubre el poder del diseñar la taxonomía en tu portafolio. Orquesta portafolios, productos y capacidades en un entornos fluido y enfocado.</p>
                <ion-button id="btn-start-wizard" class="ios-btn">
                    Diseñar Nueva Taxonomía
                    <ion-icon name="arrow-forward-outline" slot="end"></ion-icon>
                </ion-button>
            </div>
        `;

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

        // --- Network Canvas Logic ---
        const canvas = wrapper.querySelector('#taxonomy-network-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            let particles = [];
            let w = 0;
            let h = 0;
            let reqId;
            let isRunning = false;
            
            const isDark = document.body.classList.contains('dark');
            const nodeColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(43, 33, 97, 0.3)';
            const lineBase = isDark ? '255, 255, 255' : '43, 33, 97';
            
            const numParticles = Math.min(Math.floor(window.innerWidth / 15), 150);
            const connectionDistance = 150;
            let mouse = { x: null, y: null };
            
            wrapper.addEventListener('mousemove', (e) => {
                const rect = wrapper.getBoundingClientRect();
                mouse.x = e.clientX - rect.left;
                mouse.y = e.clientY - rect.top;
            });
            wrapper.addEventListener('mouseleave', () => {
                mouse.x = null;
                mouse.y = null;
            });
            
            class Particle {
                constructor() {
                    this.x = Math.random() * (w || window.innerWidth);
                    this.y = Math.random() * (h || window.innerHeight);
                    this.vx = (Math.random() - 0.5) * 0.6;
                    this.vy = (Math.random() - 0.5) * 0.6;
                    this.radius = Math.random() * 2 + 1;
                }
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    if (this.x < 0 || this.x > w) this.vx *= -1;
                    if (this.y < 0 || this.y > h) this.vy *= -1;
                }
                draw() {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = nodeColor;
                    ctx.fill();
                }
            }
            
            function animate() {
                if (!canvas.isConnected) {
                    isRunning = false;
                    return;
                }
                
                ctx.clearRect(0, 0, w, h);
                
                for (let i = 0; i < particles.length; i++) {
                    particles[i].update();
                    particles[i].draw();
                    
                    for (let j = i + 1; j < particles.length; j++) {
                        const dx = particles[i].x - particles[j].x;
                        const dy = particles[i].y - particles[j].y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        
                        if (dist < connectionDistance) {
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(' + lineBase + ', ' + ((1 - dist/connectionDistance) * 0.25) + ')';
                            ctx.lineWidth = 0.8;
                            ctx.moveTo(particles[i].x, particles[i].y);
                            ctx.lineTo(particles[j].x, particles[j].y);
                            ctx.stroke();
                        }
                    }
                    
                    if (mouse.x !== null) {
                        const dx = particles[i].x - mouse.x;
                        const dy = particles[i].y - mouse.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < connectionDistance + 50) {
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(' + lineBase + ', ' + ((1 - dist/(connectionDistance + 50)) * 0.4) + ')';
                            ctx.lineWidth = 1.2;
                            ctx.moveTo(particles[i].x, particles[i].y);
                            ctx.lineTo(mouse.x, mouse.y);
                            ctx.stroke();
                            
                            // Slight attraction
                            particles[i].x -= dx * 0.005;
                            particles[i].y -= dy * 0.005;
                        }
                    }
                }
                
                if (isRunning) {
                    reqId = requestAnimationFrame(animate);
                }
            }
            
            // ResizeObserver garantiza que el canvas se dibuje solo cuando el contenedor
            // sea visible en el DOM y tenga dimensiones > 0
            const observer = new ResizeObserver(entries => {
                for (let entry of entries) {
                    if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                        w = entry.contentRect.width;
                        h = entry.contentRect.height;
                        canvas.width = w;
                        canvas.height = h;
                        
                        if (particles.length === 0) {
                            for (let i = 0; i < numParticles; i++) particles.push(new Particle());
                        }
                        
                        if (!isRunning && canvas.isConnected) {
                            isRunning = true;
                            animate();
                        }
                    }
                }
            });
            
            observer.observe(wrapper);
        }
    }
};
