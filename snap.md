# PROMPT — LANGKAH 4: Doku SNAP Virtual Account
**Repo:** `ling-mandarin-latest` (Ling Chinese Lab)
**Tool:** Claude Code, dijalankan dari root repo
**Tujuan:** VA berfungsi lewat SNAP, nomor VA tampil **inline di FE sendiri** — tanpa popup Jokul.

---

## PRINSIP KERJA

**QRIS = jalur kita sendiri** (statis → dinamis, sudah jadi, tidak bergantung siapa pun).
**VA = lewat Doku SNAP** (channel-nya sudah `ACTIVE` di dashboard, tinggal dikonfigurasi dan diintegrasikan).

Keduanya dirender di UI sendiri. Popup Jokul tidak dipakai lagi.

---

## KENAPA SNAP, BUKAN CHECKOUT API

Dashboard menunjukkan semua VA berstatus `ACTIVE` tapi berlabel **(SNAP)**. Kode sekarang memanggil `/checkout/v1/payment` — **Jokul Checkout API non-SNAP**, autentikasi HMAC-SHA256. Dua sisi yang tidak bertemu: channel ter-provision di SNAP, kode bicara non-SNAP. Itulah kenapa tombol VA muncul tapi selalu "Oops".

Solusinya bukan menambal Checkout API, tapi bicara SNAP.

| | Checkout API non-SNAP | SNAP |
|---|---|---|
| Auth | HMAC-SHA256, secret key | RSA + HMAC-SHA512, **dua tahap** |
| Token | tidak ada | B2B access token, umur pendek |
| Timestamp | `2026-08-23T14:05:00Z` | `2026-08-23T14:05:00+07:00` |
| Signature request | 1 skema | 2 skema berbeda |
| Response code | HTTP biasa | 7 digit, `2002700` |
| UI | popup hosted | **nomor VA mentah, render sendiri** |

Perbedaan format timestamp itu penyebab kegagalan paling umum. SNAP menolak format `Z` yang dipakai kode non-SNAP.

---

# BAGIAN 0 — PRASYARAT (di luar kode, kerjakan lebih dulu)

## 0.1 — Generate keypair RSA

`Merchant Public Key has not been set` di dashboard adalah **blocker mutlak**. Tanpa ini, request token B2B ditolak dan tidak ada endpoint SNAP yang bisa dipanggil.

```bash
openssl genrsa -out doku-private.pem 2048
openssl rsa -in doku-private.pem -pubout -out doku-public.pem
```

- Upload isi `doku-public.pem` ke **Dashboard → API Keys → Merchant Public Key**
- Simpan `doku-private.pem` ke env `DOKU_PRIVATE_KEY` (newline jadi `\n`, dibungkus tanda kutip)
- **Jangan** commit file `.pem`. Tambahkan `*.pem` ke `.gitignore`

## 0.2 — Kumpulkan nilai konfigurasi dari dashboard

- **`DOKU_PARTNER_SERVICE_ID`** — prefix VA per bank acquirer, 8 karakter. Ada di konfigurasi channel VA. **Kalau kurang dari 8 karakter, dipadding SPASI di kiri, dan spasi itu signifikan** — ikut masuk ke `virtualAccountNo`. Ini gotcha paling sering.
- **`DOKU_CHANNEL_ID`** — untuk header `CHANNEL-ID`
- **Token URL** di `Pengaturan SNAP` masih kosong. Isi dengan `https://<domain>/api/snap/access-token/b2b` (endpoint ini dibuat di Bagian 3.4)
- **Notification URL** SNAP — arahkan ke `https://<domain>/api/snap/transfer-va/payment`

## 0.3 — Rotasi secret

`DOKU_SECRET_KEY` sudah pernah masuk `.env.example` yang di-commit. Klik **Regenerate Secret Key** di dashboard, lalu perbarui `.env.local` dan Vercel Environment Variables. Beberapa menit saja, dan wajib dilakukan sebelum menerima uang sungguhan.

