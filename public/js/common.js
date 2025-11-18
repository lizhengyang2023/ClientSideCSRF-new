(() => {
  const baseUrl = '';

  async function syncToken(caseId) {
    try {
      const res = await fetch(`${baseUrl}/api/session/${caseId}`);
      if (!res.ok) throw new Error('无法获取 token');
      const data = await res.json();
      const badge = document.querySelector('[data-token]');
      if (badge) {
        badge.textContent = data.token;
      }
      return data.token;
    } catch (err) {
      console.error(err);
      const badge = document.querySelector('[data-token]');
      if (badge) {
        badge.textContent = '获取失败';
      }
      return null;
    }
  }

  function appendLog(target, message) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const timestamp = new Date().toLocaleTimeString();
    el.textContent = `[${timestamp}] ${message}\n${el.textContent}`.slice(0, 4000);
  }

  window.CSRFDemo = {
    syncToken,
    appendLog
  };
})();

