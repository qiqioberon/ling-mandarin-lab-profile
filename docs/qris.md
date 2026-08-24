# PROMPT — LANGKAH 1 & 2: Fondasi Pembayaran
**Repo:** `andarin2` (Ling Chinese Lab)
**Tool:** Claude Code, dijalankan dari root repo
**Prasyarat:** tidak ada. Dua langkah ini **tidak bergantung sama sekali** pada approval Doku.

> Kerjakan **Langkah 1 sampai tuntas dan terverifikasi** sebelum menyentuh Langkah 2.
> Jangan lanjut ke Bagian 3+ dari prompt utama sebelum keduanya selesai.

---

## KONTEKS: KENAPA DUA LANGKAH INI DULU

**Status Doku saat ini (dari dashboard merchant):**
- QRIS → `UPDATING`, **tidak bisa dipakai**
- Google Pay → `UPDATING`
- Semua VA (Mandiri, BCA, BRI, BNI, BSI, CIMB, dll) → `ACTIVE`, tapi semuanya berlabel **(SNAP)**

Kode sekarang memanggil `/checkout/v1/payment`, yaitu **Jokul Checkout API non-SNAP**. Kalau merchant hanya ter-provision untuk SNAP, Checkout tetap merender tombol VA tapi backend-nya tidak punya rute → error generic *"Oops, Something went wrong."*

**Dokumentasi `NON_SNAP.txt` tidak menutup celah ini.** Isinya hanya Tokenization V1 (terduplikasi 6×), VA BNC & BTN (terduplikasi 4×), dan Direct Debit BRI/Allobank/Mandiri. Tidak ada QRIS, tidak ada spesifikasi Checkout API, tidak ada format HTTP Notification non-SNAP. Beberapa bagiannya bahkan menautkan balik ke dokumen SNAP.

**Kesimpulan:** approval Doku di luar kendali kita. Tapi dua langkah di bawah ini bisa dikerjakan hari ini juga, dan setelah keduanya selesai, sistem sudah bisa menerima uang sungguhan lewat QRIS dengan verifikasi manual.

---

# LANGKAH 1 — Perbaiki Webhook & Ekstrak `grantEntitlement()`

## 1.1 — Bug kritis: webhook selalu gagal verifikasi signature

**File:** `api/doku-webhook.ts`, `api/_lib/doku.ts`

`verifyDokuWebhookSignature()` menghitung digest dari `JSON.stringify(req.body)`. Vercel sudah mem-parse body jadi object; **re-stringify mengubah urutan key dan whitespace** dibanding byte asli yang dikirim Doku. Digest tidak akan pernah cocok → webhook selalu balas `401` → order tidak pernah jadi `paid` → **pembeli sudah bayar tapi e-book tidak terbuka**.

Ini bug yang gagal secara diam. Tidak ada error di FE, tidak ada yang kelihatan rusak. Baru ketahuan setelah ada pembeli komplain.

**Yang harus dilakukan:**

1. Matikan body parser pada handler webhook:
   ```ts
   export const config = { api: { bodyParser: false } };
   ```
2. Baca raw body sebagai string dari stream request, **sebelum** parsing apa pun.
3. Hitung signature dari **string mentah itu**, persis apa adanya — jangan di-normalisasi, jangan di-trim, jangan di-reserialisasi.
4. Baru setelah signature terverifikasi, `JSON.parse(rawBody)` untuk logika bisnis.
5. Ubah tanda tangan fungsi `verifyDokuWebhookSignature` agar menerima `rawBody: string`, lalu teruskan apa adanya ke `generateDokuSignature`.

**Pengetatan tambahan yang wajib ada:**
- Bandingkan signature dengan `crypto.timingSafeEqual`. Cek panjang buffer dulu — `timingSafeEqual` melempar kalau panjangnya beda.
- Tolak request kalau `Request-Timestamp` selisihnya lebih dari 5 menit dari waktu server (anti-replay).
- `Request-Target` harus **persis** sama dengan path notification yang didaftarkan di Doku Dashboard. Jangan hardcode tebakan — baca dari env `DOKU_NOTIFICATION_PATH`, isinya disamakan dengan yang tertulis di dashboard.
- Guard idempotensi: kalau order sudah berstatus `paid`, langsung balas `200` tanpa memproses ulang.
- Log setiap request yang ditolak berikut alasannya. Tanpa ini, debugging webhook nyaris mustahil.

