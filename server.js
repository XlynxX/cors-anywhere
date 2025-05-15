const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

// Настроим CORS
app.use(cors({
  origin: '*',  // Разрешаем доступ с любого домена
  credentials: true,  // Разрешаем отправку cookies
}));

// Настройка JSON для тела запроса
app.use(express.json());

// Rate Limiting: Allow 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

// Apply rate limiting to all requests
app.use(limiter);

// Один рут для получения данных
app.post('/proxy', async (req, res) => {
  const { targetUrl, cookie } = req.body; // targetUrl — целевой сервер, cookie — cookie для запроса

  if (!targetUrl) {
    return res.status(400).json({ error: 'targetUrl обязательны!' });
  }

  // Restrict to specific domains
  const allowedDomains = ['tavirekini.lv', 'teleopti.nordic.webhelp.com'];
  const targetDomain = new URL(targetUrl).hostname;

  if (!allowedDomains.includes(targetDomain)) {
    return res.status(400).json({ error: 'Этот домен не разрешен!' });
  }

  try {
    // Отправляем запрос на другой сервер с использованием cookie (если передан)
    const response = await axios.get(targetUrl, {
      headers: {
        'Cookie': cookie || '', // Указываем cookie, если оно есть, иначе пустая строка
      },
      withCredentials: true, // Разрешаем отправку cookies на целевой сервер (если необходимо)
    });

    // Возвращаем данные, полученные от целевого сервера
    res.json(response.data);
  } catch (error) {
    console.error('Ошибка при запросе:', error);
    res.status(500).json({ error: 'Ошибка при запросе к целевому серверу', track: error });
  }
});

// Запуск сервера на порту 10000
app.listen(10000, () => {
  console.log('Сервер запущен на порту 10000');
});
