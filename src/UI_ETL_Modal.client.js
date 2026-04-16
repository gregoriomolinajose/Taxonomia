/* ============================================================
   UI_ETL_Modal.client.js — Hub Visual de Ingesta Híbrida
   ============================================================ */

window.UI_ETL_Modal = (function() {

    function present(entityName, options) {
        // [QA Fix] Evitar DOM Node Leakage eliminando rastros previos
        const prevModal = document.getElementById('dv-etl-modal');
        if (prevModal) prevModal.remove();

        const modal = document.createElement('ion-modal');
        modal.id = 'dv-etl-modal';
        // Ajustes para que se comporte como un Popup Centrado (Desktop) y no Fullscreen si es posible
        modal.cssClass = 'etl-central-modal'; 

        const content = document.createElement('ion-content');
        
        // --- Header ---
        const header = document.createElement('ion-header');
        const toolbar = document.createElement('ion-toolbar');
        const title = document.createElement('ion-title');
        title.innerHTML = `<ion-icon name="cloud-upload-outline" style="vertical-align: middle; margin-right: 6px;"></ion-icon> Carga Masiva - ${window.formatEntityName ? window.formatEntityName(entityName) : entityName}`;
        
        const buttonsEnd = document.createElement('ion-buttons');
        buttonsEnd.setAttribute('slot', 'end');
        const btnClose = document.createElement('ion-button');
        btnClose.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
        btnClose.addEventListener('click', () => modal.dismiss());
        
        buttonsEnd.appendChild(btnClose);
        toolbar.appendChild(title);
        toolbar.appendChild(buttonsEnd);
        header.appendChild(toolbar);
        
        // --- Body Container ---
        const container = document.createElement('div');
        container.className = 'ion-padding';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '20px';

        // --- SECTION 1: Google Workspace Sync ---
        const cardDrive = document.createElement('ion-card');
        cardDrive.className = 'ion-no-margin';
        const cardDriveHeader = document.createElement('ion-card-header');
        cardDriveHeader.innerHTML = `<ion-card-title><span style="color: #0F9D58; font-weight: 900; margin-right: 5px; font-family: 'Product Sans', sans-serif;">G</span> <span style="color: #0F9D58; font-weight: 600;">Google Sheets</span> <span class="ion-text-medium">(Recomendado)</span></ion-card-title>`;
        
        const cardDriveContent = document.createElement('ion-card-content');
        cardDriveContent.innerHTML = `<p class="ion-margin-bottom ion-text-medium">Sincroniza directamente desde tu Drive. Omite dependencias offline y evita bloqueos de límite de Google.</p>`;
        
        const btnGenTpl = document.createElement('ion-button');
        btnGenTpl.setAttribute('expand', 'block');
        btnGenTpl.setAttribute('fill', 'outline');
        btnGenTpl.setAttribute('shape', 'round');
        btnGenTpl.style.textTransform = 'none';
        btnGenTpl.style.fontFamily = 'inherit';
        btnGenTpl.style.fontWeight = '500';
        btnGenTpl.innerHTML = `<ion-icon name="document-outline" slot="start"></ion-icon> 1. Auto-Generar Plantilla en Drive`;
        btnGenTpl.addEventListener('click', () => {
            if (options && typeof options.onGenerateTemplate === 'function') {
                options.onGenerateTemplate(entityName, modal);
            }
        });

        const inputItem = document.createElement('ion-item');
        inputItem.className = 'ion-margin-top';
        inputItem.setAttribute('fill', 'solid');
        inputItem.style.borderRadius = '8px';
        const urlInput = document.createElement('ion-input');
        urlInput.id = 'etl-drive-url';
        urlInput.setAttribute('label', '2. URL o ID de Google Sheet');
        urlInput.setAttribute('label-placement', 'floating');
        urlInput.setAttribute('clear-input', 'true');
        inputItem.appendChild(urlInput);

        const btnSync = document.createElement('ion-button');
        btnSync.setAttribute('expand', 'block');
        btnSync.setAttribute('shape', 'round');
        btnSync.style.textTransform = 'none';
        btnSync.style.fontFamily = 'inherit';
        btnSync.style.fontWeight = '500';
        btnSync.className = 'ion-margin-top';
        btnSync.innerHTML = `<ion-icon name="sync-circle-outline" slot="start"></ion-icon> 3. Ejecutar Extracción Híbrida`;
        btnSync.addEventListener('click', () => {
            const val = urlInput.value;
            if (!val || val.trim() === '') {
                return _showToast('Por favor provee un enlace o ID válido.', 'warning');
            }
            if (options && typeof options.onDriveSync === 'function') {
                options.onDriveSync(entityName, val.trim(), modal);
            }
        });

        cardDriveContent.appendChild(btnGenTpl);
        cardDriveContent.appendChild(inputItem);
        cardDriveContent.appendChild(btnSync);
        cardDrive.appendChild(cardDriveHeader);
        cardDrive.appendChild(cardDriveContent);

        // --- SECTION 2: Local CSV (Fallback) ---
        const cardLocal = document.createElement('ion-card');
        cardLocal.className = 'ion-no-margin';
        const cardLocalHeader = document.createElement('ion-card-header');
        cardLocalHeader.innerHTML = `<ion-card-title><ion-icon name="folder-open-outline"></ion-icon> Carga Plana (CSV)</ion-card-title>`;
        
        const cardLocalContent = document.createElement('ion-card-content');
        cardLocalContent.innerHTML = `<p class="ion-margin-bottom ion-text-medium">Procesa un archivo local sin pasar por los servidores de nube nativos.</p>`;
        
        const flexRow = document.createElement('div');
        flexRow.style.display = 'flex';
        flexRow.style.gap = '10px';

        const fileInput = document.createElement('input');
        fileInput.setAttribute('type', 'file');
        fileInput.setAttribute('accept', '.csv');
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => {
            if (options && typeof options.onLocalUpload === 'function') {
                options.onLocalUpload(entityName, e, modal);
            }
        });

        const btnDownloadCsv = document.createElement('ion-button');
        btnDownloadCsv.setAttribute('fill', 'clear');
        btnDownloadCsv.setAttribute('shape', 'round');
        btnDownloadCsv.style.textTransform = 'none';
        btnDownloadCsv.style.fontFamily = 'inherit';
        btnDownloadCsv.style.fontWeight = '500';
        btnDownloadCsv.style.flex = "1";
        btnDownloadCsv.innerHTML = `<ion-icon name="download-outline" slot="start"></ion-icon> Bajar Template`;
        btnDownloadCsv.addEventListener('click', () => {
             if (options && typeof options.onDownloadCSVTpl === 'function') {
                options.onDownloadCSVTpl(entityName);
             }
        });

        const btnUploadCsv = document.createElement('ion-button');
        btnUploadCsv.setAttribute('fill', 'outline');
        btnUploadCsv.setAttribute('color', 'secondary');
        btnUploadCsv.setAttribute('shape', 'round');
        btnUploadCsv.style.textTransform = 'none';
        btnUploadCsv.style.fontFamily = 'inherit';
        btnUploadCsv.style.fontWeight = '500';
        btnUploadCsv.style.flex = "1";
        btnUploadCsv.innerHTML = `<ion-icon name="upload-outline" slot="start"></ion-icon> Adjuntar .CSV`;
        btnUploadCsv.addEventListener('click', () => fileInput.click());

        flexRow.appendChild(btnDownloadCsv);
        flexRow.appendChild(btnUploadCsv);
        
        cardLocalContent.appendChild(fileInput);
        cardLocalContent.appendChild(flexRow);
        cardLocal.appendChild(cardLocalHeader);
        cardLocal.appendChild(cardLocalContent);

        // --- TAB SEGMENTATION ---
        const segment = document.createElement('ion-segment');
        segment.value = 'drive';
        segment.className = 'ion-margin-bottom';
        segment.innerHTML = `
            <ion-segment-button value="drive">
                <ion-label>Desde GoogleSheet</ion-label>
            </ion-segment-button>
            <ion-segment-button value="local">
                <ion-label>Desde tu Equipo</ion-label>
            </ion-segment-button>
        `;
        
        segment.addEventListener('ionChange', (e) => {
            if (e.detail.value === 'drive') {
                cardDrive.style.display = 'block';
                cardLocal.style.display = 'none';
            } else {
                cardDrive.style.display = 'none';
                cardLocal.style.display = 'block';
            }
        });

        // Estado inicial
        cardLocal.style.display = 'none';

        // Assembly
        container.appendChild(segment);
        container.appendChild(cardDrive);
        container.appendChild(cardLocal);
        
        content.appendChild(header);
        content.appendChild(container);
        modal.appendChild(content);

        // [QA Fix] Self-destruct listener RAM clear
        modal.addEventListener('ionModalDidDismiss', () => { modal.remove(); });

        document.body.appendChild(modal);
        return typeof window.PresentSafe === 'function' ? window.PresentSafe(modal) : modal.present();
    }

    function _showToast(message, color) {
        const toast = document.createElement('ion-toast');
        toast.message = message;
        toast.duration = 2500;
        toast.color = color || 'success';
        document.body.appendChild(toast);
        return typeof window.PresentSafe === 'function' ? window.PresentSafe(toast) : toast.present();
    }

    return {
        present: present,
        updateUrlField: function(modalEl, urlStr) {
            const input = modalEl.querySelector('#etl-drive-url');
            if (input) input.value = urlStr;
        }
    };
})();
