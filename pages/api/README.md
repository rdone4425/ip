# IP查询 API 文档

这是一个简单的IP查询API，可以获取IP地址的详细信息，包括地理位置、ISP等信息。

## API 端点

### 获取IP信息

```
GET /api/ip
```

#### 查询参数

- `ip` (可选): 要查询的IP地址。如果不提供，将返回请求者的IP信息。
- `api` (可选): 设置为true时，返回精简的API响应，不包含请求头等额外信息。

#### 响应格式

```json
{
  "success": true,
  "data": {
    "ip": "8.8.8.8",
    "ipVersion": "IPv4",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "geoInfo": {
      "country": "United States",
      "city": "Mountain View",
      "regionName": "California",
      "isp": "Google LLC",
      "timezone": "America/Los_Angeles"
    }
  }
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "错误信息"
}
```

### 状态码

- 200: 成功
- 400: 请求参数错误（如无效的IP地址格式）
- 429: 请求过于频繁
- 500: 服务器内部错误

### 速率限制

- 每个IP每分钟最多100次请求
- 超过限制将返回429状态码

### 示例

1. 获取当前IP信息：
```
GET /api/ip
```

2. 查询指定IP：
```
GET /api/ip?ip=8.8.8.8
```

3. API模式（精简响应）：
```
GET /api/ip?ip=8.8.8.8&api=true
```

## 注意事项

1. API支持IPv4和IPv6地址
2. 所有响应都是JSON格式
3. 启用了CORS，支持跨域请求
4. 地理位置信息可能因服务提供商而异 