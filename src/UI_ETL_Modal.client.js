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
        title.innerHTML = `<ion-icon name="cloud-upload-outline" style="vertical-align: middle; margin-right: 6px;"></ion-icon> Hub de Ingesta - ${window.formatEntityName ? window.formatEntityName(entityName) : entityName}`;
        
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
        container.style.padding = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '20px';

        // --- SECTION 1: Google Workspace Sync ---
        const cardDrive = document.createElement('ion-card');
        cardDrive.style.margin = '0';
        const cardDriveHeader = document.createElement('ion-card-header');
        cardDriveHeader.innerHTML = `<ion-card-title style="font-size: 1.1rem; color: var(--ion-color-primary);"><ion-icon name="logo-google"></ion-icon> Google Sheets (Recomendado)</ion-card-title>`;
        
        const cardDriveContent = document.createElement('ion-card-content');
        cardDriveContent.innerHTML = `<p style="margin-bottom: 12px; font-size: 0.95rem; color: var(--ion-color-medium);">Sincroniza directamente desde tu Drive. Omite dependencias offline y evita bloqueos de límite de Google.</p>`;
        
        const btnGenTpl = document.createElement('ion-button');
        btnGenTpl.setAttribute('expand', 'block');
        btnGenTpl.setAttribute('fill', 'outline');
        btnGenTpl.innerHTML = `<ion-icon name="document-text-outline" slot="start"></ion-icon> 1. Auto-Generar Plantilla en Drive`;
        btnGenTpl.addEventListener('click', () => {
            if (options && typeof options.onGenerateTemplate === 'function') {
                options.onGenerateTemplate(entityName, modal);
            }
        });

        const inputItem = document.createElement('ion-item');
        inputItem.setAttribute('lines', 'full');
        inputItem.style.marginTop = '15px';
        const urlInput = document.createElement('ion-input');
        urlInput.id = 'etl-drive-url';
        urlInput.setAttribute('label', '2. URL o ID de Google Sheet');
        urlInput.setAttribute('label-placement', 'stacked');
        urlInput.setAttribute('placeholder', 'Pega el enlace aquí...');
        urlInput.setAttribute('clear-input', 'true');
        inputItem.appendChild(urlInput);

        const btnSync = document.createElement('ion-button');
        btnSync.setAttribute('expand', 'block');
        btnSync.style.marginTop = '15px';
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
        cardLocal.style.margin = '0';
        const cardLocalHeader = document.createElement('ion-card-header');
        cardLocalHeader.innerHTML = `<ion-card-title style="font-size: 1.1rem;"><ion-icon name="folder-open-outline"></ion-icon> Carga Plana (CSV)</ion-card-title>`;
        
        const cardLocalContent = document.createElement('ion-card-content');
        cardLocalContent.innerHTML = `<p style="margin-bottom: 12px; font-size: 0.95rem; color: var(--ion-color-medium);">Procesa un archivo local sin pasar por los servidores de nube nativos.</p>`;
        
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
        btnUploadCsv.style.flex = "1";
        btnUploadCsv.innerHTML = `<ion-icon name="upload-outline" slot="start"></ion-icon> Adjuntar .CSV`;
        btnUploadCsv.addEventListener('click', () => fileInput.click());

        flexRow.appendChild(btnDownloadCsv);
        flexRow.appendChild(btnUploadCsv);
        
        cardLocalContent.appendChild(fileInput);
        cardLocalContent.appendChild(flexRow);
        cardLocal.appendChild(cardLocalHeader);
        cardLocal.appendChild(cardLocalContent);

        // Assembly
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
