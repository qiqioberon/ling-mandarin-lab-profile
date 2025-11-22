import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { stats } from "@/data/stats";
import { TrendingUp, Users, Award, ArrowLeft, ArrowRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
import hskLogo from "@/assets/LogoSertifikat/HSK.svg";
import tocflLogo from "@/assets/LogoSertifikat/TOCFL.svg";
import videoOne from "@/assets/Phone/video1.mp4";
import videoTwo from "@/assets/Phone/Video 2.mp4";
import igIcon from "@/assets/Medsos/ig.svg";
import tiktokIcon from "@/assets/Medsos/tiktok.svg";
import celineHSK from "@/assets/Laoshi/Celine/Celine HSK.pdf";
import celineHSKPreview from "@/assets/Laoshi/Celine/celine-hsk-1.png";
import celineTOCFL from "@/assets/Laoshi/Celine/Celine TOCFL.jpg";
import michelleHSK from "@/assets/Laoshi/MichellePutri/Michelle P HSK.pdf";
import michelleHSKPreview from "@/assets/Laoshi/MichellePutri/michelle-hsk-1.png";
import michelleTOCFL from "@/assets/Laoshi/MichelleOlivia/Michelle TOCFL A2.pdf";
import tasyaHSK from "@/assets/Laoshi/Tasya/Tasya HSK.pdf";
import tasyaHSKPreview from "@/assets/Laoshi/Tasya/tasya-hsk-1.png";

const icons = {
  0: TrendingUp,
  1: Users,
  2: Award
};

type CertificateType = "HSK" | "TOCFL";

const certificateLogos: Record<CertificateType, string> = {
  HSK: hskLogo,
  TOCFL: tocflLogo
};

const videos = [
  { src: videoOne, title: "Video 1" },
  { src: videoTwo, title: "Video 2" }
];

type Certificate = {
  src: string;
  preview: string;
  mentor: string;
  description: string;
  type: CertificateType;
  previewType?: "image" | "pdf";
};

const certificates: Certificate[] = [
  {
    src: celineHSK,
    preview: celineHSKPreview,
    mentor: "Laoshi Celine",
    description: "HSK Certificate",
    type: "HSK" as CertificateType
  },
  {
    src: celineTOCFL,
    preview: celineTOCFL,
    mentor: "Laoshi Celine",
    description: "TOCFL Certificate",
    type: "TOCFL" as CertificateType
  },
  {
    src: michelleTOCFL,
    preview: michelleTOCFL,
    mentor: "Laoshi Michelle Olivia",
    description: "TOCFL Certificate",
    type: "TOCFL" as CertificateType,
    previewType: "pdf" as const
  },
  {
    src: michelleHSK,
    preview: michelleHSKPreview,
    mentor: "Laoshi Michelle Putri",
    description: "HSK Certificate",
    type: "HSK" as CertificateType
  },
  {
    src: tasyaHSK,
    preview: tasyaHSKPreview,
    mentor: "Laoshi Tasya",
    description: "HSK Certificate",
    type: "HSK" as CertificateType
  }
];

const TikTokSection = () => {
  const [activeVideo, setActiveVideo] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [activeCertificate, setActiveCertificate] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRefs = useRef<HTMLVideoElement[]>([]);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalCertificates = certificates.length;
  const totalVideos = videos.length;

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      vid.muted = isVideoMuted;
      if (idx !== activeVideo) {
        vid.pause();
        vid.currentTime = 0;
      }
    });

    const current = videoRefs.current[activeVideo];
    if (current) {
      current.muted = isVideoMuted;
      const playPromise = current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsVideoPlaying(!current.paused))
          .catch(() => setIsVideoPlaying(false));
      } else {
        setIsVideoPlaying(!current.paused);
      }
    }
  }, [activeVideo, isVideoMuted]);

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

  const handlePlayPauseVideo = () => {
    const current = videoRefs.current[activeVideo];
    if (!current) return;

    if (current.paused) {
      const playPromise = current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsVideoPlaying(true)).catch(() => setIsVideoPlaying(false));
      } else {
        setIsVideoPlaying(true);
      }
    } else {
      current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    setIsVideoMuted((prev) => !prev);
  };

  const showPrevVideo = () => {
    setActiveVideo((prev) => (prev - 1 + totalVideos) % totalVideos);
  };

  const showNextVideo = () => {
    setActiveVideo((prev) => (prev + 1) % totalVideos);
  };

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
          {/* Video carousel */}
          <div className="flex justify-center">
            <div className="w-full max-w-xl space-y-4">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-black/80 shadow-lg">
                {videos.map((video, index) => (
                  <video
                    key={video.title}
                    ref={(el) => {
                      if (el) {
                        videoRefs.current[index] = el;
                      }
                    }}
                    src={video.src}
                    muted={isVideoMuted}
                    playsInline
                    loop
                    className={`h-full w-full object-contain ${activeVideo === index ? "block" : "hidden"}`}
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onEnded={() => setIsVideoPlaying(false)}
                  />
                ))}

                <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-4">
                  <button
                    type="button"
                    onClick={showPrevVideo}
                    className="rounded-full bg-white/80 p-2 text-foreground shadow hover:bg-white"
                    aria-label="Video sebelumnya"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextVideo}
                    className="rounded-full bg-white/80 p-2 text-foreground shadow hover:bg-white"
                    aria-label="Video selanjutnya"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlayPauseVideo}
                    className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-foreground shadow"
                    aria-label={isVideoPlaying ? "Jeda video" : "Putar video"}
                  >
                    {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isVideoPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleVideoMute}
                    className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-foreground shadow"
                    aria-label={isVideoMuted ? "Aktifkan suara" : "Matikan suara"}
                  >
                    {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    {isVideoMuted ? "Sound off" : "Sound on"}
                  </button>
                  <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                    {videos[activeVideo].title} / {totalVideos}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="https://www.instagram.com/lingchineselab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-primary/10"
                >
                  <img src={igIcon} alt="Instagram" className="h-5 w-5" />
                  <span>@lingchineselab</span>
                </a>
                <a
                  href="https://www.tiktok.com/@ceeehaaaaa?_r=1&_t=ZS-91V8Wr9Xixp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-primary/10"
                >
                  <img src={tiktokIcon} alt="TikTok" className="h-5 w-5" />
                  <span>@ceeehaaaaa</span>
                </a>
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
                pengalaman mengajar privat dari berbagai level HSK dan TOCFL.
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
                    Sertifikat HSK & TOCFL
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
                    key={`${certificate.mentor}-${certificate.type}`}
                    className={`absolute inset-0 transition-all duration-700 ${activeCertificate === index
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-8 opacity-0"
                      }`}
                  >
                    <div className="flex h-full flex-col gap-4 rounded-2xl bg-white/90 p-4 shadow">
                      <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-muted/20">
                        <div className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                          <img
                            src={certificateLogos[certificate.type]}
                            alt={`Logo sertifikat ${certificate.type}`}
                            className="h-8 w-8"
                            loading="lazy"
                          />
                        </div>
                        {certificate.previewType === "pdf" ? (
                          <object
                            data={certificate.preview}
                            type="application/pdf"
                            className="h-full w-full"
                            aria-label={`Preview PDF sertifikat ${certificate.mentor}`}
                          >
                            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                              Preview PDF tidak dapat dimuat. Klik tombol di bawah untuk membuka berkas.
                            </div>
                          </object>
                        ) : (
                          <img
                            src={certificate.preview}
                            alt={`Preview sertifikat ${certificate.mentor}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
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
                        Lihat sertifikat asli
                      </a>
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-2">
                  {certificates.map((certificate, index) => (
                    <button
                      key={`${certificate.mentor}-${certificate.type}-dot`}
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
