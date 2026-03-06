// src/API_Auth.js

/**
 * Capa de Identidad y Seguridad
 * Valida la identidad y dominio del usuario utilizando SSO de Google Workspace.
 */

const ALLOWED_DOMAINS = ['@gmail.com', '@bellfy.app'];

const API_Auth = {
    getUserIdentity: function (mockEmail = null) {
        let email = "";

        // Usar mockEmail para testing, si no, usar Session (solo en entorno GAS)
        if (mockEmail !== null) {
            email = mockEmail;
        } else if (typeof Session !== 'undefined') {
            try {
                email = Session.getActiveUser().getEmail();
            } catch (e) {
                // Silencioso, manejado abajo
            }
        }

        email = email.toLowerCase().trim();

        if (!email) {
            return {
                email: "",
                authorized: false,
                message: "No se pudo obtener la identidad del usuario activo."
            };
        }

        const isAuthorized = ALLOWED_DOMAINS.some(domain => email.endsWith(domain.toLowerCase()));

        return {
            email: email,
            authorized: isAuthorized,
            message: isAuthorized ? "Acceso concedido." : "Dominio no autorizado."
        };
    }
};

// Función global expuesta para que google.script.run pueda llamarla desde el cliente
function getUserIdentity() {
    return API_Auth.getUserIdentity();
}

if (typeof module !== 'undefined') {
    module.exports = { API_Auth, getUserIdentity, ALLOWED_DOMAINS };
}
