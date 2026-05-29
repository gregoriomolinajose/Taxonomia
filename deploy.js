const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');
const readline = require('readline');
const esbuild  = require('esbuild');
const { stripQAModule, extractAndValidateScripts } = require('./scripts/pipelineUtils.js');


const env = process.argv[2];

if (!['dev', 'prod', 'staging', 'tenantB'].includes(env)) {
    console.error('Usage: node deploy.js <dev|prod|staging|tenantB>');
    process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
    console.log(`[Deploy] Switching to ${env} environment...`);

    const SCRIPT_IDS = {
        'dev':     '1ZjGYDSsBgXy9mxa9guRoj69oabUJAVZz9GOy9DzJ5280tzYmMIjIBd5q',
        'staging': '14oIjG_akx2DuX1nZe_HWBR8TECPYZgCyYikKwtRnng_pgzxcK0wLekYa',   // ex-prod
        'prod':    '1kpN1TjMRtU6sE5rXStorv3rHF2gs_SvHWwBJyCkyGC9nWMKAx9GF7Ijw',    // nuevo prod (Tenant A)
        'tenantB': '1ifdT9dDsDP0Efvrq2eCaBdB4TM5jRnRz9dXnshn0aT8hvbSfUnqMC5hi'     // Tenant B
    };

    const DEPLOYMENT_IDS = {
        'staging': 'AKfycbyM1dZ_VxFzyaljHVEkTC0NXn_FYxnvRfHGZqjtbpnd-T-mRiGyXFWVdI0diJWtH79-eg',  // ex-prod
        'prod':    'AKfycbxzO-_6ud4UpYZoBgL8xbmcKy9Xlx5LgMtIW7jQdD9zP8-8peiPUKAysEae12xW-JOs',     // Tenant A prod
        'tenantB': 'AKfycbzv5roNRhVzT5f0kOvCHikd-PjNjPzuyJUJyzKs_VjlZVwx7Wiscomprv2Y3iYYeL3jLg'   // Tenant B
    };

    if (!SCRIPT_IDS[env]) {
        throw new Error(`No scriptId configured for environment: ${env}`);
    }

    // [S67] Multi-Account Clasp Auth — Swap temporal de ~/.clasprc.json
    // clasp 3.x no soporta --creds. La estrategia es intercambiar el archivo
    // de sesión activa justo antes del push y restaurarlo siempre al finalizar.
    // Los archivos de credenciales NO van al repo (viven en el HOME del developer).
    // Setup: ver docs/deploy-setup.md
    const CLASPRC = path.join(os.homedir(), '.clasprc.json');
    const CREDS_FILE = {
        'dev':     path.join(os.homedir(), '.clasp-coppel.json'),      // Coppel  → dev
        'staging': path.join(os.homedir(), '.clasp-coppel.json'),      // Coppel  → staging
        'prod':    path.join(os.homedir(), '.clasp-coppel.json'),      // Coppel  → prod (Tenant A)
        'tenantB': path.join(os.homedir(), '.clasp-coppel.json'),      // Coppel  → Tenant B
    };

    const credsPath = CREDS_FILE[env];
    let originalClasprc = null; // backup del token activo antes del swap
    let originalClasprcExisted = false;

    function swapClaspCredentials() {
        if (!credsPath) return;
        if (!fs.existsSync(credsPath)) {
            console.error(`[Deploy] ERROR: Credentials file not found: ${credsPath}`);
            console.error(`[Deploy] Para crearlo: ver docs/deploy-setup.md`);
            process.exit(1);
        }
        // Guardar el token actual antes de reemplazarlo
        if (fs.existsSync(CLASPRC)) {
            originalClasprc = fs.readFileSync(CLASPRC, 'utf8');
            originalClasprcExisted = true;
        } else {
            originalClasprcExisted = false;
        }
        try {
            fs.copyFileSync(credsPath, CLASPRC);
            console.log(`[Deploy] Using credentials: ${credsPath}`);
        } catch (e) {
            console.error(`[Deploy] Failed to swap credentials:`, e.message);
            // Abort gracefully if copy fails
        }
    }

    function restoreClaspCredentials() {
        if (originalClasprcExisted && originalClasprc !== null) {
            fs.writeFileSync(CLASPRC, originalClasprc, 'utf8');
            console.log(`[Deploy] Credentials restored to original token.`);
            originalClasprc = null;
        } else if (!originalClasprcExisted && fs.existsSync(CLASPRC) && credsPath && fs.existsSync(credsPath)) {
            // Only unlink if we actually did a swap (credsPath exists) and it wasn't there before
            try {
                fs.unlinkSync(CLASPRC);
                console.log(`[Deploy] Credentials file removed (did not exist originally).`);
            } catch (err) {
                console.warn(`[Deploy] Warning: could not remove temporary credentials file.`, err.message);
            }
        }
    }

    // Handlers for graceful shutdown
    let cleanupDone = false;
    function doCleanup() {
        if (!cleanupDone) {
            restoreClaspCredentials();
            cleanupDone = true;
        }
    }
    process.on('SIGINT', () => {
        console.log('\n[Deploy] Process aborted via SIGINT. Cleaning up...');
        doCleanup();
        process.exit(1);
    });
    process.on('uncaughtException', (err) => {
        console.error('\n[Deploy] Uncaught Exception:', err);
        doCleanup();
        process.exit(1);
    });


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

    const isZeroTouch = process.argv.includes('--zero-touch');

    const proceedWithVersion = (inputVersion) => {
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
            try {
                extractAndValidateScripts(content, file);
            } catch (err) {
                console.error(`\x1b[31m[Deploy-Error]\x1b[0m ${err.message}`);
                process.exit(1);
            }
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
            
            const stat = fs.statSync(sourcePath);
            let cssContent = fs.readFileSync(sourcePath, 'utf8');
            let minified = cssContent;
            
            try {
                const output = esbuild.transformSync(cssContent, {
                    loader: 'css',
                    minify: true
                });
                minified = output.code;
            } catch (e) {
                console.error(`\x1b[31m[Deploy-Error] Excepción Crítica compilando CSS con Esbuild en ${file.source}:\x1b[0m`, e);
                process.exit(1);
            }
            
            const htmlWrapped = `<style>\n${minified}\n</style>`;
            fs.writeFileSync(targetPath, htmlWrapped, 'utf8');
        });

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

        // [S67] Intercambiar credenciales antes del push
        swapClaspCredentials();

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
                } else if (output.includes('No files to push') || output.includes('Script is already up to date')) {
                    console.log(`[Deploy] Warning: Clasp reports no files to push. Either files are identical remotely, or manifest is out of sync.`);
                    // Lo tomamos como éxito estructural si realmente no había cambios.
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

        // [S67] Restaurar credenciales originales después del push (siempre)
        restoreClaspCredentials();

        if (!pushSuccess) {

            console.error("[Deploy] Error: Clasp failed to reliably push code after 3 attempts.");
            process.exit(1);
        }

        // --- S14.5: Auto-Deploy Versioning for PROD Environment ---
        if (env === 'prod' && DEPLOYMENT_IDS['prod']) {
            console.log(`[Deploy] Publishing new Version and updating PROD Executable Link...`);
            // [S67] El clasp deploy también necesita las creds correctas
            swapClaspCredentials();
            try {
                const deployOutput = execSync(`npx clasp deploy -i ${DEPLOYMENT_IDS['prod']} -d "Release ${newVersion}"`, { encoding: 'utf8', stdio: 'pipe' });
                console.log(deployOutput);
                console.log(`[Deploy] Executable Link (Web App) updated successfully for PROD.`);
            } catch (e) {
                console.error(`[Deploy] Warning: Failed to update the Web App deployment link for PROD:`);
                console.error(e.stdout || e.message);
                console.log(`[Deploy] Remember: You may need to manually update the deployment version in Apps Script GUI.`);
            } finally {
                restoreClaspCredentials();
            }
        }


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
    };

    if (isZeroTouch) {
        console.log(`\n[Deploy] Zero-Touch mode enabled. Auto-generating version: ${autoVersion}`);
        rl.close();
        proceedWithVersion('');
    } else {
        rl.question(`\n[Deploy] Current version in ${env}: ${currentVersion}\n[Deploy] Presiona Enter para auto-generar (${autoVersion}) o escribe una base nueva (ej. v1.5.0): `, (inputVersion) => {
            rl.close();
            proceedWithVersion(inputVersion);
        });
    }
} catch (error) {
    console.error(`[Deploy] Error: ${error.message}`);
    rl.close();
    process.exit(1);
}
