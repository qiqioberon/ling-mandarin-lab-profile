# Prompt — Produksi Jalur QRIS (verifikasi manual + link akses)

Fokus tunggal: membuka penjualan lewat QRIS dengan verifikasi manusia dan link
akses e-book. iPaymu **tidak** dikerjakan di putaran ini, hanya dimatikan dengan
rapi.

Uang sungguhan akan masuk lewat jalur ini, jadi kerjakan berurutan dan jangan
lompati Tugas 6.

---

## TUGAS 1 — Matikan iPaymu dengan rapi

Bukan disembunyikan, bukan dibiarkan hidup. Ada satu bahaya nyata kalau tombolnya
tetap bisa diklik: pembeli diarahkan ke `sandbox.ipaymu.com`, menyelesaikan
pembayaran yang tidak memindahkan uang sepeser pun, lalu merasa sudah membayar.
Dari sisi pembeli itu terlihat seperti penipuan.

Lebih buruk lagi, `api/ipaymu-notify.ts` akan menerima callback sukses dari
sandbox dan memanggil `settlePayment()` — jadi entitlement e-book benar-benar
terbit tanpa ada uang masuk.

1. Tambahkan env `IPAYMU_MODE` (server) dan `VITE_IPAYMU_MODE` (frontend),
   nilai `disabled` | `live`. Default `disabled` kalau kosong.

2. Di `api/checkout.ts`, baris pertama handler:

```ts
if ((process.env.IPAYMU_MODE || 'disabled') !== 'live') {
  return res.status(403).json({
    error: 'Pembayaran online sedang dalam proses aktivasi. '
         + 'Silakan gunakan pembayaran QRIS.',
  });
}
```

3. Di `Checkout.tsx`, tombol "Bayar Online" tetap **dirender** tapi `disabled`
   saat mode bukan `live`, dengan label:

   > **Bayar Online** — QRIS, VA, E-Wallet
   > *Sedang dalam proses aktivasi.*

   Jangan pakai kata "sandbox" di UI — itu jargon yang terdengar seperti ada
   yang rusak.

4. Pastikan Scan QRIS adalah tombol primary, full width, warna solid.

---

## TUGAS 2 — Rapikan gerbang penjualan

`VITE_PAYMENTS_LIVE` dan `VITE_PREVIEW_EMAILS` berprefix `VITE_`, artinya
gerbangnya hidup di browser saja. `api/manual/create.ts` tidak punya pengecekan
padanannya, jadi endpoint itu bisa dipanggil langsung lewat DevTools terlepas
dari daftar email.

Tambahkan padanan di server, di `api/manual/create.ts` sebelum `guardPurchase()`:

```ts
const PAYMENTS_LIVE = process.env.PAYMENTS_LIVE === 'true';
const PREVIEW_EMAILS = (process.env.PREVIEW_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Sebelum launch: hanya email preview. Saat launch: PAYMENTS_LIVE=true → terbuka.
if (!PAYMENTS_LIVE
    && !PREVIEW_EMAILS.includes(String(buyerEmail).toLowerCase())) {
  return res.status(403).json({
    error: 'Penjualan belum dibuka untuk umum.',
  });
}
```

Nilai `PAYMENTS_LIVE` dan `PREVIEW_EMAILS` (tanpa `VITE_`) harus dijaga sama
dengan pasangan `VITE_`-nya. Beri komentar yang menyatakan itu.

---

## TUGAS 3 — Bersihkan `.env.example` (di-commit ke git)

Masalah yang ada sekarang:

1. **Berisi email admin asli dan email pribadi.** `adminAuth.ts` sendiri
   berkomentar "don't reveal who the admins are", tapi daftarnya justru ada di
   file yang ter-commit. Ganti semua nilai `ADMIN_EMAILS` dan
   `VITE_PREVIEW_EMAILS` menjadi kosong. Nilai asli hanya di `.env.local` dan
   dashboard Vercel.

2. **`QRIS_STATIC_PAYLOAD` tertulis dua kali.** Sisakan satu, di blok QRIS.

3. **Blok `DOKU_*` masih tertinggal** (`DOKU_CLIENT_ID`, `DOKU_SECRET_KEY`,
   `DOKU_PUBLIC_KEY`, `DOKU_NOTIFICATION_PATH`, `DOKU_ENABLED_METHODS`,
   `VITE_DOKU_CLIENT_ID`, `VITE_DOKU_IS_PRODUCTION`). Hapus semua — sudah tidak
   ada kode yang membacanya.

4. **Tambahkan yang hilang:** `IPAYMU_MODE`, `VITE_IPAYMU_MODE`,
   `PAYMENTS_LIVE`, `PREVIEW_EMAILS`, `VITE_MANUAL_BANK_INFO`,
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

Setelah itu jalankan `grep -n "@gmail\|DOKU" .env.example` — harus nihil.

---

## TUGAS 4 — Perbaiki batas perangkat

`MAX_DEVICES` sekarang 2, dan `deviceId` adalah `crypto.randomUUID()` yang
disimpan di localStorage. Konsekuensinya: mode incognito atau pembersihan data
browser menghabiskan slot tanpa disadari. Pembeli yang membaca di HP lalu laptop
sudah mentok; sekali clear cache, dia terkunci dari barang yang sudah dibayar.

