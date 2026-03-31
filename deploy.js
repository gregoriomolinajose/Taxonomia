const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const CleanCSS = require('clean-css');

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
                indexContent = indexContent.replace(/<!-- \[QA_MODULE_START\] -->[\s\S]*<!-- \[QA_MODULE_END\] -->/, '');
                fs.writeFileSync(indexFile, indexContent, 'utf8');
                console.log(`[Deploy] Stripped QA Module from PROD build.`);
            }
        }

        // Safe CSS Minification (AST-Like RegExp)
        ['CSS_App.html', 'CSS_DesignSystem.html'].forEach(filename => {
            const filepath = `${buildDir}/${filename}`;
            if (!fs.existsSync(filepath)) return;
            let fileContent = fs.readFileSync(filepath, 'utf8');
            
            // Reemplazar de forma segura y basada en AST (AST Minify) el contenido del Style
            fileContent = fileContent.replace(/<style>([\s\S]*?)<\/style>/gi, (match, p1) => {
                let minified = p1;
                try {
                    const output = new CleanCSS({ level: 1 }).minify(p1);
                    if (output.errors.length > 0) {
                        console.error(`\x1b[31m[Deploy-Error] Fallo CSS AST Minifier en ${filename}:\x1b[0m`, output.errors);
                    } else {
                        minified = output.styles;
                    }
                } catch (e) {
                    console.error(`\x1b[31m[Deploy-Error] Excepción Crítica compilando CSS en ${filename}:\x1b[0m`, e);
                }
                return `<style>\n${minified}\n</style>`;
            });
            fs.writeFileSync(filepath, fileContent, 'utf8');
        });
        console.log(`[Deploy] Minified ${buildDir}/CSS_App.html and CSS_DesignSystem.html`);

        // Swap Config.js in .build
        const targetConfig = `${buildDir}/Global_Config.js`;
        if (fs.existsSync(configFile)) {
            console.log(`[Deploy] Updating ${targetConfig} with ${configFile}...`);
            fs.copyFileSync(configFile, targetConfig);
        }

        // Alter .clasp.json to point to .build
        console.log(`[Deploy] Generating temporary .clasp.json for ${env}...`);
        let claspConfig = JSON.parse(fs.readFileSync(envFile, 'utf8'));
        claspConfig.rootDir = '.build';
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

        // Cleanup
        if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true, force: true });
        }
        // Restore .clasp.json rootDir
        claspConfig.rootDir = 'src';
        fs.writeFileSync('.clasp.json', JSON.stringify(claspConfig, null, 2), 'utf8');

        console.log(`[Deploy] Successfully deployed to ${env}!`);
    });
} catch (error) {
    console.error(`[Deploy] Error: ${error.message}`);
    rl.close();
    process.exit(1);
}
