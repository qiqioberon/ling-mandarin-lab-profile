import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowDown } from "lucide-react";
import { whatsappUrl } from "@/data/stats";
import logoFull from "@/assets/logoNoBG.png";
import panda1 from "@/assets/PandaDialog/panda1.png";
import panda2 from "@/assets/PandaDialog/panda2.png";
import panda3 from "@/assets/PandaDialog/panda3.png";
import panda4 from "@/assets/PandaDialog/panda4.png";
import panda5 from "@/assets/PandaDialog/panda5.png";
import panda6 from "@/assets/PandaDialog/panda6.png";

const HeroSection = () => {
  const phrases = useMemo(
    () => [
      "Belajar Mandarin dari Level Basic, Medium, sampai Advance!",
      "Les privat & online dengan mentor bersertifikat HSK",
      "Tingkatkan percakapan sehari-hari hingga lulus HSK",
      "Belajar nyaman bersama alumni Xin Zhong School"
    ],
    []
  );

  const [displayText, setDisplayText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const scrollToTeachers = () => {
    document.getElementById("teachers-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const typingSpeed = isDeleting ? 40 : 70;
    const pauseTime = 1500;

    if (!isDeleting && charIndex === currentPhrase.length) {
      const pause = setTimeout(() => setIsDeleting(true), pauseTime);
      return () => clearTimeout(pause);
    }

    if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timer = setTimeout(() => {
      const nextIndex = isDeleting ? charIndex - 1 : charIndex + 1;
      setDisplayText(currentPhrase.substring(0, nextIndex));
      setCharIndex(nextIndex);
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phraseIndex, phrases]);

  const pandas = useMemo(
    () => [
      { src: panda1, alt: "Panda 1" },
      { src: panda2, alt: "Panda 2" },
      { src: panda3, alt: "Panda 3" },
      { src: panda4, alt: "Panda 4" },
      { src: panda5, alt: "Panda 5" },
      { src: panda6, alt: "Panda 6" }
    ],
    []
  );

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          {/* Headline */}
          <div className=" flex items-center justify-center">
            <img src={logoFull} alt="Ling Mandarin Lab" className="h-auto md:h-auto md:w-[40%] w-[60%]" />
          </div>
          <div className="inline-flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight min-h-[3.4rem] md:min-h-[4.2rem] lg:min-h-[5.5rem]">
              {displayText || phrases[0]}
              <span className="text-primary caret-blink">|</span>
            </h1>

          </div>

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

      {/* Panda dialog section */}
      <div className="pointer-events-none select-none relative mt-14 flex justify-center">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl px-4">
          {pandas.map((panda, index) => (
            <div
              key={panda.src}
              className="flex items-center justify-center"
            >
              <div
                className="p-3 md:p-4 bg-white/80 backdrop-blur-lg rounded-2xl border border-border shadow-lg animate-chat-wave"
                style={{ animationDelay: `${index * 0.35}s` }}
              >
                <img
                  src={panda.src}
                  alt={panda.alt}
                  className="h-24 w-auto md:h-28 object-contain drop-shadow-md"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