1. Naikkan `MAX_DEVICES` ke **3**.

2. Perbaiki tampilan saat keputusan `deny`:

   > Akses e-book ini sudah terdaftar di 3 perangkat. Kalau Anda mengganti
   > perangkat atau membersihkan data browser, hubungi kami di {WA} dengan
   > menyertakan kode pesanan **{orderRef}**.

   Tampilkan `orderRef` di layar supaya pembeli bisa langsung menyebutkannya.

3. **`POST /api/admin/reset-devices`** — endpoint baru. `requireAdmin()` di baris
   pertama, body `{ orderRef }`, mengosongkan `access_devices` menjadi `{}`.
   Catat siapa yang mereset dan kapan.

4. Tombol **Reset Perangkat** di `/admin/verify` untuk tiap order `paid`, dengan
   dialog konfirmasi.

Tanpa nomor 3 dan 4, permintaan reset pertama akan memaksamu membuka SQL editor
Supabase pada jam yang tidak menyenangkan.

---

## TUGAS 5 — Watermark di reader

Ini satu-satunya proteksi e-book yang benar-benar berpengaruh, dan belum ada
sama sekali di `Read.tsx`.

Overlay `orderRef` (atau email pembeli) semi-transparan di atas tiap halaman PDF:
diagonal, opacity sekitar 0.12, `pointer-events: none`, tidak menghalangi
membaca. Ambil datanya dari respons `/api/get-reader-url`.

**Ini tidak mencegah screenshot, dan tidak ada yang bisa.** Blokir `contextmenu`
dan `PrintScreen` yang sudah ada hanya menghentikan orang paling malas —
Snipping Tool, `Shift+Cmd+4`, dan HP kedua semuanya lolos, karena screenshot
adalah fungsi sistem operasi yang tidak bisa dijangkau browser.

Yang dilakukan watermark adalah membuat orang enggan menyebarkan, karena setiap
kebocoran bisa dilacak balik ke pembelinya. Efek jera itu nyata; blokir keyboard
tidak.

---

## TUGAS 6 — Uji beli sendiri sampai tuntas (JANGAN dilewati)

Sebelum satu pun pembeli asli masuk, lakukan sendiri dengan uang sendiri:

1. Buka `/store`, harga tampil benar.
2. Klik beli → `/bayar-manual`, isi data.
3. QR muncul dengan nominal unik. Salin nominalnya.
4. **Scan dan transfer sungguhan** dengan nominal persis.
5. Upload bukti transfer.
6. Buka `/admin/verify`, order muncul dengan nominal yang menonjol.
7. Klik Setujui.
8. Ambil link akses, kirim lewat WhatsApp.
9. Buka link di HP → e-book terbaca, watermark terlihat.
10. Buka di laptop → terbaca, slot perangkat bertambah.
11. Buka di browser ketiga → terbaca (batas 3).
12. Buka di browser keempat → ditolak dengan pesan yang menyertakan `orderRef`.
13. Klik Reset Perangkat di panel admin → browser keempat bisa masuk.

Kalau ada satu langkah yang tersendat, perbaiki dulu sebelum membuka penjualan.

---

## TUGAS 7 — Verifikasi operasional

1. `ADMIN_EMAILS` terisi di Vercel. Kosong berarti kamu sendiri tidak bisa masuk
   panel verifikasi — ini penyebab kepanikan paling umum di hari pertama.
2. Cron `expire-orders` terdaftar di `vercel.json` dan `CRON_SECRET` ter-set.
   Tanpa ini, 900 slot kode unik habis dan pembeli mulai kena error 503 tanpa
   sebab yang jelas.
3. `QRIS_STATIC_PAYLOAD` ter-set, `QRIS_DYNAMIC_ENABLED=false`.
4. Buka `/store` di produksi — kalau produk tidak muncul tapi situs jalan,
   berarti `VITE_SUPABASE_URL` tidak terbaca dan `src/lib/supabase.ts` diam-diam
   jatuh ke `placeholder.supabase.co`.
5. `/refund-policy` isinya mencerminkan apa yang benar-benar akan kamu lakukan
   kalau ada pembeli yang sudah bayar tapi aksesnya bermasalah.

```bash
npx tsc --noEmit && npm test && npm run build
```

---

## Yang JANGAN dikerjakan

- Jangan set `IPAYMU_MODE=live` atau `IPAYMU_IS_PRODUCTION=true`.
- Jangan nyalakan `QRIS_DYNAMIC_ENABLED` sebelum ada transaksi uji nominal kecil
  yang benar-benar diterima acquirer.
- Jangan bangun auto-approve dari notifikasi Android. Verifikasi manusia
  dipertahankan — kesalahan manusia berarti pembeli menunggu beberapa jam,
  kesalahan otomatisasi berarti akses permanen ke orang yang salah.
- Jangan mengandalkan gerbang `VITE_` sebagai pengaman. Setiap pembatasan harus
  punya padanannya di server.
