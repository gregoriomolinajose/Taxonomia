const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const env = process.argv[2];

if (!['dev', 'prod'].includes(env)) {
    console.error('Usage: node deploy.js <dev|prod>');
    process.exit(1);
}

const envFile = `.clasp-${env}.json`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

try {
    console.log(`[Deploy] Switching to ${env} environment...`);

    if (!fs.existsSync(envFile)) {
        throw new Error(`Source file ${envFile} not found.`);
    }

    const configFile = `environments/Config.${env}.js`;
    let currentConfigContent = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : '';
    let currentVersionMatch = currentConfigContent.match(/APP_VERSION:\s*['"](.*?)['"]/);
    let currentVersion = currentVersionMatch ? currentVersionMatch[1] : 'v1.0.0';

    rl.question(`\n[Deploy] Current version in ${env}: ${currentVersion}\n[Deploy] Ingresa la nueva version (o presiona Enter para dejar la misma): `, (newVersion) => {
        rl.close();
        newVersion = newVersion.trim() || currentVersion;

        // Si cambió la versión, modificamos el archivo Config original
        if (newVersion !== currentVersion && currentConfigContent) {
            currentConfigContent = currentConfigContent.replace(/APP_VERSION:\s*['"].*?['"]/, `APP_VERSION: '${newVersion}'`);
            fs.writeFileSync(configFile, currentConfigContent);
            console.log(`[Deploy] Version actualizada a ${newVersion} en ${configFile}`);
        }

        // Swap Config.js
        const targetConfig = 'src/Global_Config.js';
        if (fs.existsSync(configFile)) {
            console.log(`[Deploy] Updating ${targetConfig} with ${configFile}...`);
            fs.copyFileSync(configFile, targetConfig);
        }

        console.log(`[Deploy] Copying ${envFile} to .clasp.json to guarantee exact script ID routing...`);
        fs.copyFileSync(envFile, '.clasp.json');

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

        console.log(`[Deploy] Successfully deployed to ${env}!`);
    });
} catch (error) {
    console.error(`[Deploy] Error: ${error.message}`);
    rl.close();
    process.exit(1);
}