**Catatan spesifikasi yang belum kita punya:** struktur body notification non-SNAP belum ada di dokumen mana pun yang tersedia. Kode sekarang mengasumsikan `{ order.invoice_number, transaction.status }`. Pertahankan asumsi itu, tapi **tulis defensif** — kalau field yang diharapkan tidak ada, log seluruh body mentah dan balas `200`, jangan crash. Nanti begitu spesifikasinya didapat dari Doku, perbaikannya tinggal menyesuaikan parser.

## 1.2 — Ekstrak `grantEntitlement()` jadi fungsi bersama

**File baru:** `api/_lib/grantEntitlement.ts`

Ini alasan Langkah 1 dikerjakan lebih dulu. Logika "tandai lunas + berikan akses" nantinya akan dipanggil dari **tiga tempat berbeda**:
1. Webhook Doku (kalau approval keluar)
2. Admin approve manual
3. Jembatan notifikasi auto-unlock

Kalau tidak diekstrak sekarang, akan ada tiga salinan yang perilakunya perlahan menyimpang satu sama lain — dan bug-nya baru ketahuan saat ada pembeli yang aksesnya tidak terbuka lewat salah satu jalur.

**Spesifikasi fungsi:**

```
settlePayment({
  orderRef: string,
  source: 'doku-webhook' | 'admin' | 'bridge' | 'reconcile',
  paidAt?: string,
  rawRef?: string,
}) -> { ok: boolean, alreadyPaid: boolean, reason?: string }
```

Perilaku yang harus dipenuhi:
- **Idempotent.** Dipanggil dua kali untuk `orderRef` yang sama tidak boleh menggandakan entitlement atau mengubah `paid_at` yang sudah ada.
- Update `orders`: `status='paid'`, isi `paid_at`, catat `source`.
- Upsert ke `entitlements` — **perbaiki** `onConflict: 'buyer_email, product_id'` menjadi `'buyer_email,product_id'`. Spasi di situ bisa membuat Supabase gagal mengenali constraint.
- Kembalikan hasil terstruktur, jangan lempar exception untuk kasus normal seperti "sudah lunas". Pemanggil perlu membedakan "berhasil" dari "sudah pernah".
- Kalau order tidak ditemukan, kembalikan `ok: false` dengan alasan jelas — jangan diam.

Setelah fungsi ini jadi, **refactor `api/doku-webhook.ts` agar memanggilnya**, bukan mengeksekusi logika update sendiri.

## 1.3 — Bug lain yang sekalian dibereskan

**Nominal yang ditagih ≠ yang ditampilkan.** `src/pages/Checkout.tsx` menghitung `grandTotal = item.price + 2500` dan tombolnya menampilkan angka itu, tapi `api/checkout.ts` mengirim `amount: product.price` **tanpa** service fee. User melihat Rp 62.500, ditagih Rp 60.000.
→ Pindahkan `SERVICE_FEE` ke server sebagai satu-satunya sumber kebenaran. FE **mengambil** nilainya lewat endpoint `GET /api/pricing-config`, bukan menghardcode. Backend memakai total yang sama untuk `amount` ke Doku **dan** untuk kolom `orders.amount`.

**Logika `isOwned` salah semantik.** Checkout mengecek apakah email ada di whitelist beta, lalu menampilkan *"Anda Sudah Memiliki E-Book Ini!"*. Whitelist beta ≠ kepemilikan produk — tester justru **diblokir dari membeli**.
→ Ganti dengan query nyata ke tabel `entitlements` berdasarkan `buyer_email` + `product_id`.

**Whitelist beta di-hardcode di dua tempat** (FE dan `api/checkout.ts`).
→ Pindahkan ke env `BETA_ALLOWED_EMAILS` (server-only) dan **hapus sepenuhnya dari FE**. Validasi whitelist adalah urusan server; menaruhnya di FE hanya memberi tahu penyerang siapa saja testernya.

