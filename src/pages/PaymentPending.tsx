import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function PaymentPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderRef = searchParams.get('orderRef');
  
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderRef) {
      setLoading(false);
      return;
    }

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/order-status?orderRef=${orderRef}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          
          if (data.status === 'paid' || data.status === 'failed' || data.status === 'expired') {
            setLoading(false);
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error("Error checking status", err);
      }
    };

    // Check immediately, then poll every 3 seconds
    checkStatus();
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, [orderRef]);

  if (!orderRef) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p>Referensi Order tidak ditemukan.</p>
        <Button className="mt-4" onClick={() => navigate('/store')}>Kembali ke Store</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-soft max-w-md w-full text-center">
        
        {loading && status === 'pending' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Menunggu Pembayaran</h2>
            <p className="text-muted-foreground mb-8">
              Mohon selesaikan pembayaran Anda di halaman Doku. Halaman ini akan otomatis diperbarui.
            </p>
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-full">
              <Clock className="w-4 h-4" />
              <span>Memeriksa status secara otomatis...</span>
            </div>
          </div>
        )}

        {status === 'paid' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Pembayaran Berhasil!</h2>
            <p className="text-muted-foreground mb-8">
              Terima kasih. Akses E-Book Anda telah ditambahkan ke Library. Tautan akses juga dikirimkan via email.
            </p>
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12"
              onClick={() => navigate('/library')}
            >
              Buka E-Book Saya
            </Button>
          </div>
        )}

        {(status === 'failed' || status === 'expired') && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Pembayaran Gagal/Kedaluwarsa</h2>
            <p className="text-muted-foreground mb-8">
              Waktu pembayaran telah habis atau pembayaran dibatalkan.
            </p>
            <Button 
              variant="outline"
              className="w-full font-bold h-12 border-primary text-primary hover:bg-primary/5"
              onClick={() => navigate('/checkout')}
            >
              Coba Lagi
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
