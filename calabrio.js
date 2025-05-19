const puppeteer = require('puppeteer');

async function tryLoginCalabrio(username, password) {
    try {
        const browser = await puppeteer.launch({
            headless: true,  // Ensure it's running in headless mode
            args: [
                '--incognito',
                '--ignore-certificate-errors',
                '--no-sandbox',  // Some environments may require this
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',  // Avoid memory issues
                '--disable-images', // Disable images
                '--disable-extensions', // Disable extensions
                '--disable-animations', // Disable CSS animations
                '--disable-notifications', // Disable notifications
                '--devtools=false', // Disable devtools
                '--disable-web-security', // Disable web security
                '--no-zygote', // Disable zygote process
            ],
            ignoreHTTPSErrors: true,
        });
        const page = await browser.newPage();

        // Abort unnecessary requests early
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            if (url.startsWith('https://teleopti.nordic.webhelp.com/TeleoptiWFM/Web/Start/Config/SharedSettings') ||
                url.endsWith('.json') ||
                url.endsWith('permissions')) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.goto('https://teleopti.nordic.webhelp.com/TeleoptiWFM/Web/MyTime', {
            waitUntil: 'domcontentloaded',
        });

        await page.click('.teleopti');
        await page.waitForSelector('#Username-input', { timeout: 5000 });

        // Optimized login process
        await page.type('#Username-input', username, { delay: 0 });
        await page.type('#Password-input', password, { delay: 0 });
        await page.click('#check1');
        await page.click('#Signin-button');

        await page.waitForSelector('.user-name', { timeout: 5000 });

        // Directly extract username and cookies in one go
        const [userName, cookies] = await Promise.all([
            page.$eval('span.user-name', (span) => span.title),
            browser.cookies(),
        ]);

        // console.log('Logged in as:', userName);
        // console.log('Cookies:', cookies);

        await browser.close();

        return { username: userName, cookies: cookies };  // Return both username and cookies
    } catch (error) {
        console.error('Login error:', error, error.message);
        return { error: 'Login failed', details: error.message };
    }
}

// Export the function so it can be used in other files
module.exports = { tryLoginCalabrio };