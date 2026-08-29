import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCart, CartItem } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ShoppingCart, CheckCircle2, Lock, ChevronLeft, ChevronRight, Copy, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ACCEPTED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MAX_BYTES = 5 * 1024 * 1024;

// Soft-launch gate: the payment UI is hidden from the public until launch.
// Set VITE_PAYMENTS_LIVE=true to open it to everyone. Until then only the
// preview emails (logged in via Supabase OTP) see the checkout.
// ponytail: UI-only gate — the /api/manual/create endpoint stays reachable
// (a stray order is harmless; add a server flag if that changes).
const PAYMENTS_LIVE = import.meta.env.VITE_PAYMENTS_LIVE === 'true';
const PREVIEW_EMAILS = (
  import.meta.env.VITE_PREVIEW_EMAILS ||
  'lingchineselab@gmail.com,lingmandarinlab@gmail.com,firaniaputriharsanti23@gmail.com'
)
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);
const canPreviewPayments = (email?: string | null) =>
  !!email && PREVIEW_EMAILS.includes(email.toLowerCase());

type QrisOrder = {
  orderRef: string;
  uploadUrl: string;
  baseAmount: number;
  serviceFee: number;
  uniqueCode: number;
  finalAmount: number;
  expiresAt: string;
};

// Tipe untuk data produk dari tabel public.products
type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  cover_url: string;
};

// Mock data untuk fallback jika tabel products kosong
const mockProduct: Product = {
  id: "mock-123",
  slug: "test-katalog",
  title: "E-Book: Rahasia Huruf Mandarin (Vol. 1)",
  description: "Buku panduan komprehensif menguasai dasar-dasar huruf Mandarin (Hanzi). Cocok pemula–menengah, 10 unsur radikal, Step menulis, Latihan soal + kunci.",
  price: 60000,
  cover_url: "/coverling.png"
};

