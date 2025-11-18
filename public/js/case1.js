document.addEventListener('DOMContentLoaded', async () => {
  await window.CSRFDemo.syncToken('case1');
  const logPanel = document.getElementById('case1Log');

  const provider = document.getElementById('provider');
  const clientId = document.getElementById('clientId');
  const redirect = document.getElementById('redirect');
  const scope = document.getElementById('scope');
  const state = document.getElementById('state');
  const preview = document.getElementById('preview');

  const appendLog = (msg) => window.CSRFDemo.appendLog(logPanel, msg);

  const buildAuthUrl = () => {
    const providerMap = {
      github: 'https://github.com/login/oauth/authorize',
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      wechat: 'https://open.weixin.qq.com/connect/qrconnect',
      custom: clientId.value.startsWith('http') ? clientId.value : 'https://attacker.example/auth'
    };
    const base = providerMap[provider.value] || providerMap.github;
    const qs = new URLSearchParams({
      client_id: clientId.value,
      redirect_uri: redirect.value,
      response_type: 'code',
      scope: scope.value,
      state: state.value
    });
    return `${base}?${qs.toString()}`;
  };

  const refreshPreview = () => {
    const url = buildAuthUrl();
    preview.value = url;
    appendLog(`预览 URL：${url}`);
  };

  document.getElementById('previewBtn').addEventListener('click', refreshPreview);

  document.getElementById('openBtn').addEventListener('click', () => {
    const url = buildAuthUrl();
    const features = 'width=520,height=640,noopener=yes';
    const opened = window.open(url, 'oauthWindow', features);
    if (opened) {
      appendLog(`已使用 window.open 打开新窗口：${url}`);
    } else {
      appendLog('⚠️ 浏览器阻止了弹窗，请允许 window.open。');
    }
  });

  refreshPreview();
});

