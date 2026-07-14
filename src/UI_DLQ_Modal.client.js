window.UI_DLQ = {
    openDLQDrawer: function(jobId, entityName) {
        if (!window.DrawerStackController) return;

        const drawerHeader = window.UI_Factory.buildDrawerHeader({
            entityName: 'Sys_DLQ',
            titleOverride: 'Resolución de Errores (DLQ)',
            badgeOverride: `Job: ${jobId}`,
            onClose: () => window.DrawerStackController.closeTop()
        });

        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.height = '100%';
        content.style.background = 'var(--ion-background-color, #fff)';

        content.appendChild(drawerHeader);

        const scrollableContent = document.createElement('div');
        scrollableContent.style.padding = '24px 16px';
        scrollableContent.style.flex = '1';
        scrollableContent.style.overflowY = 'auto';

        const infoText = document.createElement('p');
        infoText.textContent = `Los siguientes registros de la entidad ${entityName} fallaron durante la ingesta. Puedes editar el JSON y re-procesarlos.`;
        infoText.style.color = 'var(--ion-color-medium)';
        infoText.style.fontSize = '14px';
        infoText.style.marginBottom = '20px';
        scrollableContent.appendChild(infoText);

        const listContainer = document.createElement('div');
        listContainer.style.display = 'flex';
        listContainer.style.flexDirection = 'column';
        listContainer.style.gap = '16px';
        scrollableContent.appendChild(listContainer);

        content.appendChild(scrollableContent);
        window.DrawerStackController.push(content);

        // Fetch DLQ records for this job
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px;"><ion-spinner></ion-spinner></div>';
        
        window.DataAPI.call('API_Universal_Router', 'read', 'Sys_DLQ', { filters: { job_id: jobId, estado: 'Pendiente' } })
            .then(res => {
                if (res.status === 'success' && res.data && res.data.length > 0) {
                    listContainer.innerHTML = '';
                    res.data.forEach(dlqRecord => {
                        const card = window.UI_DLQ.buildDLQCard(dlqRecord, entityName, () => {
                            // On resolve success, remove card
                            card.remove();
                            if (listContainer.children.length === 0) {
                                listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--ion-color-success);">Todos los errores han sido resueltos.</div>';
                            }
                        });
                        listContainer.appendChild(card);
                    });
                } else {
                    listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--ion-color-medium);">No se encontraron errores pendientes para este Job.</div>';
                }
            })
            .catch(err => {
                listContainer.innerHTML = `<div style="color:var(--ion-color-danger); padding:20px;">Error cargando DLQ: ${err.message || err}</div>`;
            });
    },

    buildDLQCard: function(dlqRecord, entityName, onSuccess) {
        const card = document.createElement('div');
        card.style.border = '1px solid var(--ion-color-danger)';
        card.style.borderRadius = '8px';
        card.style.padding = '16px';
        card.style.background = 'var(--ion-color-step-50, #f9f9f9)';

        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'flex-start';
        headerRow.style.marginBottom = '12px';

        const errorInfo = document.createElement('div');
        errorInfo.innerHTML = `
            <div style="font-weight: 600; font-size: 14px; color: var(--ion-color-danger); margin-bottom: 4px;">
                <ion-icon name="warning" style="vertical-align: middle;"></ion-icon> Error de Validación
            </div>
            <div style="font-size: 13px; color: var(--ion-color-dark); word-break: break-word;">${dlqRecord.error_message || 'Error desconocido'}</div>
        `;

        headerRow.appendChild(errorInfo);
        card.appendChild(headerRow);

        let initialPayload = {};
        try {
            initialPayload = typeof dlqRecord.payload === 'string' ? JSON.parse(dlqRecord.payload) : dlqRecord.payload;
        } catch(e) {
            initialPayload = { raw_data: dlqRecord.payload };
        }

        const editorContainer = document.createElement('div');
        editorContainer.style.marginBottom = '12px';

        const jsonEditor = window.UI_Factory.buildJSONEditorNode({
            initialData: initialPayload,
            readonly: false
        });
        editorContainer.appendChild(jsonEditor);
        card.appendChild(editorContainer);

        const actionsRow = document.createElement('div');
        actionsRow.style.display = 'flex';
        actionsRow.style.justifyContent = 'flex-end';
        actionsRow.style.gap = '8px';

        const btnProcess = document.createElement('ion-button');
        btnProcess.setAttribute('size', 'small');
        btnProcess.setAttribute('color', 'primary');
        btnProcess.innerHTML = '<ion-icon slot="start" name="refresh"></ion-icon> Re-procesar';
        btnProcess.addEventListener('click', () => {
            const newPayload = jsonEditor.getValidatedJSON();
            if (!newPayload) {
                window.AppEventBus && window.AppEventBus.publish('SHOW_TOAST', { message: 'El JSON no es válido', color: 'danger' });
                return;
            }

            btnProcess.disabled = true;
            btnProcess.innerHTML = '<ion-spinner name="crescent"></ion-spinner>';

            window.DataAPI.call('API_Universal_Router', 'dlq_reprocess', 'Sys_DLQ', {
                id_dlq: dlqRecord.id_dlq || dlqRecord.id_registro,
                entity_name: entityName,
                new_payload: newPayload
            }).then(res => {
                if (res.status === 'success') {
                    window.AppEventBus && window.AppEventBus.publish('SHOW_TOAST', { message: 'Registro re-procesado exitosamente', color: 'success' });
                    onSuccess();
                } else {
                    throw new Error(res.message || 'Error en re-procesamiento');
                }
            }).catch(err => {
                window.AppEventBus && window.AppEventBus.publish('SHOW_TOAST', { message: err.message || 'Error', color: 'danger' });
                btnProcess.disabled = false;
                btnProcess.innerHTML = '<ion-icon slot="start" name="refresh"></ion-icon> Re-procesar';
            });
        });

        actionsRow.appendChild(btnProcess);
        card.appendChild(actionsRow);

        return card;
    }
};