export default function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const showPayments = PAYMENTS_LIVE || canPreviewPayments(user?.email);
  const [previewPage, setPreviewPage] = useState(1); // 1, 2, 3 = preview pages, 4 = locked purchase page

  // Checkout form states
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'transfer'>('qris');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);

  // Inline QRIS payment popup (no page navigation, no re-entering data).
  const [qrisOrder, setQrisOrder] = useState<QrisOrder | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrisDynamic, setQrisDynamic] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [paidDone, setPaidDone] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, slug, title, description, price, cover_url')
          .eq('is_active', true);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setProducts(data);
        } else {
          // Jika kosong, pakai mock untuk testing UI
          setProducts([mockProduct]);
        }
      } catch (err: any) {
        console.error("Error fetching products:", err);
        setProducts([mockProduct]); // Fallback ke mock
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    const item: CartItem = {
      id: product.id,
      title: product.title,
      price: product.price,
      cover_url: product.cover_url,
      slug: product.slug
    };
    addToCart(item);
    toast.success("Berhasil ditambahkan ke keranjang");
  };

  const formatPrice = (price: number) => {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
    return formatted.replace(/^Rp\s?/, 'IDR ');
  };

  const handlePurchaseFromPreview = () => {
    checkoutRef.current?.scrollIntoView({ behavior: 'smooth' });
    const nameInput = document.getElementById('buyer-name');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 500);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) {
      toast.error("Nama Lengkap wajib diisi");
      return;
    }
    if (!buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      toast.error("Email tidak valid");
      return;
    }
    if (!buyerWhatsapp.trim() || buyerWhatsapp.length < 9 || !/^[0-9+]+$/.test(buyerWhatsapp)) {
      toast.error("Nomor WhatsApp tidak valid (angka saja, min. 9 digit)");
      return;
    }

    const targetProduct = products.length > 0 ? products[0] : mockProduct;

    if (paymentMethod === 'qris') {
      // Everything happens right here in a popup: create the order, render the
      // QR (nominal already embedded), and upload proof — no page hops, no
      // retyping name/email.
      try {
        setIsSubmitting(true);
        const res = await fetch('/api/manual/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: targetProduct.id,
            buyerName,
            buyerEmail,
            buyerWhatsapp,
            method: 'qris',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal membuat pesanan');

        const qres = await fetch(`/api/manual/qris?orderRef=${encodeURIComponent(data.orderRef)}`);
        const qdata = await qres.json();
        if (!qres.ok) throw new Error(qdata.error || 'Gagal memuat QRIS');

        setQrDataUrl(await QRCode.toDataURL(qdata.payload, { width: 320, margin: 1 }));
        setQrisDynamic(!!qdata.isDynamic);
        setPaidDone(false);
        setProofFile(null);
        setProofPreview(null);
        setQrisOrder({
          orderRef: data.orderRef,
          uploadUrl: data.uploadUrl,
          baseAmount: data.baseAmount,
          serviceFee: data.serviceFee,
          uniqueCode: data.uniqueCode,
          finalAmount: data.finalAmount,
          expiresAt: data.expiresAt,
        });
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Transfer Bank (Manual)
      const waNumber = '6285100195519';
      const messageText = `Halo Ling Chinese Lab, saya ingin membeli E-Book Mandarin Vol. 1 via Transfer Bank.\n\n` +
        `Detail Pembeli:\n` +
        `• Nama: ${buyerName}\n` +
        `• Email: ${buyerEmail}\n` +
        `• WhatsApp: ${buyerWhatsapp}\n\n` +
        `Saya akan mengirimkan bukti transfer setelah ini.`;
      
      const encodedMsg = encodeURIComponent(messageText);
      const url = `https://wa.me/${waNumber}?text=${encodedMsg}`;
      
      toast.success("Membuka WhatsApp untuk konfirmasi transfer...");
      window.open(url, '_blank');
    }
  };

  const copyText = (text: string, label: string) =>
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} disalin`))
      .catch(() => toast.error('Gagal menyalin'));

  const onPickProof = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!(f.type in ACCEPTED)) return toast.error('Format harus JPG, PNG, WEBP, atau PDF.');
    if (f.size > MAX_BYTES) return toast.error('Ukuran file maksimal 5 MB.');
    setProofFile(f);
    setProofPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const uploadProof = async () => {
    if (!qrisOrder || !proofFile) return toast.error('Pilih file bukti pembayaran dulu.');
    try {
      setUploading(true);
      setUploadProgress(5);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', qrisOrder.uploadUrl);
        xhr.setRequestHeader('Content-Type', proofFile.type);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload gagal (${xhr.status})`)));
        xhr.onerror = () => reject(new Error('Upload gagal. Cek koneksi Anda.'));
        xhr.send(proofFile);
      });
      setPaidDone(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Store - Background kembali ke warna netral yang elegan */}
      <div className="bg-[#f4efe9] border-b border-[#6A2B2B]/10 py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#6A2B2B] tracking-tight">OFFICIAL STORE</h1>
            <p className="text-[#6A2B2B]/70 mt-2 text-lg font-medium">Ling Chinese Lab</p>
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="w-12 h-12 relative bg-white border-[#6A2B2B]/20 hover:bg-[#6A2B2B]/5 hover:border-[#6A2B2B]/30 transition-colors shadow-sm"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="w-6 h-6 text-[#6A2B2B]" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-12 px-4 md:px-8">
        
        {/* Highlight Section (Video Phone Frame + Copywriting) */}
        <div className="mb-16 grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] bg-white rounded-3xl p-6 md:p-10 shadow-soft border border-[#6A2B2B]/10">
          
          {/* E-Book Preview in Phone Frame */}
          <div className="flex justify-center">
            <div className="relative w-[280px] h-[580px] overflow-hidden rounded-[2.5rem] border-[8px] border-black bg-zinc-950 shadow-xl ring-4 ring-[#6A2B2B]/10 flex flex-col justify-between select-none">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 bg-black z-30 rounded-b-xl w-32 mx-auto"></div>

              {/* Status/Top Bar */}
              <div className="absolute top-8 inset-x-0 flex items-center justify-between px-5 py-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20">
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Pratinjau E-Book</span>
                <span className="text-[10px] text-white/60 font-semibold">
                  {previewPage <= 3 ? `Hal ${previewPage} dari 3` : 'Selesai'}
                </span>
              </div>

              {/* Slider Content */}
              <div className="w-full h-full flex flex-col justify-between pt-14 pb-20 relative">
                {previewPage <= 3 ? (
                  <div className="w-full flex-1 flex items-center justify-center bg-white overflow-hidden p-1">
                    <Document
                      file="/Lingchinenese.pdf"
                      loading={
                        <div className="flex flex-col items-center justify-center text-zinc-400 p-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#6A2B2B] mb-2" />
                          <p className="text-[11px] font-medium text-[#6A2B2B]/75">Memuat halaman...</p>
                        </div>
                      }
                      error={
                        <div className="flex flex-col items-center justify-center text-red-500 p-4 text-center">
                          <p className="text-xs font-semibold">Gagal memuat pratinjau</p>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={previewPage}
                        width={250}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="pointer-events-none shadow-sm"
                      />
                    </Document>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center px-5 text-center bg-gradient-to-b from-[#4A1A1A] to-[#1E0A0A] text-white relative">
                    <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[#6A2B2B]/20 blur-2xl"></div>
                    <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-[#6A2B2B]/20 blur-2xl"></div>

                    <div className="w-14 h-14 rounded-full bg-[#E5B869]/20 flex items-center justify-center mb-5 border border-[#E5B869]/30 animate-pulse z-10">
                      <Lock className="w-6 h-6 text-[#E5B869]" />
                    </div>
                    <h4 className="text-lg font-bold tracking-tight mb-2 text-[#E5B869] z-10">Ingin Lanjut Membaca?</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed mb-6 z-10">
                      Miliki versi lengkap e-book <strong className="text-white">Rahasia Huruf Mandarin (Vol. 1)</strong> untuk membuka 10 radikal utama, langkah penulisan guratan, serta kuis latihan lengkap.
                    </p>
                    <Button
                      onClick={handlePurchaseFromPreview}
                      className="w-full bg-[#E5B869] hover:bg-[#D4A758] text-[#331111] font-extrabold py-5 text-xs rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] z-10"
                    >
                      Beli E-Book Sekarang
                    </Button>
                  </div>
                )}
              </div>

              {/* Slider Bottom Controls */}
              <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-2 px-4 z-20">
                {/* Dots indicator */}
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPreviewPage(p)}
                      className="focus:outline-none transition-all duration-200"
                    >
                      {p === 4 ? (
                        <Lock className={`w-2.5 h-2.5 ${previewPage === 4 ? 'text-[#E5B869] scale-125' : 'text-zinc-500 hover:text-zinc-400'}`} />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full ${previewPage === p ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Nav buttons */}
                <div className="flex items-center justify-between w-full px-2">
                  {previewPage > 1 ? (
                    <button
                      onClick={() => setPreviewPage(prev => prev - 1)}
                      className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] font-semibold py-1 focus:outline-none"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Kembali
                    </button>
                  ) : (
                    <div />
                  )}

                  {previewPage < 4 ? (
                    <button
                      onClick={() => setPreviewPage(prev => prev + 1)}
                      className="flex items-center gap-1 text-white/80 hover:text-white text-[11px] font-semibold py-1 focus:outline-none ml-auto"
                    >
                      Lanjut <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Marketing Copy */}
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#6A2B2B]/10 text-[#6A2B2B] text-sm font-bold tracking-wide">
              E-BOOK TERBARU
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
              Rahasia Huruf Mandarin <span className="text-[#6A2B2B]">(Vol. 1)</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Buku panduan komprehensif menguasai dasar-dasar huruf Mandarin (Hanzi). Dirancang khusus dengan metode yang terstruktur agar proses belajar menjadi lebih mudah, cepat, dan menyenangkan.
            </p>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 bg-[#6A2B2B]/5 p-3 rounded-xl border border-[#6A2B2B]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6A2B2B]/10 shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-[#6A2B2B]" />
                </div>
                <p className="text-[1.05rem] font-semibold text-foreground/90">10 Unsur Radikal & Step Menulis (Guratan)</p>
              </div>
              <div className="flex items-center gap-4 bg-[#6A2B2B]/5 p-3 rounded-xl border border-[#6A2B2B]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6A2B2B]/10 shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-[#6A2B2B]" />
                </div>
                <p className="text-[1.05rem] font-semibold text-foreground/90">Cocok untuk Pemula hingga Menengah</p>
              </div>
              <div className="flex items-center gap-4 bg-[#6A2B2B]/5 p-3 rounded-xl border border-[#6A2B2B]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6A2B2B]/10 shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-[#6A2B2B]" />
                </div>
                <p className="text-[1.05rem] font-semibold text-foreground/90">Dilengkapi Latihan Soal + Kunci Jawaban Lengkap</p>
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Section — hidden pre-launch except for preview emails */}
        {showPayments ? (
        <div ref={checkoutRef} className="max-w-3xl mx-auto bg-white rounded-3xl p-6 md:p-10 shadow-soft border border-[#6A2B2B]/10 scroll-mt-6">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-extrabold text-foreground">Pembelian E-Book</h3>
            <p className="text-muted-foreground mt-2">Isi detail Anda di bawah ini untuk mendapatkan akses e-book</p>
          </div>

          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="buyer-name" className="text-sm font-semibold text-foreground">Nama Lengkap</label>
                <input
                  id="buyer-name"
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6A2B2B]/20 focus:border-[#6A2B2B] transition-all bg-sand/10 text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="buyer-whatsapp" className="text-sm font-semibold text-foreground">Nomor WhatsApp</label>
                <input
                  id="buyer-whatsapp"
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={buyerWhatsapp}
                  onChange={(e) => setBuyerWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6A2B2B]/20 focus:border-[#6A2B2B] transition-all bg-sand/10 text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="buyer-email" className="text-sm font-semibold text-foreground">Alamat Email</label>
              <input
                id="buyer-email"
                type="email"
                placeholder="email@contoh.com"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#6A2B2B]/20 focus:border-[#6A2B2B] transition-all bg-sand/10 text-foreground"
                required
              />
              <p className="text-xs text-muted-foreground">E-book akan dikaitkan dengan email ini untuk akses membaca.</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Pilih Metode Pembayaran</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QRIS Option */}
                <div
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                    paymentMethod === 'qris'
                      ? 'border-[#6A2B2B] bg-[#6A2B2B]/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-foreground">Scan QRIS</span>
                    <Badge className="bg-[#E5B869] text-[#331111] hover:bg-[#E5B869] font-bold text-[10px] tracking-wide border-none px-2 py-0.5">
                      CEPAT
                    </Badge>
                  </div>
                  <div className="mt-auto flex items-baseline gap-2">
                    <span className="text-lg font-black text-[#6A2B2B]">Rp 60.000</span>
                    <span className="text-[10px] text-muted-foreground">(+ kode unik 3 digit)</span>
                  </div>
                </div>

                {/* Transfer Option */}
                <div
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                    paymentMethod === 'transfer'
                      ? 'border-[#6A2B2B] bg-[#6A2B2B]/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-foreground">Transfer Bank (Manual)</span>
                    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 font-bold text-[10px] tracking-wide border-none px-2 py-0.5">
                      MANUAL
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    Kirim dana ke rekening kami dan konfirmasi via WhatsApp untuk verifikasi manual (maks 1x24 jam).
                  </p>
                  <div className="mt-auto flex items-baseline gap-2">
                    <span className="text-lg font-black text-[#6A2B2B]">Rp 60.000</span>
                    <span className="text-[10px] text-muted-foreground">(Tanpa biaya tambahan)</span>
                  </div>
                </div>
              </div>
              {paymentMethod === 'qris' && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                  Bayar via QRIS lalu unggah bukti. Link akses e-book dikirim ke WhatsApp Anda setelah diverifikasi (maks 1×24 jam).
                </p>
              )}
            </div>

            {paymentMethod === 'transfer' && (
              <div className="p-5 rounded-2xl bg-[#f4efe9]/60 border border-[#6A2B2B]/10 space-y-4 transition-all duration-300">
                <p className="text-xs font-bold text-[#6A2B2B] uppercase tracking-wider">Rekening Pembayaran</p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">BANK BCA</p>
                    <p className="text-lg font-black text-[#6A2B2B] tracking-wide mt-0.5">2160835373</p>
                    <p className="text-xs text-muted-foreground mt-0.5">a.n. Celine</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-[#6A2B2B]/20 text-[#6A2B2B] hover:bg-[#6A2B2B]/5 rounded-lg flex items-center gap-1.5 h-9 font-semibold text-xs shrink-0 bg-white"
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText('2160835373');
                      toast.success('Nomor rekening disalin!');
                    }}
                  >
                    Salin Rekening
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>1. Transfer tepat <strong>Rp 60.000</strong> ke rekening BCA di atas.</p>
                  <p>2. Simpan struk/bukti transfer Anda.</p>
                  <p>3. Isi formulir nama/email di atas, lalu klik tombol di bawah untuk mengirim bukti transfer ke WhatsApp admin.</p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-sand/10 border border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Harga E-Book</span>
                <span className="font-semibold text-foreground">Rp 60.000</span>
              </div>
              <div className="border-t border-dashed my-2 pt-2 flex justify-between font-bold text-base text-[#6A2B2B]">
                <span>Total Bayar</span>
                <span>Rp 60.000</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#6A2B2B] hover:bg-[#522121] text-white font-extrabold py-6 text-base rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-14"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-white" />
                  <span>Memproses...</span>
                </div>
              ) : paymentMethod === 'qris' ? (
                'Lanjut ke Pembayaran QRIS'
              ) : (
                'Konfirmasi Pembayaran via WhatsApp'
              )}
            </Button>
          </form>
        </div>
        ) : (
          <div ref={checkoutRef} className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-soft border border-[#6A2B2B]/10 scroll-mt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#E5B869]/20 flex items-center justify-center mx-auto mb-5 border border-[#E5B869]/30">
              <Lock className="w-7 h-7 text-[#E5B869]" />
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-foreground">Segera Hadir</h3>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">
              Pembelian e-book akan segera dibuka. Nantikan ya! 🙏
            </p>
          </div>
        )}
      </div>

      {/* Inline QRIS payment popup — data already entered, no page hop */}
      <Dialog open={!!qrisOrder} onOpenChange={(o) => { if (!o) { setQrisOrder(null); setPaidDone(false); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {paidDone ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto mb-3" />
              <DialogHeader><DialogTitle className="text-center">Bukti Terkirim!</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground mt-3">
                Kode pesanan: <span className="font-mono font-bold">{qrisOrder?.orderRef}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Kami verifikasi maks. 1×24 jam. <strong>Link akses e-book dikirim ke WhatsApp Anda</strong> setelah pembayaran diverifikasi.
              </p>
              <Button className="mt-5 w-full bg-[#6A2B2B] hover:bg-[#522121] text-white" onClick={() => setQrisOrder(null)}>Tutup</Button>
            </div>
          ) : qrisOrder && (
            <>
              <DialogHeader><DialogTitle>Scan &amp; Bayar QRIS</DialogTitle></DialogHeader>
              <div className="text-center">
                {qrDataUrl && <img src={qrDataUrl} alt="QRIS Ling Chinese Lab" className="w-56 h-56 mx-auto rounded-lg" />}
                <p className="text-xs text-muted-foreground">QRIS · Ling Chinese Lab</p>
                <div className="bg-[#f4efe9]/70 rounded-xl p-3 mt-3">
                  <p className="text-xs text-muted-foreground">Nominal</p>
                  <p className="text-2xl font-extrabold text-[#6A2B2B]">{formatPrice(qrisOrder.finalAmount)}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => copyText(String(qrisOrder.finalAmount), 'Nominal')}>
                    <Copy className="w-4 h-4 mr-1" /> Salin nominal
                  </Button>
                </div>
                {qrisDynamic ? (
                  <p className="text-xs text-muted-foreground mt-2">Nominal terisi otomatis saat Anda scan.</p>
                ) : (
                  <div className="mt-3 flex items-start gap-2 text-left text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Masukkan nominal <strong>persis sampai 3 angka terakhir</strong> — itu kode pesanan Anda.</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-3 text-left bg-sand/10 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between"><span>Harga e-book</span><span>{formatPrice(qrisOrder.baseAmount - qrisOrder.serviceFee)}</span></div>
                  {qrisOrder.serviceFee > 0 && (
                    <div className="flex justify-between"><span>Biaya layanan</span><span>{formatPrice(qrisOrder.serviceFee)}</span></div>
                  )}
                  <div className="flex justify-between"><span>Kode unik</span><span>{formatPrice(qrisOrder.uniqueCode)}</span></div>
                  <div className="flex justify-between font-bold text-[#6A2B2B] border-t pt-1"><span>Total</span><span>{formatPrice(qrisOrder.finalAmount)}</span></div>
                </div>
              </div>

              <div className="border-t pt-4 mt-1">
                <p className="text-sm font-semibold mb-2">Sudah bayar? Unggah bukti</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#6A2B2B]/30 rounded-xl p-4 cursor-pointer hover:bg-sand/20 transition-colors">
                  {proofPreview ? (
                    <img src={proofPreview} className="max-h-32 rounded" alt="Preview bukti" />
                  ) : proofFile ? (
                    <span className="text-sm text-foreground font-medium">{proofFile.name}</span>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#6A2B2B]/50 mb-1" />
                      <span className="text-xs text-muted-foreground text-center">Klik untuk unggah (JPG/PNG/WEBP/PDF · maks 5 MB)</span>
                    </>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={onPickProof} disabled={uploading} />
                </label>
                {uploading && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-center text-muted-foreground mt-1">Mengunggah… {uploadProgress}%</p>
                  </div>
                )}
                <Button onClick={uploadProof} disabled={uploading || !proofFile} className="w-full mt-3 bg-[#6A2B2B] hover:bg-[#522121] text-white h-12 font-bold rounded-xl">
                  {uploading ? 'Mengunggah…' : 'Kirim Bukti Pembayaran'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
