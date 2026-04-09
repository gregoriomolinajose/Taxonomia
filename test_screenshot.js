const { chromium } = require('@playwright/test');

(async () => {
    const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
    const context = await chromium.launchPersistentContext(authDir, {
        headless: false,
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
        ]
    });
    
    const page = await context.newPage();
    await page.goto('https://script.google.com/macros/s/AKfycbz1wK6yVfTuUe3kv35k45IULLBVya51t6HDXUZHNP-6rI9Nh_PEctWZseGyoQiQ2HxkIw/exec');
    
    console.log("Current URL:", page.url());
    
    await page.waitForTimeout(5000); // let it redirect
    console.log("URL After 5s:", page.url());
    
    await page.screenshot({ path: 'artifacts/test-failed-1.png' });
    
    await context.close();
})();
