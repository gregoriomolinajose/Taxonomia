// __tests__/API_Auth.test.js

const { API_Auth } = require('../src/API_Auth');

describe('API_Auth: Capa de Identidad y Seguridad', () => {

    it('Debe autorizar a un usuario con dominio @gmail.com', () => {
        const result = API_Auth.getUserIdentity("testuser@gmail.com");
        expect(result.authorized).toBe(true);
        expect(result.email).toBe("testuser@gmail.com");
        expect(result.message).toBe("Acceso concedido.");
    });

    it('Debe autorizar a un usuario con dominio @bellfy.app', () => {
        const result = API_Auth.getUserIdentity("admin@bellfy.app");
        expect(result.authorized).toBe(true);
        expect(result.email).toBe("admin@bellfy.app");
        expect(result.message).toBe("Acceso concedido.");
    });

    it('Debe rechazar a un usuario con dominio no autorizado (@hotmail.com)', () => {
        const result = API_Auth.getUserIdentity("hacker@hotmail.com");
        expect(result.authorized).toBe(false);
        expect(result.email).toBe("hacker@hotmail.com");
        expect(result.message).toBe("Dominio no autorizado.");
    });

    it('Debe manejar correos con mayúsculas y espacios correctamente', () => {
        const result = API_Auth.getUserIdentity("   UsuarioTest@Gmail.com ");
        expect(result.authorized).toBe(true);
        expect(result.email).toBe("usuariotest@gmail.com");
    });

    it('Debe rechazar el acceso si no se provee correo (sesión no disponible)', () => {
        const result = API_Auth.getUserIdentity("");
        expect(result.authorized).toBe(false);
        expect(result.email).toBe("");
        expect(result.message).toBe("No se pudo obtener la identidad del usuario activo.");
    });
});
