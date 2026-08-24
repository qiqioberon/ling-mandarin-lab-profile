# PROMPT — QRIS OTOMATIS HARI INI
**Repo:** `ling-mandarin-latest`
**Target:** pembeli scan → bayar → e-book terbuka otomatis. Tanpa unggah bukti.
**Estimasi:** ~2 jam
**Catatan:** VA/SNAP **tidak** dikerjakan di sini — masih terblokir `partnerServiceId`.

---

## KENAPA VERSI INI LEBIH RINGAN

Rancangan sebelumnya memakai HMAC-SHA256 di sisi perangkat. MacroDroid tidak bisa menghitung HMAC dengan nyaman, dan itu membuat seluruh rencana mandek.

Versi ini memakai **bearer token acak panjang di atas HTTPS**. Secara teori lebih lemah dari HMAC, tapi untuk endpoint yang hanya menerima teks notifikasi dan tidak pernah memindahkan uang, ini memadai — dan bisa selesai hari ini.

Pengaman sesungguhnya bukan di tanda tangan, melainkan di **aturan pencocokan**: nominal harus cocok persis, order harus aktif, dan hanya boleh ada satu kandidat.

---

# BAGIAN 0 — `.gitignore` (5 menit, kerjakan pertama)

Repo **belum punya `.gitignore` sama sekali**, sementara `doku-private.pem`, `.env`, dan `.claude/` ada di working tree. Sekali `git add .`, private key masuk ke history.

Buat `.gitignore`:
```
node_modules
dist
.vercel
.env
.env.*
!.env.example
*.pem
.claude/settings.local.json
*.local
```

Lalu pastikan belum terlanjur:
```bash
git rm --cached doku-private.pem .env 2>/dev/null
git status
```

Kalau `doku-private.pem` ternyata sudah pernah ter-commit, **generate keypair baru** setelah `.gitignore` terpasang. Jangan dipakai ulang.

---

# BAGIAN 1 — Perbaiki `reconcile.ts` (10 menit)

**File:** `api/admin/reconcile.ts` baris 66

```ts
.eq('status', 'awaiting_verification')
```

Begitu unggah bukti tidak lagi wajib, order akan tetap berstatus `pending` — dan rekonsiliasi **tidak akan pernah menemukannya**. Ini bug diam yang akan mematikan jalur cadangan Anda tepat saat dibutuhkan.

Ubah menjadi:
```ts
.in('status', ['pending', 'awaiting_verification'])
.eq('qris_provider', 'self')
```

Filter `qris_provider` mencegah order Doku ikut tersapu — nominalnya tidak unik dan bisa menimbulkan kecocokan palsu.

---

# BAGIAN 2 — Migrasi Tabel Audit (10 menit)

`supabase/migrations/<timestamp>_payment_notifications.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL DEFAULT 'bridge',
  raw           text NOT NULL,
  package_name  text,
  parsed_amount integer,
  matched       boolean DEFAULT false,
  order_ref     text,
  reason        text,
  nonce         text UNIQUE,
  received_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_notifications_recent_idx
  ON public.payment_notifications (created_at DESC);

ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;
-- Tanpa policy: hanya service-role key dari backend yang bisa mengakses.
```

`nonce UNIQUE` memberi proteksi replay langsung di level database.

Tabel ini yang akan Anda pakai memperbaiki regex di hari-hari pertama. Notifikasi yang gagal di-parse tetap menyimpan `raw`-nya, jadi perbaikannya berdasarkan teks asli, bukan tebakan.

---

# BAGIAN 3 — `POST /api/qris-notify` (45 menit)

## Autentikasi
Header `Authorization: Bearer <QRIS_BRIDGE_TOKEN>`.
- Bandingkan dengan `crypto.timingSafeEqual` (cek panjang buffer dulu)
- Tolak kalau `receivedAt` menyimpang lebih dari 15 menit dari waktu server
- `nonce` wajib; duplikat ditolak lewat unique constraint

Body parser boleh menyala — tidak ada digest yang perlu dihitung dari raw byte.

## Body
```json
{
  "raw": "<teks notifikasi apa adanya>",
  "packageName": "<opsional>",
  "receivedAt": "<ISO-8601>",
  "nonce": "<uuid acak>"
}
```

