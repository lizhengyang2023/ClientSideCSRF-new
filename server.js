const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

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
victimApp.use(express.static('public'));

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

// 受害者服务器启动在端口3000
victimApp.listen(3000, () => {
    console.log('✅ 受害者服务器运行在 http://127.0.0.1:3000');
    console.log('   受害者页面: http://127.0.0.1:3000/victim.html');
});

// 攻击者服务器启动在端口3001
attackerApp.listen(3001, () => {
    console.log('✅ 攻击者服务器运行在 http://127.0.0.1:3001');
    console.log('   攻击者页面: http://127.0.0.1:3001/attacker.html');
});

console.log('\n📌 请确保先安装依赖: npm install');
console.log('📌 然后访问攻击者页面开始演示\n');
