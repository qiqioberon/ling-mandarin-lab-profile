import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  cover_url: string;
  granted_at: string;
};

export default function Library() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithOtpEmail, verifyOtp, signOut } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // OTP Login States
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      toast.error('Masukkan email yang valid');
      return;
    }
    setIsAuthProcessing(true);
    const { error } = await signInWithOtpEmail(emailInput);
    setIsAuthProcessing(false);
    
    if (error) {
      toast.error('Gagal mengirim OTP: ' + error.message);
    } else {
      setIsOtpSent(true);
      toast.success('Kode OTP 6 digit telah dikirim ke email Anda!');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 6) {
      toast.error('Kode OTP harus 6 digit angka');
      return;
    }
    setIsAuthProcessing(true);
    const { error } = await verifyOtp(emailInput, otpInput);
    setIsAuthProcessing(false);
    
    if (error) {
      toast.error('Kode OTP salah atau kadaluarsa');
    } else {
      toast.success('Berhasil masuk!');
    }
  };

  useEffect(() => {
    async function fetchLibrary() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('entitlements')
          .select(`
            granted_at,
            product:products (
              id,
              slug,
              title,
              cover_url
            )
          `)
          .eq('buyer_email', user.email);

        if (error) {
          console.error("Error fetching library", error);
        }

        if (data && data.length > 0) {
          const formattedItems = data.map((item) => ({
            id: item.product.id,
            slug: item.product.slug,
            title: item.product.title,
            cover_url: item.product.cover_url,
            granted_at: item.granted_at
          }));
          setItems(formattedItems);
        } else {
          // Jika kosong, kita tetap tampilkan mock file Lingchinenese.pdf untuk demo di lokal
          // Memasukkan email asli user agar demo bekerja
          if (user.email === 'firaniaputri23@gmail.com' || user.email === 'firania@gmail.com' || user.email === 'firaniaputriharsanti23@gmail.com') {
             setItems([{
              id: 'mock-1',
              slug: 'test', 
              title: 'E-Book Ling Chinese Lab Volume I - Demo',
              cover_url: '/coverling.png',
              granted_at: new Date().toISOString()
            }]);
          } else {
            setItems([]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchLibrary();
  }, [user]);

  if (authLoading || (loading && user)) {
    return <div className="min-h-screen bg-sand flex items-center justify-center font-medium">Memuat Library...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-4">
         <div className="bg-white p-8 rounded-3xl shadow-soft max-w-md w-full text-center border border-border">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Masuk ke Library</h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              Masuk menggunakan email yang Anda gunakan saat membeli E-Book untuk mengakses koleksi rahasia Anda.
            </p>
            {!isOtpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4 w-full">
                <Input 
                  type="email" 
                  placeholder="Masukkan email Anda" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={isAuthProcessing}
                  required
                  className="h-14 bg-sand/30 rounded-xl"
                />
                <Button type="submit" disabled={isAuthProcessing} className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md">
                  {isAuthProcessing ? 'Mengirim...' : 'Kirim Kode OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 w-full">
                <div className="text-sm font-medium text-foreground text-left mb-2 px-1">
                  Kode 6 digit telah dikirim ke <span className="font-bold text-primary">{emailInput}</span>
                </div>
                <Input 
                  type="text" 
                  placeholder="0 0 0 0 0 0" 
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isAuthProcessing}
                  required
                  className="h-14 bg-sand/30 text-center text-2xl tracking-[0.5em] font-mono font-bold rounded-xl"
                  maxLength={6}
                />
                <Button type="submit" disabled={isAuthProcessing} className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md">
                  {isAuthProcessing ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsOtpSent(false)} className="w-full text-xs text-muted-foreground mt-2">
                  Ganti Alamat Email
                </Button>
              </form>
            )}
            <div className="mt-6 pt-6 border-t border-dashed">
               <p className="text-xs text-muted-foreground">Belum pernah berbelanja?</p>
               <Button variant="link" onClick={() => navigate('/store')} className="text-primary mt-1">Jelajahi Store</Button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="bg-cream border-b py-8 px-4 md:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Library Anda</h1>
            <p className="text-muted-foreground mt-2">Selamat datang, <span className="font-semibold text-foreground">{user.email}</span></p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="w-fit border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-12 px-4 md:px-8">
        {items.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-3xl shadow-soft border border-border max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
               <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Koleksi Masih Kosong</h3>
            <p className="text-muted-foreground mb-8 text-lg">Anda belum memiliki E-Book di akun ini. Kunjungi Store untuk melihat koleksi materi terbaik kami.</p>
            <Button onClick={() => navigate('/store')} size="lg" className="rounded-full px-8">Jelajahi Store</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl p-6 shadow-soft border border-border flex flex-col transition hover:shadow-lg hover:-translate-y-1">
                <div className="aspect-[3/4] bg-sand flex items-center justify-center relative rounded-xl overflow-hidden mb-6">
                  <img 
                    src={item.cover_url || '/coverling.png'} 
                    alt={item.title} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                <h3 className="font-bold text-foreground text-xl mb-3 line-clamp-2 flex-1 leading-snug">{item.title}</h3>
                
                <p className="text-xs font-medium text-muted-foreground mb-6 bg-muted/30 w-fit px-3 py-1.5 rounded-md">
                  Diperoleh: {new Date(item.granted_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md rounded-xl h-12 text-base"
                  onClick={() => navigate(`/read/${item.slug}`)}
                >
                  Baca Sekarang
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
