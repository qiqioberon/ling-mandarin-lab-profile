import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowDown } from "lucide-react";
import { whatsappUrl } from "@/data/stats";
import logoFull from "@/assets/logoNoBG.png";
import panda1 from "@/assets/PandaDialog/1.svg";
import panda2 from "@/assets/PandaDialog/2.svg";
import panda3 from "@/assets/PandaDialog/3.svg";
import panda4 from "@/assets/PandaDialog/4.svg";
import flagChina from "@/assets/Flag/china.svg";
import flagTaiwan from "@/assets/Flag/taiwan.svg";
import flagIndonesia from "@/assets/Flag/indonesia.svg";
import schoolXinZhong from "@/assets/School/xin_zhong.svg";
import schoolHsing from "@/assets/School/hsing.svg";
import schoolMedical from "@/assets/School/medical.svg";
import schoolNtcust from "@/assets/School/ntcust_long.svg";

const highlightPoints = [
  "Learn from trusted professionals yang sabar dalam mendampingi tiap murid.",
  "Mentor kami pernah belajar dan mengajar di universitas ternama di Taiwan dan Indonesia."
];

const schoolLogos = [
  { src: schoolXinZhong, alt: "Xin Zhong School" },
  { src: schoolMedical, alt: "Taipei Medical University" },
  { src: schoolNtcust, alt: "National Taichung University of Science and Technology" },
  { src: schoolHsing, alt: "Hsing Wu University" }
];

const flagList = [
  { src: flagTaiwan, alt: "Taiwan Flag" },
  { src: flagChina, alt: "China Flag" },
  { src: flagIndonesia, alt: "Indonesia Flag" }
];

const pandaSlides = [
  { src: panda1, alt: "Panda dialog 1" },
  { src: panda2, alt: "Panda dialog 2" },
  { src: panda3, alt: "Panda dialog 3" },
  { src: panda4, alt: "Panda dialog 4" }
];

const HeroSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const scrollToTeachers = () => {
    document.getElementById("teachers-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  const slideCount = pandaSlides.length;

  useEffect(() => {
    const rotation = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideCount);
    }, 3200);

    return () => clearInterval(rotation);
  }, [slideCount]);

  return (
    <section className="relative overflow-hidden bg-[hsl(37,45%,96%)] py-16 md:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="space-y-4">
              <img
                src={logoFull}
                alt="Ling Mandarin Lab"
                className="h-auto max-w-md drop-shadow-md"
              />

              <h1 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                Crafting cozy journeys in Mandarin
              </h1>
              <p className="text-lg text-muted-foreground">
                Temukan pengalaman belajar yang hangat, privat, dan terarah langsung bersama mentor
                alumni Xin Zhong School dan berbagai universitas mitra.
              </p>
            </div>

            <div className="space-y-3">
              {highlightPoints.map((text, index) => (
                <div
                  key={`highlight-${index}`}
                  className="rounded-2xl border border-border bg-white/70 px-4 py-3 text-base shadow-sm backdrop-blur"
                >
                  {text}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-14 flex-1 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
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
                className="h-14 flex-1 rounded-full border-primary text-primary hover:bg-primary/10"
              >
                <ArrowDown className="mr-2 h-5 w-5" />
                Lihat Profil Laoshi
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <span className="text-sm font-medium uppercase tracking-[0.35em] text-muted-foreground">
                Mentors from
              </span>
              <div className="flex items-center gap-2">
                {flagList.map((flag) => (
                  <div
                    key={flag.alt}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white shadow-sm"
                  >
                    <img src={flag.src} alt={flag.alt} className="h-8 w-8 object-contain" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-6">
              {schoolLogos.map((school) => (
                <div
                  key={school.alt}
                  className="flex h-14 max-w-[160px] items-center justify-center rounded-xl bg-white/80 px-4 shadow-sm backdrop-blur"
                >
                  <img src={school.src} alt={school.alt} className="max-h-10 w-full object-contain" />
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative mx-auto max-w-lg rounded-[2.5rem] border border-border bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="relative ml-auto max-w-xs">
                <div className="rounded-3xl border border-border bg-white p-5 shadow-lg">
                  <p className="text-3xl font-semibold text-primary">&#21644;&#22909;!</p>
                  <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">n&#464; halo!</p>
                  <p className="mt-2 text-sm text-muted-foreground">Hello, nice to meet you.</p>
                </div>
                <div className="absolute -bottom-3 right-10 h-6 w-6 rotate-45 rounded-sm border border-border bg-white" />
              </div>

              <div className="relative mt-10 h-72 sm:h-80">
                {pandaSlides.map((panda, index) => (
                  <img
                    key={panda.alt}
                    src={panda.src}
                    alt={panda.alt}
                    className={`absolute inset-x-0 bottom-0 mx-auto w-[85%] max-w-sm transition-all duration-700 ${activeSlide === index
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-8 opacity-0"
                      }`}
                    style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
                  />
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
