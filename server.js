const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

// 创建多个Express应用实例（模拟不同端口的服务）
const victimApp = express();
const attackerApp = express();

// 中间件配置
victimApp.use(cors());
// 注意：bodyParser中间件的顺序很重要
// sendBeacon发送application/json时，需要先用text解析，然后再用json解析
victimApp.use(bodyParser.urlencoded({ extended: true }));
victimApp.use(bodyParser.json());
victimApp.use(bodyParser.text({ type: 'text/*' })); // 处理text类型
victimApp.use(cookieParser('secret-key')); // 用于签名Cookie（CSRF保护需要）
victimApp.use(express.static('public'));

// 初始化CSRF保护（用于CS-CSRF演示）
// cookie: true 表示将Secret存储在Cookie中（双重提交Cookie模式）
const csrfProtection = csrf({ cookie: true });

attackerApp.use(cors());
attackerApp.use(express.static('public'));

// 受害者服务器API端点（端口3000）
// 模拟用户账户操作
let userBalance = 1000;
let userEmail = 'user@example.com';
let transferHistory = [];

victimApp.get('/api/user/info', (req, res) => {
    res.json({
        balance: userBalance,
        email: userEmail,
        message: '用户信息获取成功'
    });
});

// GET请求端点 - 用于演示图片标签攻击
victimApp.get('/api/user/action', (req, res) => {
    const action = req.query.action;
    console.log(`[受害者服务器] GET请求被劫持: action=${action}, from=${req.headers.referer || 'unknown'}`);
    res.json({
        success: true,
        message: `执行操作: ${action}`,
        timestamp: new Date().toISOString()
    });
});

// POST请求端点 - 用于演示表单劫持
victimApp.post('/api/transfer', (req, res) => {
    const { to, amount } = req.body;
    console.log(`[受害者服务器] POST转账请求被劫持: 转账给 ${to}, 金额 ${amount}, from=${req.headers.referer || 'unknown'}`);
    
    if (amount && amount > 0) {
        userBalance -= parseFloat(amount);
        transferHistory.push({ to, amount, timestamp: new Date().toISOString() });
        res.json({
            success: true,
            message: `成功转账 ${amount} 给 ${to}`,
            newBalance: userBalance
        });
    } else {
        res.status(400).json({ success: false, message: '无效的转账请求' });
    }
});

// POST请求端点 - 更新邮箱
victimApp.post('/api/user/update-email', (req, res) => {
    const { email } = req.body;
    console.log(`[受害者服务器] 邮箱更新请求被劫持: ${email}, from=${req.headers.referer || 'unknown'}`);
    userEmail = email;
    res.json({
        success: true,
        message: `邮箱已更新为: ${email}`
    });
});

// POST请求端点 - 删除账户
victimApp.post('/api/user/delete', (req, res) => {
    console.log(`[受害者服务器] 删除账户请求被劫持, from=${req.headers.referer || 'unknown'}`);
    res.json({
        success: true,
        message: '账户删除请求已接收'
    });
});

// 接收sendBeacon数据 - sendBeacon可能发送Blob/文本/JSON数据
victimApp.post('/api/tracking', express.raw({ type: '*/*' }), (req, res) => {
    let data;
    try {
        // sendBeacon发送的是Blob，需要转换为字符串
        const bodyStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
        // 尝试解析JSON
        if (bodyStr.trim().startsWith('{') || bodyStr.trim().startsWith('[')) {
            data = JSON.parse(bodyStr);
        } else {
            data = bodyStr;
        }
    } catch (e) {
        // 如果解析失败，使用原始字符串
        data = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
    }
    console.log(`[受害者服务器] sendBeacon数据接收:`, data, `from=${req.headers.referer || 'unknown'}`);
    res.status(204).send();
});

// 接收fetch请求数据
victimApp.post('/api/data/collect', (req, res) => {
    console.log(`[受害者服务器] fetch数据收集:`, req.body);
    res.json({
        success: true,
        message: '数据已收集',
        received: req.body
    });
});

// WebSocket消息接收（通过POST模拟）
victimApp.post('/api/websocket/message', (req, res) => {
    console.log(`[受害者服务器] WebSocket消息:`, req.body);
    res.json({
        success: true,
        message: '消息已接收'
    });
});

// JSONP回调端点
victimApp.get('/api/user/jsonp', (req, res) => {
    const callback = req.query.callback || 'callback';
    const data = {
        balance: userBalance,
        email: userEmail,
        secret: 'sensitive_data_12345'
    };
    res.type('application/javascript');
    res.send(`${callback}(${JSON.stringify(data)});`);
});

