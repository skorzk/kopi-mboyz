# Kasir Kopi (PWA)

## Isi folder
| File | Fungsi | Kapan diedit |
|---|---|---|
| index.html | Kerangka halaman (popup Edit, menu bawah) | jarang |
| style.css | Warna, ukuran, tampilan | ganti warna/tema |
| app.js | Semua logika: hitungan, tampilan, WhatsApp, database | ubah fitur/teks |
| sw.js | Cache untuk offline | naikkan VERSI tiap update |
| manifest.json | Nama & ikon aplikasi saat diinstal | ganti nama/warna |
| icon-*.png | Ikon aplikasi | ganti gambar |

## Yang sering diubah (cari di app.js)
- Menu & harga awal: `MENU_AWAL` (paling atas)
- Nomor WhatsApp tujuan: `NOMOR_WA` (paling atas)
- Isi pesan WhatsApp: fungsi `reportText`
- Rumus hitungan: fungsi `calc`
- Warna: bagian `:root` di style.css

## Cara update di GitHub
1. Edit file di teks editor, simpan.
2. Kalau mengubah index.html / app.js / style.css: ubah `VERSI` di sw.js (v5 jadi v6).
3. Di repo: Add file > Upload files > pilih file yang berubah > Commit.
4. Tunggu 1-2 menit, buka aplikasi, tutup, buka lagi sekali.

## Tes di komputer
Jangan klik ganda index.html untuk mode offline. Jalankan server lokal:
`python3 -m http.server 8000` lalu buka http://localhost:8000

## Data
Disimpan di IndexedDB browser (database `kasirkopi`). Pakai tab Riwayat > Unduh file cadangan.
