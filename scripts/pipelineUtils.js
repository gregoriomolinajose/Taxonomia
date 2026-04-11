const parse5 = require('parse5');
const acorn = require('acorn');

/**
 * Recorta de forma segura un módulo encapsulado entre tags QA.
 * @param {string} indexContent - HTML del archivo.
 * @returns {string} HTML sin el módulo QA.
 */
function stripQAModule(indexContent) {
    const startToken = '<!-- [QA_MODULE_START] -->';
    const endToken = '<!-- [QA_MODULE_END] -->';
    
    let strippedContent = indexContent;
    let startIndex, endIndex;
    
    while ((startIndex = strippedContent.indexOf(startToken)) !== -1 && 
           (endIndex = strippedContent.indexOf(endToken)) !== -1) {
        
        if (endIndex > startIndex) {
            strippedContent = strippedContent.substring(0, startIndex) + strippedContent.substring(endIndex + endToken.length);
        } else {
            break; // Tokens malformados o invertidos, romper para evitar bucle infinito
        }
    }
    
    return strippedContent;
}

/**
 * Parsea el HTML provisto buscando <script>, los extrae y pasa minificación validativa por Acorn.
 * @param {string} content - Archivo HTML con estilos o scripts.
 * @param {string} filename - Nombre en caso de imprimir error.
 * @throws {Error} SyntaxError de Acorn u otro error de validación JS.
 */
function extractAndValidateScripts(content, filename) {
    const ast = parse5.parse(content);
    const scriptNodes = [];
    
    const walk = (node) => {
        if (node.tagName === 'script') {
            scriptNodes.push(node);
        }
        if (node.childNodes) {
            node.childNodes.forEach(walk);
        }
    };
    walk(ast);
    
    scriptNodes.forEach(node => {
        const textNode = node.childNodes && node.childNodes.find(n => n.nodeName === '#text');
        const scriptContent = textNode ? textNode.value.trim() : '';
        
        // Omitir vacíos o plantillas App Script "<?!="
        if (!scriptContent || scriptContent.includes('<?!=')) return;
        
        try {
            acorn.parse(scriptContent, { ecmaVersion: 'latest', sourceType: 'script' });
        } catch (e) {
            // Re-lanzar el error mejorándolo
            const lineNum = e.loc ? e.loc.line : 'unknown';
            const error = new Error(`SyntaxError in ${filename} at line ${lineNum}: ${e.message}`);
            error.original = e;
            throw error;
        }
    });
}

module.exports = {
    stripQAModule,
    extractAndValidateScripts
};