// 重置状态端点（用于演示）
victimApp.post('/api/reset', (req, res) => {
    userBalance = 1000;
    userEmail = 'user@example.com';
    transferHistory = [];
    res.json({ success: true, message: '状态已重置' });
});

// 获取转账历史
victimApp.get('/api/transfer/history', (req, res) => {
    res.json({
        success: true,
        history: transferHistory
    });
});

// ========== CS-CSRF 攻击演示相关端点 ==========
// 这些端点使用CSRF Token保护，但客户端代码存在漏洞，可以绕过保护

// 受CSRF保护的转账API（CS-CSRF演示用）
victimApp.post('/api/csrf-protected/transfer', csrfProtection, (req, res) => {
    const { to, amount } = req.body;
    console.log(`[CS-CSRF受害者服务器] 受保护的转账请求: 转账给 ${to}, 金额 ${amount}, from=${req.headers.referer || 'unknown'}`);
    
    if (amount && amount > 0) {
        userBalance -= parseFloat(amount);
        transferHistory.push({ to, amount, timestamp: new Date().toISOString(), type: 'csrf-protected' });
        res.json({
            success: true,
            message: `成功转账 ${amount} 给 ${to}（CSRF保护已通过）`,
            newBalance: userBalance
        });
    } else {
        res.status(400).json({ success: false, message: '无效的转账请求' });
    }
});

// 受CSRF保护的删除账户API
victimApp.post('/api/csrf-protected/delete', csrfProtection, (req, res) => {
    console.log(`[CS-CSRF受害者服务器] 受保护的删除账户请求, from=${req.headers.referer || 'unknown'}`);
    res.json({
        success: true,
        message: '账户删除请求已接收（CSRF保护已通过）'
    });
});

// 受CSRF保护的更新邮箱API
victimApp.post('/api/csrf-protected/update-email', csrfProtection, (req, res) => {
    const { email } = req.body;
    console.log(`[CS-CSRF受害者服务器] 受保护的邮箱更新请求: ${email}, from=${req.headers.referer || 'unknown'}`);
    userEmail = email;
    res.json({
        success: true,
        message: `邮箱已更新为: ${email}（CSRF保护已通过）`
    });
});

