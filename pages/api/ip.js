import { Reader } from 'maxmind';

export const config = {
  runtime: 'nodejs'
};

// 缓存Reader实例
let reader = null;

// 下载数据库文件
async function downloadDatabase(dbPath) {
  const https = await import('https');
  const fs = await import('fs');
  const DB_URL = 'https://raw.githubusercontent.com/Loyalsoldier/geoip/release/GeoLite2-Country.mmdb';

  return new Promise((resolve, reject) => {
    console.log('Downloading GeoLite2-Country database...');
    https.get(DB_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download database: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(dbPath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('Database downloaded successfully!');
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(dbPath, () => {}); // 删除可能的不完整文件
        reject(err);
      });
    }).on('error', reject);
  });
}

// 确保数据库文件存在
async function ensureDatabase(dbPath) {
  const fs = await import('fs');
  const path = await import('path');

  // 确保目录存在
  const dir = path.default.dirname(dbPath);
  if (!fs.default.existsSync(dir)) {
    fs.default.mkdirSync(dir, { recursive: true });
  }

  // 检查文件是否存在
  if (!fs.default.existsSync(dbPath)) {
    try {
      await downloadDatabase(dbPath);
    } catch (error) {
      console.error('Error downloading database:', error);
      throw error;
    }
  }
}

// 初始化数据库reader
async function initReader() {
  if (reader) return reader;
  
  try {
    const path = await import('path');
    const fs = await import('fs');
    
    const DB_PATH = path.default.join(process.cwd(), 'public', 'GeoLite2-Country.mmdb');
    
    // 确保数据库文件存在
    await ensureDatabase(DB_PATH);
    
    const buffer = fs.default.readFileSync(DB_PATH);
    reader = await Reader.open(buffer);
    return reader;
  } catch (error) {
    console.error('Error initializing GeoIP database:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 初始化GeoIP reader
    const reader = await initReader();
    if (!reader) {
      throw new Error('GeoIP database not available');
    }

    // 获取要查询的IP
    let targetIp = req.query.ip; // 从查询参数获取IP
    
    if (!targetIp) {
      // 如果没有指定IP，则获取请求者的IP
      targetIp = getIp(req);
    }

    // 验证IP格式
    if (targetIp && !isValidIp(targetIp)) {
      res.status(400).json({
        success: false,
        error: 'Invalid IP address format'
      });
      return;
    }

    // 如果是本地地址或无效IP，尝试使用外部服务获取
    if (!targetIp || targetIp === '::1' || targetIp === '127.0.0.1') {
      try {
        const data = await fetchWithRetry('https://api64.ipify.org?format=json');
        if (data.ip) {
          targetIp = data.ip;
        }
      } catch (error) {
        console.error('Error fetching IP:', error);
      }
    }

    // 获取地理位置信息
    let geoInfo = null;
    if (targetIp && targetIp !== '::1' && targetIp !== '127.0.0.1') {
      try {
        const lookup = reader.get(targetIp);
        if (lookup) {
          geoInfo = {
            status: 'success',
            country: lookup.country?.names?.['zh-CN'] || lookup.country?.names?.en || 'Unknown',
            continent: lookup.continent?.names?.['zh-CN'] || lookup.continent?.names?.en || 'Unknown',
            isEU: lookup.country?.is_in_european_union || false,
            countryCode: lookup.country?.iso_code || 'Unknown'
          };
        }
      } catch (error) {
        console.error('Error looking up IP:', error);
      }
    }

    // 构建响应数据
    const responseData = {
      success: true,
      data: {
        ip: targetIp || 'Unknown',
        ipVersion: isIPv6(targetIp) ? 'IPv6' : 'IPv4',
        timestamp: new Date().toISOString(),
        geoInfo: geoInfo || null
      }
    };

    // 如果不是API调用，添加额外的用户代理信息
    if (!req.query.api) {
      responseData.data.userAgent = req.headers['user-agent'];
      responseData.data.acceptLanguage = req.headers['accept-language'];
      responseData.data.headers = req.headers;
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// 带重试的fetch函数
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  const timeout = options.timeout || 10000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      if (isLastAttempt) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// 验证IP地址格式
function isValidIp(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?:(?::[0-9A-Fa-f]{1,4}){1,6})|:(?:(?::[0-9A-Fa-f]{1,4}){1,7}|:)|fe80:(?::[0-9A-Fa-f]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9A-Fa-f]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// 判断是否是IPv6地址
function isIPv6(ip) {
  return ip && ip.includes(':');
}

// 获取IP地址
function getIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfIp = req.headers['cf-connecting-ip'];
  const socketIp = req.socket.remoteAddress;

  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0];
  }

  return realIp || cfIp || socketIp;
} 