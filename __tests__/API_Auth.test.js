// __tests__/API_Auth.test.js

const { API_Auth } = require('../src/API_Auth');

describe('API_Auth: Capa de Identidad y Seguridad', () => {
    beforeAll(() => {
        global.CONFIG = global.CONFIG || {};
        global.CONFIG.ALLOWED_DOMAINS = ['@gmail.com', '@bellfy.app'];
        
        // [S23.4] Mapear objeto global Session nativo en lugar de corromper la API de la capa Auth
        global.Session = {
            getActiveUser: () => ({ getEmail: () => global.__MOCK_EMAIL__ || "" })
        };
    });

    afterAll(() => {
        delete global.Session;
        delete global.__MOCK_EMAIL__;
    });

    it('Debe autorizar a un usuario con dominio @gmail.com', () => {
        global.__MOCK_EMAIL__ = "testuser@gmail.com";
        const result = API_Auth.getUserIdentity();
        expect(result.authorized).toBe(true);
        expect(result.email).toBe("testuser@gmail.com");
        expect(result.message).toBe("Acceso concedido.");
    });

    it('Debe autorizar a un usuario con dominio @bellfy.app', () => {
        global.__MOCK_EMAIL__ = "admin@bellfy.app";
        const result = API_Auth.getUserIdentity();
        expect(result.authorized).toBe(true);
        expect(result.email).toBe("admin@bellfy.app");
        expect(result.message).toBe("Acceso concedido.");
    });

    it('Debe rechazar a un usuario con dominio no autorizado (@hotmail.com)', () => {
        global.__MOCK_EMAIL__ = "hacker@hotmail.com";
        const result = API_Auth.getUserIdentity();
        expect(result.authorized).toBe(false);
        expect(result.email).toBe("hacker@hotmail.com");
        expect(result.message).toBe("Dominio no autorizado.");
    });

    it('Debe manejar correos con mayúsculas y espacios correctamente', () => {
        global.__MOCK_EMAIL__ = "   UsuarioTest@Gmail.com ";
        const result = API_Auth.getUserIdentity();
        expect(result.authorized).toBe(true);
        expect(result.email).toBe("usuariotest@gmail.com");
    });

    it('Debe rechazar el acceso si no se provee correo (sesión no disponible)', () => {
        global.__MOCK_EMAIL__ = "";
        const result = API_Auth.getUserIdentity();
        expect(result.authorized).toBe(false);
        expect(result.email).toBe("");
        expect(result.message).toBe("No se pudo obtener la identidad del usuario activo.");
    });

    it('Debe usar el preaprobado si AuthMode es local', () => {
        global.CONFIG.AuthMode = 'LOCAL';
        const result = API_Auth.getUserIdentity();
        expect(result.email).toBe("local.admin@system.com");
        global.CONFIG.AuthMode = 'SSO'; // cleanup
    });
});
