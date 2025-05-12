// const http = require('http');
// const httpProxy = require('http-proxy');

// // Создаем прокси-сервер
// const proxy = httpProxy.createProxyServer({});

// http.createServer((req, res) => {
//   // Прокси передает все заголовки и куки
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Credentials', 'true'); // Это важно для отправки куков
  
//   // Перенаправляем запрос
//   proxy.web(req, res, { target: 'https://teleopti.nordic.webhelp.com' }); 
// }).listen(10000);

const https = require('https');
const httpProxy = require('http-proxy');

// Create custom agent that allows self-signed certificates
const agent = new https.Agent({
  rejectUnauthorized: false,
});

httpProxy.createProxyServer({
  target: 'https://teleopti.nordic.webhelp.com',  // Your target server
  agent: agent,
}).listen(10000);
