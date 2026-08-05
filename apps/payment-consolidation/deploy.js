const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');

// =====================================================================
// DEPLOY SCRIPT — Payment Consolidation
// Basado en el patrón de Taxonomía (multi-account clasp auth)
// =====================================================================

const env = process.argv[2];

if (!['dev'].includes(env)) {
    console.error('Usage: node deploy.js <dev>');
    process.exit(1);
}

const isZeroTouch = process.argv.includes('--zero-touch');

try {
    console.log(`[Deploy] Payment Consolidation — Environment: ${env}`);

    const SCRIPT_IDS = {
        'dev': '1cY1iVSzd3pV9YQ8z0SwEBkL858GV5CGh_b5AHvimqCSMmlDL-m7p5nIY'
    };

    if (!SCRIPT_IDS[env]) {
        throw new Error(`No scriptId configured for environment: ${env}`);
    }

    // Multi-Account Clasp Auth — Swap temporal de ~/.clasprc.json
    // Usa las credenciales de la cuenta Gmail (misma que GreatPeeps en Taxonomía).
    const CLASPRC = path.join(os.homedir(), '.clasprc.json');
    const CREDS_FILE = {
        'dev': path.join(os.homedir(), '.clasp-gmail.json')
    };

    const credsPath = CREDS_FILE[env];
    let originalClasprc = null;
    let originalClasprcExisted = false;

    function swapClaspCredentials() {
        if (!credsPath) return;
        if (!fs.existsSync(credsPath)) {
            console.error(`[Deploy] ERROR: Credentials file not found: ${credsPath}`);
            console.error(`[Deploy] Asegúrate de tener el archivo de credenciales de la cuenta Coppel.`);
            process.exit(1);
        }
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
        }
    }

    function restoreClaspCredentials() {
        if (originalClasprcExisted && originalClasprc !== null) {
            fs.writeFileSync(CLASPRC, originalClasprc, 'utf8');
            console.log(`[Deploy] Credentials restored to original token.`);
            originalClasprc = null;
        } else if (!originalClasprcExisted && fs.existsSync(CLASPRC) && credsPath && fs.existsSync(credsPath)) {
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

    // Verificar que .clasp.json apunta al script correcto
    const claspConfig = {
        scriptId: SCRIPT_IDS[env],
        rootDir: "src"
    };
    fs.writeFileSync('.clasp.json', JSON.stringify(claspConfig, null, 2), 'utf8');
    console.log(`[Deploy] .clasp.json updated for ${env} (scriptId: ${SCRIPT_IDS[env]})`);

    // Intercambiar credenciales antes del push
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
                console.log(`[Deploy] Warning: Clasp reports no files to push.`);
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

    // Restaurar credenciales originales después del push (siempre)
    restoreClaspCredentials();

    if (!pushSuccess) {
        console.error("[Deploy] Error: Clasp failed to reliably push code after 3 attempts.");
        process.exit(1);
    }

    console.log(`[Deploy] Successfully deployed Payment Consolidation to ${env}!`);

} catch (error) {
    console.error(`[Deploy] Error: ${error.message}`);
    process.exit(1);
}
