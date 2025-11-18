document.addEventListener('DOMContentLoaded', async () => {
  await window.CSRFDemo.syncToken('case2');
  const logPanel = document.getElementById('case2Log');
  const appendLog = (msg) => window.CSRFDemo.appendLog(logPanel, msg);

  const engine = document.getElementById('engine');
  const query = document.getElementById('query');
  const directUrl = document.getElementById('directUrl');

  const buildSearch = () => {
    const prefix = engine.value;
    return `${prefix}${encodeURIComponent(query.value.trim())}`;
  };

  const navigate = (url, mode = 'assign') => {
    if (!url) {
      appendLog('⚠️ 请输入内容');
      return;
    }
    appendLog(`准备以 ${mode} 打开：${url}`);
    setTimeout(() => {
      if (mode === 'replace') {
        location.replace(url);
      } else {
        location.assign(url);
      }
    }, 600);
  };

  document.getElementById('assignSearch').addEventListener('click', () => {
    navigate(buildSearch(), 'assign');
  });

  document.getElementById('replaceSearch').addEventListener('click', () => {
    navigate(buildSearch(), 'replace');
  });

  document.getElementById('openSelf').addEventListener('click', () => {
    const url = directUrl.value.trim();
    if (!url) {
      appendLog('⚠️ 请输入完整 URL');
      return;
    }
    appendLog(`location.href 即将跳转到：${url}`);
    setTimeout(() => {
      location.href = url;
    }, 800);
  });

  document.getElementById('openNew').addEventListener('click', () => {
    const url = directUrl.value.trim();
    if (!url) {
      appendLog('⚠️ 请输入完整 URL');
      return;
    }
    const win = window.open(url, '_blank', 'noopener=yes');
    appendLog(win ? `已在新标签打开：${url}` : '浏览器阻止了弹窗');
  });
});

