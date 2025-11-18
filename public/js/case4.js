document.addEventListener('DOMContentLoaded', async () => {
  await window.CSRFDemo.syncToken('case4');
  const logPanel = document.getElementById('case4Log');
  const appendLog = (msg) => window.CSRFDemo.appendLog(logPanel, msg);
  const messages = document.getElementById('messages');
  const chatInput = document.getElementById('chatInput');
  const nickname = document.getElementById('nickname');

  const pushState = {
    registration: null
  };

  const renderMessage = (payload) => {
    const node = document.createElement('div');
    node.className = `message ${payload.type === 'system' ? 'system' : ''}`;
    node.innerHTML = `<strong>${payload.user || payload.title}</strong>：${payload.message}`;
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
  };

  // WebSocket
  let socket;
  const connectWs = () => {
    const name = nickname.value.trim() || `访客-${Math.floor(Math.random() * 1000)}`;
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?user=${encodeURIComponent(name)}`;
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      appendLog('✅ WebSocket 连接已建立');
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
          renderMessage({ user: data.user, message: data.message });
        } else if (data.type === 'presence') {
          renderMessage({
            type: 'system',
            title: '系统',
            message: `${data.user} ${data.action === 'join' ? '加入' : '离开'}了房间`
          });
        }
      } catch {
        appendLog(`无法解析消息：${event.data}`);
      }
    });

    socket.addEventListener('close', () => {
      appendLog('⚠️ WebSocket 断开，3 秒后重连');
      setTimeout(connectWs, 3000);
    });
  };

  connectWs();

  const sendChat = () => {
    const text = chatInput.value.trim();
    if (!text || socket.readyState !== WebSocket.OPEN) {
      appendLog('⚠️ 无法发送：内容为空或连接未建立');
      return;
    }
    socket.send(JSON.stringify({ message: text }));
    chatInput.value = '';
  };

  document.getElementById('sendBtn').addEventListener('click', sendChat);
  chatInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      sendChat();
    }
  });

  // SSE
  const eventSource = new EventSource('/api/sse');
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'system_broadcast') {
      renderMessage({ type: 'system', title: 'SSE 广播', message: data.message });
    }
    appendLog(`SSE 收到：${event.data}`);
  };
  eventSource.onerror = () => {
    appendLog('❌ SSE 连接异常，浏览器会自动重试。');
  };

  document.getElementById('triggerBroadcast').addEventListener('click', async () => {
    await fetch('/api/chat/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '手动触发的系统广播：谨防跨站请求劫持。' })
    });
    appendLog('已触发 SSE 系统广播');
  });

  // Push 模拟
  const ensureServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      appendLog('当前浏览器不支持 Service Worker，无法模拟 push。');
      return null;
    }
    if (!pushState.registration) {
      pushState.registration = await navigator.serviceWorker.register('/sw.js');
      appendLog('Service Worker 已注册');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      appendLog('通知权限被拒绝。');
      return null;
    }
    return pushState.registration;
  };

  const simulatePush = async () => {
    const registration = await ensureServiceWorker();
    if (!registration) return;
    const payload = {
      title: '模拟推送',
      body: `来自 ${nickname.value || '匿名用户'} 的安全提示`,
      at: Date.now()
    };
    registration.active?.postMessage({ type: 'fake-push', payload });
    appendLog('已向 Service Worker 发送模拟 push 消息');
  };

  document.getElementById('simulatePush').addEventListener('click', simulatePush);
});