## Parsing nominal
**Pakai ulang `extractAmounts()` dari `api/admin/reconcile.ts`.** Ekstrak ke `api/_lib/parseAmount.ts` agar jembatan dan rekonsiliasi memakai parser yang sama. Kalau tidak, keduanya akan menyimpang dan bug-nya cuma muncul di salah satu jalur.

Fungsi yang ada sudah menangani format Indonesia (`62.561` → `62561`) dan menyaring nilai di bawah 1000.

## Aturan pencocokan
Semua harus terpenuhi untuk auto-unlock:
1. Tepat **satu** order dengan `final_amount` sama persis
2. Status `pending` atau `awaiting_verification`
3. `qris_provider = 'self'`
4. `expires_at` belum lewat
5. Belum `paid`
6. `final_amount` ≤ `AUTO_UNLOCK_MAX_AMOUNT`

Terpenuhi → `settlePayment({ orderRef, source: 'bridge' })` → catat `matched=true`.
Tidak terpenuhi → catat `matched=false` + `reason`, kirim alert Telegram, **jangan unlock**.

### Order kedaluwarsa — jangan pernah auto-settle
Unique index hanya mencakup order aktif, jadi nominal milik order expired **bisa dipakai ulang** order baru. Mencocokkan ke order expired berisiko membuka akses untuk orang yang salah.

→ Kalau tidak ada order aktif yang cocok, cari order expired dalam 24 jam terakhir. Ketemu? Kirim alert Telegram, biarkan admin memutuskan lewat `/admin/orders`.

## Selalu balas HTTP 200
Bahkan saat token salah atau tidak cocok. MacroDroid akan retry berulang kalau menerima error. Cukup catat alasannya dan balas `{ received: true }`.

## Mode belajar
Env `BRIDGE_MODE`:
- `learn` — catat dan parse, **tidak pernah settle**, kirim ringkasan ke Telegram
- `live` — auto-unlock aktif

Default `learn`.

---

# BAGIAN 4 — Frontend (20 menit)

**`src/components/payment/QrisPayment.tsx`** — balik prioritasnya.

**0–3 menit, status `pending`:**
> "Menunggu pembayaran. Setelah Anda bayar, akses e-book terbuka otomatis dalam beberapa detik — tidak perlu unggah bukti."

Sembunyikan tombol unggah bukti di fase ini. Tampilkan indikator halus bahwa sistem sedang memantau.

**Setelah 3 menit masih `pending`:**
> "Sudah bayar tapi belum terbuka? Kirim bukti transfer di sini."

Tombol unggah bukti dan WhatsApp muncul di sini.

**Polling:** 3 detik selama 5 menit pertama, lalu 15 detik. Berhenti saat status final.

**Jangan hapus alur unggah bukti.** Jembatan akan mati suatu saat — HP restart, Android membunuh listener, format notifikasi berubah. Saat itu terjadi, ini satu-satunya jalan pembeli menyelesaikan transaksi.

---

# BAGIAN 5 — Env

```bash
QRIS_BRIDGE_TOKEN=       # openssl rand -hex 32
BRIDGE_MODE=learn        # naikkan ke 'live' setelah parsing terbukti
AUTO_UNLOCK_MAX_AMOUNT=500000
```

Tambahkan semuanya ke **Vercel → Settings → Environment Variables**, bukan hanya `.env` lokal.

---

# BAGIAN 6 — Deploy (15 menit)

