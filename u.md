# PROMPT — LANGKAH 5: Auto-Unlock Tanpa Unggah Bukti
**Repo:** `ling-mandarin-latest` (Ling Chinese Lab)
**Tool:** Claude Code, dijalankan dari root repo
**Tujuan:** pembeli scan QRIS → bayar → e-book terbuka otomatis. Tanpa unggah bukti, tanpa menunggu admin.

---

## STATUS SAAT INI (terverifikasi dari repo)

**Sudah jalan:**
- QRIS inline berfungsi, discan dan nominal langsung terisi ✅
- `settlePayment()` idempotent, satu sumber kebenaran untuk "lunas → akses terbuka"
- `/api/admin/reconcile` — cocokkan nominal dari teks mutasi
- `/api/admin/verify`, `/api/admin/orders`, `AdminOrders.tsx`
- Unique index `orders_final_amount_active_idx` mencakup `pending` **dan** `awaiting_verification`, dibatasi `qris_provider='self'`
- `notifyTelegram()` siap pakai

**Yang menghalangi auto-unlock:**
- Tidak ada sumber sinyal pembayaran. Satu-satunya jalan masuk saat ini adalah pembeli menekan "Saya Sudah Bayar" lalu unggah bukti
- `reconcile.ts` hanya mencocokkan `status='awaiting_verification'`. Kalau bukti tidak lagi diunggah, order tetap `pending` dan **tidak akan pernah cocok**
- Belum ada tabel audit notifikasi

---

## CARA KERJANYA

QRIS statis tidak punya webhook resmi. Kita bangun sendiri, memanfaatkan fakta bahwa acquirer Anda adalah **Bank Mandiri** — setiap pembayaran masuk memunculkan notifikasi di aplikasi **Livin' Merchant**.

```
Pembeli scan QR  →  Livin' Merchant terima notifikasi push
                          │
                          ▼
              HP Android + notification listener
                          │  POST + HMAC
                          ▼
                 POST /api/qris-notify
                          │
                          ▼
              Cocokkan berdasarkan NOMINAL UNIK
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
    cocok tunggal & valid        ambigu / gagal
            │                           │
            ▼                           ▼
    settlePayment()              catat + alert admin
    e-book terbuka                (TIDAK auto-unlock)
            │
            ▼
    FE polling → terbuka dalam ±3–10 detik
```

**Nominal unik adalah kunci korelasinya.** Notifikasi bank hanya memuat nominal dan waktu — tidak ada `orderRef`. Tanpa 3 digit unik, dua order Rp 62.500 yang bersamaan mustahil dibedakan.

---

# BAGIAN 1 — Migrasi Database

`supabase/migrations/<timestamp>_notification_bridge.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source         text NOT NULL,              -- 'bridge' | 'manual'
  raw            text NOT NULL,              -- teks notifikasi apa adanya
  package_name   text,
  parsed_amount  integer,
  matched        boolean DEFAULT false,
  order_ref      text,
  reason         text,                       -- alasan kalau tidak cocok
  nonce          text UNIQUE,                -- proteksi replay dari DB
  received_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_notifications_amount_idx
  ON public.payment_notifications (parsed_amount, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_notifications_unmatched_idx
  ON public.payment_notifications (created_at DESC) WHERE matched = false;

ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;
-- Tanpa policy: hanya service-role key dari backend yang bisa mengakses.
```

`nonce UNIQUE` memberi proteksi replay gratis di level database — notifikasi yang sama dikirim dua kali langsung ditolak.

**Tabel ini bukan opsional.** Selama format notifikasi Livin' Merchant belum terbukti, ini satu-satunya cara melihat apa yang sebenarnya dikirim. Notifikasi yang gagal di-parse tetap menyimpan `raw`-nya, jadi regex bisa diperbaiki berdasarkan teks asli, bukan tebakan.

---

# BAGIAN 2 — `POST /api/qris-notify`

## 2.1 — Autentikasi

Header `X-Bridge-Signature: <HMAC-SHA256 dari raw body, key = QRIS_BRIDGE_SECRET>`.

