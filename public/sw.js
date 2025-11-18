const sendNotification = (payload) => {
  const title = payload.title || 'CSRF Demo 通知';
  const options = {
    body: payload.body || '这是一个模拟 push 通知',
    icon: '/favicon.ico',
    data: payload,
    tag: 'csrf-demo',
    renotify: true
  };
  return self.registration.showNotification(title, options);
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() || { title: '真实 Push', body: '服务器推送的数据' };
  event.waitUntil(sendNotification(payload));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'fake-push') {
    event.waitUntil(sendNotification(event.data.payload || {}));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      const target = allClients.find((client) => client.url.includes('/case4-chat.html'));
      if (target) {
        return target.focus();
      }
      return self.clients.openWindow('/case4-chat.html');
    })()
  );
});

