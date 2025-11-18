const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 8080;

const sessions = new Map();
const sseClients = new Map();
let sseCounter = 0;

const mockProducts = [
  {
    id: 'sku-1',
    name: '超轻量安全鼠标',
    price: 199,
    stock: 12,
    badge: '限时折扣'
  },
  {
    id: 'sku-2',
    name: '零信任笔记本支架',
    price: 299,
    stock: 5,
    badge: '热销'
  },
  {
    id: 'sku-3',
    name: '抗窥屏幕膜',
    price: 89,
    stock: 25,
    badge: '新品'
  }
];

const recentBeacons = [];

const getOrCreateToken = (caseId) => {
  if (!sessions.has(caseId)) {
    sessions.set(caseId, uuidv4().replace(/-/g, ''));
  }
  return sessions.get(caseId);
};

const broadcastSse = (payload) => {
  const serialized = `data: ${JSON.stringify(payload)}\n\n`;
  for (const [, client] of sseClients) {
    client.res.write(serialized);
  }
};

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

app.get('/api/session/:caseId', (req, res) => {
  const { caseId } = req.params;
  const token = getOrCreateToken(caseId);
  res.cookie(`${caseId}Token`, token, {
    httpOnly: false,
    sameSite: 'Lax',
    maxAge: 1000 * 60 * 60 * 2
  });
  res.json({ caseId, token });
});

app.get('/api/products', (req, res) => {
  res.json({
    updatedAt: new Date().toISOString(),
    items: mockProducts
  });
});

app.post('/api/beacon', (req, res) => {
  const payload = {
    ...req.body,
    receivedAt: new Date().toISOString()
  };
  recentBeacons.push(payload);
  if (recentBeacons.length > 20) {
    recentBeacons.shift();
  }
  console.log('[Beacon]', payload);
  res.status(204).end();
});

app.get('/api/beacon/logs', (req, res) => {
  res.json({
    count: recentBeacons.length,
    logs: recentBeacons
  });
});

app.get('/api/sse', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders?.();

  const clientId = ++sseCounter;
  sseClients.set(clientId, { res });
  res.write(`data: ${JSON.stringify({ type: 'connected', id: clientId })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

app.post('/api/chat/system', (req, res) => {
  const message = req.body?.message || '服务器通知：保持警惕，防止 CSRF！';
  broadcastSse({
    type: 'system_broadcast',
    message,
    createdAt: Date.now()
  });
  res.json({ delivered: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const wsClients = new Map();

const broadcastWs = (data) => {
  const serialized = JSON.stringify(data);
  for (const [id, client] of wsClients) {
    if (client.readyState === 1) {
      client.send(serialized);
    } else {
      wsClients.delete(id);
    }
  }
};

wss.on('connection', (socket, req) => {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const user = searchParams.get('user') || `访客-${Math.floor(Math.random() * 1000)}`;
  const userId = uuidv4();

  wsClients.set(userId, socket);

  broadcastWs({
    type: 'presence',
    action: 'join',
    user,
    userId,
    at: Date.now()
  });

  socket.on('message', (raw) => {
    let payload = String(raw);
    try {
      const data = JSON.parse(payload);
      payload = data;
    } catch (err) {
      payload = { raw: payload };
    }
    broadcastWs({
      type: 'chat',
      user,
      userId,
      at: Date.now(),
      message: payload.message || payload.raw || ''
    });
  });

  socket.on('close', () => {
    wsClients.delete(userId);
    broadcastWs({
      type: 'presence',
      action: 'leave',
      user,
      userId,
      at: Date.now()
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
