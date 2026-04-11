const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const CleanCSS = require('clean-css');
const { stripQAModule, extractAndValidateScripts } = require('./scripts/pipelineUtils.js');

const env = process.argv[2];

if (!['dev', 'prod'].includes(env)) {
    console.error('Usage: node deploy.js <dev|prod>');
    process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
    console.log(`[Deploy] Switching to ${env} environment...`);

    const SCRIPT_IDS = {
        'dev': '1ZjGYDSsBgXy9mxa9guRoj69oabUJAVZz9GOy9DzJ5280tzYmMIjIBd5q',
        'prod': '14oIjG_akx2DuX1nZe_HWBR8TECPYZgCyYikKwtRnng_pgzxcK0wLekYa'
    };

    const DEPLOYMENT_IDS = {
        'prod': 'AKfycbyM1dZ_VxFzyaljHVEkTC0NXn_FYxnvRfHGZqjtbpnd-T-mRiGyXFWVdI0diJWtH79-eg'
    };

    if (!SCRIPT_IDS[env]) {
        throw new Error(`No scriptId configured for environment: ${env}`);
    }

    const configFile = `environments/Config.${env}.js`;
    let currentConfigContent = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : '';
    let currentVersionMatch = currentConfigContent.match(/APP_VERSION:\s*['"](.*?)['"]/);
    let currentVersion = currentVersionMatch ? currentVersionMatch[1] : 'v1.0.0';

    // Aislar la base de la versión (ej. 'v1.4.0' de 'v1.4.0 - 2603310930' o 'v1.4.0-stable')
    let baseVersion = currentVersion.split(' - ')[0].replace(/-stable|-dev/gi, '').trim();

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const suffix = `${yy}${mm}${dd}${hh}${min}`;

    const autoVersion = `${baseVersion} - ${suffix}`;

    rl.question(`\n[Deploy] Current version in ${env}: ${currentVersion}\n[Deploy] Presiona Enter para auto-generar (${autoVersion}) o escribe una base nueva (ej. v1.5.0): `, (inputVersion) => {
        rl.close();
        
        let finalBase = inputVersion.trim() || baseVersion;
        // Si el usuario escribió la base manual (ej v1.5.0), le agregamos el sufijo igual.
        // Si escribió todo completo, lo respetamos, pero asumimos que escribirá la base.
        if (!finalBase.includes(' - ')) {
            finalBase = `${finalBase} - ${suffix}`;
        }
        let newVersion = finalBase;

        // Si cambió la versión, modificamos el archivo Config original
        if (newVersion !== currentVersion && currentConfigContent) {
            currentConfigContent = currentConfigContent.replace(/APP_VERSION:\s*['"].*?['"]/, `APP_VERSION: '${newVersion}'`);
            fs.writeFileSync(configFile, currentConfigContent);
            console.log(`[Deploy] Version actualizada a ${newVersion} en ${configFile}`);
        }

        // Create .build directory
        const buildDir = '.build';
        if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true, force: true });
        }
        fs.cpSync('src', buildDir, { recursive: true });

        // Strip QA Module in Production
        if (env === 'prod') {
            const indexFile = `${buildDir}/Index.html`;
            if (fs.existsSync(indexFile)) {
                let indexContent = fs.readFileSync(indexFile, 'utf8');
                
                // S30.5: Sustitución de RegExp por cortes absolutos estáticos
                
                // S30.5: Uso de la librería de despliegue para purgado de AST
                const originalContent = indexContent;
                indexContent = stripQAModule(indexContent);
                
                if (originalContent !== indexContent) {
                    fs.writeFileSync(indexFile, indexContent, 'utf8');
                    console.log(`[Deploy] Stripped QA Module from PROD build (Utils Pipeline).`);
                }
            }
        }

        // Validate JS AST in HTML files (S15.1)
        console.log(`[Deploy] Validating JavaScript AST in all HTML modules...`);
        const files = fs.readdirSync(buildDir);
        for (const file of files) {
            if (!file.endsWith('.html')) continue;
            const filePath = path.join(buildDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            // S30.5: Delegar a la librería pipelineUtils.js
            extractAndValidateScripts(content, file);
        }
        console.log(`[Deploy] AST Validation passed.`);

        // Native CSS Bundler (S14.2 & S24.4 Atomic Stylesheets)
        const assetsCssPath = `${buildDir}/assets/css`;
        const assetsCssDirList = fs.existsSync(assetsCssPath) ? fs.readdirSync(assetsCssPath) : [];
        const cssFiles = assetsCssDirList
            .filter(f => f.endsWith('.css'))
            .map(f => {
                const baseName = path.basename(f, '.css');
                const pascalCase = baseName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
                return { source: `assets/css/${f}`, target: `CSS_${pascalCase}.html` };
            });

        cssFiles.forEach(file => {
            const sourcePath = `${buildDir}/${file.source}`;
            const targetPath = `${buildDir}/${file.target}`;
            
            if (!fs.existsSync(sourcePath)) return;
            
            let cssContent = fs.readFileSync(sourcePath, 'utf8');
            let minified = cssContent;
            
            try {
                const output = new CleanCSS({ level: 1 }).minify(cssContent);
                if (output.errors.length > 0) {
                    console.error(`\x1b[31m[Deploy-Error] Fallo CSS AST Minifier en ${file.source}:\x1b[0m`, output.errors);
                } else {
                    minified = output.styles;
                }
            } catch (e) {
                console.error(`\x1b[31m[Deploy-Error] Excepción Crítica compilando CSS con Esbuild en ${file.source}:\x1b[0m`, e);
                process.exit(1);
            }
            
            const htmlWrapped = `<style>\n${minified}\n</style>`;
            fs.writeFileSync(targetPath, htmlWrapped, 'utf8');
        });

        // Cleanup assets/css is now handled passively by .claspignore
        console.log(`[Deploy] Bundled native CSS files into virtual HTML styles`);

        // Native JS Frontend Bundler (S24.6 Client JS Decoupling)
        const jsFiles = fs.readdirSync(buildDir).filter(f => f.endsWith('.client.js'));
        jsFiles.forEach(file => {
            const sourcePath = `${buildDir}/${file}`;
            const targetPath = `${buildDir}/${file.replace('.client.js', '.html')}`;
            
            let jsContent = fs.readFileSync(sourcePath, 'utf8');
            const htmlWrapped = `<script>\n${jsContent}\n</script>`;
            fs.writeFileSync(targetPath, htmlWrapped, 'utf8');
            
            // Delete the original to prevent Clasp from pushing it as a backend script
            fs.unlinkSync(sourcePath);
        });
        if (jsFiles.length > 0) {
            console.log(`[Deploy] Bundled ${jsFiles.length} native .client.js files into virtual HTML scripts`);
        }

        // Swap Config.js in .build
        const targetConfig = `${buildDir}/Global_Config.js`;
        if (fs.existsSync(configFile)) {
            console.log(`[Deploy] Updating ${targetConfig} with ${configFile}...`);
            fs.copyFileSync(configFile, targetConfig);
        }

        // Alter .clasp.json to point to .build
        console.log(`[Deploy] Generating temporary .clasp.json for ${env}...`);
        let claspConfig = {
            scriptId: SCRIPT_IDS[env],
            rootDir: ".build"
        };
        fs.writeFileSync('.clasp.json', JSON.stringify(claspConfig, null, 2), 'utf8');

        console.log(`[Deploy] Environment files updated for ${env}. Running npx clasp push...`);

        let pushSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!pushSuccess && attempts < maxAttempts) {
            attempts++;
            console.log(`[Deploy] Attempt ${attempts} of ${maxAttempts}...`);
            try {
                const output = execSync(`npx clasp push -f`, { encoding: 'utf8', stdio: 'pipe' });
                console.log(output);
                
                if (output.includes('Pushed') && output.includes('files.')) {
                    pushSuccess = true;
                    console.log(`[Deploy] Verified: Clasp confirmed files were physically pushed.`);
                } else if (output.includes('No files to push')) {
                    console.log(`[Deploy] Warning: Clasp reports 'No files to push'. Either files are identical remotely, or manifest is out of sync.`);
                    pushSuccess = true; 
                } else {
                    console.log(`[Deploy] Warning: Expected confirmation string not found. Retrying in 2s...`);
                    execSync('node -e "setTimeout(()=>{}, 2000)"'); 
                }
            } catch (e) {
                console.error(`[Deploy] Error during attempt ${attempts}:`);
                console.error(e.stdout || e.message);
                if (attempts < maxAttempts) {
                    console.log(`[Deploy] Retrying in 3 seconds...`);
                    execSync('node -e "setTimeout(()=>{}, 3000)"');
                }
            }
        }

        if (!pushSuccess) {
            console.error("[Deploy] Error: Clasp failed to reliably push code after 3 attempts.");
            process.exit(1);
        }

        // --- S14.5: Auto-Deploy Versioning for PROD Environment ---
        if (env === 'prod' && DEPLOYMENT_IDS['prod']) {
            console.log(`[Deploy] Publishing new Version and updating PROD Executable Link...`);
            try {
                const deployOutput = execSync(`npx clasp deploy -i ${DEPLOYMENT_IDS['prod']} -d "Release ${newVersion}"`, { encoding: 'utf8', stdio: 'pipe' });
                console.log(deployOutput);
                console.log(`[Deploy] Executable Link (Web App) updated successfully for PROD.`);
            } catch (e) {
                console.error(`[Deploy] Warning: Failed to update the Web App deployment link for PROD:`);
                console.error(e.stdout || e.message);
                console.log(`[Deploy] Remember: You may need to manually update the deployment version in Apps Script GUI.`);
            }
        }
        // -----------------------------------------------------------

        // Cleanup
        if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true, force: true });
        }
        // Restore .clasp.json rootDir
        console.log(`[Deploy] Restoring base .clasp.json to target dev/src...`);
        fs.writeFileSync('.clasp.json', JSON.stringify({
            scriptId: SCRIPT_IDS['dev'],
            rootDir: 'src'
        }, null, 2), 'utf8');

        console.log(`[Deploy] Successfully deployed to ${env}!`);
    });
} catch (error) {
    console.error(`[Deploy] Error: ${error.message}`);
    rl.close();
    process.exit(1);
}
