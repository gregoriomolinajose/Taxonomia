const { stripQAModule, extractAndValidateScripts } = require('../scripts/pipelineUtils.js');

describe('pipelineUtils — AST & RegExp Compiler Methods', () => {

    describe('stripQAModule', () => {
        it('debe remover un bloque QA Module limpiamente', () => {
            const mockHTML = `
                <html>
                    <body>
                        <h1>App</h1>
                        <!-- [QA_MODULE_START] -->
                        <script>QA.run();</script>
                        <!-- [QA_MODULE_END] -->
                        <footer>Footer</footer>
                    </body>
                </html>
            `;
            const result = stripQAModule(mockHTML);
            expect(result).not.toContain('QA.run();');
            expect(result).toContain('<h1>App</h1>');
            expect(result).toContain('<footer>Footer</footer>');
        });

        it('debe tolerar múltiples bloques QA secuenciales', () => {
            const mockHTML = `
                A<!-- [QA_MODULE_START] -->QA1<!-- [QA_MODULE_END] -->B<!-- [QA_MODULE_START] -->QA2<!-- [QA_MODULE_END] -->C
            `;
            const result = stripQAModule(mockHTML);
            expect(result.trim()).toBe('ABC');
        });

        it('debe tolerar caso roto (QA START sin END) evitando bucle infinito', () => {
            const mockHTML = `
                A<!-- [QA_MODULE_START] -->QA1
            `;
            const result = stripQAModule(mockHTML); // Rompe elegantemente o lo ignora
            expect(result).toBe(mockHTML); // No debe cambiar nada porque el ciclo verifica ambos tokens
        });
        
        it('debe romper elegantemente si END está antes que START', () => {
            const mockHTML = `
                A<!-- [QA_MODULE_END] -->QA<!-- [QA_MODULE_START] -->B
            `;
            const result = stripQAModule(mockHTML); // Rompe iteración
            expect(result).toBe(mockHTML);
        });
    });

    describe('extractAndValidateScripts', () => {
        it('debe validar un script con sintaxis correcta sin arrojar error', () => {
            const mockHTML = `
                <script>
                    const x = 10;
                    if (x > 5) console.log(x);
                </script>
            `;
            expect(() => extractAndValidateScripts(mockHTML, 'test.html')).not.toThrow();
        });

        it('debe ignorar silenciosamente scripts vacíos', () => {
            const mockHTML = `
                <script></script>
            `;
            expect(() => extractAndValidateScripts(mockHTML, 'empty.html')).not.toThrow();
        });

        it('debe ignorar scripts que contengan templates de Google Apps Script', () => {
            const mockHTML = `
                <script>
                    <?!= include('Foo'); ?>
                    const x = 1.
                </script>
            `;
            expect(() => extractAndValidateScripts(mockHTML, 'gas.html')).not.toThrow();
        });

        it('debe arrojar SyntaxError al detectar JavaScript malicioso/malformado', () => {
            const mockHTML = `
                <script>
                    const y = (10; // Bracket faltante
                </script>
            `;
            expect(() => extractAndValidateScripts(mockHTML, 'bad.html')).toThrow(/SyntaxError in bad\.html/);
        });
    });
});