- `export const config = { api: { bodyParser: false } }` — baca raw body, hitung HMAC dari string mentah itu. **Pola yang sama persis dengan webhook non-SNAP**: jangan `JSON.stringify` ulang, digest-nya tidak akan cocok
- Bandingkan dengan `crypto.timingSafeEqual`, cek panjang buffer dulu
- Tolak kalau `receivedAt` menyimpang lebih dari 15 menit dari waktu server
- `nonce` wajib ada; duplikat ditolak lewat unique constraint

## 2.2 — Body

```json
{
  "raw": "<teks notifikasi apa adanya>",
  "packageName": "<package sumber>",
  "receivedAt": "<ISO-8601>",
  "nonce": "<uuid acak>"
}
```

## 2.3 — Parsing nominal

**Jangan pakai satu regex kaku.** Coba beberapa pola berurutan:
```
/Rp\.?\s*([\d.,]+)/i
/(?:sebesar|senilai|nominal|amount)\s*(?:Rp\.?)?\s*([\d.,]+)/i
```
Normalisasi format Indonesia: `62.561` → `62561`, `62.561,00` → `62561`.

**Pakai ulang `extractAmounts()` yang sudah ada di `api/admin/reconcile.ts`.** Ekstrak ke `api/_lib/parseAmount.ts` agar jembatan dan rekonsiliasi memakai parser yang sama — kalau tidak, keduanya akan menyimpang dan bug-nya hanya muncul di salah satu jalur.

## 2.4 — Aturan pencocokan

Semua syarat berikut harus terpenuhi untuk auto-unlock:

1. Ada **tepat satu** order dengan `final_amount` sama persis
2. Statusnya `pending` **atau** `awaiting_verification`
3. `qris_provider = 'self'`
4. `expires_at` belum lewat
5. Belum `paid`
6. `final_amount` ≤ `AUTO_UNLOCK_MAX_AMOUNT`

Kalau semua terpenuhi → `settlePayment({ source: 'bridge' })` → simpan notifikasi dengan `matched=true`.

Kalau ada yang gagal → simpan `matched=false` berikut `reason`, kirim alert Telegram, **jangan auto-unlock**.

### ⚠️ Kasus order kedaluwarsa

Pembeli bisa membayar di menit ke-31, setelah order expired. Godaannya adalah tetap meloloskan — **jangan**.

Unique index hanya mencakup order aktif, jadi nominal milik order yang sudah expired **bisa dipakai ulang** oleh order baru. Mencocokkan ke order expired berisiko membuka akses untuk orang yang salah.

→ Kalau tidak ada order aktif yang cocok, cari order expired dalam 24 jam terakhir. Kalau ketemu, kirim alert Telegram berisi detailnya dan biarkan admin yang memutuskan lewat `/admin/orders`. Jangan pernah auto-settle order expired.

## 2.5 — Selalu balas HTTP 200

Bahkan saat tidak cocok atau signature salah. Aplikasi otomasi Android akan retry berulang kalau menerima error, dan endpoint Anda akan dibanjiri. Cukup catat alasannya di `payment_notifications` dan balas `200` dengan body `{ received: true }`.

---

# BAGIAN 3 — Mode Belajar (jangan diskip)

Format notifikasi Livin' Merchant belum kita ketahui. Menyalakan auto-unlock langsung berarti menebak.

Tambahkan env `BRIDGE_MODE`:

| Nilai | Perilaku |
|---|---|
| `learn` | Catat semua notifikasi, parse, **tapi tidak pernah settle**. Kirim ringkasan ke Telegram: teks mentah + nominal terparse + order yang cocok |
| `live` | Auto-unlock aktif penuh |

**Jalankan `learn` selama beberapa hari pengujian.** Bayar sendiri beberapa kali dengan nominal kecil, periksa apakah parsing-nya benar dan pencocokannya tepat sasaran. Baru pindah ke `live`.

Kalau nanti parsing meleset di `live`, gejalanya adalah pembeli sudah bayar tapi e-book tidak terbuka — dan Anda baru tahu setelah ada yang komplain. Mode `learn` memindahkan penemuan itu ke saat Anda sedang menonton.

---

# BAGIAN 4 — Perbaiki `reconcile.ts`

Sekarang hanya mencocokkan `status='awaiting_verification'`. Dengan bukti tidak lagi wajib, order akan tetap `pending` — dan rekonsiliasi manual **tidak akan pernah menemukannya**.

