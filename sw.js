// MotoLog 手機版 Service Worker（只在 HTTPS 下生效）
// 把網頁存在手機上：電腦關機、沒有訊號時照樣能從主畫面開啟並離線記錄。
// 同一份檔案用在電腦直連（網址根目錄 /）與 GitHub Pages（/motolog/）。
const CACHE = "motolog-shell";
const ROOT = new URL("./", self.registration.scope).pathname;
const SHELL = [ROOT, ROOT + "icon.png", ROOT + "icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  // 只處理本站的網頁與圖示；資料 API 與雲端同步一律直接連線
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith(ROOT + "api/")) return;
  const nav = req.mode === "navigate";
  const key = nav ? ROOT : req;
  // 先拿最新版（3 秒內沒回應就用手機上存的），拿到新版順便更新存檔
  const net = fetch(nav ? new Request(ROOT, { cache: "no-cache" }) : req).then(r => {
    if (r.ok && (nav || SHELL.includes(url.pathname))) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(key, copy));
    }
    return r;
  });
  const cached = () => caches.match(key, { ignoreSearch: true });
  e.respondWith(new Promise(resolve => {
    let done = false;
    const finish = r => { if (!done && r) { done = true; resolve(r); } };
    net.then(finish, () => cached().then(r => finish(r || Response.error())));
    setTimeout(() => cached().then(finish), 3000);
  }));
});