Localhost tidak bisa dijangkau HP Anda. Deploy dulu.

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # produksi
```

Pastikan **semua** env sudah terpasang di Vercel: Supabase, `QRIS_STATIC_PAYLOAD`, `SERVICE_FEE`, `ADMIN_TOKEN`, Telegram, dan tiga env baru di atas.

Verifikasi cepat setelah deploy:
```bash
curl https://<domain>/api/pricing-config
```
Harus mengembalikan JSON. Kalau HTML, berarti routing `/api` bermasalah — cek `vercel.json`.

---

# BAGIAN 7 — MacroDroid (20 menit, dikerjakan manual di HP)

Di HP yang sudah ada Livin' Merchant:

1. Pasang **MacroDroid** dari Play Store
2. Buat Macro baru:
   - **Trigger:** Device Events → Notification → Received, filter ke aplikasi Livin' Merchant
   - **Action:** Applications → HTTP Request
     - Method: `POST`
     - URL: `https://<domain>/api/qris-notify`
     - Header: `Authorization: Bearer <QRIS_BRIDGE_TOKEN>`
     - Content-Type: `application/json`
     - Body:
       ```json
       {"raw":"[notification_text]","receivedAt":"[timestamp]","nonce":"[random:8]"}
       ```
       *(nama variabel MacroDroid bisa berbeda — pakai variabel notification text, dan sisipkan nilai acak untuk nonce)*

3. **Pengaturan HP yang wajib**, kalau tidak listener mati diam-diam:
   - Matikan battery optimization untuk MacroDroid **dan** Livin' Merchant
   - Kunci keduanya di recent apps
   - Colok charger, aktifkan "stay awake while charging"
   - Matikan auto-update Play Store untuk Livin' Merchant — update bisa mengubah format notifikasi tanpa peringatan

---

# BAGIAN 8 — Urutan Pengujian

**1. `BRIDGE_MODE=learn`**
Bayar sendiri nominal kecil. Cek tabel `payment_notifications`:
- Apakah notifikasi masuk?
- Apakah `parsed_amount` benar?
- Apakah `order_ref` cocok?

**2. Ulangi 2–3 kali.** Kalau ketiganya benar, parsing-nya bisa dipercaya.

**3. Naikkan ke `BRIDGE_MODE=live`.** Bayar sekali lagi → e-book harus terbuka tanpa sentuhan.

**4. Uji kegagalan.** Matikan MacroDroid → bayar → tidak terbuka otomatis, **tapi** unggah bukti + verifikasi admin harus tetap jalan.

Jangan lewati tahap `learn`. Kalau parsing meleset di `live`, gejalanya pembeli sudah bayar tapi e-book tidak terbuka — dan Anda baru tahu setelah ada yang komplain.

---

# KRITERIA SELESAI

- [ ] `.gitignore` ada, `*.pem` dan `.env*` tertutup
- [ ] `reconcile.ts` mencocokkan `pending` juga
- [ ] `extractAmounts()` dipakai bersama, tidak ada dua salinan
- [ ] `/api/qris-notify` menolak token salah, nonce berulang, timestamp basi
- [ ] Selalu balas `200`
- [ ] Order expired tidak pernah auto-settle
- [ ] Nominal di atas `AUTO_UNLOCK_MAX_AMOUNT` tidak auto-unlock
- [ ] `learn` tidak pernah memanggil `settlePayment()`
- [ ] Deploy berhasil, `/api/pricing-config` mengembalikan JSON
- [ ] MacroDroid mengirim notifikasi, tercatat di `payment_notifications`
- [ ] `live`: bayar → terbuka dalam ≤10 detik
- [ ] MacroDroid mati → jalur bukti tetap berfungsi penuh

---

# CARA MENJALANKAN

```
Kerjakan BAGIAN 0, 1, 2 dulu — gitignore, fix reconcile, migrasi.
Tunjukkan diff dan berhenti.
```

Lalu Bagian 3, lalu 4. Bagian 6 dan 7 Anda kerjakan manual.

---

# TENTANG VA

Tidak dikerjakan hari ini. Masih terblokir `partnerServiceId` — nilai yang dialokasikan bank acquirer, tidak ada di dashboard, dan tidak bisa direkayasa dari sisi merchant.

Satu-satunya cara mendapatkannya tanpa menghubungi Doku: buat **Payment Link** nominal kecil (channel ini `ACTIVE`), bayar, pilih Virtual Account. **8 karakter pertama nomor VA yang muncul = `partnerServiceId`.** Kalau prefix-nya kurang dari 8 digit, sisanya dipadding spasi di kiri.

Kalau Payment Link juga error, jalur itu buntu dan hanya Doku yang bisa membukanya. `api/_lib/snap/crypto.ts` sudah jadi dan tesnya hijau, jadi pekerjaan itu tidak hilang — tinggal menunggu satu nilai.
