import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/data/stats";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logo} alt="Ling Chinese Lab" className="h-12 w-auto" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Membawa bahasa Mandarin jadi dekat dan menyenangkan untuk semua.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Hubungi Kami</h3>
            <Button
              asChild
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Follow Kami</h3>
            <div className="flex space-x-4">
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                TikTok
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Ling Chinese Lab – All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
