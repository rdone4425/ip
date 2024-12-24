import { useState } from 'react';
import { kv } from '@vercel/kv';

export default function Home({ lastUpdate, ipList, error: initialError }) {
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateStatus(null);
    try {
      const response = await fetch('/api/update-ips', {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        setUpdateStatus({
          success: true,
          message: `Successfully processed ${data.processed} IPs out of ${data.total} (${data.errors} errors)`
        });
        // 刷新页面以显示最新数据
        window.location.reload();
      } else {
        setUpdateStatus({
          success: false,
          message: data.error || 'Failed to update IP information'
        });
      }
    } catch (err) {
      setUpdateStatus({
        success: false,
        message: 'Failed to update IP information'
      });
    }
    setUpdating(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>IP 地理位置信息</h1>
      
      {/* 更新按钮和状态 */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p>
            上次更新时间: {lastUpdate ? new Date(lastUpdate).toLocaleString() : '从未更新'}
            {ipList ? ` (共 ${ipList.length} 个IP)` : ''}
          </p>
          <button 
            onClick={handleUpdate} 
            disabled={updating}
            style={{ 
              padding: '10px 20px', 
              cursor: updating ? 'not-allowed' : 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {updating ? '更新中...' : '更新IP列表'}
          </button>
        </div>
        
        {updateStatus && (
          <div style={{ 
            marginTop: '10px',
            padding: '10px',
            backgroundColor: updateStatus.success ? '#DFF0D8' : '#F2DEDE',
            color: updateStatus.success ? '#3C763D' : '#A94442',
            borderRadius: '4px'
          }}>
            {updateStatus.message}
          </div>
        )}
      </div>

      {/* IP列表 */}
      {initialError ? (
        <div style={{ color: 'red', padding: '20px', backgroundColor: '#FFF0F0', borderRadius: '4px' }}>
          {initialError}
        </div>
      ) : (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>IP列表</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '15px',
            marginTop: '15px'
          }}>
            {ipList?.map((item) => (
              <div 
                key={item.ip}
                style={{
                  backgroundColor: 'white',
                  padding: '15px',
                  borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{item.ip}</div>
                <div style={{ color: '#666' }}>
                  <div>国家: {item.country}</div>
                  <div>大洲: {item.continent}</div>
                  <div>国家代码: {item.iso_code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const lastUpdate = await kv.get('last_update');
    const keys = await kv.keys('ip:*');
    const ipList = [];
    
    // 获取所有IP信息
    for (const key of keys) {
      const info = await kv.get(key);
      if (info) {
        ipList.push(info);
      }
    }
    
    // 按IP排序
    ipList.sort((a, b) => {
      const aNum = a.ip.split('.').map(n => parseInt(n, 10));
      const bNum = b.ip.split('.').map(n => parseInt(n, 10));
      for (let i = 0; i < 4; i++) {
        if (aNum[i] !== bNum[i]) {
          return aNum[i] - bNum[i];
        }
      }
      return 0;
    });
    
    return {
      props: {
        lastUpdate: lastUpdate || null,
        ipList,
        error: null
      }
    };
  } catch (error) {
    console.error('Error fetching KV data:', error);
    return {
      props: {
        lastUpdate: null,
        ipList: [],
        error: 'Failed to fetch IP information'
      }
    };
  }
} 