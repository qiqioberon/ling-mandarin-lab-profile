import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Tentang from "./pages/Tentang";
import NotFound from "./pages/NotFound";
import Read from "./pages/Read";
import Store from "./pages/Store";
import Checkout from "./pages/Checkout";
import PaymentPending from "./pages/PaymentPending";
import Library from "./pages/Library";
import { CartProvider } from "./hooks/useCart";
import { AuthProvider } from "./hooks/useAuth";
import { CartSheet } from "./components/store/CartSheet";

import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import ManualPayment from "./pages/ManualPayment";
import AdminVerify from "./pages/AdminVerify";
import AdminDashboard from "./pages/AdminDashboard";
import Faq from "./pages/Faq";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <CartProvider>
          <BrowserRouter>
            <CartSheet />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tentang" element={<Tentang />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/read/:slug" element={<Read />} />
              <Route path="/store" element={<Store />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment/pending" element={<PaymentPending />} />
              <Route path="/library" element={<Library />} />
              <Route path="/bayar-manual" element={<ManualPayment />} />
              <Route path="/admin/verify" element={<AdminVerify />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/legal" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);


export default App;
