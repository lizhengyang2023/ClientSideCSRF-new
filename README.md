# 客户端请求劫持攻击演示系统

## 📋 项目简介

本项目是一个用于演示客户端请求劫持（Client-Side Request Hijacking / CSRF）攻击的教育系统。系统展示了10种不同的请求劫持攻击方式，帮助理解Web安全中的CSRF漏洞及其防护方法。

## 🎯 项目目标

- 演示10种常见的客户端请求劫持攻击方式
- 展示攻击原理和实际应用场景
- 帮助理解Web安全漏洞
- 提供实际可运行的攻击演示环境

## 📁 项目结构

```
ClientSideCSRF-new/
├── server.js              # Express服务器（受害者端口3000，攻击者端口3001）
├── package.json           # 项目依赖配置
├── public/                # 静态文件目录
│   ├── index.html        # 主页面（案例导航）
│   ├── victim.html       # 受害者页面（模拟正常Web应用）
│   └── attacker.html     # 攻击者页面（包含10种攻击方式）
└── README.md             # 项目说明文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

服务器将启动两个服务：
- **受害者服务器**: http://127.0.0.1:3000
- **攻击者服务器**: http://127.0.0.1:3001

### 3. 访问页面

1. 首先打开**受害者页面**: http://127.0.0.1:3000/victim.html
   - 模拟正常用户已登录状态
   - 保持此页面打开

2. 然后打开**攻击者页面**: http://127.0.0.1:3001/attacker.html
   - 观察各种攻击方式
   - 查看攻击结果

## 🔍 攻击案例说明

### 1. 表单自动提交攻击 (form.submit())

**攻击原理：** 创建隐藏的HTML表单，包含恶意数据，页面加载时自动提交。

**应用场景：** 
- 用户访问恶意网站
- 恶意网站包含隐藏表单，自动提交转账请求
- 用户在没有察觉的情况下执行了操作

**攻击步骤：**
1. 攻击者在恶意页面中创建隐藏表单
2. 表单包含转账信息（收款人、金额等）
3. 页面加载时自动调用 `form.submit()`
4. 浏览器自动携带Cookie发送POST请求
5. 受害者服务器执行转账操作

**防护方法：**
- 使用CSRF Token
- 验证Referer头
- 使用SameSite Cookie属性

### 2. 图片标签GET请求劫持 (&lt;img src&gt;)

**攻击原理：** 使用img标签的src属性发送GET请求，浏览器会尝试加载"图片"。

**应用场景：**
- 触发用户操作（删除、修改状态等）
- 泄露用户信息（通过URL参数）
- 统计用户访问

**攻击步骤：**
1. 攻击者在页面中插入img标签
2. src指向受害者服务器的API端点
3. 浏览器自动发送GET请求
4. 即使图片加载失败，请求也已发送

**防护方法：**
- 对状态修改操作使用POST请求
- 验证Referer头
- 使用CSRF Token

### 3. Fetch API请求劫持 (fetch())

**攻击原理：** 使用现代的Fetch API发送跨域请求，如果服务器配置不当，可以执行操作。

**应用场景：**
- 数据收集和窃取
- 后台操作执行
- 用户行为追踪

**攻击步骤：**
1. 使用fetch()发送POST请求
2. 设置 `credentials: 'include'` 携带Cookie
3. 如果服务器允许CORS，请求成功执行
4. 收集或修改用户数据

**防护方法：**
- 正确配置CORS策略
- 使用CSRF Token
- 验证Origin头

### 4. sendBeacon API数据收集 (navigator.sendBeacon())

**攻击原理：** sendBeacon专门用于页面卸载时发送数据，即使页面关闭也会执行。

**应用场景：**
- 页面关闭时的数据收集
- 用户行为追踪劫持
- 在用户离开时发送攻击请求

**攻击步骤：**
1. 在页面卸载事件中调用 `navigator.sendBeacon()`
2. 即使页面关闭，请求也会发送
3. 优先级高于其他请求
4. 常用于追踪用户行为

**防护方法：**
- 验证请求来源
- 限制sendBeacon端点
- 使用CSRF Token

### 5. JSONP回调劫持 (&lt;script&gt; + callback)

**攻击原理：** 劫持JSONP回调函数，窃取跨域返回的敏感数据。

**应用场景：**
- 窃取用户敏感信息（余额、邮箱等）
- 跨域数据获取
- 绕过同源策略限制

**攻击步骤：**
1. 定义恶意回调函数
2. 通过script标签加载JSONP端点
3. 服务器返回数据并调用回调函数
4. 回调函数获取敏感数据

**防护方法：**
- 验证callback参数
- 使用CORS代替JSONP
- 添加随机token验证

### 6. iframe跨域请求劫持 (iframe + form)

**攻击原理：** 在iframe中加载受害者页面，然后通过JavaScript操作表单提交。

**应用场景：**
- 绕过某些防护措施
- 隐藏攻击行为
- 跨域表单提交

**攻击步骤：**
1. 创建隐藏的iframe加载受害者页面
2. 等待iframe加载完成
3. 创建表单并提交到iframe
4. 请求携带Cookie执行操作

**防护方法：**
- 使用X-Frame-Options头防止iframe嵌入
- 使用CSRF Token
- 验证Referer头

### 7. XMLHttpRequest劫持 (XMLHttpRequest)

**攻击原理：** 使用传统的XMLHttpRequest发送AJAX请求。

**应用场景：**
- 后台操作执行
- 数据收集
- 类似Fetch API的攻击

**攻击步骤：**
1. 创建XMLHttpRequest对象
2. 设置 `withCredentials: true` 携带Cookie
3. 发送POST请求
4. 如果CORS配置不当，请求成功执行

**防护方法：**
- 正确配置CORS
- 使用CSRF Token
- 验证Origin头

### 8. Link标签CSS导入劫持 (&lt;link rel="stylesheet"&gt;)

**攻击原理：** 使用link标签导入CSS资源时发送GET请求。

**应用场景：**
- API端点探测
- 资源加载劫持
- 触发某些操作

**攻击步骤：**
1. 创建link标签，rel设置为stylesheet
2. href指向目标API端点
3. 浏览器尝试加载CSS资源
4. 即使加载失败，GET请求也已发送

**防护方法：**
- 对状态修改操作使用POST
- 验证请求类型
- 限制GET请求的操作

### 9. WebSocket连接劫持 (WebSocket)

**攻击原理：** 建立WebSocket连接发送消息，用于实时通信场景下的数据劫持。

**应用场景：**
- 实时通信劫持
- 聊天系统攻击
- 持续数据收集

**攻击步骤：**
1. 建立WebSocket连接到受害者服务器
2. 如果服务器未验证来源，连接成功
3. 发送恶意消息
4. 持续监听和劫持数据

**防护方法：**
- 验证WebSocket连接的Origin
- 使用Token认证
- 限制连接来源

### 10. EventSource/SSE劫持 (EventSource)

**攻击原理：** 利用Server-Sent Events建立连接，在实时数据流场景下进行劫持。

**应用场景：**
- 实时数据流劫持
- 通知系统攻击
- 只读数据的泄露

**攻击步骤：**
1. 创建EventSource连接到SSE端点
2. 建立持久连接接收服务器推送
3. 即使数据只读，也可能泄露敏感信息
4. 持续接收实时数据流

**防护方法：**
- 验证EventSource连接的Origin
- 限制SSE端点访问
- 过滤敏感数据

## 🛡️ 通用防护方法

### 1. CSRF Token

在表单中添加随机token，服务器验证token是否匹配：

```html
<form method="POST">
    <input type="hidden" name="csrf_token" value="随机生成的token">
    <!-- 其他表单字段 -->
