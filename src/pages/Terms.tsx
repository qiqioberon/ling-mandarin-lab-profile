import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LegalPoliciesSection from "@/components/home/LegalPoliciesSection";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background w-full flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Beranda</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Syarat & Ketentuan</span>
          </div>
        </div>
        <LegalPoliciesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
