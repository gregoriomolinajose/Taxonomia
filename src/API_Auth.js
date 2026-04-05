// src/API_Auth.js

/**
 * Capa de Identidad y Seguridad
 * Valida la identidad y dominio del usuario utilizando SSO de Google Workspace.
 */


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

        const domains = (typeof CONFIG !== 'undefined' && CONFIG.ALLOWED_DOMAINS)
            ? CONFIG.ALLOWED_DOMAINS
            : ['@coppel.com', '@bancoppel.com']; // Fallback seguro

        const isAuthorized = domains.some(domain => email.endsWith(domain.toLowerCase()));

        return {
            email: email,
            authorized: isAuthorized,
            message: isAuthorized ? "Acceso concedido." : "Dominio no autorizado."
        };
    },

    getWorkspaceAvatar: function(email) {
        if (!email) return null;
        try {
            if (typeof CacheService !== 'undefined') {
                const cache = CacheService.getScriptCache();
                const cachedAvatar = cache.get("AVATAR_" + email);
                if (cachedAvatar) {
                    return cachedAvatar === 'null' ? null : cachedAvatar;
                }
            }

            let avatarUrl = null;
            if (typeof AdminDirectory !== 'undefined') {
                const user = AdminDirectory.Users.get(email, {projection: "basic", viewType: "domain_public"});
                avatarUrl = user && user.thumbnailPhotoUrl ? user.thumbnailPhotoUrl : null;
            }

            if (typeof CacheService !== 'undefined') {
                const cache = CacheService.getScriptCache();
                // Persistimos en caché por 6 horas (21600s), incluso las respuestas vacías
                cache.put("AVATAR_" + email, avatarUrl || 'null', 21600);
            }

            return avatarUrl;
        } catch (e) {
            console.error("API_Auth: Error hidratando avatar para " + email, e);
            return null;
        }
    }
};

// Funciones globales expuestas para google.script.run
function getUserIdentity() {
    return API_Auth.getUserIdentity();
}

function getWorkspaceAvatar(email) {
    return API_Auth.getWorkspaceAvatar(email);
}

if (typeof module !== 'undefined') {
    module.exports = { API_Auth, getUserIdentity };
}
