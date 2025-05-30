const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { tryLoginCalabrio } = require('./calabrio');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Отключаем проверку сертификата SSL (не рекомендуется для продакшн окружения)

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

// app.set('trust proxy', true);

// Настроим CORS
app.use(cors({
  origin: '*',  // Разрешаем доступ с любого домена
  exposedHeaders: ['calabrio'],
  credentials: true,  // Разрешаем отправку cookies
}));

// Настройка JSON для тела запроса
app.use(express.json());

// Rate Limiting: Allow 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 75, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

// Apply rate limiting to all requests
app.use(limiter);

app.get('/ping', async (req, res) => {
  res.status(200).send('OK!');
});

// /auth route to handle XSRF token fetching, Teleopti login, and WFM authentication
app.post('/auth', async (req, res) => {
  const { username, password, authType } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required!' });
  }

  if (!authType) {
    return res.status(400).json({ error: 'Auth type required!' });
  }

  tryLoginCalabrio(username, password, authType).then(login => {
    const cookies = login.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    // console.log('Cookies:', cookies);

    // Set cookies in the response
    res.setHeader('calabrio', cookies);
    return res.status(200).json({ username: login.username });
  })
    .catch(error => {
      return res.status(401).json({ error: error.details || 'Login failed' });
    });
});

// Один рут для получения данных
app.post('/proxy', async (req, res) => {
  const { targetUrl, cookie, headers, isClient, method, ...body } = req.body; // targetUrl — целевой сервер, cookie — cookie для запроса

  if (!targetUrl) {
    return res.status(400).json({ error: 'targetUrl обязательны!' });
  }

  // Restrict to specific domains
  const allowedDomains = ['tavirekini.lv', 'teleopti.nordic.webhelp.com'];
  const targetDomain = new URL(targetUrl).hostname;

  if (!allowedDomains.includes(targetDomain)) {
    return res.status(400).json({ error: 'Этот домен не разрешен!' });
  }

  if (method !== 'POST') {
    try {
      // Отправляем запрос на другой сервер с использованием cookie (если передан)
      const response = await client.get(targetUrl, {
        headers: {
          'Cookie': cookie || '', // Указываем cookie, если оно есть, иначе пустая строка
        },
        body: body,
        withCredentials: true, // Разрешаем отправку cookies на целевой сервер (если необходимо)
      });

      // Возвращаем данные, полученные от целевого сервера
      const contentType = response.headers['content-type'];
      const isHtml = contentType && contentType.includes('text/html');

      if (isHtml) {
        return res.status(200).send(response.data);
      }

      res.json({ ...response.data, cookies: await jar.getCookies(targetUrl) });
    } catch (error) {
      console.error('Ошибка при запросе:', error);
      res.status(error.response.status).json({ error: 'Ошибка при запросе к целевому серверу', track: error });
    }
  }

  else {
    try {
      // Prepare the form data body
      const formData = new URLSearchParams();

      // Add extra fields to form data (excluding targetUrl and cookie)
      Object.entries(body).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (isClient) {
        const response = await client.post(targetUrl, formData, {
          headers: {
            'Cookie': cookie || '', // Include cookie if provided
            'Content-Type': 'application/x-www-form-urlencoded', // Use x-www-form-urlencoded for form data
            ...headers, // Include any additional headers provided in the request
          },
          withCredentials: true, // Allow sending cookies to the target server
        });

        // Return the response data from the target server
        const cookies = response.headers['set-cookie'];
        res.json({ ...response.data, cookies: cookies });
      }

      else {
        // Sending request to the target server with cookie and form data
        const response = await axios.post(targetUrl, formData, {
          headers: {
            'Cookie': cookie || '', // Include cookie if provided
            'Content-Type': 'application/x-www-form-urlencoded', // Use x-www-form-urlencoded for form data
            ...headers, // Include any additional headers provided in the request
          },
          withCredentials: true, // Allow sending cookies to the target server
        });

        // Return the response data from the target server
        const cookies = response.headers['set-cookie'];
        res.json({ ...response.data, cookies: cookies });
      }

    } catch (error) {
      console.error('Ошибка при запросе:', error);
      res.status(error.response.status).json({ error: 'Ошибка при запросе к целевому серверу', track: error, data: error.response.data });
    }
  }


});

// Запуск сервера на порту 10000
app.listen(10000, () => {
  console.log('Сервер запущен на порту 10000');
});