→ Ubah filter menjadi `.in('status', ['pending', 'awaiting_verification'])`.
→ Tambahkan filter `qris_provider = 'self'` supaya order Doku tidak ikut tersapu.

Ini bug diam. Tanpa perbaikan ini, jalur cadangan manual Anda ikut mati bersamaan dengan dihapusnya unggah bukti.

---

# BAGIAN 5 — Jembatan di Sisi Perangkat

## Perangkat
HP Android mana pun yang selalu menyala dan terhubung internet, dengan **Livin' Merchant** terpasang dan login sebagai merchant Toko Fira.

## Aplikasi otomasi
**MacroDroid** paling sederhana. Tasker atau Automate juga bisa.

- **Trigger:** Notification received, filter ke package Livin' Merchant
- **Action:** HTTP POST ke `https://<domain>/api/qris-notify`
- Body: `raw`, `packageName`, `receivedAt`, `nonce` (pakai variabel UUID/random dari aplikasi)
- Header: `X-Bridge-Signature` — HMAC-SHA256 dari body

**Kalau aplikasi otomasi tidak bisa menghitung HMAC:** jangan kirim body tanpa tanda tangan. Alternatifnya, pakai secret statis panjang di header `X-Bridge-Token` **dan** wajibkan HTTPS. Lebih lemah dari HMAC, tapi masih jauh lebih baik daripada endpoint terbuka. Catat pilihan ini di README agar tidak terlupa saat audit.

## Pengaturan HP yang wajib
Tanpa ini listener akan mati diam-diam:
- Matikan battery optimization untuk aplikasi otomasi **dan** Livin' Merchant
- Kunci kedua aplikasi di recent apps
- Colok charger permanen, aktifkan "stay awake while charging"
- Aktifkan auto-start setelah reboot
- Matikan auto-update Play Store untuk Livin' Merchant — update bisa mengubah format notifikasi tanpa peringatan

---

# BAGIAN 6 — Health Check

Kegagalan diam adalah mode kegagalan terburuk di sistem ini. HP restart, listener dimatikan Android, internet putus — dan Anda tidak tahu sampai ada pembeli yang komplain.

**`GET /api/admin/bridge-health`** (dilindungi `ADMIN_TOKEN`):
```json
{
  "lastNotificationAt": "...",
  "minutesSinceLast": 42,
  "pendingOrders": 3,
  "oldestPendingMinutes": 18,
  "unmatchedLast24h": 0,
  "healthy": true
}
```

**Cron harian** (Vercel Cron): kalau ada order `pending` lebih dari 30 menit **dan** tidak ada notifikasi masuk dalam 6 jam terakhir → alert Telegram: *"Jembatan notifikasi kemungkinan mati."*

**Alert anomali:** lebih dari 10 notifikasi tidak cocok dalam 1 jam → kirim alert. Bisa jadi ada yang menyelidik endpoint Anda.

---

# BAGIAN 7 — Frontend

## 7.1 — `QrisPayment.tsx`: ubah pesan utama

Sekarang tombol "Saya Sudah Bayar" + unggah bukti adalah aksi utama. **Balik prioritasnya.**

**Status `pending`, 0–3 menit pertama:**
> "Menunggu pembayaran. Setelah Anda bayar, akses e-book akan terbuka otomatis dalam beberapa detik — tidak perlu unggah bukti."

Tampilkan indikator halus (pulse/spinner kecil) yang menandakan sistem sedang memantau. Jangan tampilkan tombol unggah bukti sama sekali di fase ini.

**Setelah 3 menit masih `pending`:**
Munculkan fallback secara tenang, tanpa membuat panik:
> "Sudah bayar tapi belum terbuka? Kirim bukti transfer di sini."

Tombol unggah bukti dan tombol WhatsApp muncul di titik ini.

**Status `paid`:**
Animasi sukses + tombol "Buka E-Book Saya" → `/library`.

Alur unggah bukti dan `/api/confirm-payment` **tetap dipertahankan**, hanya turun jadi jalur cadangan. Jangan dihapus — jembatan akan mati suatu saat, dan saat itu terjadi inilah satu-satunya jalan pembeli menyelesaikan transaksi.

## 7.2 — Polling

