# ADDENDUM — Menjalankan di Localhost
**Pelengkap untuk:** `PROMPT-LANGKAH-3-QRIS-Inline.md` dan `PROMPT-LANGKAH-4-Doku-SNAP-VA.md`
**Sisipkan sebagai Bagian 0.5 di kedua prompt.**

---

## A. APA YANG BISA DAN TIDAK BISA DI LOCALHOST

| Fitur | Localhost | Catatan |
|---|---|---|
| Converter QRIS + unit test | ✅ | murni offline |
| `POST /api/qris/create` | ✅ | tidak perlu jaringan eksternal |
| Render QR, countdown, upload bukti | ✅ | |
| Verifikasi admin manual | ✅ | |
| Token B2B SNAP | ✅ | panggilan **keluar** |
| Create VA SNAP | ✅ | panggilan **keluar** |
| **Webhook Doku non-SNAP** | ❌ | perlu tunnel |
| **Notifikasi pembayaran SNAP** | ❌ | perlu tunnel |
| **Token URL SNAP** | ❌ | perlu tunnel |
| Jembatan notifikasi Android | ❌ | perlu tunnel |

**Pola dasarnya:** apa pun yang **keluar** dari laptop Anda jalan. Apa pun yang harus **masuk** ke laptop Anda tidak, karena Doku tidak bisa menjangkau `localhost`.

Konsekuensi nyata: kalau Anda uji bayar VA tanpa tunnel, VA-nya terbuat dan uangnya masuk, tapi order **tidak akan pernah** berubah jadi `paid`. Gejalanya persis sama dengan bug signature — jangan sampai tertukar dan menghabiskan waktu men-debug kripto yang sebenarnya sudah benar.

---

## B. `npm run dev` TIDAK MENJALANKAN FOLDER `api/`

Vite hanya melayani frontend. Folder `api/` adalah Vercel Functions dan butuh runtime terpisah.

```bash
npm i -g vercel
vercel dev
```

Tanpa ini, setiap `fetch('/api/...')` mengembalikan HTML `index.html`, bukan JSON — persis kondisi yang sudah diantisipasi guard di `Checkout.tsx`:

> *"Endpoint API tidak merespons dengan JSON. Pastikan Anda menjalankan server backend (Vercel dev)."*

Kalau pesan itu muncul, penyebabnya hampir selalu ini, bukan bug kode.

**Tambahkan ke `package.json`:**
```json
"scripts": {
  "dev:api": "vercel dev",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Catat port yang dipakai `vercel dev` (biasanya `3000`, berbeda dari port Vite `8080`). Seluruh konfigurasi di bawah memakai port itu.

---

## C. TUNNEL UNTUK NOTIFIKASI MASUK

Wajib untuk menguji webhook non-SNAP, notifikasi SNAP, dan jembatan Android.

**Cloudflare Tunnel** — gratis, tanpa daftar, paling praktis:
```bash
cloudflared tunnel --url http://localhost:3000
```
Keluar URL seperti `https://random-words-1234.trycloudflare.com`.

**ngrok** — alternatif; versi gratis memberi URL acak juga.

### Daftarkan URL-nya di Doku Dashboard

| Pengaturan | Nilai |
|---|---|
| HTTP Notification URL (non-SNAP) | `https://<tunnel>/api/doku-webhook` |
| SNAP Notification URL | `https://<tunnel>/api/snap/transfer-va/payment` |
| SNAP Token URL | `https://<tunnel>/api/snap/access-token/b2b` |

### ⚠️ Konsekuensi yang mudah terlewat

**URL tunnel gratis berubah setiap restart.** Padahal `Request-Target` ikut masuk ke perhitungan signature. Kalau URL berganti tapi dashboard belum diperbarui, verifikasi signature gagal dan pesannya tidak akan menyebut soal URL sama sekali.

→ Selama sesi pengujian, **jangan restart tunnel**. Kalau terpaksa, perbarui dashboard **dan** env `DOKU_NOTIFICATION_PATH` bersamaan.

→ Alternatif yang lebih stabil: pakai **Vercel Preview Deployment**. URL-nya tetap per branch, HTTPS asli, dan tidak perlu tunnel sama sekali. Lebih cocok untuk pengujian notifikasi yang berlangsung berhari-hari.

---

## D. `callback_url` DI LOCALHOST

