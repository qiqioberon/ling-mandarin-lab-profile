# PROMPT — AKTIFKAN DOKU VA (Tanpa Mandiri)
**Repo:** `ling-mandarin-latest`
**Estimasi:** ~45 menit
**Temuan kunci:** Payment Link buatan Doku sendiri berhasil menerbitkan VA untuk **semua bank kecuali Mandiri**.

---

## APA ARTINYA TEMUAN ITU

Payment Link adalah produk Doku, nol baris kode dari Anda. Kalau di situ VA bank lain berhasil dan hanya Mandiri yang error, kesimpulannya:

1. **Doku VA sudah ter-provision dengan benar** untuk merchant ini
2. **Integrasi Checkout API Anda kemungkinan besar sudah benar sejak awal**
3. Error "Oops" selama ini terjadi karena Mandiri ikut dirender di daftar channel, lalu dipilih

Artinya **SNAP tidak diperlukan.** Cukup keluarkan Mandiri dari daftar channel yang ditawarkan.

Ini juga menutup pencarian `partnerServiceId` — tidak lagi relevan.

---

## KONDISI REPO (sudah terverifikasi, jangan dibangun ulang)

| Komponen | Status |
|---|---|
| `RadioGroup` pemilih metode di `Checkout.tsx` | ✅ ada |
| `dokuAvailable` dari `/api/pricing-config` | ✅ terhubung |
| `paymentMethodTypes` diteruskan ke Doku | ✅ ada |
| Order Doku ditandai `qris_provider: 'doku'` | ✅ benar — tidak mengganggu unique index QRIS |
| `PaymentPending.tsx` bercabang per `paymentMethod` | ✅ ada |
| Webhook raw-body + `settlePayment()` | ✅ ada |
| `DOKU_ENABLED_METHODS` | ❌ **kosong** ← ini satu-satunya penyebab |

Sebagian besar pekerjaan di bawah adalah **konfigurasi dan verifikasi**, bukan koding.

---

# BAGIAN 1 — Isi `DOKU_ENABLED_METHODS`

Isi hanya bank yang **terbukti berhasil menerbitkan nomor VA** lewat Payment Link.

```
DOKU_ENABLED_METHODS=VIRTUAL_ACCOUNT_BCA,VIRTUAL_ACCOUNT_BRI,VIRTUAL_ACCOUNT_BNI,VIRTUAL_ACCOUNT_BANK_PERMATA,VIRTUAL_ACCOUNT_BANK_CIMB,VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI,VIRTUAL_ACCOUNT_BANK_DANAMON,VIRTUAL_ACCOUNT_DOKU
```

## ⚠️ Dua hal yang mudah salah

**`VIRTUAL_ACCOUNT_BANK_MANDIRI` — JANGAN dimasukkan.** Ini yang rusak.

**`VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI` — BOLEH dimasukkan.** Ini BSI, bank yang berbeda, dan statusnya ACTIVE terpisah. Namanya memuat kata "MANDIRI" tapi bukan channel yang bermasalah. Jangan ikut dibuang.

**Jangan masukkan channel non-VA dulu.** Screenshot sebelumnya menunjukkan DOKU e-Wallet juga menampilkan "Please use another payment method". Mulai dari VA saja, tambahkan yang lain hanya setelah terbukti satu per satu.

Pasang di **`.env.local`** dan **Vercel → Settings → Environment Variables**. Kalau hanya di lokal, produksi tetap menampilkan semua channel termasuk Mandiri.

---

# BAGIAN 2 — Perbaikan Kecil di Kode

## 2.1 — Set `expires_at` untuk order Doku

`api/checkout.ts` tidak mengisi `expires_at`. Akibatnya order Doku yang ditinggalkan pembeli akan berstatus `pending` selamanya dan mengotori dashboard admin.

→ Isi `expires_at = now + payment_due_date` (default 60 menit, sama dengan nilai di `buildDokuCheckoutPayload`). Ambil dari satu konstanta bersama supaya tidak menyimpang dari nilai yang dikirim ke Doku.

## 2.2 — Pesan error yang informatif

Kalau Doku mengembalikan error, `checkout.ts` sekarang melempar pesan generic. Untuk debugging channel, sertakan **`response_code` / `error_code` asli** dari body respons Doku ke dalam log server — jangan ke pembeli, cukup ke log.

Tanpa ini, kalau ada channel lain yang ternyata bermasalah, Anda kembali menebak-nebak seperti kemarin.

## 2.3 — Verifikasi cabang Doku di `PaymentPending.tsx`

Untuk `paymentMethod === 'doku'`, pastikan tampilannya masuk akal: pembeli menyelesaikan pembayaran di popup Jokul, lalu halaman ini memantau status. Teks yang ada sekarang sudah tepat — cukup pastikan polling-nya berhenti saat status final.

---