**Kriteria selesai Bagian 0:**
- [ ] Keypair RSA dibuat, public key ter-upload, dashboard tidak lagi menampilkan "has not been set"
- [ ] `DOKU_PARTNER_SERVICE_ID` dan `DOKU_CHANNEL_ID` terisi
- [ ] Token URL dan Notification URL SNAP terdaftar
- [ ] Secret key dirotasi
- [ ] `*.pem` masuk `.gitignore`

---

# BAGIAN 1 — Perbaiki Bug Konfigurasi

**File:** `api/_lib/doku.ts`

```ts
const clientId = process.env.DOKU_CLIENT_ID || process.env.DOKU_API_KEY || '';
```

Fallback ini berbahaya. Kalau `DOKU_CLIENT_ID` lupa diisi di Vercel, sistem **diam-diam memakai API Key sebagai Client-Id** — dan Doku menolak dengan pesan yang tidak menjelaskan apa-apa.

Client ID (`BRN-0290-...`) dan API Key (`doku_key_...`) adalah dua field berbeda dengan fungsi berbeda.

→ Hapus fallback-nya. Kalau `DOKU_CLIENT_ID` kosong, **lempar error saat startup** dengan pesan eksplisit.

Terapkan pola yang sama untuk semua env SNAP: satu fungsi `getSnapConfig()` yang memvalidasi kelengkapan di muka dan gagal dengan pesan jelas, bukan gagal misterius saat pembeli sedang menunggu.

---

# BAGIAN 2 — Lapisan Kriptografi SNAP

**File baru:** `api/_lib/snap/crypto.ts`

Ini bagian tersulit dan paling rawan salah. Kerjakan **dengan unit test lebih dulu**, sebelum menyentuh jaringan sama sekali. Signature yang salah selalu mengembalikan error generic, jadi debugging lewat trial-and-error ke server akan sangat lambat.

## 2.1 — Timestamp

```
formatSnapTimestamp(date) -> "2026-08-23T14:05:00+07:00"
```
ISO8601 **dengan offset zona waktu**, bukan `Z`. Ini berbeda dari helper non-SNAP yang sudah ada. Jangan pakai ulang fungsi lama.

## 2.2 — Tanda tangan asimetris (untuk minta token)

```
stringToSign = clientId + "|" + timestamp
signature    = base64( SHA256withRSA( stringToSign, privateKey ) )
```
Node: `crypto.createSign('RSA-SHA256')`, key dari `DOKU_PRIVATE_KEY`.

Pemisahnya adalah **pipe** `|`, tanpa spasi di sekitarnya.

## 2.3 — Tanda tangan simetris (untuk request transaksional)

```
minifiedBody = JSON.stringify(body)          // tanpa spasi, tanpa newline
bodyHash     = lowercase( hex( SHA256( minifiedBody ) ) )
stringToSign = method + ":" + relativeUrl + ":" + accessToken + ":" + bodyHash + ":" + timestamp
signature    = base64( HMAC-SHA512( stringToSign, DOKU_SECRET_KEY ) )
```

Detail yang menentukan berhasil atau tidak:
- `method` **UPPERCASE** (`POST`)
- `relativeUrl` adalah **path saja**, tanpa host, diawali `/`
- Hash body **lowercase hex**, bukan base64
- `HMAC-SHA512`, bukan SHA256
- Body yang di-hash harus **byte-identik** dengan body yang dikirim. Serialisasi **sekali** ke string, lalu pakai string yang sama untuk hash dan untuk `fetch`. Jangan `JSON.stringify` dua kali — inilah bug yang sama persis dengan bug raw-body di webhook non-SNAP kemarin.

## 2.4 — Verifikasi tanda tangan notifikasi masuk

Doku menandatangani notifikasi yang dikirim ke kita. Verifikasi memakai skema simetris yang sama, dengan `relativeUrl` = path notifikasi yang didaftarkan.

Karena spesifikasi persisnya belum kita pegang, **tulis defensif**: coba verifikasi, catat hasilnya, tapi pada tahap awal **jangan tolak** notifikasi yang gagal verifikasi — cukup tandai `signature_verified=false` di tabel audit dan tetap proses. Setelah beberapa notifikasi nyata masuk dan skemanya terbukti, **naikkan jadi penolakan keras**.