`api/checkout.ts` menyusun callback dari `req.headers.host`:
```ts
const host = req.headers.host || 'www.lingchineselab.com';
const protocol = host.includes('localhost') ? 'http' : 'https';
```

Di localhost ini menghasilkan `http://localhost:3000/payment/pending?...`. Untuk redirect di browser sendiri tidak masalah, tapi **Doku produksi bisa menolak callback non-HTTPS**.

→ Tambahkan override eksplisit:
```
PUBLIC_BASE_URL=https://<tunnel>
```
Pakai `PUBLIC_BASE_URL` kalau ada, baru fallback ke `req.headers.host`. Ini juga menghindari `callback_url` salah saat request lewat proxy.

---

## E. JAM SISTEM

SNAP menolak request kalau `X-TIMESTAMP` menyimpang lebih dari beberapa menit dari jam server Doku.

```bash
timedatectl status        # pastikan NTP aktif
```

Kalau jam laptop meleset, semua request SNAP gagal dengan error yang terlihat seperti masalah signature. Ini penyebab yang sering terlewat karena tidak ada hubungannya dengan kode.

Offset zona waktu juga harus benar — timestamp SNAP berformat `+07:00`, dan nilainya dihitung dari zona sistem.

---

## F. ⚠️ QRIS TIDAK PUNYA SANDBOX

Ini yang paling penting dipahami sebelum menguji.

`QRIS_STATIC_PAYLOAD` adalah **QRIS produksi Toko Fira**. Tidak ada versi sandbox-nya. Scan QR hasil konversi = **uang sungguhan berpindah**, bahkan saat dijalankan dari `localhost`.

**Aturan pengujian:**
- Pakai nominal kecil. Set `SERVICE_FEE=0` dan buat produk uji seharga Rp 1.000–2.000 di tabel `products`
- Nominal unik tetap berlaku, jadi tetap perlu ≥ Rp 1.000 supaya suffix 3 digit muat
- Uang masuk ke rekening merchant sungguhan — tidak bisa di-refund otomatis
- Isi `BETA_ALLOWED_EMAILS` supaya tidak ada orang lain yang tidak sengaja checkout

Sementara **VA SNAP punya sandbox**. Set `DOKU_IS_PRODUCTION=false` dan pakai kredensial sandbox untuk seluruh pengujian VA. Baru naikkan ke produksi saat verifikasi akhir.

---

## G. URUTAN PENGUJIAN LOKAL

**Tahap 1 — tanpa jaringan sama sekali**
```bash
npm run test
```
Converter QRIS, helper nominal unik, signature SNAP. Semua harus hijau sebelum apa pun yang lain.

**Tahap 2 — `vercel dev`, tanpa tunnel**
- `POST /api/qris/create` → QR muncul di `/payment/pending`
- Scan QR dengan HP (**uang sungguhan**, pakai nominal kecil)
- Upload bukti → status `awaiting_verification`
- Admin approve → e-book terbuka
- Token B2B SNAP berhasil → dapat `accessToken`
- Create VA → `responseCode` `2002700`

**Tahap 3 — dengan tunnel**
- Bayar VA sandbox → notifikasi masuk, tercatat di `snap_notifications`
- Verifikasi `settlePayment()` terpanggil dan idempotent
- Jembatan notifikasi Android (Langkah 5)

**Tahap 4 — Vercel Preview**
- Ulangi tahap 3 dengan URL yang stabil, lalu perketat verifikasi signature

---

## H. CHECKLIST SEBELUM MULAI

- [ ] `vercel dev` jalan, `/api/pricing-config` mengembalikan JSON
- [ ] Satu file env saja — `.env` dan `.env.local` lama sudah dihapus
- [ ] `SUPABASE_SERVICE_ROLE_KEY` berisi nilai asli, bukan `placeholder_service_role_key`
- [ ] `DOKU_IS_PRODUCTION=false` dan kredensial sandbox terpasang
- [ ] Jam sistem sinkron via NTP
- [ ] Produk uji murah ada di tabel `products`
- [ ] `BETA_ALLOWED_EMAILS` terisi
- [ ] `.gitignore` menutup `.env*` dan `*.pem`
- [ ] Tunnel jalan **dan** URL-nya sudah didaftarkan di dashboard (untuk tahap 3)
