import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { whatsappUrl } from "@/data/stats";
import logoFull from "@/assets/LOGO.svg";
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
import whatsappIcon from "@/assets/Medsos/wa.svg";

const highlightPoints = [
  "Yuk, belajar dengan para laoshi penyabar dan bersertifikasi HSK & TOCFL dengan pengalaman studi dan magang di Taiwan!",
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

const typewriterPhrases = [
  "Lebih dari 1,1 miliar orang bisa berbahasa Mandarin (Ethnologue, 2023).",
  "1-2% lowongan kerja di Eropa mensyaratkan kemampuan Mandarin (OECD, 2023).",
  "40% alumni yang menembus perusahaan asing terkait Tiongkok/Asia Timur berasal dari jurusan Mandarin (Times Indonesia).",
  "Kemampuan Mandarin bisa membawa gaji di atas Rp10 juta per bulan di sektor teknologi, perdagangan internasional, dan perusahaan multinasional (Suara.com)."
];

const HeroSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const scrollToTeachers = () => {
    document.getElementById("teachers-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWhatsappClick = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const slideCount = pandaSlides.length;

  useEffect(() => {
    const rotation = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideCount);
    }, 1000);

    return () => clearInterval(rotation);
  }, [slideCount]);

  useEffect(() => {
    const currentPhrase = typewriterPhrases[typewriterIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayedText.length < currentPhrase.length) {
        timeout = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, 45);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 1600);
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length - 1));
        }, 28);
      } else {
        setIsDeleting(false);
        setTypewriterIndex((prev) => (prev + 1) % typewriterPhrases.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, typewriterIndex]);

  return (
    <section className="relative overflow-hidden bg-[hsl(37,45%,96%)] lg:py-16 py-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="relative flex flex-col items-center justify-center gap-2 w-full min-h-fit lg:grid lg:grid-cols-[0.8fr_1.2fr]">

          <div className="order-1 lg:order-1 w-full">
            <div className="relative lg:mt-10 w-full">
              <div className="grid w-full items-start">
                {pandaSlides.map((panda, index) => (
                  <img
                    key={panda.alt}
                    src={panda.src}
                    alt={panda.alt}
                    // put every image into the same grid cell (overlap) but keep them in normal flow
                    className={`col-start-1 row-start-1 w-full transition-all duration-[50ms] ${activeSlide === index
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-8 opacity-0"
                      }`}
                    style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
                  />
                ))}
              </div>
            </div>


          </div>

          <div className="order-2 space-y-6 lg:order-2 w-full">
            <div className="space-y-4">
              <img
                src={logoFull}
                alt="Ling Chinese Lab"
                className="h-auto max-w-md drop-shadow-md w-full"
              />

              <h1 className="text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                Crafting cozy journeys in Mandarin
              </h1>
              <p className="text-base sm:text-xl text-muted-foreground min-h-[4.25rem] sm:min-h-[3.5rem]">
                <span className="relative inline-flex items-center">
                  <span>{displayedText}</span>
                  <span
                    aria-hidden
                    className="ml-2 inline-block h-6 w-[2px] animate-pulse rounded bg-primary align-middle"
                  />
                </span>
              </p>
            </div>

            <div className="space-y-3">
              {highlightPoints.map((text, index) => (
                <div
                  key={`highlight-${index}`}
                  className="rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm sm:text-xl shadow-sm backdrop-blur"
                >
                  {text}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-2 md:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={handleWhatsappClick}
                className="relative py-5 md:py-8 lg:px-6 w-full md:w-auto sm:min-w-[260px] md:min-w-[400px]  flex-1 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <span className="flex w-full items-center justify-center gap-2">
                  <img src={whatsappIcon} alt="WhatsApp" className="size-7" />
                  <p className="text-base sm:text-lg">Chat WA: Harga & Jadwal</p>
                </span>
              </Button>

              <Button
                onClick={scrollToTeachers}
                variant="outline"
                size="lg"
                className="py-5 md:py-8 lg:px-6 w-full sm:w-full md:w-auto sm:min-w-[220px] flex-1 rounded-full border-primary text-primary hover:bg-primary/10"
              >
                <span className="flex w-full items-center justify-center gap-2 text-base sm:text-lg">
                  <ArrowDown className=" size-7" />
                  Lihat Profil Laoshi
                </span>
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


        </div>
      </div>
    </section>
  );
};

export default HeroSection;