Catat `X-SIGNATURE` dan seluruh raw body setiap notifikasi. Tanpa itu, mencocokkan skema tanda tangan hampir mustahil.

## 2.5 — Unit test wajib

Uji dengan vektor tetap (timestamp dan body yang di-hardcode):
- Timestamp berformat offset, bukan `Z`
- String-to-sign asimetris tersusun persis, dan signature-nya bisa diverifikasi balik dengan public key pasangannya
- String-to-sign simetris tersusun persis untuk body contoh
- Body hash lowercase hex
- Body yang di-hash identik dengan yang dikirim (uji lewat satu fungsi yang mengembalikan keduanya sekaligus)

---

# BAGIAN 3 — Klien SNAP

## 3.1 — `api/_lib/snap/token.ts`

```
POST {baseUrl}/authorization/v1/access-token/b2b
Headers: X-CLIENT-KEY, X-TIMESTAMP, X-SIGNATURE (asimetris)
Body:    { "grantType": "client_credentials" }
```

- Cache token di memori sampai kedaluwarsa **dikurangi 60 detik** sebagai margin
- Kalau request gagal, jangan retry membabi buta — maksimal 2 kali dengan jeda, lalu menyerah dengan error jelas
- **Jangan pernah** menulis token ke log

## 3.2 — `api/_lib/snap/createVa.ts`

Service code **27** (dikonfirmasi dari dokumentasi yang Anda punya: *"Merchant could hit create VA API (service code 27)"*). Sukses ditandai `responseCode` = **`2002700`**.

Header:
```
Authorization: Bearer {accessToken}
X-TIMESTAMP, X-SIGNATURE (simetris), X-PARTNER-ID, X-EXTERNAL-ID, CHANNEL-ID
Content-Type: application/json
```

**`X-EXTERNAL-ID` harus unik per hari per partner.** Pakai `orderRef`, dan simpan di DB supaya retry tidak menghasilkan nilai baru — pengulangan ID yang sama untuk transaksi berbeda akan ditolak.

Body inti:
```
partnerServiceId    — 8 karakter, PADDING SPASI DI KIRI
customerNo          — nomor pelanggan yang kita bangkitkan
virtualAccountNo    — partnerServiceId + customerNo (spasi ikut terhitung)
virtualAccountName  — nama pembeli, alfanumerik saja
trxId               — orderRef
totalAmount         — { value: "62500.00", currency: "IDR" }
expiredDate         — ISO8601 dengan offset
virtualAccountTrxType — "C"  (Closed Amount, sesuai label channel di dashboard)
additionalInfo      — { channel: <bank> }
```

Dua gotcha:
- `totalAmount.value` adalah **string dengan dua desimal**: `"62500.00"`, bukan angka
- `virtualAccountNo` menyertakan spasi padding. Panjangnya ikut terhitung. Jangan di-`trim()` di mana pun

Response code selain `2002700` → lempar error yang **menyertakan `responseCode` dan `responseMessage` asli**. Jangan bungkus jadi pesan generic; kode 7 digit itu satu-satunya petunjuk yang berguna.

## 3.3 — `api/snap/transfer-va/payment.ts` (notifikasi masuk)

Service code **25**. Balas dengan `responseCode` **`2002500`**, `responseMessage` `"Successful"`.

- `export const config = { api: { bodyParser: false } }` — baca raw body, sama seperti webhook non-SNAP
- Simpan setiap notifikasi ke tabel audit **sebelum** memproses
- Cocokkan berdasarkan `trxId` (= `orderRef`), fallback ke `virtualAccountNo`
- Panggil `settlePayment({ source: 'snap-va' })` yang sudah ada. **Jangan tulis ulang logika entitlement**
- **Idempotent** — Doku bisa mengirim notifikasi yang sama berkali-kali
- **Selalu balas 200** dengan `responseCode` yang sesuai, bahkan saat order tidak ketemu. Balasan error akan memicu retry berulang

## 3.4 — `api/snap/access-token/b2b.ts` (Doku minta token ke kita)

Field **Token URL** di `Pengaturan SNAP` menunjukkan Doku akan meminta access token dari kita sebelum mengirim notifikasi.

