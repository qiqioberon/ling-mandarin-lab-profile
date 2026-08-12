import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
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
import { ShieldCheck, Info } from 'lucide-react';

const formSchema = z.object({
  buyerName: z.string().min(2, 'Nama harus minimal 2 karakter'),
  buyerEmail: z.string().email('Format email tidak valid'),
  buyerWhatsapp: z.string().min(9, 'Nomor WhatsApp tidak valid').regex(/^[0-9+]+$/, 'Hanya masukkan angka'),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Anda harus menyetujui Syarat & Ketentuan"
  }),
});

export default function Checkout() {
  const navigate = useNavigate();
  const { item, removeFromCart } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOwned, setIsOwned] = useState(false);

  // Load Doku Jokul Checkout Script
  useEffect(() => {
    const isProd = import.meta.env.VITE_DOKU_IS_PRODUCTION === 'true';
    const scriptUrl = isProd 
      ? "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
      : "https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js";
    
    let script = document.querySelector(`script[src="${scriptUrl}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      buyerName: '',
      buyerEmail: user?.email || '',
      buyerWhatsapp: '',
      termsAccepted: false,
    },
  });

  useEffect(() => {
    if (user?.email) {
      form.setValue('buyerEmail', user.email);
      // MOCK LOGIC: Sementara karena belum ada webhook, kita anggap email dev ini sudah punya
      if (['firaniaputriharsanti23@gmail.com', 'firaniaputri23@gmail.com', 'firania@gmail.com'].includes(user.email)) {
        setIsOwned(true);
      }
    }
  }, [user, form]);

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-foreground mb-4">Keranjang Kosong</h2>
        <p className="text-muted-foreground mb-6">Anda belum memilih produk untuk dicheckout.</p>
        <Button onClick={() => navigate('/store')}>Kembali ke Store</Button>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const serviceFee = 2500;
  const grandTotal = item.price + serviceFee;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsProcessing(true);
      
      const payload = {
        productId: item?.id,
        buyerName: values.buyerName,
        buyerEmail: values.buyerEmail,
        buyerWhatsapp: values.buyerWhatsapp
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Terjadi kesalahan saat memproses checkout');
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        throw new Error('Endpoint API tidak merespons dengan JSON. Pastikan Anda menjalankan server backend (Vercel dev).');
      }

      const data = await res.json();
      
      if (data.paymentUrl === 'MOCK-URL-123') {
        toast.success("Mode Lokal: Checkout berhasil (Simulasi)");
        navigate(`/payment/pending?orderRef=${data.orderRef}`);
        return;
      }

      if (data.paymentUrl) {
        if (typeof (window as any).loadJokulCheckout === 'function') {
          // Gunakan modal overlay pop-up
          (window as any).loadJokulCheckout(data.paymentUrl);
        } else {
          // Fallback: redirect langsung
          toast.loading('Mengarahkan ke halaman pembayaran...');
          window.location.href = data.paymentUrl;
        }
      } else {
        throw new Error('Gagal mendapatkan link pembayaran dari Doku');
      }

    } catch (error: any) {
      toast.error(error.message);
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-sand py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Kiri */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-soft">
              <h2 className="text-xl font-bold text-foreground mb-6 border-b pb-4">Data Pembeli</h2>
              
                <div className="bg-[#6C2525]/5 border border-[#6C2525]/20 text-[#6C2525] p-4 rounded-xl flex items-start gap-3 mb-6">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">
                    <strong>Produk Digital.</strong> Anda tidak perlu memasukkan alamat pengiriman fisik. Link akses e-book akan dikirimkan ke email dan tersedia di akun Anda setelah pembayaran selesai.
                  </p>
                </div>

                {isOwned ? (
                  <div className="bg-green-50 border border-green-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                    <ShieldCheck className="w-12 h-12 text-green-600" />
                    <div>
                      <h3 className="text-xl font-bold text-green-800 mb-2">Anda Sudah Memiliki E-Book Ini!</h3>
                      <p className="text-green-700">Sistem mendeteksi bahwa akun email <strong>{user?.email}</strong> sudah melakukan pembelian untuk buku ini sebelumnya.</p>
                    </div>
                    <Button onClick={() => navigate('/library')} className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8">
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
                              <Input type="email" placeholder="email@contoh.com" className="bg-sand/30" disabled={!!user} {...field} />
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
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-medium">
                                  Saya menyetujui Syarat & Ketentuan dan Kebijakan Privasi
                                </FormLabel>
                                <FormDescription>
                                  Saya memahami bahwa produk digital yang telah dibeli tidak dapat direfund.
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

          {/* Rincian Kanan */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-soft sticky top-24">
              <h2 className="text-xl font-bold text-foreground mb-6 border-b pb-4">Rincian Pesanan</h2>
              
              <div className="flex gap-4 items-start mb-6">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="w-16 h-20 object-cover rounded border" />
                ) : (
                  <div className="w-16 h-20 bg-muted rounded border flex items-center justify-center text-xs">PDF</div>
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
                  <span className="font-medium">{formatPrice(serviceFee)}</span>
                </div>
              </div>
              
              <div className="bg-cream p-4 rounded-xl mb-6">
                <div className="flex justify-between font-bold text-lg text-primary">
                  <span>Grand Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground justify-center mt-6">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Pembayaran aman via Doku (QRIS, VA, e-Wallet)</span>
              </div>
              
              {!isOwned && (
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  className="w-full lg:hidden bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 text-lg mt-6"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Memproses...' : `Bayar Sekarang`}
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
