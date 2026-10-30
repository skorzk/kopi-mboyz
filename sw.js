// KASIR KOPI - sw.js (service worker, supaya aplikasi bisa dibuka offline)
//
// PENTING: setiap kali kamu mengubah file aplikasi (index.html, app.js, style.css),
// naikkan nomor VERSI di bawah (misal v6 -> v7), supaya HP memuat file yang baru.
const VERSI = 'kopi-mboyz-v7';

// Daftar file yang disimpan untuk offline. Kalau menambah file baru, tulis di sini.
const FILES = [
  './', './index.html', './style.css', './app.js', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'
];

// Saat dipasang: simpan semua file ke cache (ambil versi terbaru dari server).
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI)
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Saat aktif: hapus cache versi lama.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Saat ada permintaan file: pakai cache dulu, kalau tidak ada ambil dari internet.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const salinan = res.clone();
      caches.open(VERSI).then(c => c.put(e.request, salinan));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