**Whitelist channel Doku.** `buildDokuCheckoutPayload()` mendukung `paymentMethodTypes` tapi tidak pernah diisi, sehingga Doku merender semua channel termasuk yang tidak jalan.
→ Tambahkan env `DOKU_ENABLED_METHODS` (comma-separated) dan teruskan ke payload. Isi **hanya** channel yang terbukti jalan lewat Checkout API non-SNAP.
→ Pahami perannya: ini **menyembunyikan tombol yang rusak**, bukan memperbaikinya. Jangan berharap VA Mandiri langsung berfungsi setelah ini.
→ Perhatikan `pro.md` memuat dua ejaan berbeda untuk ShopeePay (`EMONEY_SHOPEEPAY` dan `EMONEY_SHOPEE_PAY`). Konfirmasi ke Doku sebelum dipakai — salah ejaan akan ditolak.

**`vercel.json`.** Ubah `"source": "/(.*)"` → `"source": "/((?!api/).*)"` supaya rewrite SPA tidak berpotensi menelan route API.

**`test-doku.js`.** Menembak `https://api.doku.com` (production) secara hardcode. Buat mengikuti `DOKU_IS_PRODUCTION`.

**Validasi input.** `api/checkout.ts` hanya mengecek truthy. Tambahkan skema `zod` — `zod` sudah ada di `package.json`.

## 1.4 — Cara menguji tanpa menunggu transaksi asli

`pro.md` (sekitar baris 698) menyebut `additional_info.override_notification_url`. Pakai itu untuk mengarahkan notifikasi ke URL preview Vercel saat development.

**Kriteria selesai Langkah 1:**
- [ ] Webhook lolos verifikasi signature dengan raw body — dibuktikan lewat request uji, bukan asumsi
- [ ] Signature salah, timestamp basi, dan replay semuanya ditolak
- [ ] `settlePayment()` idempotent — dipanggil 2× tidak menggandakan entitlement
- [ ] `api/doku-webhook.ts` memanggil `settlePayment()`, tidak lagi punya logika update sendiri
- [ ] Nominal di FE = nominal ke Doku = `orders.amount`
- [ ] Tester beta bisa checkout, tidak lagi diblokir pesan "sudah memiliki"
- [ ] Tidak ada email whitelist tersisa di `src/`
- [ ] `npm run lint` dan `npm run build` lolos

---

# LANGKAH 2 — Port & Patch QRIS Converter

Sepenuhnya offline. Tidak menyentuh Doku, tidak menyentuh database, tidak menyentuh UI. Bisa diverifikasi 100% lewat unit test.

## 2.1 — Lokasi

Salin core dari repo `qris-dinamis` (MIT, © verssache) ke **`api/_lib/qris/`**:
`crc16.ts`, `parser.ts`, `types.ts`, `validator.ts`, `converter.ts`, `index.ts`.

**Taruh di `api/`, bukan `src/`.** Ini bukan preferensi gaya — menaruhnya di `src/` membuat `QRIS_STATIC_PAYLOAD` berisiko ikut ter-bundle ke browser. Cantumkan atribusi lisensi MIT di header `index.ts`.

Tambahkan dependency `qrcode` + `@types/qrcode`. **Jangan** tambahkan `jsqr` — fitur scan kamera tidak dipakai di alur checkout.

## 2.2 — Fixture asli untuk test

Payload QRIS statis Toko Fira sudah didecode dan diverifikasi. **Pakai ini, jangan bikin fixture karangan.**

```
00020101021126690021ID.CO.BANKMANDIRI.WWW01189360000802121173600211721211736080303UMI51440014ID.CO.QRIS.WWW0215ID10265311733200303UMI5204569953033605802ID5919Toko Fira Aksesoris6015Jakarta Utara (61051413062070703A0163040487
```
224 karakter, CRC `0487` **valid**.

