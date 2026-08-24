import React from 'react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';

export function CartSheet() {
  const { item, isCartOpen, setIsCartOpen, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
      <DialogContent className="flex flex-col bg-background max-h-[90vh] overflow-hidden w-[95vw] max-w-lg rounded-2xl p-5 md:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-primary text-xl">
            <ShoppingCart className="w-5 h-5" />
            Keranjang Belanja
          </DialogTitle>
          <DialogDescription>
            Tinjau pesanan Anda sebelum melakukan pembayaran.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto py-4 flex-1">
          {!item ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p>Keranjang masih kosong</p>
              <Button variant="outline" onClick={() => setIsCartOpen(false)}>
                Lanjut Belanja
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-start">
                <img 
                  src={item.cover_url || '/coverling.png'} 
                  alt={item.title} 
                  className="w-20 h-28 object-cover rounded-md border shadow-sm" 
                />
                
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground line-clamp-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">Qty: 1 (Digital)</p>
                  <p className="font-bold text-primary mt-2">{formatPrice(item.price)}</p>
                </div>
                
                <Button variant="ghost" size="icon" onClick={removeFromCart} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              <Separator className="my-2" />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(item.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biaya Layanan</span>
                  <span className="font-medium">{formatPrice(2500)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-bold text-lg text-primary bg-sand/30 p-3 rounded-lg">
                  <span>Grand Total</span>
                  <span>{formatPrice(item.price + 2500)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {item && (
          <DialogFooter className="mt-2 border-t pt-4 sm:justify-start">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 text-lg" onClick={handleCheckout}>
              Lanjut Pembayaran
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
