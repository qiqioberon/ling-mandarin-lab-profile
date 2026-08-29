import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import QRCode from 'qrcode';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Upload, Copy, QrCode, Landmark, Clock } from 'lucide-react';

const ACCEPTED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
} as const;
const MAX_BYTES = 5 * 1024 * 1024;

// Fixed bank account for manual transfers.
const BCA = { number: '2160835373', holder: 'Celine' };

type Method = 'qris' | 'bca';

const formSchema = z.object({
  buyerName: z.string().min(2, 'Nama harus minimal 2 karakter'),
  buyerEmail: z.string().email('Format email tidak valid'),
  buyerWhatsapp: z
    .string()
    .min(9, 'Nomor WhatsApp tidak valid')
    .regex(/^[0-9+]+$/, 'Hanya masukkan angka'),
});

const formatPrice = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

type OrderInfo = {
  orderRef: string;
  method: Method;
  uploadUrl: string;
  baseAmount: number;
  serviceFee: number;
  uniqueCode: number;
  finalAmount: number;
  expiresAt: string;
};

function useCountdown(expiresAt?: string) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) return setLeft('kedaluwarsa');
      const h = Math.floor(ms / 3600_000);
      const m = Math.floor((ms % 3600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLeft(`${h}j ${m}m ${s}d`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return left;
}

export default function ManualPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { item } = useCart();

  // Buyer details carried over from the Store form (if arriving from there).
  const incomingBuyer = (location.state as { buyer?: { buyerName: string; buyerEmail: string; buyerWhatsapp: string } } | null)?.buyer;

  const [method, setMethod] = useState<Method>('qris');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [done, setDone] = useState<{ orderRef: string } | null>(null);

  const countdown = useCountdown(order?.expiresAt);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buyerName: incomingBuyer?.buyerName || '',
      buyerEmail: incomingBuyer?.buyerEmail || '',
      buyerWhatsapp: incomingBuyer?.buyerWhatsapp || '',
    },
  });

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  if (!item) {
    return (
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-foreground mb-4">Keranjang Kosong</h2>
        <p className="text-muted-foreground mb-6">Pilih produk terlebih dahulu.</p>
        <Button onClick={() => navigate('/store')}>Kembali ke Store</Button>
      </div>
    );
  }

  async function onCreateOrder(values: z.infer<typeof formSchema>) {
    try {
      setCreating(true);
      const res = await fetch('/api/manual/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.id,
          buyerName: values.buyerName,
          buyerEmail: values.buyerEmail,
          buyerWhatsapp: values.buyerWhatsapp,
          method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat pesanan');

      if (method === 'qris') {
        const qres = await fetch(`/api/manual/qris?orderRef=${encodeURIComponent(data.orderRef)}`);
        const qdata = await qres.json();
        if (!qres.ok) throw new Error(qdata.error || 'Gagal memuat QRIS');
        setQrDataUrl(await QRCode.toDataURL(qdata.payload, { width: 320, margin: 1 }));
      }

      setOrder({
        orderRef: data.orderRef,
        method: data.method,
        uploadUrl: data.uploadUrl,
        baseAmount: data.baseAmount,
        serviceFee: data.serviceFee,
        uniqueCode: data.uniqueCode,
        finalAmount: data.finalAmount,
        expiresAt: data.expiresAt,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setCreating(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!(f.type in ACCEPTED)) return toast.error('Format harus JPG, PNG, WEBP, atau PDF.');
    if (f.size > MAX_BYTES) return toast.error('Ukuran file maksimal 5 MB.');
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  async function onUploadProof() {
    if (!order || !file) return toast.error('Pilih file bukti pembayaran dulu.');
    try {
      setIsUploading(true);
      setProgress(5);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', order.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload gagal (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Upload gagal. Cek koneksi Anda.'));
        xhr.send(file);
      });
      setDone({ orderRef: order.orderRef });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
    } finally {
      setIsUploading(false);
    }
  }

  const copy = (text: string, label: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} disalin`))
      .catch(() => toast.error('Gagal menyalin'));

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-soft max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Bukti Terkirim!</h2>
          <p className="text-muted-foreground mb-4">
            Kode pesanan: <span className="font-mono font-bold text-foreground">{done.orderRef}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Kami verifikasi maksimal 1×24 jam. <strong>Link akses e-book akan kami kirim ke WhatsApp Anda</strong> setelah
            pembayaran diverifikasi.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">Kembali ke Beranda</Button>
        </div>
      </div>
    );
  }

  // ── Step 2: pay (QRIS or BCA) + upload proof ───────────────────────────────
  if (order) {
    return (
      <div className="min-h-screen bg-sand py-12 px-4 md:px-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-bold text-[#6A2B2B] mb-2">
            {order.method === 'bca' ? 'Transfer ke BCA' : 'Scan QRIS untuk Membayar'}
          </h1>

          <div className="bg-white p-6 rounded-xl shadow-soft text-center">
            {order.method === 'qris' ? (
              <>
                <p className="text-muted-foreground mb-4 text-sm">
                  Buka aplikasi bank / e-wallet apa saja, pilih <strong>Scan QRIS</strong>, arahkan ke kode ini,
                  lalu <strong>ketik nominal</strong> persis seperti di bawah.
                </p>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="QRIS Ling Chinese Lab" className="w-64 h-64 mx-auto rounded-lg" />
                )}
                <p className="text-sm text-muted-foreground mt-2">QRIS · Ling Chinese Lab</p>
              </>
            ) : (
              <div className="text-left">
                <div className="flex items-center gap-2 text-[#6A2B2B] font-bold mb-3">
                  <Landmark className="w-5 h-5" /> Transfer Bank BCA
                </div>
                <div className="bg-cream rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nomor Rekening</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold tracking-wide text-foreground">{BCA.number}</span>
                      <Button variant="outline" size="sm" onClick={() => copy(BCA.number, 'No. rekening')}>
                        <Copy className="w-4 h-4 mr-1" /> Salin
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atas Nama</p>
                    <p className="font-semibold text-foreground">{BCA.holder}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 bg-cream rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Nominal yang harus dibayar</p>
              <p className="text-3xl font-extrabold text-[#6A2B2B]">{formatPrice(order.finalAmount)}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => copy(String(order.finalAmount), 'Nominal')}
              >
                <Copy className="w-4 h-4 mr-1" /> Salin nominal
              </Button>
            </div>

            <div className="mt-4 flex items-start gap-2 text-left text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                Bayar <strong>tepat sampai 3 angka terakhir</strong>. Nominal ini adalah kode pesanan Anda —
                jumlah yang berbeda tidak dapat kami cocokkan.
              </span>
            </div>

            <div className="mt-4 text-xs text-muted-foreground space-y-1 text-left bg-sand/40 rounded-lg p-3">
              <div className="flex justify-between">
                <span>Harga e-book</span><span>{formatPrice(order.baseAmount - order.serviceFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya layanan</span><span>{formatPrice(order.serviceFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kode unik</span><span>{formatPrice(order.uniqueCode)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#6A2B2B] border-t pt-1">
                <span>Total</span><span>{formatPrice(order.finalAmount)}</span>
              </div>
            </div>

            {countdown && (
              <p className="mt-3 text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Berlaku {countdown}
              </p>
            )}
          </div>

          {/* Proof upload */}
          <div className="bg-white p-6 rounded-xl shadow-soft mt-6">
            <h2 className="font-bold text-foreground mb-1">Sudah bayar? Unggah bukti</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Setelah bayar, unggah bukti pembayaran. Link akses e-book dikirim ke WhatsApp Anda setelah diverifikasi.
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#6A2B2B]/30 rounded-xl p-6 cursor-pointer hover:bg-sand/30 transition-colors">
              {preview ? (
                <img src={preview} alt="Preview bukti" className="max-h-48 rounded-lg" />
              ) : file ? (
                <p className="text-sm text-foreground font-medium">{file.name}</p>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-[#6A2B2B]/50 mb-2" />
                  <span className="text-sm text-muted-foreground text-center">
                    Klik untuk unggah (JPG, PNG, WEBP, PDF · maks 5 MB)
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={onPickFile}
                disabled={isUploading}
              />
            </label>

            {isUploading && (
              <div className="space-y-1 mt-4">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">Mengunggah… {progress}%</p>
              </div>
            )}

            <Button
              onClick={onUploadProof}
              disabled={isUploading || !file}
              className="w-full mt-4 bg-[#6A2B2B] hover:bg-[#6A2B2B]/90 text-white font-bold h-14 text-lg rounded-xl"
            >
              {isUploading ? 'Mengunggah…' : 'Kirim Bukti Pembayaran'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: buyer details + method choice ──────────────────────────────────
  return (
    <div className="min-h-screen bg-sand py-12 px-4 md:px-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-[#6A2B2B] mb-1">Pembayaran</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Isi data Anda dan pilih metode. Link akses e-book dikirim via WhatsApp setelah pembayaran diverifikasi.
        </p>

        <div className="bg-white p-6 rounded-xl shadow-soft">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateOrder)} className="space-y-5">
              <FormField
                control={form.control}
                name="buyerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Anda" className="bg-sand/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="buyerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@contoh.com" className="bg-sand/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="buyerWhatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor WhatsApp</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="081234567890" className="bg-sand/30" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <p className="text-sm font-medium mb-2">Metode Pembayaran</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('qris')}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      method === 'qris'
                        ? 'border-[#6A2B2B] bg-[#6A2B2B]/5'
                        : 'border-border hover:bg-sand/30'
                    }`}
                  >
                    <QrCode className="w-6 h-6 text-[#6A2B2B] mb-1" />
                    <p className="font-bold text-sm text-foreground">QRIS</p>
                    <p className="text-[11px] text-muted-foreground">Scan pakai bank / e-wallet</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('bca')}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      method === 'bca'
                        ? 'border-[#6A2B2B] bg-[#6A2B2B]/5'
                        : 'border-border hover:bg-sand/30'
                    }`}
                  >
                    <Landmark className="w-6 h-6 text-[#6A2B2B] mb-1" />
                    <p className="font-bold text-sm text-foreground">Transfer BCA</p>
                    <p className="text-[11px] text-muted-foreground">a.n. {BCA.holder}</p>
                  </button>
                </div>
              </div>

              <div className="bg-cream rounded-xl p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga e-book</span>
                  <span className="font-medium">{formatPrice(item.price)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Biaya layanan &amp; kode unik ditambahkan di langkah berikutnya.
                </p>
              </div>

              <Button
                type="submit"
                disabled={creating}
                className="w-full bg-[#6A2B2B] hover:bg-[#6A2B2B]/90 text-white font-bold h-14 text-lg rounded-xl"
              >
                {creating ? 'Menyiapkan…' : 'Lanjut'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
