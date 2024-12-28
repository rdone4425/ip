import { useState, useEffect } from 'react';

export default function Home() {
  const [ipInfo, setIpInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputIp, setInputIp] = useState('');

  // 获取当前IP信息
  const fetchCurrentIp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ip');
      const data = await res.json();
      setIpInfo(data);
    } catch (error) {
      console.error('Error fetching IP info:', error);
      setError('获取IP信息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 查询指定IP
  const lookupIp = async (ip) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ip?ip=${encodeURIComponent(ip)}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || '查询失败');
      }
      setIpInfo(data);
    } catch (error) {
      console.error('Error looking up IP:', error);
      setError(error.message || '查询失败，请检查IP地址格式是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 处理表单提交
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputIp.trim()) {
      lookupIp(inputIp.trim());
    }
  };

  // 首次加载时获取当前IP
  useEffect(() => {
    fetchCurrentIp();
  }, []);

  return (
    <div style={{ 
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>IP 信息查询</h1>
      
      {/* IP查询表单 */}
      <div style={{
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            value={inputIp}
            onChange={(e) => setInputIp(e.target.value)}
            placeholder="输入IP地址"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
          <button
            type="submit"
            disabled={loading || !inputIp.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {loading ? '查询中...' : '查询'}
          </button>
          <button
            type="button"
            onClick={fetchCurrentIp}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            获取当前IP
          </button>
        </form>
      </div>

      {/* 错误信息显示 */}
      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#fff3f3',
          color: '#dc3545',
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      
      {/* 加载状态 */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p>查询中，请稍候...</p>
        </div>
      ) : ipInfo ? (
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>IP信息：</h2>
          <div style={{
            backgroundColor: '#fff',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            <p><strong>IP地址：</strong> {ipInfo.data.ip}</p>
            <p><strong>IP版本：</strong> {ipInfo.data.ipVersion}</p>
            <p><strong>访问时间：</strong> {new Date(ipInfo.data.timestamp).toLocaleString()}</p>
            <p><strong>浏览器信息：</strong> {ipInfo.data.userAgent}</p>
            <p><strong>语言设置：</strong> {ipInfo.data.acceptLanguage}</p>
          </div>
          
          {ipInfo.data.geoInfo && (
            <div style={{
              backgroundColor: '#fff',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginTop: 0 }}>地理位置信息：</h3>
              <p><strong>国家/地区：</strong> {ipInfo.data.geoInfo.country || '未知'}</p>
              <p><strong>大洲：</strong> {ipInfo.data.geoInfo.continent || '未知'}</p>
              <p><strong>国家代码：</strong> {ipInfo.data.geoInfo.countryCode || '未知'}</p>
              <p><strong>是否欧盟：</strong> {ipInfo.data.geoInfo.isEU ? '是' : '否'}</p>
            </div>
          )}
          
          <details>
            <summary style={{ 
              cursor: 'pointer', 
              marginTop: '20px',
              padding: '10px',
              backgroundColor: '#fff',
              borderRadius: '4px'
            }}>
              查看完整请求头信息
            </summary>
            <pre style={{
              backgroundColor: '#fff',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              marginTop: '10px'
            }}>
              {JSON.stringify(ipInfo.data.headers, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'red' }}>
          获取IP信息失败，请刷新页面重试
        </p>
      )}
    </div>
  );
} 