# BAGIAN 3 — Webhook Doku (kritis untuk auto-unlock VA)

Inilah yang membuat VA otomatis. Tanpa ini, pembeli transfer tapi e-book tidak terbuka.

1. **Deploy ke Vercel dulu.** Doku tidak bisa menjangkau `localhost`.
2. **Daftarkan Notification URL** di Doku Dashboard:
   ```
   https://<domain>/api/doku-webhook
   ```
3. **Samakan `DOKU_NOTIFICATION_PATH`** dengan path yang didaftarkan, **byte per byte**. Nilai ini ikut dihitung dalam verifikasi signature — beda satu karakter, verifikasi gagal dan pesannya tidak akan menyebut soal URL.
4. Pastikan `DOKU_CLIENT_ID` di Vercel berisi `BRN-0290-1786002451778`, **bukan** API Key `doku_key_...`. Dua field berbeda.

## Uji webhook
Bayar satu VA nominal kecil. Yang harus terjadi berurutan:
- Webhook masuk, lolos verifikasi signature
- `settlePayment({ source: 'doku-webhook' })` terpanggil
- Order jadi `paid`, entitlement diberikan
- Halaman pembeli berubah, e-book terbuka di Library

**Kalau webhook tidak masuk sama sekali:** cek Notification URL di dashboard.
**Kalau masuk tapi ditolak 401:** `DOKU_NOTIFICATION_PATH` tidak sama dengan yang didaftarkan.

---

# BAGIAN 4 — Pengujian Bertahap

Jangan uji semua bank sekaligus. Kalau ada yang gagal, Anda tidak akan tahu yang mana.

**Tahap 1 — satu bank saja.**
```
DOKU_ENABLED_METHODS=VIRTUAL_ACCOUNT_BCA
```
Checkout → pilih VA → pastikan halaman Doku hanya menampilkan BCA → nomor VA terbit.

**Tahap 2 — bayar sungguhan** nominal kecil lewat bank itu. Pastikan webhook masuk dan e-book terbuka.

**Tahap 3 — tambahkan bank lain satu per satu.** Setiap penambahan, buka checkout dan pastikan tidak ada channel yang menampilkan error inline.

**Tahap 4 — pastikan Mandiri benar-benar hilang** dari daftar. Ini verifikasi utama: pembeli tidak boleh bisa memilih channel yang rusak.

---

# BAGIAN 5 — Kriteria Selesai

- [ ] `DOKU_ENABLED_METHODS` terisi di **`.env.local` dan Vercel**
- [ ] `VIRTUAL_ACCOUNT_BANK_MANDIRI` **tidak ada** di daftar
- [ ] `VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI` (BSI) **tetap ada** — bank berbeda
- [ ] Halaman Doku hanya menampilkan channel yang di-whitelist
- [ ] Tidak ada channel yang menampilkan "Please use another payment method"
- [ ] Nomor VA terbit dari checkout Anda sendiri
- [ ] `expires_at` terisi untuk order Doku
- [ ] Notification URL terdaftar, `DOKU_NOTIFICATION_PATH` sama persis
- [ ] Bayar VA sungguhan → webhook masuk → e-book terbuka otomatis
- [ ] QRIS tetap berfungsi penuh, tidak terpengaruh
- [ ] `response_code` asli dari Doku tercatat di log server saat error

---

# CARA MENJALANKAN

```
Kerjakan BAGIAN 2 saja — expires_at untuk order Doku, logging
response_code asli, dan verifikasi cabang doku di PaymentPending.
Tunjukkan diff dan berhenti.
```

Bagian 1, 3, 4 Anda kerjakan manual: isi env, daftarkan Notification URL, lalu uji bertahap.

---

# CATATAN

**Mandiri tetap tidak akan berfungsi.** Itu di luar kendali Anda, dan sekarang sudah dibuktikan bukan salah kodingan. Menyembunyikannya dari daftar adalah penanganan yang benar — lebih baik menawarkan delapan bank yang jalan daripada sembilan yang satunya selalu error.

Kalau nanti sempat, satu kalimat ke Doku sudah cukup: *"Payment Link buatan Doku sendiri juga gagal menerbitkan VA Mandiri untuk BRN-0290-1786002451778, sementara bank lain berhasil. Mohon dicek provisioning channel ini."* Sertakan screenshot. Tidak perlu menjelaskan apa pun soal SNAP.

**SNAP tidak jadi dikerjakan.** `api/_lib/snap/crypto.ts` boleh dibiarkan di repo — tesnya hijau dan tidak mengganggu apa pun. Kalau suatu saat butuh, sudah siap.

**Setelah bagian ini selesai**, Anda punya dua metode berfungsi: QRIS dan VA delapan bank. VA sudah otomatis lewat webhook Doku. QRIS masih perlu verifikasi manual sampai `PROMPT-QRIS-Otomatis-Hari-Ini.md` dijalankan.
