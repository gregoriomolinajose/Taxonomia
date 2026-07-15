// src/API_Auth.js

/**
 * Capa de Identidad y Seguridad
 * Valida la identidad y dominio del usuario utilizando SSO de Google Workspace.
 */


const API_Auth = {
    getUserIdentity: function () {
        let email = "";
        let authMode = "SSO";

        if (typeof PropertiesService !== 'undefined') {
            try {
                const envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
                if (envStr) authMode = JSON.parse(envStr).AuthMode || "SSO";
            } catch(e) {}
        } else if (typeof CONFIG !== 'undefined' && CONFIG.AuthMode) {
             authMode = CONFIG.AuthMode;
        }

        // [S23.4] Dual Authentication System (Local Fallback vs SSO Zero-Trust)
        if (authMode === 'LOCAL') {
            email = "local.admin@system.com"; // Fallback autorizado para testing manual
        } else if (typeof Session !== 'undefined') {
            try {
                email = Session.getActiveUser().getEmail();
            } catch (e) {
                // Silencioso, manejado abajo
            }
        }

        email = email.toLowerCase().trim();

        let isGuest = false;
        if (!email) {
            email = "invitado@publico.com";
            isGuest = true;
        }

        // [E6-S64] Dominios resueltos en runtime desde Adapter_Config / PropertiesService.
        // Lista vacía como último recurso — los dominios reales se configuran via 'Ajustes Globales'.
        let domains = CONFIG && CONFIG.ALLOWED_DOMAINS && CONFIG.ALLOWED_DOMAINS.length > 0
            ? CONFIG.ALLOWED_DOMAINS
            : [];
        if (typeof PropertiesService !== 'undefined') {
            let customDomains = null;
            try {
                // S48.2 Dynamic SSO Domains (Source of Truth via Adapter_Config)
                const domainsStr = PropertiesService.getScriptProperties().getProperty('APP_CONFIG__allowed_domains');
                if (domainsStr && domainsStr.trim() !== '') {
                    customDomains = domainsStr.split(',').map(d => d.trim()).filter(d => d.length > 0);
                }
                
                // Fallback a configuración anterior si no hay nada en la nueva (Backward compatibility)
                if (!customDomains || customDomains.length === 0) {
                    const secStr = PropertiesService.getScriptProperties().getProperty('APP_SECURITY_CONFIG');
                    if (secStr) {
                        const parsedSec = JSON.parse(secStr);
                        if (parsedSec.allowedDomains && parsedSec.allowedDomains.length > 0) {
                            customDomains = parsedSec.allowedDomains;
                        }
                    }
                }
            } catch(e) {
                console.error("API_Auth: Error parseando dominios de seguridad", e);
            }

            if (customDomains) {
                domains = customDomains;
            } else {
                try {
                    // Fallback to static ENV_CONFIG
                    const envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
                    if (envStr && JSON.parse(envStr).ALLOWED_DOMAINS) {
                        domains = JSON.parse(envStr).ALLOWED_DOMAINS;
                    }
                } catch(e) {
                    console.error("API_Auth: Error parseando ENV_CONFIG", e);
                }
            }
        } else if (typeof CONFIG !== 'undefined' && CONFIG.ALLOWED_DOMAINS) {
            domains = CONFIG.ALLOWED_DOMAINS;
        }

        const isAuthorized = isGuest ? true : domains.some(domain => email.endsWith(domain.toLowerCase().trim()));

        return {
            email: email,
            authorized: isAuthorized,
            message: isAuthorized ? (isGuest ? "Acceso concedido como Invitado." : "Acceso concedido.") : `Dominio no autorizado para ${email}. Eval: ` + JSON.stringify(domains)
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
