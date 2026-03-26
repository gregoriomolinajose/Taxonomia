const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const env = process.argv[2];

if (!['dev', 'prod'].includes(env)) {
    console.error('Usage: node deploy.js <dev|prod>');
    process.exit(1);
}

const envFile = `.clasp-${env}.json`;

try {
    console.log(`[Deploy] Switching to ${env} environment...`);

    if (!fs.existsSync(envFile)) {
        throw new Error(`Source file ${envFile} not found.`);
    }

    // Swap Config.js
    const configFile = `environments/Config.${env}.js`;
    const targetConfig = 'src/Global_Config.js';
    if (fs.existsSync(configFile)) {
        console.log(`[Deploy] Updating ${targetConfig} with ${configFile}...`);
        fs.copyFileSync(configFile, targetConfig);
    }

    console.log(`[Deploy] Environment files updated for ${env}. Running npx clasp push explicitly with ${envFile}...`);

    execSync(`npx clasp push -P ${envFile} -f`, { stdio: 'inherit' });

    console.log(`[Deploy] Successfully deployed to ${env}!`);
} catch (error) {
    console.error(`[Deploy] Error: ${error.message}`);
    process.exit(1);
}
