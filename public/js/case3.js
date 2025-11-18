document.addEventListener('DOMContentLoaded', async () => {
  await window.CSRFDemo.syncToken('case3');
  const productList = document.getElementById('productList');
  const cartSummary = document.getElementById('cartSummary');
  const logPanel = document.getElementById('case3Log');
  const appendLog = (msg) => window.CSRFDemo.appendLog(logPanel, msg);

  const cart = new Map();

  const renderCart = () => {
    if (!cart.size) {
      cartSummary.textContent = '尚未添加商品';
      return;
    }
    let total = 0;
    const lines = [];
    cart.forEach((item) => {
      const subtotal = item.price * item.qty;
      total += subtotal;
      lines.push(`${item.name} × ${item.qty}`);
    });
    cartSummary.innerHTML = `
      <div>已选：${lines.join('， ')}</div>
      <strong>合计 ￥${total.toFixed(2)}</strong>
    `;
  };

  const renderProducts = (items) => {
    productList.innerHTML = items
      .map(
        (item) => `
        <article class="product-card">
          <div class="meta">
            <h3>${item.name}</h3>
            <span class="pill">${item.badge}</span>
          </div>
          <div class="muted">库存 ${item.stock} 件</div>
          <strong>￥${item.price}</strong>
          <button data-sku="${item.id}">加入购物车</button>
        </article>
      `
      )
      .join('');

    productList.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sku = btn.dataset.sku;
        const matched = items.find((p) => p.id === sku);
        if (!matched) return;
        const entry = cart.get(sku) || { ...matched, qty: 0 };
        entry.qty += 1;
        cart.set(sku, entry);
        appendLog(`已添加 ${matched.name}，当前数量 ${entry.qty}`);
        renderCart();
      });
    });
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('获取失败');
      const data = await res.json();
      renderProducts(data.items);
      appendLog(`商品列表已更新（${data.updatedAt}）`);
    } catch (err) {
      appendLog(`❌ 拉取商品失败：${err.message}`);
    }
  };

  const sendBeaconPayload = () => {
    const payload = {
      cart: Array.from(cart.values()).map(({ id, name, qty, price }) => ({
        id,
        name,
        qty,
        price
      })),
      total: Array.from(cart.values()).reduce((sum, item) => sum + item.price * item.qty, 0),
      triggeredAt: Date.now()
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const success = navigator.sendBeacon('/api/beacon', blob);
    appendLog(success ? '✅ sendBeacon 已发送购物车摘要' : '⚠️ 浏览器阻止 sendBeacon');
  };

  const visibilityHandler = () => {
    if (document.hidden && cart.size) {
      sendBeaconPayload();
    }
  };

  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('beforeunload', () => {
    if (cart.size) {
      sendBeaconPayload();
    }
  });

  fetchProducts();
});