| Tag | Isi |
|---|---|
| `01` | `11` (statis) |
| `26` | `ID.CO.BANKMANDIRI.WWW` — acquirer **Bank Mandiri**, NNS `9360000802121173600` |
| `51` | NMID `ID1026531173320`, kriteria `UMI` |
| `52` | `5699` |
| `53` | `360` (IDR) |
| `59` | `Toko Fira Aksesoris` |
| `60` | `Jakarta Utara (` — terpotong di 15 char, **biarkan apa adanya** |
| `62` | `0703A01` — **Terminal Label sudah terisi** |

**Hasil konversi yang benar** untuk `amount=62317`, `billNumber=LCL260823K7M2P` — 251 karakter, CRC `8166` valid:

```
00020101021226690021ID.CO.BANKMANDIRI.WWW01189360000802121173600211721211736080303UMI51440014ID.CO.QRIS.WWW0215ID10265311733200303UMI5204569953033605405623175802ID5919Toko Fira Aksesoris6015Jakarta Utara (61051413062250114LCL260823K7M2P0703A0163048166
```

Jadikan ini **assertion literal** di test. Kalau output berbeda satu karakter pun, ada yang salah.

## 2.3 — Lima patch wajib pada `converter.ts`

**P1 — Tag `01` yang hilang.**
Kode asli hanya *mengganti* tag `01` kalau tag itu sudah ada di sumber. Sebagian QRIS statis menghilangkannya (nilai default = statis). Akibatnya hasil konversi tidak pernah bertanda dinamis, dan aplikasi bank tetap meminta pembeli mengetik nominal manual — persis masalah yang ingin kita hindari.
→ Kalau tag `01` tidak ditemukan setelah loop, sisipkan `01` = `12` **tepat setelah tag `00`**.

**P2 — Fallback tag `58`.**
Nominal hanya disisipkan sebelum tag `58`. Kalau `58` tidak ada, flag `amountInserted` tetap `false` dan **nominal hilang tanpa error apa pun**. QR jadi, tampak normal, tapi statis.
→ Tambahkan anchor cadangan sebelum tag `59`. Kalau keduanya tidak ada, **lempar error** — jangan pernah mengembalikan payload tanpa nominal secara diam-diam.

**P3 — Format nominal.**
`options.amount.toString()` bisa menghasilkan `"150000.00000000001"` dari aritmatika float, atau notasi eksponen untuk angka besar.
→ Helper `formatAmount()`: tolak non-finite, bulatkan ke integer (IDR tanpa sen), tolak `< 1`, tolak panjang `> 13` digit (batas EMVCo).

**P4 — Merge tag `62`, jangan timpa.**
Ini regresi paling penting. QRIS Toko Fira **sudah punya** `0703A01`. Menimpa tag `62` akan menghapusnya.
→ Parse isi tag `62` yang ada, masukkan `orderRef` ke sub-tag `01` (Bill Number), pertahankan sub-tag lain apa adanya, lalu rakit ulang.
→ Sanitasi nilai sub-tag: hanya `A-Z 0-9 - .`, uppercase, maksimal 25 karakter. QRIS adalah format ASCII — karakter di luar itu merusak prefix panjang.
→ Kalau sumber tidak punya tag `62` sama sekali, buat baru sebelum CRC.

**P5 — Validasi diri.**
→ Validasi payload **sumber** di awal (tolak kalau CRC-nya sudah rusak), dan validasi **hasil** di akhir. Kalau hasil tidak valid, lempar error. Lebih baik gagal keras daripada menyerahkan QR rusak ke pembeli yang sedang memegang HP-nya.

## 2.4 — Helper nominal unik

**File baru:** `api/_lib/qris/uniqueAmount.ts`

Notifikasi bank hanya memuat **nominal dan waktu** — tidak ada `orderRef`. Tanpa nominal unik, dua order Rp 62.500 yang bersamaan tidak bisa dibedakan sama sekali, dan auto-unlock jadi mustahil. Inilah fondasi Langkah 3 nanti.

Spesifikasi:
- `finalAmount = baseAmount - (baseAmount % 1000) + suffix`, dengan `suffix` di rentang **100–999**
- **Deterministik** dari hash `orderRef` — `orderRef` yang sama harus selalu menghasilkan nominal yang sama, supaya retry tidak pernah memunculkan angka kedua yang bertabrakan
- Terima parameter `attempt` untuk regenerasi kalau nominal bentrok dengan order aktif lain
- Tolak `baseAmount < 1000`

