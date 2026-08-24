import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart, CartItem } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, BookOpen, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import ebookvid from '@/assets/Phone/ebookvid.mp4';

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
  title: "E-Book Ling Chinese Lab Volume I",
  description: "Buku panduan komprehensif menguasai dasar-dasar huruf Mandarin (Hanzi). Cocok pemula–menengah, 10 unsur radikal, Step menulis, Latihan soal + kunci.",
  price: 60000,
  cover_url: "/coverling.png"
};

export default function Store() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, setIsCartOpen } = useCart();
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      } catch (err) {
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

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
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
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="h-12 px-4 gap-2 bg-white border-[#6A2B2B]/20 text-[#6A2B2B] hover:bg-[#6A2B2B]/5 font-semibold shadow-sm rounded-xl"
              onClick={() => navigate('/library')}
            >
              <BookOpen className="w-5 h-5 text-[#6A2B2B]" />
              <span className="hidden sm:inline">Library Saya</span>
            </Button>

            <Button 
              variant="outline" 
              size="icon" 
              className="w-12 h-12 relative bg-white border-[#6A2B2B]/20 hover:bg-[#6A2B2B]/5 hover:border-[#6A2B2B]/30 transition-colors shadow-sm rounded-xl"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-6 h-6 text-[#6A2B2B]" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-12 px-4 md:px-8">
        
        {/* Highlight Section (Video Phone Frame + Copywriting) */}
        <div className="mb-16 grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] bg-white rounded-3xl p-6 md:p-10 shadow-soft border border-[#6A2B2B]/10">
          
          {/* Video Player in Phone Frame */}
          <div className="flex justify-center">
            <div className="relative w-[280px] h-[580px] overflow-hidden rounded-[2.5rem] border-[8px] border-black bg-black shadow-xl ring-4 ring-[#6A2B2B]/10">
              <div className="absolute top-0 inset-x-0 h-6 bg-black z-20 rounded-b-xl w-32 mx-auto"></div>
              <video
                ref={videoRef}
                src={ebookvid}
                muted={isVideoMuted}
                playsInline
                loop
                autoPlay
                className="h-full w-full object-cover z-10"
              />
              <div className="absolute bottom-6 left-4 flex flex-wrap items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={toggleVideoMute}
                  className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-black/80 transition"
                >
                  {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isVideoMuted ? "Sound off" : "Sound on"}
                </button>
              </div>
            </div>
          </div>

          {/* Marketing Copy */}
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#6A2B2B]/10 text-[#6A2B2B] text-sm font-bold tracking-wide">
              E-BOOK TERBARU
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-foreground leading-tight">
              E-Book Ling Chinese Lab <span className="text-[#6A2B2B]">Volume I</span>
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

        {/* Catalog Section */}
        <h3 className="text-2xl font-bold text-foreground mb-8">Katalog Produk</h3>
        {loading ? (
          <div className="text-center text-muted-foreground py-20 font-medium">Memuat katalog...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-3xl shadow-soft overflow-hidden border border-[#6A2B2B]/10 transition-smooth hover:shadow-xl hover:border-[#6A2B2B]/20 flex flex-col group">
                <div className="aspect-[3/4] bg-[#f4efe9] flex items-center justify-center relative p-6">
                  <Badge className="absolute top-4 right-4 bg-[#6A2B2B] text-white hover:bg-[#522121] shadow-md border-none px-3 py-1 font-bold tracking-wide z-10">
                    BEST SELLER
                  </Badge>
                  <img 
                    src={product.cover_url || '/coverling.png'} 
                    alt={product.title} 
                    className="w-full h-full object-cover rounded-xl shadow-md group-hover:scale-[1.02] transition-transform duration-500" 
                  />
                </div>
                
                <div className="p-6 flex flex-col flex-1 bg-white">
                  <h3 className="text-xl font-extrabold text-foreground mb-3 line-clamp-2 leading-tight">{product.title}</h3>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-5 line-clamp-2 leading-relaxed">{product.description}</p>
                    
                    {/* Mock fitur */}
                    <ul className="space-y-2.5 mb-6">
                      <li className="flex items-start text-sm font-medium text-foreground/80 gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#6A2B2B]/80 mt-0.5 shrink-0" /> 
                        <span>Cocok pemula–menengah</span>
                      </li>
                      <li className="flex items-start text-sm font-medium text-foreground/80 gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#6A2B2B]/80 mt-0.5 shrink-0" /> 
                        <span>10 unsur radikal & Step menulis</span>
                      </li>
                      <li className="flex items-start text-sm font-medium text-foreground/80 gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#6A2B2B]/80 mt-0.5 shrink-0" /> 
                        <span>Latihan soal + kunci</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <div className="flex items-end gap-3 mb-5">
                      <p className="text-[1.75rem] font-black text-[#6A2B2B] leading-none">{formatPrice(product.price)}</p>
                      <p className="text-sm font-semibold text-muted-foreground line-through decoration-[#6A2B2B]/40 pb-1">{formatPrice(75000)}</p>
                    </div>
                    <Button 
                      className="w-full bg-[#6A2B2B] hover:bg-[#522121] text-white font-bold py-6 text-base rounded-xl shadow-md hover:shadow-lg transition-all"
                      onClick={() => handleAddToCart(product)}
                    >
                      Tambah ke Keranjang
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