</form>
```

### 2. SameSite Cookie

设置Cookie的SameSite属性，防止跨站请求携带Cookie：

```javascript
Set-Cookie: session=xxx; SameSite=Strict
```

### 3. 验证Referer/Origin头

检查请求来源，拒绝非预期的来源：

```javascript
if (req.headers.referer !== 'https://example.com') {
    return res.status(403).send('Forbidden');
}
```

### 4. 双重提交Cookie

同时使用Cookie和请求体中的token，验证两者是否匹配。

### 5. 使用POST代替GET

对状态修改操作使用POST请求，避免GET请求被轻易触发。

## 📊 攻击结果展示

在攻击者页面中，每种攻击都包含：
- **代码标签页**：展示攻击代码
- **结果标签页**：显示攻击执行结果

攻击结果会显示：
- ✅ 攻击成功：请求已发送并收到响应
- ❌ 攻击失败：可能受到CORS或其他限制
- ℹ️ 信息说明：攻击原理和影响说明

## ⚠️ 注意事项

1. **仅用于教育目的**：本系统仅用于学习Web安全，请勿用于非法用途。

2. **本地环境运行**：所有攻击都在本地环境（127.0.0.1）的不同端口间进行，确保安全可控。

3. **浏览器同源策略**：某些攻击可能因为浏览器的同源策略而无法直接获取响应，但请求可能已经发送。

4. **CORS限制**：Fetch和XHR攻击可能受到CORS限制，但某些情况下请求仍会发送。

## 🔧 技术栈

- **后端**: Node.js + Express
- **前端**: 原生HTML/CSS/JavaScript
- **服务器**: 双端口架构（受害者3000，攻击者3001）

## 📚 参考资料

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CSRF Attack](https://owasp.org/www-community/attacks/csrf)

## 📝 许可证

MIT License - 仅用于教育目的

## 👥 贡献

欢迎提交Issue和Pull Request来完善本项目。

---

**⚠️ 警告：本系统仅用于教育目的，请勿在生产环境或未经授权的系统上使用这些攻击技术。**

