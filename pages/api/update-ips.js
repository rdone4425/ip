import { kv } from '@vercel/kv';
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

async function fetchIpList() {
  const response = await fetch('https://raw.githubusercontent.com/rdone4425/cfipcaiji/refs/heads/main/ip.txt');
  const text = await response.text();
  return text.split('\n').filter(ip => ip.trim()); // 过滤空行
}

async function queryIpInfo(ip, reader) {
  try {
    const result = reader.get(ip);
    if (!result) return null;
    
    return {
      ip,
      country: result.country?.names?.en || 'Unknown',
      continent: result.continent?.names?.en || 'Unknown',
      iso_code: result.country?.iso_code || 'Unknown',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error querying IP ${ip}:`, error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 加载数据库
    const reader = await loadDatabase();
    
    // 获取IP列表
    const ipList = await fetchIpList();
    
    // 批量查询IP信息
    const results = [];
    const errors = [];
    
    for (const ip of ipList) {
      const info = await queryIpInfo(ip.trim(), reader);
      if (info) {
        results.push(info);
        // 存储到KV中
        await kv.set(`ip:${ip}`, info);
      } else {
        errors.push(ip);
      }
    }
    
    // 存储更新时间
    await kv.set('last_update', Date.now());
    
    // 返回结果
    res.status(200).json({
      success: true,
      total: ipList.length,
      processed: results.length,
      errors: errors.length,
      last_update: Date.now()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 