Turunkan ke **3 detik** selama 5 menit pertama supaya unlock terasa instan, lalu naik ke 15 detik. Berhenti otomatis saat status final.

## 7.3 — `AdminOrders.tsx`

Tambahkan tab **"Notifikasi"** — daftar `payment_notifications` terbaru, kolom: waktu, nominal terparse, cocok/tidak, alasan, dan teks mentah (bisa di-expand).

Untuk yang tidak cocok, sediakan tombol "Cocokkan manual" → pilih order → `settlePayment({ source: 'admin' })`.

Halaman ini yang akan Anda pakai untuk memperbaiki regex di minggu-minggu awal.

---

# BAGIAN 8 — Environment

```bash
QRIS_BRIDGE_SECRET=          # openssl rand -hex 32
BRIDGE_MODE=learn            # 'learn' | 'live'
AUTO_UNLOCK_MAX_AMOUNT=500000
BRIDGE_STALE_ALERT_HOURS=6
```

---

# BAGIAN 9 — Kriteria Selesai

**Keamanan:**
- [ ] `/api/qris-notify` menolak HMAC salah, nonce berulang, dan timestamp basi
- [ ] Selalu balas `200`, tidak pernah memicu retry loop
- [ ] Nominal di atas `AUTO_UNLOCK_MAX_AMOUNT` **tidak** auto-unlock
- [ ] Order expired **tidak pernah** auto-settle — hanya alert ke admin

**Fungsional:**
- [ ] Semua notifikasi tercatat di `payment_notifications`, cocok maupun tidak
- [ ] `BRIDGE_MODE=learn` tidak pernah memanggil `settlePayment()`
- [ ] Nominal ambigu (>1 kandidat) tidak auto-unlock, masuk antrean admin
- [ ] `reconcile.ts` sekarang mencocokkan `pending` juga
- [ ] `extractAmounts()` dipakai bersama, tidak ada dua salinan
- [ ] Health check mendeteksi jembatan mati
- [ ] FE menampilkan "terbuka otomatis" di 3 menit pertama, fallback muncul setelahnya
- [ ] Jembatan dimatikan → unggah bukti + verifikasi admin tetap berfungsi penuh

**Uji end-to-end:**
- [ ] `learn`: bayar 3× nominal kecil, parsing benar semua, pencocokan tepat sasaran
- [ ] `live`: bayar → e-book terbuka dalam ≤10 detik tanpa sentuhan manusia
- [ ] Matikan HP jembatan → bayar → tidak terbuka otomatis, tapi jalur bukti tetap jalan

---

# CARA MENJALANKAN

```
Baca prompt LANGKAH 5.
Kerjakan BAGIAN 1, 2, dan 4 — migrasi, endpoint jembatan, dan
perbaikan reconcile. Set BRIDGE_MODE default ke 'learn'.
Tunjukkan diff dan berhenti sebelum Bagian 5.
```

Lalu Bagian 3 dan 6, baru Bagian 7 (frontend) terakhir — supaya pesan "terbuka otomatis" tidak tayang sebelum jembatannya benar-benar terbukti.

---

# CATATAN KEJUJURAN

Jembatan ini **mempercayai teks notifikasi dari sebuah HP**. Itu asumsi yang jauh lebih lemah daripada webhook bertanda tangan kriptografis dari bank.

Yang bisa salah, secara realistis:
- Format notifikasi berubah setelah update Livin' Merchant → parsing gagal
- Android membunuh listener demi baterai → sinyal berhenti tanpa peringatan
- Dua pembayaran dengan nominal identik dalam jendela waktu sempit → ditolak sebagai ambigu, jadi antre manual (ini perilaku yang benar, bukan bug)

Untuk e-book seharga puluhan ribu rupiah, risikonya sepadan dengan kemudahannya. Yang penting: `AUTO_UNLOCK_MAX_AMOUNT` menjaga batas atas, mode `learn` mencegah menebak, dan jalur manual tetap hidup sebagai jaring pengaman.

Kalau nanti volume naik atau nilai transaksi membesar, pindahlah ke QRIS dinamis resmi — lewat Bank Mandiri langsung (acquirer Anda sudah Mandiri, jadi NMID tidak berubah) atau aggregator berwebhook. Jembatan ini solusi jembatan, dan sebaiknya tetap begitu.
