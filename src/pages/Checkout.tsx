import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ShieldCheck, Info, Wallet } from 'lucide-react';

const formSchema = z.object({
  buyerName: z.string().min(2, 'Nama harus minimal 2 karakter'),
  buyerEmail: z.string().email('Format email tidak valid'),
  buyerWhatsapp: z
    .string()
    .min(9, 'Nomor WhatsApp tidak valid')
    .regex(/^[0-9+]+$/, 'Hanya masukkan angka'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'Anda harus menyetujui Syarat & Ketentuan',
  }),
});

const PAYMENT_METHODS = ['QRIS', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'Virtual Account', 'Kartu Kredit'];

export default function Checkout() {
  const navigate = useNavigate();
  const { item } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [serviceFee, setServiceFee] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buyerName: '',
      buyerEmail: user?.email || '',
      buyerWhatsapp: '',
      termsAccepted: false,
    },
  });

  // Authoritative service fee from the server (never hardcoded).
  useEffect(() => {
    let active = true;
    fetch('/api/pricing-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.serviceFee === 'number') {
          setServiceFee(data.serviceFee);
        }
      })
      .catch(() => {
        /* keep serviceFee null; total falls back to item price only */
      });
    return () => {
      active = false;
    };
  }, []);

  // Real ownership check: does an entitlement exist for this buyer + product?
  useEffect(() => {
    if (!user?.email || !item?.id) return;
    form.setValue('buyerEmail', user.email);

    let active = true;
    supabase
      .from('entitlements')
      .select('id')
      .eq('buyer_email', user.email.toLowerCase())
      .eq('product_id', item.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsOwned(!!data);
      });
    return () => {
      active = false;
    };
  }, [user, item, form]);

  if (!item) {
    return (
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-foreground mb-4">Keranjang Kosong</h2>
        <p className="text-muted-foreground mb-6">
          Anda belum memilih produk untuk dicheckout.
        </p>
        <Button onClick={() => navigate('/store')}>Kembali ke Store</Button>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);

  const grandTotal = item.price + (serviceFee ?? 0);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item?.id,
          buyerName: values.buyerName,
          buyerEmail: values.buyerEmail,
          buyerWhatsapp: values.buyerWhatsapp,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Endpoint API tidak merespons dengan JSON. Pastikan backend berjalan.');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat checkout');
      if (!data.paymentUrl) throw new Error('Gagal mendapatkan link pembayaran');

      // Redirect to iPaymu's hosted payment page.
      toast.loading('Mengarahkan ke halaman pembayaran...');
      window.location.href = data.paymentUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error(message);
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-sand py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-soft">
              <h2 className="text-xl font-bold text-foreground mb-6 border-b pb-4">
                Data Pembeli
              </h2>

              <div className="bg-[#6C2525]/5 border border-[#6C2525]/20 text-[#6C2525] p-4 rounded-xl flex items-start gap-3 mb-6">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">
                  <strong>Produk Digital.</strong> Anda tidak perlu memasukkan alamat
                  pengiriman fisik. Akses e-book dikirim ke email dan tersedia di akun
                  Anda setelah pembayaran selesai.
                </p>
              </div>

              {isOwned ? (
                <div className="bg-green-50 border border-green-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                  <ShieldCheck className="w-12 h-12 text-green-600" />
                  <div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">
                      Anda Sudah Memiliki E-Book Ini!
                    </h3>
                    <p className="text-green-700">
                      Akun email <strong>{user?.email}</strong> sudah membeli buku ini
                      sebelumnya.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/library')}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8"
                  >
                    Buka Library Sekarang
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="buyerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Lengkap</FormLabel>
                          <FormControl>
                            <Input placeholder="Masukkan nama Anda" className="bg-sand/30" {...field} />
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
                            <Input
                              type="email"
                              placeholder="email@contoh.com"
                              className="bg-sand/30"
                              disabled={!!user}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            E-book akan dikirim ke email ini. Pastikan aktif.
                          </FormDescription>
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

                    <div className="pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="termsAccepted"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-sand/20 border">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-medium">
                                Saya menyetujui Syarat &amp; Ketentuan dan Kebijakan Privasi
                              </FormLabel>
                              <FormDescription>
                                Produk digital yang telah dibeli tidak dapat direfund.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full hidden lg:flex bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 text-lg mt-6"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Memproses...' : `Bayar Sekarang — ${formatPrice(grandTotal)}`}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </div>

          {/* Right summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-soft sticky top-24">
              <h2 className="text-xl font-bold text-foreground mb-6 border-b pb-4">
                Rincian Pesanan
              </h2>

              <div className="flex gap-4 items-start mb-6">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="w-16 h-20 object-cover rounded border" />
                ) : (
                  <div className="w-16 h-20 bg-muted rounded border flex items-center justify-center text-xs">
                    PDF
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm line-clamp-2 text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">1x (Akses Digital)</p>
                  <p className="font-bold text-primary mt-1">{formatPrice(item.price)}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(item.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biaya Layanan</span>
                  <span className="font-medium">
                    {serviceFee === null ? '...' : formatPrice(serviceFee)}
                  </span>
                </div>
              </div>

              <div className="bg-cream p-4 rounded-xl mb-6">
                <div className="flex justify-between font-bold text-lg text-primary">
                  <span>Grand Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Payment methods available via iPaymu */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm mb-2">
                  <Wallet className="w-4 h-4 text-amber-700" />
                  <span>Bayar pakai apa saja</span>
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed mb-3">
                  Pilih metode di halaman pembayaran: QRIS, e-Wallet, Virtual Account, atau kartu.
                  Akses e-book terbuka otomatis setelah pembayaran.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-amber-900/80">
                  {PAYMENT_METHODS.map((m) => (
                    <span key={m} className="bg-white/80 border border-amber-200/60 rounded px-2 py-0.5">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center mt-4">
                <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Pembayaran aman via iPaymu</span>
              </div>

              {!isOwned && (
                <Button
                  onClick={form.handleSubmit(onSubmit)}
                  className="w-full lg:hidden bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 text-lg mt-6"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
