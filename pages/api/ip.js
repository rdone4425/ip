import { Reader } from 'maxmind';
import fetch from 'node-fetch';

let reader = null;

async function loadDatabase() {
  if (reader) return reader;
  
  const response = await fetch('https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/GeoLite2-Country.mmdb');
  const buffer = await response.buffer();
  reader = new Reader(buffer);
  return reader;
}

export default async function handler(req, res) {
  try {
    // 获取IP地址
    const ip = req.query.ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (!ip) {
      return res.status(400).json({ error: 'No IP address provided' });
    }

    // 加载数据库
    const reader = await loadDatabase();
    
    // 查询IP信息
    const result = reader.get(ip);
    
    if (!result) {
      return res.status(404).json({ error: 'IP not found in database' });
    }

    // 返回结果
    res.status(200).json({
      ip,
      country: result.country?.names?.en || 'Unknown',
      continent: result.continent?.names?.en || 'Unknown',
      iso_code: result.country?.iso_code || 'Unknown'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 