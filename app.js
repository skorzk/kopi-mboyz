/* =====================================================================
   KASIR KOPI - app.js
   Semua logika aplikasi ada di file ini.
   Cara cari bagian yang mau diubah: cari judul "=====" di bawah.
   ===================================================================== */

// ===== PENGATURAN (boleh diubah) =====

// Menu awal saat aplikasi pertama kali dibuka (id harus unik).
// Menu juga bisa diubah dari tab "Menu" di dalam aplikasi.
const MENU_AWAL = [
  { id: 'm1', name: 'barang_1', price: 10000 },
  { id: 'm2', name: 'barang_2', price: 12000 }
];

// Nama database di browser. JANGAN diganti kalau sudah ada data,
// kalau diganti, data lama tidak akan terbaca.
const NAMA_DB = 'kasirkopi';

// Nomor tujuan WhatsApp. Kosongkan untuk memilih kontak sendiri,
// atau isi format internasional tanpa + (contoh: '6281234567890').
const NOMOR_WA = '';


// ===== ALAT BANTU =====
// $ = ambil elemen HTML; esc = amankan teks; uid = id acak; fmt = format rupiah; today = tanggal hari ini (YYYY-MM-DD)
const $ = s => document.querySelector(s);
const esc = x => String(x).replace(/[&<>"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = n => 'Rp ' + (Math.round(n) || 0).toLocaleString('id-ID');
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
// Data utama aplikasi (disimpan ke IndexedDB oleh save())
let S = {
  menu: MENU_AWAL.map(m => ({ ...m })),   // daftar menu + harga
  days: {},                               // data per tanggal
  prof: { nama: '', lokasi: '', shift: '' }
};
let cur = today();   // tanggal yang sedang dibuka
let tab = 'h';       // tab aktif: h = Hari ini, m = Menu, r = Riwayat


// ===== DATABASE (IndexedDB) =====
// idb() membuka database, load() membaca data saat aplikasi dibuka, save() menyimpan setiap ada perubahan.
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(NAMA_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function load() {
  try {
    const d = await idb();
    return await new Promise(res => {
      const q = d.transaction('kv').objectStore('kv').get('s');
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(null);
    });
  } catch (e) {
    return null;
  }
}
async function save() {
  try {
    const d = await idb();
    d.transaction('kv', 'readwrite').objectStore('kv').put(S, 's');
  } catch (e) {
  }
}

// Kecilkan foto bukti QRIS (maks 900px, JPEG) supaya hemat penyimpanan.
function shrink(f) {
  return new Promise(res => {
    const im = new Image(), u = URL.createObjectURL(f);
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = im.width * k;
      c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      res(c.toDataURL('image/jpeg', 0.7));
    };
    im.src = u;
  });
}

// ===== HITUNGAN =====
// D() = data hari yang sedang dibuka (dibuat otomatis kalau belum ada).
const D = (k = cur) => S.days[k] || (S.days[k] = {
  cups: 0,
  sales: {},
  pays: []
});

// calc(d) menghitung: terjual, sisa cup, total seharusnya, total QRIS, dan tunai.
// Rumus tunai = total seharusnya - total QRIS.
function calc(d) {
  let sold = 0, exp = 0;
  for (const k in d.sales) {
    sold += d.sales[k].q;
    exp += d.sales[k].q * d.sales[k].p;
  }
  const qris = d.pays.reduce((a, p) => a + (+p.amt || 0), 0);
  return {
    sold,
    exp,
    qris,
    sisa: d.cups - sold,
    tunai: exp - qris
  };
}

// ===== TAMPILAN (HTML dibuat lewat JavaScript) =====
// head() = judul + tombol Edit di pojok kanan atas.
function head(t) {
  const P = S.prof || {};
  const x = [
    P.nama,
    P.lokasi,
    P.shift
  ].filter(Boolean).join(' \xB7 ');
  return `<div class="r" style="align-items:flex-start"><div><h1 style="margin-bottom:2px">${ t }</h1>${ x ? `<div class="mut">${ esc(x) }</div>` : '' }</div><button data-a="prof">Edit</button></div>`;
}

// Tab "Hari ini": cup, tombol +/- penjualan, bukti QRIS, hitungan uang.
function viewH() {
  const d = D(), t = calc(d);
  const rows = S.menu.map(m => ({
    id: m.id,
    n: m.name,
    p: m.price
  }));
  for (const k in d.sales)
    if (!S.menu.find(m => m.id === k))
      rows.push({
        id: k,
        n: d.sales[k].n + ' (dihapus)',
        p: d.sales[k].p
      });
  return `${ head('\u2615 Kopi Mboyz') }
<div class="c"><input type="date" value="${ cur }" data-c="date"></div>
<div class="c"><h2>Cup</h2>
<div class="r"><span>Cup dibawa</span><input type="number" inputmode="numeric" min="0" style="width:110px" value="${ d.cups || '' }" placeholder="0" data-c="cups"></div>
<div class="r"><span>Cup terjual</span><b>${ t.sold }</b></div>
<div class="r tot"><span>Sisa cup (dibawa pulang)</span><span class="big ${ t.sisa < 0 ? 'bad' : '' }">${ t.sisa }</span></div>
${ t.sisa < 0 ? '<div class="bad mut">Terjual lebih banyak dari cup yang dibawa, cek lagi.</div>' : '' }</div>
<div class="c"><h2>Kopi terjual</h2>
${ rows.map(r => {
    const q = d.sales[r.id]?.q || 0;
    return `<div class="r"><div><b>${ esc(r.n) }</b><div class="mut">${ fmt(r.p) }</div></div>
<div class="r" style="margin:0"><button class="q" data-a="dec" data-id="${ r.id }">−</button><span class="n">${ q }</span><button class="q" data-a="inc" data-id="${ r.id }">+</button></div></div>`;
  }).join('') || '<div class="mut">Belum ada menu. Tambah di tab Menu.</div>' }
</div>
<div class="c"><h2>Bukti QRIS</h2>
${ d.pays.map(p => `<div class="r"><img class="th" src="${ p.img }" data-a="view" data-id="${ p.id }" alt="Bukti">
<div style="flex:1"><input type="number" inputmode="numeric" placeholder="Nominal" value="${ p.amt || '' }" data-c="pamt" data-id="${ p.id }"><input placeholder="Catatan" value="${ esc(p.note || '') }" data-c="pnote" data-id="${ p.id }" style="margin-top:6px"></div>
<button class="g" data-a="delpay" data-id="${ p.id }">Hapus</button></div>`).join('') }
<label><input type="file" accept="image/*" data-c="file" style="display:none"><div class="r"><button style="width:100%" data-a="pick">+ Tambah screenshot bukti</button></div></label></div>
<div class="c"><h2>Hitungan uang</h2>
<div class="r"><span>Seharusnya didapat</span><span class="big">${ fmt(t.exp) }</span></div>
<div class="r"><span>Masuk lewat QRIS</span><b>${ fmt(t.qris) }</b></div>
<div class="r tot"><span>Uang tunai yang harus ada</span><span class="big ${ t.tunai < 0 ? 'bad' : 'ok' }">${ fmt(t.tunai) }</span></div>
${ t.tunai < 0 ? '<div class="bad mut">Total QRIS lebih besar dari penjualan, cek nominal.</div>' : '' }</div>`;
}

// Tab "Menu": ubah nama/harga, tambah, hapus menu.
function viewM() {
  return `${ head('Menu &amp; Harga') }
<div class="c">${ S.menu.map(m => `<div class="r"><input value="${ esc(m.name) }" data-c="mname" data-id="${ m.id }"><input type="number" inputmode="numeric" style="width:120px" value="${ m.price }" data-c="mprice" data-id="${ m.id }"><button class="g" data-a="delmenu" data-id="${ m.id }">✕</button></div>`).join('') }</div>
<div class="c"><h2>Tambah menu</h2><div class="r"><input id="nn" placeholder="Nama"><input id="np" type="number" inputmode="numeric" placeholder="Harga" style="width:120px"></div><button data-a="addmenu" style="width:100%">Tambah</button></div>`;
}

// Tab "Riwayat": daftar hari yang sudah tercatat + tombol WhatsApp.
function viewR0() {
  const ks = Object.keys(S.days).filter(k => {
    const d = S.days[k];
    return d.cups || d.pays.length || Object.keys(d.sales).length;
  }).sort().reverse();
  return `${ head('Riwayat') }${ ks.map(k => {
    const t = calc(S.days[k]);
    return `<div class="c"><div class="r"><b>${ k }</b><button class="g" data-a="delday" data-id="${ k }">Hapus</button></div>
<div class="mut">Terjual ${ t.sold } · sisa cup ${ t.sisa }</div><div class="r"><span>Total</span><b>${ fmt(t.exp) }</b></div><div class="r"><span>QRIS / Tunai</span><span>${ fmt(t.qris) } / ${ fmt(t.tunai) }</span></div>
<div class="r"><button data-a="open" data-id="${ k }" style="flex:1">Buka</button><button data-a="wa" data-id="${ k }" aria-label="Kirim ke WhatsApp" title="Kirim ke WhatsApp" style="display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></button></div></div>`;
  }).join('') || '<div class="c mut">Belum ada data.</div>' }`;
}

// viewR() = Riwayat + kartu cadangan data.
function viewR() {
  return viewR0() + `<div class="c"><h2>Cadangan data</h2><div class="mut" style="margin-bottom:8px">Data tersimpan di HP ini saja. Simpan cadangan secara berkala.</div>
