# Step1 网页结构搭建
网页结构：
1. 使用统一的.css作为样式；
2. 建立一个主页，从主页可以导航到以下几个应用页面：
    - case1 第三方登录与注册（含有window.open()方法）的网页，让这个方法可以修改参数（比如“选择或输入你想要使用的认证网站”）
    - case2 输入链接，打开新网页（含有Location url）的搜索引擎网页
    - case3 使用 fetch API 加载数据，并在关闭或回退页面时触发 sendBeacon 发送数据的购物网页
    - case4 使用 push， Event Source 和 websocket 的聊天应用
3. 上述网页需要各存储一个 cookie token
4. 实现逻辑清晰易懂
5. 上述提到的 API 参考 CSRF-related-APIs.md

# Step2 