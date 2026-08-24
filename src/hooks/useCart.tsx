import React, { createContext, useContext, useState, useEffect } from 'react';

export type CartItem = {
  id: string;
  title: string;
  price: number;
  cover_url: string;
  slug: string;
};

type CartContextType = {
  item: CartItem | null; // Kita batasi 1 item saja karena ini e-book PDF
  addToCart: (item: CartItem) => void;
  removeFromCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<CartItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('cart_item');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (!parsed.cover_url) parsed.cover_url = '/coverling.png';
          if (parsed.title?.includes('Uji QRIS') || parsed.title?.includes('Rahasia Huruf')) {
            parsed.title = 'E-Book Ling Chinese Lab Volume I';
          }
          setItem(parsed);
        }
      } catch (e) {
        console.error("Failed to parse cart item");
      }
    }
  }, []);

  // Save to session storage when item changes
  useEffect(() => {
    if (item) {
      sessionStorage.setItem('cart_item', JSON.stringify(item));
    } else {
      sessionStorage.removeItem('cart_item');
    }
  }, [item]);

  const addToCart = (newItem: CartItem) => {
    setItem(newItem);
    setIsCartOpen(true);
  };

  const removeFromCart = () => {
    setItem(null);
  };

  return (
    <CartContext.Provider value={{ item, addToCart, removeFromCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
