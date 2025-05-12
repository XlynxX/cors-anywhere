const express = require('express');
const axios = require('axios');
const app = express();

// Настройка JSON для тела запроса
app.use(express.json());

// Один рут для получения данных
app.post('/proxy', async (req, res) => {
  const { targetUrl, cookie } = req.body; // targetUrl — целевой сервер, cookie — cookie для запроса

  if (!targetUrl || !cookie) {
    return res.status(400).json({ error: 'targetUrl и cookie обязательны!' });
  }

  try {
    // Отправляем запрос на другой сервер с использованием cookie
    const response = await axios.get(targetUrl, {
      headers: {
        'Cookie': cookie, // Указываем cookie
      },
      withCredentials: true, // Разрешаем отправку cookies на целевой сервер
    });

    // Возвращаем данные, полученные от целевого сервера
    res.json(response.data);
  } catch (error) {
    console.error('Ошибка при запросе:', error);
    res.status(500).json({ error: 'Ошибка при запросе к целевому серверу' });
  }
});

// Запуск сервера на порту 3000
app.listen(10000, () => {
  console.log('Сервер запущен на порту 10000');
});
