// 为了解决目前看到的 CORS 和 Fetch 报错，暂时清空 Service Worker 逻辑
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
// 不进行任何 fetch 拦截