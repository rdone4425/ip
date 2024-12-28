const https = require('https');
const fs = require('fs');
const path = require('path');

const DB_URL = 'https://raw.githubusercontent.com/Loyalsoldier/geoip/release/GeoLite2-Country.mmdb';
const DB_PATH = path.join(__dirname, '../public/GeoLite2-Country.mmdb');

// 确保目录存在
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log('Downloading GeoLite2-Country database...');

// 下载数据库文件
https.get(DB_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download database: ${response.statusCode}`);
    process.exit(1);
  }

  const file = fs.createWriteStream(DB_PATH);
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('Database downloaded successfully!');
  });
}).on('error', (err) => {
  console.error('Error downloading database:', err.message);
  process.exit(1);
}); 