import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowDown } from "lucide-react";
import { whatsappUrl } from "@/data/stats";

const HeroSection = () => {
  const scrollToTeachers = () => {
    document.getElementById("teachers-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Belajar Mandarin dari Level{" "}
            <span className="text-primary">Basic</span>,{" "}
            <span className="text-primary">Medium</span>, sampai{" "}
            <span className="text-primary">Advance!</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Les privat & online Mandarin dengan mentor bersertifikat HSK dari alumni{" "}
            <span className="font-semibold text-foreground">Xin Zhong School</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              asChild 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Chat via WhatsApp untuk Harga & Jadwal
              </a>
            </Button>

            <Button
              onClick={scrollToTeachers}
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <ArrowDown className="mr-2 h-5 w-5" />
              Lihat Profil Laoshi
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
};

export default HeroSection;