Implementasikan sisi ini juga: verifikasi `X-SIGNATURE` asimetris dari Doku memakai `DOKU_PUBLIC_KEY`, lalu terbitkan token berumur pendek yang kita simpan sendiri. Endpoint `payment` di atas menerima token itu di header `Authorization`.

Kalau ternyata Doku tidak memanggilnya, endpoint ini cuma menganggur — tidak ada ruginya. Tapi kalau ternyata dibutuhkan dan belum ada, notifikasi tidak akan pernah sampai dan penyebabnya sulit dilacak.

---

# BAGIAN 4 — Database

`supabase/migrations/<timestamp>_snap_va.sql`:

```sql
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS va_number      text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS va_bank        text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS snap_external_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS snap_customer_no text;

CREATE UNIQUE INDEX IF NOT EXISTS orders_snap_external_id_idx
  ON public.orders (snap_external_id) WHERE snap_external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_va_number_idx ON public.orders (va_number);

CREATE TABLE IF NOT EXISTS public.snap_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_body    text NOT NULL,
  headers     jsonb,
  trx_id      text,
  va_number   text,
  signature_verified boolean DEFAULT false,
  matched     boolean DEFAULT false,
  reason      text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS snap_notifications_trx_idx ON public.snap_notifications (trx_id);
```

Tabel `snap_notifications` bukan opsional. Selama skema tanda tangan belum terbukti, ini satu-satunya cara melihat apa yang sebenarnya dikirim Doku.

---

# BAGIAN 5 — Endpoint & Frontend

## 5.1 — `POST /api/va/create`

Alur sama dengan `/api/qris/create`: validasi `zod` → guard whitelist & kepemilikan (pakai `api/_lib/guards.ts` bersama) → hitung `grandTotal` → generate `orderRef` → insert order `payment_method='va'` → panggil `createVa()` → simpan `va_number` → notifikasi Telegram.

Response: `{ orderRef, vaNumber, bank, amount, expiresAt }`

## 5.2 — `Checkout.tsx`: tiga kartu

Perluas `RadioGroup` dari Langkah 3:

1. **QRIS** — default, badge "Instan", styling amber yang sudah ada
2. **Virtual Account** — tampil **hanya kalau `DOKU_SNAP_ENABLED_BANKS` tidak kosong**. Kalau lebih dari satu bank, tampilkan `Select` untuk memilih bank
3. **Metode lain (Doku)** — tampil hanya kalau `DOKU_ENABLED_METHODS` tidak kosong. Biarkan kosong untuk sekarang

Flag ketersediaan diambil dari `GET /api/pricing-config`. **Kirim boolean dan daftar bank saja** — jangan bocorkan konfigurasi channel lainnya.

Prinsipnya: kartu yang tidak bisa berfungsi **tidak ditampilkan**. Lebih baik satu metode yang jalan daripada tiga yang dua di antaranya error.

## 5.3 — `VaPayment.tsx` (komponen baru)

Ini payoff-nya: nomor VA dirender di UI sendiri.

1. **Logo bank + nama bank**
2. **Nomor VA** — font mono, ukuran besar, dikelompokkan per 4 digit agar mudah dibaca
3. **Tombol "Salin Nomor VA"** — salin **tanpa spasi pengelompokan**, angka polos saja
4. **Nominal** — besar, dengan tombol salin terpisah
5. **Countdown** sampai `expiresAt`
6. **Accordion panduan transfer** per bank: ATM, m-banking, internet banking
7. **Polling status** via `useQuery` — 3 detik selama 5 menit pertama, lalu 15 detik

Berbeda dari QRIS, di sini **tidak perlu** tombol "Saya sudah bayar" — SNAP mengirim notifikasi otomatis. Tetap sediakan tombol WhatsApp sebagai jaring pengaman kalau notifikasi tidak sampai.

## 5.4 — `PaymentPending.tsx`

Render bercabang berdasarkan `paymentMethod`: `qris` → `QrisPayment`, `va` → `VaPayment`, `doku` → spinner lama.

---

# BAGIAN 6 — Urutan Pengujian

Jangan langsung uji end-to-end. Naik bertahap, karena setiap tahap punya mode kegagalan sendiri:

1. **Unit test kripto** — vektor tetap, tanpa jaringan
2. **Token B2B saja** — panggil, pastikan dapat `accessToken`. Kalau gagal di sini, masalahnya di keypair atau format timestamp, bukan di tempat lain
3. **Create VA** — pastikan `responseCode` = `2002700` dan nomor VA kembali
4. **Bayar sungguhan nominal kecil** — pastikan notifikasi masuk dan tercatat di `snap_notifications`
5. **Verifikasi signature** — setelah beberapa notifikasi nyata terkumpul, cocokkan skemanya, lalu naikkan jadi penolakan keras
6. **End-to-end** — bayar → e-book terbuka

Kalau tahap 2 gagal, tidak ada gunanya melanjutkan. Sebagian besar waktu debugging SNAP habis di dua tahap pertama.

---

# BAGIAN 7 — Kriteria Selesai

**Konfigurasi:**
- [ ] Merchant Public Key ter-upload, dashboard tidak lagi "has not been set"
- [ ] Fallback `DOKU_CLIENT_ID || DOKU_API_KEY` **dihapus**
- [ ] `getSnapConfig()` gagal dengan pesan jelas saat env kurang
- [ ] Secret key sudah dirotasi

**Kripto:**
- [ ] Unit test signature hijau dengan vektor tetap
- [ ] Timestamp berformat offset `+07:00`, bukan `Z`
- [ ] Body di-serialisasi **sekali**, string yang sama dipakai untuk hash dan untuk kirim

**Fungsional:**
- [ ] Token B2B berhasil didapat
- [ ] Create VA mengembalikan `2002700` dan nomor VA
- [ ] `virtualAccountNo` memuat padding spasi dan tidak pernah di-`trim()`
- [ ] Nomor VA tampil inline di FE, **tanpa popup Jokul**
- [ ] Notifikasi pembayaran tercatat di `snap_notifications` berikut raw body
- [ ] `settlePayment()` terpanggil, idempotent, e-book terbuka
- [ ] `DOKU_SNAP_ENABLED_BANKS` kosong → kartu VA hilang dari UI
- [ ] QRIS tetap berfungsi penuh, tidak terpengaruh perubahan ini

**Keamanan:**
- [ ] `grep -rE "BEGIN.*PRIVATE|SK-|sb_secret" dist/` → **tidak ada hasil**
- [ ] `*.pem` masuk `.gitignore`
- [ ] Access token tidak pernah muncul di log

---

# CARA MENJALANKAN

```
Baca prompt LANGKAH 4.
Kerjakan BAGIAN 2 saja — lapisan kripto SNAP, lengkap dengan unit test.
Jangan tulis kode jaringan apa pun dulu.
Tunjukkan test yang lolos, lalu berhenti.
```

Lalu berurutan: Bagian 1 → 3 → 4 → 5.

Bagian 0 dikerjakan manual oleh Anda di dashboard, dan **harus selesai sebelum Bagian 3** — tanpa Merchant Public Key, request token akan selalu ditolak dan Anda akan mengira kodenya yang salah.

---

# CATATAN KEJUJURAN

Bagian yang saya **yakin**: algoritma tanda tangan SNAP (asimetris `clientId|timestamp`, simetris `method:url:token:bodyHash:timestamp` dengan HMAC-SHA512), format timestamp beroffset, service code 27 untuk create VA dan 25 untuk notifikasi, serta struktur response code 7 digit. Ini standar BI yang seragam di semua penyelenggara.

Bagian yang **belum terkonfirmasi**: base path persis endpoint Doku, dan skema tanda tangan notifikasi masuk. Karena itu Bagian 2.4 sengaja dirancang permisif dulu lalu diperketat setelah ada bukti nyata, dan Bagian 3.2 mewajibkan `responseCode` asli ikut dilempar — supaya kalau path-nya salah, pesannya langsung menunjuk ke sana alih-alih tenggelam jadi error generic.

Kalau tahap 2 pengujian mentok di token, kirimkan `responseCode` dan `responseMessage` yang Anda dapat. Dari dua nilai itu biasanya bisa dipastikan apakah masalahnya di keypair, di timestamp, atau di path.
