const puppeteer = require('puppeteer');
require('dotenv').config();

async function tryLoginCalabrio(username, password, authType = 'adfs') {
    try {
        const browser = await puppeteer.launch({
            executablePath: process.env.NODE_ENV === 'production' ? process.env.PUPPETEER_EXECUTABLE_PATH : puppeteer.executablePath(), // Ensure the path is correct
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
                
                '--single-process', // Run in a single process
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

        console.log(authType);
        

        if (authType === 'adfs') {
            await page.click('.adfs3');

            await page.waitForSelector('#userNameInput', { timeout: 5000 });

            await page.type('#userNameInput', username, { delay: 0 });
            await page.type('#passwordInput', password, { delay: 0 });
            await page.click('#submitButton');
        }

        if (authType !== 'adfs') {
            await page.click('.teleopti');
            await page.waitForSelector('#Username-input', { timeout: 5000 });

            // Optimized login process
            await page.type('#Username-input', username, { delay: 0 });
            await page.type('#Password-input', password, { delay: 0 });
            await page.click('#check1');
            await page.click('#Signin-button');
        }

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