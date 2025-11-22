import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { programs } from "@/data/programs";
import { whatsappUrl } from "@/data/stats";
import whatsappIcon from "@/assets/Medsos/wa.svg";

import chinaFlag from "@/assets/Flag/china.svg";
import taiwanFlag from "@/assets/Flag/taiwan.svg";

const ProgramsSection = () => {
  const handleWhatsappClick = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <section className="py-16 md:py-24 ">
      <div className="container px-4 sm:px-6 lg:px-8 flex flex-col gap-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Program Ling Chinese Lab
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-2">
              <img src={chinaFlag} alt="Bendera China" className="h-7 w-7 rounded-full shadow-sm" />
              <span>Simplified</span>
            </span>
            <span className="text-xl font-semibold text-muted-foreground">&</span>
            <span className="flex items-center gap-2">
              <img src={taiwanFlag} alt="Bendera Taiwan" className="h-7 w-7 rounded-full shadow-sm" />
              <span>Traditional</span>
            </span>
          </h3>
          <p className="text-lg text-muted-foreground">
            Pilih level yang sesuai dengan kemampuan Anda. Setiap program dirancang untuk hasil maksimal.
          </p>
        </div>

        {/* Simplified vs Traditional info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-primary/20 bg-white/80 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={chinaFlag} alt="Bendera China" className="h-9 w-9 rounded-full shadow-sm" />
                <CardTitle className="text-lg">Simplified (简体字)</CardTitle>
              </div>
              <CardDescription className="space-y-2 text-foreground">
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Bentuk tulisan yang disederhanakan</li>
                  <li>Lebih mudah dipahami untuk pemula</li>
                  <li>Digunakan di: China, Singapura, Malaysia</li>
                </ol>
                <div className="pt-2 text-foreground font-semibold">Cocok untuk:</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    Ujian HSK
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    Keperluan bisnis & pekerjaan
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    Belajar lebih cepat sebagai pemula
                  </li>
                </ul>
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-primary/20 bg-white/80 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={taiwanFlag} alt="Bendera Taiwan" className="h-9 w-9 rounded-full shadow-sm" />
                <CardTitle className="text-lg">Traditional (繁體字)</CardTitle>
              </div>
              <CardDescription className="space-y-2 text-foreground">
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Bentuk asli dengan goresan lebih banyak</li>
                  <li>Banyak dipakai dalam budaya & literatur klasik</li>
                  <li>Digunakan di: Taiwan, Hong Kong, Makau</li>
                </ol>
                <div className="pt-2 text-foreground font-semibold">Cocok untuk:</div>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    Persiapan sekolah/kerja di Taiwan/HK
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    Minat budaya atau literatur klasik
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    Ingin mempelajari karakter yang lebih lengkap
                  </li>
                </ul>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Program Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {programs.map((program) => (
            <Card key={program.id} className="border-border hover:shadow-lg transition-all">
              <CardHeader>
                <div className="mb-2">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                    {program.level}
                  </span>
                </div>
                <CardTitle className="text-xl">{program.title}</CardTitle>
                <CardDescription>{program.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {program.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <Card className="border-primary/20 bg-muted/30">
            <CardContent className="py-8">
              <p className="text-muted-foreground mb-4">
                Info: Harga dan jadwal dikirimkan secara personal via WhatsApp
              </p>
              <Button
                size="lg"
                onClick={handleWhatsappClick}
                className="relative py-5 md:py-8 lg:px-6 w-full md:w-auto sm:min-w-[260px] md:min-w-[400px]  flex-1 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <span className="flex w-full items-center justify-center gap-2">
                  <img src={whatsappIcon} alt="WhatsApp" className="size-7" />
                  <p className="text-base sm:text-lg">Tanya Program Lewat Whatsapp</p>
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ProgramsSection;
