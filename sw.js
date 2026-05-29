// Service Worker for ilabshadowing
// 缓存版本 - 由构建脚本自动更新
const CACHE_VERSION = 'v3';
const CACHE_NAME = `ilabshadowing-static-${CACHE_VERSION}`;
const AUDIO_CACHE = `ilabshadowing-audio-${CACHE_VERSION}`;

// 获取当前作用域路径（处理子目录部署）
const SCOPE = self.registration ? self.registration.scope : '/';
const BASE_PATH = SCOPE.replace(/\/$/, '').split('/').slice(0, -1).join('/') || '';

// 需要缓存的静态资源（使用相对路径）
const STATIC_ASSETS = [
  './',
  './index.html',
  './js/main.js',
  './css/style.css',
  './data.json',
  './manifest.json',
  './changelog.json'
];

// 最大音频缓存数量（LRU 淘汰）
const MAX_AUDIO_CACHE = 100;

// 安装：缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Caching static assets');
      try {
        await cache.addAll(STATIC_ASSETS);
        console.log('[SW] Static assets cached');
      } catch (err) {
        console.warn('[SW] Some assets failed to cache:', err);
      }
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存 + 实现客户端通知
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          // 删除旧版本缓存
          if (name !== CACHE_NAME && name !== AUDIO_CACHE && 
              (name.startsWith('ilabshadowing-static-') || name.startsWith('ilabshadowing-audio-'))) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      // 通知所有客户端更新
      return self.clients.claim();
    })
  );
});

// 拦截请求
self.addEventListener('fetch', event => {
  const url = event.request.url;
  const requestUrl = new URL(url);
  
  // MP3 音频文件：缓存优先 + LRU 管理
  if (url.endsWith('.mp3') || requestUrl.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        
        if (cached) {
          console.log('[SW] Audio cache hit:', url);
          // 后台更新（network-first 策略）
          fetch(event.request).then(res => {
            if (res.ok) {
              cache.put(event.request, res.clone());
            }
          }).catch(() => {});
          
          return cached;
        }
        
        console.log('[SW] Audio cache miss, fetching:', url);
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            // LRU 淘汰：如果缓存太多，删除最旧的
            const keys = await cache.keys();
            if (keys.length >= MAX_AUDIO_CACHE) {
              await cache.delete(keys[0]); // 删除最旧的
            }
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          console.warn('[SW] Fetch failed:', err);
          throw err;
        }
      })
    );
    return;
  }
  
  // LRC 歌词文件：缓存优先
  if (url.endsWith('.lrc') || requestUrl.pathname.endsWith('.lrc')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            console.log('[SW] LRC cache hit:', url);
            return response;
          }
          console.log('[SW] LRC cache miss, fetching:', url);
          return fetch(event.request).then(res => {
            if (res.ok) cache.put(event.request, res);
            return res;
          });
        });
      })
    );
    return;
  }
  
  // 其他静态资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
