const CACHE_NAME = 'ashare-quant-v2';

// 动态获取基础路径，适应 GitHub Pages 的仓库名子目录
const BASE_PATH = self.location.pathname.replace('sw.js', '');

const ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/lucide-react@^0.562.0'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 优先从缓存获取，如果失败则从网络获取
      return response || fetch(event.request);
    })
  );
});