<button style="width:100%;margin-bottom:8px" data-a="exp">Unduh file cadangan</button>
<button class="g" style="width:100%" data-a="impick">Pulihkan dari file cadangan</button>
<input type="file" id="imp" accept=".json,application/json" data-c="imp" style="display:none"></div>`;
}

// ===== CADANGAN DATA =====
// Unduh semua data jadi file .json.
async function backup(share) {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const f = new File([blob], 'coffee-mboyz-backup-' + today() + '.json', { type: 'application/json' });
  if (share && navigator.canShare && navigator.canShare({ files: [f] })) {
    try {
      await navigator.share({
        files: [f],
        title: 'Kopi Mboyz Backup'
      });
      return;
    } catch (e) {
      if (e.name === 'AbortError')
        return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ===== LAPORAN WHATSAPP =====
// Ubah isi/format pesan di sini. Hasilnya dikirim lewat tombol ikon WhatsApp.
function reportText(k) {
  const d = S.days[k], t = calc(d), P = S.prof || {};
  const n = v => Math.round(v).toLocaleString('id-ID');
  return [
    'Nama : ' + '_' + (P.nama || '-') + '_',
    'Shift : ' + (P.shift || '-'),
    'Lokasi : ' + (P.lokasi || '-'),
    'Terjual : ' + t.sold,
    '*JUMLAH UANG SETORAN*',
    'Tunai : ' + n(t.tunai),
    'QRIS : ' + n(t.qris),
    'Jumlah : ' + '_' + n(t.exp) + '_'
  ].join('\n');
}

// ===== RENDER & EVENT =====
// render() menggambar ulang layar sesuai tab aktif.
let timerRender = null;
function tundaRender() {
  clearTimeout(timerRender);
  timerRender = setTimeout(render, 300);
}

function render() {
  clearTimeout(timerRender);
  const y = scrollY;
  $('#app').innerHTML = tab === 'h' ? viewH() : tab === 'm' ? viewM() : viewR();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  scrollTo(0, y);
}

// Semua tombol (yang punya data-a / data-t) ditangani di sini.
// data-t = pindah tab, data-a = aksi (inc, dec, wa, prof, ...).
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-t],[data-a]');
  if (!t)
    return;
  if (t.dataset.t) {
    tab = t.dataset.t;
    render();
    return;
  }
  const a = t.dataset.a, id = t.dataset.id, d = D();
  if (a === 'pick') {
    e.preventDefault();
    document.querySelector('input[type=file]').click();
    return;
  }
  if (a === 'close') {
    $('#ov').style.display = 'none';
    return;
  }
  if (a === 'exp') {
    backup();
    return;
  }
  if (a === 'wa') {
    window.open('https://wa.me/' + NOMOR_WA + '?text=' + encodeURIComponent(reportText(id)), '_blank', 'noopener');
    return;
  }
  if (a === 'prof') {
    const P = S.prof || {};
    $('#pn').value = P.nama || '';
    $('#pl').value = P.lokasi || '';
    $('#ps').value = P.shift || '';
    $('#pf').style.display = 'flex';
    return;
  }
  if (a === 'profx') {
    $('#pf').style.display = 'none';
    return;
  }
  if (a === 'profok') {
    S.prof = {
      nama: $('#pn').value.trim(),
      lokasi: $('#pl').value.trim(),
      shift: $('#ps').value.trim()
    };
    $('#pf').style.display = 'none';
    save();
    render();
    return;
  }
  if (a === 'impick') {
    $('#imp').click();
    return;
  }
  if (a === 'view') {
    $('#ovi').src = d.pays.find(p => p.id === id).img;
    $('#ov').style.display = 'flex';
    return;
  }
  if (a === 'inc' || a === 'dec') {
    const m = S.menu.find(x => x.id === id);
    const s = d.sales[id] || (d.sales[id] = {
      q: 0,
      n: m ? m.name : '?',
      p: m ? m.price : 0
    });
    if (m) {
      s.n = m.name;
      s.p = m.price;
    }
    s.q = Math.max(0, s.q + (a === 'inc' ? 1 : -1));
    if (!s.q)
      delete d.sales[id];
  } else if (a === 'delpay') {
    if (!confirm('Hapus bukti ini?'))
      return;
    d.pays = d.pays.filter(p => p.id !== id);
  } else if (a === 'addmenu') {
    const n = $('#nn').value.trim(), p = +$('#np').value;
    if (!n)
      return;
    S.menu.push({
      id: uid(),
      name: n,
      price: p || 0
    });
  } else if (a === 'delmenu') {
    if (!confirm('Hapus menu ini? Data penjualan lama tetap tersimpan.'))
      return;
    S.menu = S.menu.filter(m => m.id !== id);
  } else if (a === 'delday') {
    if (!confirm('Hapus data hari ' + id + '?'))
      return;
    delete S.days[id];
  } else if (a === 'open') {
    cur = id;
    tab = 'h';
  }
  save();
  render();
});

// Semua isian (input) yang punya data-c ditangani di sini:
// tanggal, jumlah cup, nominal QRIS, nama/harga menu, upload foto, impor cadangan.
document.addEventListener('change', async e => {
  const t = e.target, c = t.dataset.c, id = t.dataset.id;
  if (!c)
    return;
  const d = D();
  if (c === 'date') {
    cur = t.value || today();
  } else if (c === 'cups')
    d.cups = Math.max(0, +t.value || 0);
  else if (c === 'pamt')
    d.pays.find(p => p.id === id).amt = +t.value || 0;
  else if (c === 'pnote')
    d.pays.find(p => p.id === id).note = t.value;
  else if (c === 'mname')
    S.menu.find(m => m.id === id).name = t.value.trim() || 'Menu';
  else if (c === 'mprice')
    S.menu.find(m => m.id === id).price = +t.value || 0;
  else if (c === 'imp' && t.files[0]) {
    try {
      const o = JSON.parse(await t.files[0].text());
      if (!(o.menu && o.days))
        alert('File cadangan tidak valid');
      else if (confirm('Ganti semua data sekarang dengan cadangan ini?'))
        S = o;
    } catch (x) {
      alert('File cadangan tidak valid');
    }
    t.value = '';
  } else if (c === 'file' && t.files[0]) {
    const img = await shrink(t.files[0]);
    d.pays.push({
      id: uid(),
      img,
      amt: 0,
      note: '',
      t: Date.now()
    });
  }
  save();
  // Isian teks/angka: gambar ulang DITUNDA sebentar. Kalau langsung, ketukan
  // pertama pada tombol (misal +) setelah mengetik bisa hilang karena
  // elemennya keburu diganti. Tombol apa pun yang ditekan akan memanggil render() sendiri.
  if (['cups', 'pamt', 'pnote', 'mname', 'mprice'].includes(c))
    tundaRender();
  else
    render();
});

// ===== MULAI =====
// Dijalankan saat aplikasi dibuka: baca data, daftarkan service worker, tampilkan layar.
(async () => {
  const s = await load();
  if (s && s.menu && s.days)
    S = s;
  if (!S.prof)
    S.prof = {
      nama: '',
      lokasi: '',
      shift: ''
    };
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('sw.js').catch(() => {
    });
  render();
})();
