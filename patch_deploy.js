const fs = require('fs');

let content = fs.readFileSync('deploy.js', 'utf8');

// Replace argv parsing
content = content.replace(
  /const env = process\.argv\[2\];[\s\S]*?if \(\!\['dev', 'prod', 'staging', 'tenantB'\]\.includes\(env\)\) \{[\s\S]*?console\.error\('Usage: node deploy\.js <dev\|prod\|staging\|tenantB>'\);[\s\S]*?process\.exit\(1\);[\s\S]*?\}/,
  `const appName = process.argv[2];
const env = process.argv[3];

if (!appName || !['dev', 'prod', 'staging', 'tenantB'].includes(env)) {
    console.error('Usage: node deploy.js <appName> <dev|prod|staging|tenantB>');
    process.exit(1);
}`
);

// Replace SCRIPT_IDS and DEPLOYMENT_IDS
content = content.replace(
  /const SCRIPT_IDS = \{[\s\S]*?\};/,
  `const SCRIPT_IDS = {
        taxonomia: {
            'dev':     '1ZjGYDSsBgXy9mxa9guRoj69oabUJAVZz9GOy9DzJ5280tzYmMIjIBd5q',
            'staging': '14oIjG_akx2DuX1nZe_HWBR8TECPYZgCyYikKwtRnng_pgzxcK0wLekYa',
            'prod':    '1kpN1TjMRtU6sE5rXStorv3rHF2gs_SvHWwBJyCkyGC9nWMKAx9GF7Ijw',
            'tenantB': '1ifdT9dDsDP0Efvrq2eCaBdB4TM5jRnRz9dXnshn0aT8hvbSfUnqMC5hi'
        },
        greatpeeps: {
            'dev': '1C1uyuiwqC-hDYzCy8gDCNGR1mhBIDx_6Lcr08dW6tuYr7i434AIdALIH',
            'staging': '1C1uyuiwqC-hDYzCy8gDCNGR1mhBIDx_6Lcr08dW6tuYr7i434AIdALIH'
        }
    };`
);

content = content.replace(
  /const DEPLOYMENT_IDS = \{[\s\S]*?\};/,
  `const DEPLOYMENT_IDS = {
        taxonomia: {
            'staging': 'AKfycbyM1dZ_VxFzyaljHVEkTC0NXn_FYxnvRfHGZqjtbpnd-T-mRiGyXFWVdI0diJWtH79-eg',
            'prod':    'AKfycbxzO-_6ud4UpYZoBgL8xbmcKy9Xlx5LgMtIW7jQdD9zP8-8peiPUKAysEae12xW-JOs',
            'tenantB': 'AKfycbzv5roNRhVzT5f0kOvCHikd-PjNjPzuyJUJyzKs_VjlZVwx7Wiscomprv2Y3iYYeL3jLg'
        },
        greatpeeps: {}
    };`
);

content = content.replace(
  /if \(!SCRIPT_IDS\[env\]\) \{[\s\S]*?throw new Error\(\`No scriptId configured for environment: \$\{env\}\`\);[\s\S]*?\}/,
  `if (!SCRIPT_IDS[appName] || !SCRIPT_IDS[appName][env]) {
        throw new Error(\`No scriptId configured for app: \${appName}, env: \${env}\`);
    }`
);

// Replace fs.cpSync('src'
content = content.replace(
  /fs\.cpSync\('src', buildDir, \{ recursive: true \}\);/,
  `fs.cpSync('packages/core/src', buildDir, { recursive: true });
        if (fs.existsSync(\`apps/\${appName}/src\`)) {
            fs.cpSync(\`apps/\${appName}/src\`, buildDir, { recursive: true, force: true });
        }`
);

// Fix .clasp.json generation
content = content.replace(
  /scriptId: SCRIPT_IDS\[env\],/,
  `scriptId: SCRIPT_IDS[appName][env],`
);

// Fix prod deploy
content = content.replace(
  /if \(env === 'prod' && DEPLOYMENT_IDS\['prod'\]\) \{/,
  `if (env === 'prod' && DEPLOYMENT_IDS[appName] && DEPLOYMENT_IDS[appName]['prod']) {`
);
content = content.replace(
  /npx clasp deploy -i \$\{DEPLOYMENT_IDS\['prod'\]\}/g,
  `npx clasp deploy -i \${DEPLOYMENT_IDS[appName]['prod']}`
);

fs.writeFileSync('deploy.js', content, 'utf8');
console.log('deploy.js updated for Monorepo');