// 有漏洞的受害者页面 - 需要CSRF Token
victimApp.get('/vulnerable.html', csrfProtection, (req, res, next) => {
    // 创建一个临时的HTML页面，包含CSRF Token
    const token = req.csrfToken();
    res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="${token}">
    <title>有漏洞的受害者页面 - CS-CSRF演示</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 40px;
        }
        h1 {
            color: #2d3436;
            margin-bottom: 10px;
            text-align: center;
        }
        .warning {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            color: #856404;
        }
        .info-box {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        .result-box {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            min-height: 100px;
        }
        .result-box h3 {
            color: #0984e3;
            margin-bottom: 15px;
        }
        .result-content {
            font-family: 'Courier New', monospace;
            background: #2d3436;
            color: #ddd;
            padding: 15px;
            border-radius: 8px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .vulnerability-info {
            background: #ffe6e6;
            border-left: 4px solid #ff4757;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .vulnerability-info h3 {
            color: #c92a2a;
            margin-bottom: 10px;
        }
        .code-snippet {
            background: #2d3436;
            color: #ddd;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            margin: 10px 0;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ 有漏洞的受害者页面 - CS-CSRF演示</h1>
        <p style="text-align: center; color: #636e72; margin-bottom: 20px;">
            此页面包含客户端请求伪造漏洞，即使服务器有CSRF Token保护也能被绕过
        </p>
        <div class="warning">
            <strong>⚠️ 警告</strong>
            本页面仅用于教育目的，展示CS-CSRF漏洞。即使服务器使用了CSRF Token保护，
            客户端代码的漏洞仍然可以被利用。
        </div>
        <div class="vulnerability-info">
            <h3>🔍 漏洞分析</h3>
            <p><strong>漏洞类型：</strong>Client-Side Request Forgery (CS-CSRF)</p>
            <p><strong>漏洞原理：</strong></p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li><strong>Source（漏洞源头）：</strong>window.location.search - 不受信任的URL参数</li>
                <li><strong>Propagator（数据传播）：</strong>URL参数被直接复制到请求Body</li>
                <li><strong>Sink（漏洞汇点）：</strong>fetch()函数使用动态构建的URL和参数</li>
                <li><strong>Authentication（认证混淆）：</strong>客户端代码自动读取并添加CSRF Token</li>
            </ul>
            <div class="code-snippet">
// 【漏洞代码】根据URL参数动态调用API
const params = new URLSearchParams(window.location.search);
if (params.has('action')) {
    const action = params.get('action');
    const payload = {};
    for (const [key, value] of params) {
        if (key !== 'action') {
            payload[key] = value;
        }
    }
    // 自动读取CSRF Token（混淆代理）
    const token = document.querySelector('meta[name="csrf-token"]').content;
    fetch(\`/api/csrf-protected/\${action}\`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': token  // Token被自动添加！
        },
        body: JSON.stringify(payload)
    });
}
            </div>
        </div>
        <div class="info-box">
            <h3>📋 攻击流程说明</h3>
            <ol style="margin-left: 20px; margin-top: 10px; line-height: 1.8;">
                <li>攻击者构造恶意URL：<code>http://127.0.0.1:3000/vulnerable.html?action=transfer&to=attacker@evil.com&amount=1000</code></li>
                <li>用户点击链接，浏览器加载页面</li>
                <li>服务器生成合法的CSRF Token并嵌入HTML</li>
                <li>客户端JS解析URL参数，提取action和payload</li>
                <li>客户端JS自动读取CSRF Token</li>
                <li>客户端JS发送POST请求，Token被自动添加到请求头</li>
                <li>服务器验证Token（合法！），请求成功执行</li>
                <li>攻击完成，CSRF保护被绕过！</li>
            </ol>
        </div>
        <div class="result-box">
            <h3>📊 操作结果</h3>
            <div id="result" class="result-content">等待操作...如果URL中包含action参数，页面加载时会自动执行。</div>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            const resultDiv = document.getElementById('result');
            
            if (params.has('action')) {
                const action = params.get('action');
                resultDiv.textContent = \`[检测到URL参数] action=\${action}\\n正在构造请求...\`;
                
                const payload = {};
                for (const [key, value] of params) {
                    if (key !== 'action') {
                        payload[key] = value;
                    }
                }
                
                let token = '';
                try {
                    const tokenMeta = document.querySelector('meta[name="csrf-token"]');
                    if (tokenMeta) {
                        token = tokenMeta.content;
                        resultDiv.textContent += \`\\n[获取CSRF Token] Token已自动读取: \${token.substring(0, 20)}...\`;
                    } else {
                        resultDiv.textContent += \`\\n[警告] 未找到CSRF Token，请求可能会失败\`;
                    }
                } catch (e) {
                    resultDiv.textContent += \`\\n[错误] 无法读取CSRF Token: \${e.message}\`;
                }
                
                resultDiv.textContent += \`\\n[发送请求] POST /api/csrf-protected/\${action}\`;
                resultDiv.textContent += \`\\n[请求Body] \${JSON.stringify(payload, null, 2)}\`;
                
                fetch(\`/api/csrf-protected/\${action}\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': token
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    resultDiv.textContent += \`\\n[响应状态] \${response.status} \${response.statusText}\`;
                    return response.json();
                })
                .then(data => {
                    resultDiv.textContent += \`\\n\\n✅ 请求成功！\\n响应数据：\\n\${JSON.stringify(data, null, 2)}\`;
                    resultDiv.textContent += \`\\n\\n⚠️ CSRF保护已被绕过！即使服务器有Token保护，攻击仍然成功！\`;
                })
                .catch(err => {
                    resultDiv.textContent += \`\\n\\n❌ 请求失败：\${err.message}\`;
                    resultDiv.textContent += \`\\n这可能是由于：\\n1. Token验证失败\\n2. 网络错误\\n3. 端点不存在\`;
                });
            } else {
                resultDiv.textContent = '页面已加载。\\n\\n提示：如果URL中包含action参数，会自动执行API调用。\\n例如：?action=transfer&to=attacker@evil.com&amount=1000\\n\\n这是典型的CS-CSRF漏洞：客户端代码根据URL参数动态调用API，并自动添加CSRF Token，使得攻击者可以通过构造URL来执行未授权的操作。';
            }
        });
    </script>
</body>
</html>
    `);
});

// 受害者服务器启动在端口3000
victimApp.listen(3000, () => {
    console.log('✅ 受害者服务器运行在 http://127.0.0.1:3000');
    console.log('   受害者页面: http://127.0.0.1:3000/victim.html');
    console.log('   有漏洞的受害者页面: http://127.0.0.1:3000/vulnerable.html');
});

// 攻击者服务器启动在端口3001
attackerApp.listen(3001, () => {
    console.log('✅ 攻击者服务器运行在 http://127.0.0.1:3001');
    console.log('   攻击者页面: http://127.0.0.1:3001/attacker.html');
});

console.log('\n📌 请确保先安装依赖: npm install');
console.log('📌 然后访问攻击者页面开始演示\n');
