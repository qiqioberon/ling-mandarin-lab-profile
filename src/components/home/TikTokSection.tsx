import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { stats } from "@/data/stats";
import { TrendingUp, Users, Award, ArrowLeft, ArrowRight } from "lucide-react";
import phoneMockup from "@/assets/Phone/nitipanjay.png";
import phoneVideo from "@/assets/Phone/tiktokVideo.mp4";
import celineHSK from "@/assets/Laoshi/Celine/Celine HSK.pdf";
import celineHSKPreview from "@/assets/Laoshi/Celine/celine-hsk-1.png";
import michelleHSK from "@/assets/Laoshi/MichellePutri/Michelle P HSK.pdf";
import michelleHSKPreview from "@/assets/Laoshi/MichellePutri/michelle-hsk-1.png";
import tasyaHSK from "@/assets/Laoshi/Tasya/Tasya HSK.pdf";
import tasyaHSKPreview from "@/assets/Laoshi/Tasya/tasya-hsk-1.png";

const icons = {
  0: TrendingUp,
  1: Users,
  2: Award
};

const certificates = [
  {
    src: celineHSK,
    preview: celineHSKPreview,
    mentor: "Laoshi Celine",
    description: "HSK Certificate"
  },
  {
    src: michelleHSK,
    preview: michelleHSKPreview,
    mentor: "Laoshi Michelle Putri",
    description: "HSK Certificate"
  },
  {
    src: tasyaHSK,
    preview: tasyaHSKPreview,
    mentor: "Laoshi Tasya",
    description: "HSK Certificate"
  }
];

const TikTokSection = () => {
  const [activeCertificate, setActiveCertificate] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalCertificates = certificates.length;

  useEffect(() => {
    if (isPaused || totalCertificates <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setActiveCertificate((prev) => (prev + 1) % totalCertificates);
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, totalCertificates]);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const pauseSlider = () => {
    setIsPaused(true);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const resumeSliderAfterDelay = () => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      resumeTimeoutRef.current = null;
    }, 5000);
  };

  const handleHoverStart = () => {
    pauseSlider();
  };

  const handleHoverEnd = () => {
    resumeSliderAfterDelay();
  };

  const handleClickPause = () => {
    pauseSlider();
    resumeSliderAfterDelay();
  };

  const selectCertificate = (index: number) => {
    setActiveCertificate(index);
    pauseSlider();
    resumeSliderAfterDelay();
  };

  const showPrev = () => {
    setActiveCertificate((prev) => (prev - 1 + totalCertificates) % totalCertificates);
    pauseSlider();
    resumeSliderAfterDelay();
  };

  const showNext = () => {
    setActiveCertificate((prev) => (prev + 1) % totalCertificates);
    pauseSlider();
    resumeSliderAfterDelay();
  };

  return (
    <section className="bg-[#f7f1ea] py-16 md:py-24">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Video mockup */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-xs sm:max-w-sm">
              <div className="absolute inset-6 rounded-[3rem] bg-primary/10 blur-3xl" />
              <img
                src={phoneMockup}
                alt="Phone mockup"
                className="relative z-10 w-full rounded-[3rem] shadow-[0_20px_60px_rgba(88,63,49,0.2)]"
              />
              <div className="absolute left-1/2 top-[9%] z-20 w-[72%] -translate-x-1/2 rounded-[2rem] shadow-2xl">
                <video
                  src={phoneVideo}
                  muted
                  loop
                  autoPlay
                  playsInline
                  className="w-full rounded-[2rem] border-4 border-background"
                />
              </div>
            </div>
          </div>

          {/* Stats and certificates */}
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Kenapa Pilih Ling Chinese Lab?
              </p>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Belajar dengan metode yang terbukti efektif dan menyenangkan
              </h2>
              <p className="text-base text-muted-foreground">
                Dibimbing langsung oleh laoshi yang aktif membagikan ilmu lewat video pembelajaran dan
                pengalaman mengajar privat dari berbagai level HSK.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {stats.map((stat, index) => {
                const Icon = icons[index as keyof typeof icons];
                return (
                  <Card
                    key={stat.id}
                    className="rounded-3xl border border-border bg-white/80 shadow-sm transition hover:shadow-md"
                  >
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-lg font-semibold text-foreground/90">{stat.label}</p>
                        <p className="text-sm text-muted-foreground">{stat.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="rounded-[30px] border border-border bg-white/85 p-6 shadow-md backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Sertifikat HSK
                  </p>
                  <h3 className="text-xl font-bold text-foreground">
                    Bukti kompetensi para laoshi bersertifikat
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={showPrev}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-primary/10"
                    aria-label="Sertifikat sebelumnya"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-primary/10"
                    aria-label="Sertifikat selanjutnya"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                className="relative mt-5 h-[360px] overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30 p-4 sm:h-[420px]"
                onMouseEnter={handleHoverStart}
                onMouseLeave={handleHoverEnd}
                onClick={handleClickPause}
                onFocus={handleHoverStart}
                onBlur={handleHoverEnd}
                tabIndex={0}
                role="region"
                aria-roledescription="Sertifikat laoshi"
              >
                {certificates.map((certificate, index) => (
                  <div
                    key={certificate.mentor}
                    className={`absolute inset-0 transition-all duration-700 ${activeCertificate === index
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-8 opacity-0"
                      }`}
                  >
                    <div className="flex h-full flex-col gap-4 rounded-2xl bg-white/90 p-4 shadow">
                      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
                        <img
                          src={certificate.preview}
                          alt={`Preview sertifikat ${certificate.mentor}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-foreground">{certificate.mentor}</p>
                        <p className="text-sm text-muted-foreground">{certificate.description}</p>
                      </div>
                      <a
                        href={certificate.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-primary/40 px-4 py-2 text-center text-sm font-medium text-primary transition hover:bg-primary/10"
                      >
                        Lihat sertifikat asli (PDF)
                      </a>
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-2">
                  {certificates.map((certificate, index) => (
                    <button
                      key={certificate.mentor}
                      type="button"
                      onClick={() => selectCertificate(index)}
                      className={`h-2.5 rounded-full transition ${activeCertificate === index ? "w-8 bg-primary" : "w-2.5 bg-muted-foreground/40"
                        }`}
                      aria-label={`Tampilkan sertifikat ${certificate.mentor}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Slider berhenti ketika disentuh atau diarahkan kursor, dan akan berjalan lagi otomatis setelah 5
                detik.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TikTokSection;
