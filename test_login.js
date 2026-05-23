const http = require('http');

const data = new URLSearchParams();
data.append('email', 'christian.ramos9895@gmail.com');
data.append('password', 'PitchSideAdmin!2024');
const body = data.toString();

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body)
  },
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers['set-cookie']);
  res.on('data', d => process.stdout.write(d));
});

req.write(body);
req.end();
