const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
require('dotenv').config();

// Optional: If you'd like to disable webgl, true is the default.
chromium.setGraphicsMode = false;

async function tryLoginCalabrio(username, password, authType = 'adfs') {
    return new Promise(async (resolve, reject) => {
        try {
            const browser = await puppeteer.launch({
                executablePath: process.env.NODE_ENV === 'production' ? await chromium.executablePath() : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: true,  // Ensure it's running in headless mode
                // slowMo: 125,  // Set to 0 for no delay, or adjust as needed
                args: [
                    '--incognito',
                    '--ignore-certificate-errors',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-images',
                    '--disable-extensions',
                    '--disable-animations',
                    '--disable-notifications',
                    '--devtools=false',
                    '--disable-web-security',
                    '--no-zygote',
                ],
                ignoreHTTPSErrors: true,
            });

            const page = await browser.newPage();

            // Abort unnecessary requests early
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const url = request.url();
                if (url.startsWith('https://teleopti.nordic.webhelp.com/TeleoptiWFM/Web/Start/Config/SharedSettings') ||
                    url.includes('.json') ||
                    url.includes('.jpg') || url.includes('.png') ||
                    url.endsWith('permissions')) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            await page.goto('https://teleopti.nordic.webhelp.com/TeleoptiWFM/Web/MyTime', {
                waitUntil: 'domcontentloaded',
            });

            // Handle login attempt
            await login(page, authType, username, password);

            // page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
            // page.on('error', (err) => console.error('Page error:', err));
            // page.on('requestfailed', (request) => {
            //     console.log('Request failed:', request.url(), request.failure().errorText);
            // });

            page.on('requestfinished', async (request) => {
                if (request.method() === 'OPTIONS') {
                    request.continue();
                    return;
                }
                
                console.log('Request finished:', request.url());

                if (request.url().endsWith('SSO/ApplicationAuthenticationApi/Password')) {
                    const response = request.response();
                    if (response.ok()) {
                        const json = await response.json();
                        if (json.Failed) {
                            reject({ error: 'Login failed', details: json.Message });

                            for (const page of await browser.pages()) {
                                await page.close();
                            }
                            await browser.close();
                        };
                    }
                }

                if (request.url().startsWith('https://sts.webhelp.com/adfs/ls/?wa=wsignin1.0') && request.url().includes('AuthenticationBridge')) {
                    const response = request.response();
                    const htmlString = await response.text();

                    const regex = /<span id="errorText"[^>]*>(.*?)<\/span>/s;
                    const match = htmlString.match(regex);

                    if (match && response.status() === 200) {
                        const errorText = match[1];
                        reject({ error: 'Login failed', details: errorText });

                        for (const page of await browser.pages()) {
                            await page.close();
                        }
                        await browser.close();
                    }
                }
            });

            await page.waitForSelector('.user-name', { timeout: 10000 });
            // Directly extract username and cookies in one go
            const [userName, cookies] = await Promise.all([
                page.$eval('span.user-name', (span) => span.title),
                browser.cookies(),
            ]);

            for (const page of await browser.pages()) {
                await page.close();
            }
            await browser.close();

            return resolve({ username: userName, cookies: cookies });

            // Check for login error (this won't block the flow)
            // checkForLoginError(page);

        } catch (error) {
            console.error('Login error:', error, error.message);
            return reject({ error: 'Login failed', details: error.message });
        }
    });
}

// Helper function to handle the login process
async function login(page, authType, username, password) {
    if (authType === 'adfs') {
        await page.waitForSelector('.adfs3');

        await page.click('.adfs3');
        await page.waitForSelector('#userNameInput', { timeout: 5000 });

        await page.type('#userNameInput', username, { delay: 0 });
        await page.type('#passwordInput', password, { delay: 0 });
        await page.click('#submitButton');
    } else {
        await page.waitForSelector('.teleopti');

        await page.click('.teleopti');
        await page.waitForSelector('#Username-input', { timeout: 5000 });

        // Optimized login process
        await page.type('#Username-input', username, { delay: 0 });
        await page.type('#Password-input', password, { delay: 0 });
        await page.click('#check1');
        await page.click('#Signin-button');
    }
}

// Helper function to check for login errors
// async function checkForLoginError(page) {
//     try {
//         // Check for #errorText, if it exists, wait for visibility and return the error message
//         const errorTextElement = await page.$('#errorText');
//         if (errorTextElement) {
//             await page.waitForSelector('#errorText', { visible: true });
//             const errorText = await page.$eval('#errorText', el => el.innerText);
//             return { error: 'Login failed', details: errorText };
//         }

//         // Check for #Signin-error, if it exists, wait for visibility and return the error message
//         const signinErrorElement = await page.$('#Signin-error');
//         if (signinErrorElement) {
//             await page.waitForSelector('#Signin-error', { visible: true });
//             const errorText = await page.$eval('#Signin-error', el => el.innerText);
//             return { error: 'Login failed', details: errorText };
//         }

//         // If no error element found, return null so we can continue the flow
//         return null;
//     } catch (error) {
//         console.error('Error checking for login:', error);
//         return { error: 'Login check failed', details: error.message };
//     }
// }

// Export the function so it can be used in other files
module.exports = { tryLoginCalabrio };