## 2.5 — Test suite

Pakai Vitest. Tambahkan script `"test": "vitest run"` ke `package.json`.

Minimal harus mencakup:
- Fixture asli: panjang 224, CRC `0487`, `validateQRIS().valid === true`
- Output **sama persis** dengan payload known-good di §2.2
- `tag 01` → `12`, `parseQRIS().method === "dynamic"`
- `tag 54` = nominal yang diminta, CRC berubah dari aslinya
- **`tag 62` ter-merge: sub-tag `01` = orderRef DAN sub-tag `07` = `A01` masih ada** ← test paling penting
- Tanpa `additional`, tag `62` tetap persis `0703A01`
- Sumber tanpa tag `01` → output tetap `01`=`12`, dan posisinya tepat setelah tag `00`
- Idempoten: konversi dua kali menghasilkan payload identik
- Round-trip untuk beberapa nominal: 1000, 62317, 150429, 5000317
- Sanitasi: `"lcl/2608#23 k7m2p"` → `"LCL260823K7M2P"`
- Nominal `0`, negatif, `NaN`, `Infinity` → throw
- Sumber dengan CRC rusak → throw
- Nominal unik: deterministik, selalu 100–999, floor ribuan terjaga, `attempt` berbeda → nominal berbeda

**Kriteria selesai Langkah 2:**
- [ ] Semua test hijau, termasuk assertion literal payload known-good
- [ ] Test merge tag `62` lulus — `0703A01` tidak hilang
- [ ] `npm run lint` dan `npm run build` lolos
- [ ] Tidak ada file QRIS di bawah `src/`
- [ ] **Uji nyata:** generate QR dari hasil konversi, scan dengan **minimal 3 aplikasi** (GoPay, DANA, dan satu m-banking). Nominal harus terisi otomatis di ketiganya.

> Uji scan nyata tidak bisa digantikan unit test. CRC valid hanya membuktikan payload-nya konsisten secara struktur — bukan bahwa aplikasi bank mau menerimanya.

---

# CARA MENJALANKAN

```
Baca PROMPT-LANGKAH-1-2-Fondasi.md.
Kerjakan LANGKAH 1 saja, sub-bagian 1.1 dan 1.2 dulu.
Tunjukkan diff per file dan jelaskan setiap perubahan.
Berhenti dan tunggu konfirmasi saya sebelum lanjut ke 1.3.
```

Setelah Langkah 1 tuntas dan webhook terbukti lolos verifikasi:

```
Lanjut ke LANGKAH 2. Port core QRIS dan terapkan patch P1–P5.
Jalankan test suite dan tunjukkan hasilnya sebelum apa pun yang lain.
```

---

# YANG DIKERJAKAN PARALEL (di luar kode)

Kirim satu tiket ke `care@doku.com` dengan empat pertanyaan spesifik ini. Pertanyaan yang tepat biasanya memotong berhari-hari bolak-balik:

1. Channel mana saja yang ter-provision untuk **Checkout API non-SNAP** (`/checkout/v1/payment`) — bukan SNAP? Dashboard kami menampilkan semua VA sebagai ACTIVE dengan label (SNAP), tapi VA Mandiri mengembalikan error generic saat dipilih di halaman Checkout.
2. Kapan estimasi **QRIS** keluar dari status `UPDATING`, dan dokumen apa yang masih kurang dari sisi kami?
3. Apakah merchant kami punya akses **QRIS Direct API** yang mengembalikan raw `qr_string`? Kalau ya, mohon endpoint, struktur payload, dan nama field response-nya.
4. Mohon spesifikasi **HTTP Notification non-SNAP**: struktur body dan nilai `Request-Target` yang dipakai untuk verifikasi signature.

**Jangan menunggu jawabannya untuk mulai.** Langkah 1 dan 2 sudah bisa dikerjakan hari ini, dan begitu keduanya selesai, jalur QRIS manual sudah siap menerima uang sungguhan.
