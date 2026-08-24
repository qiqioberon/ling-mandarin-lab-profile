import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowDown } from "lucide-react";
import { useState, useEffect } from "react";
import { programs } from "@/data/programs";
import { whatsappUrl } from "@/data/stats";
import whatsappIcon from "@/assets/Medsos/wa.svg";

import chinaFlag from "@/assets/Flag/china.svg";
import taiwanFlag from "@/assets/Flag/taiwan.svg";

const ProgramsSection = () => {
  const [charIndex, setCharIndex] = useState(0);

  const simplifiedChars = ["学习", "让", "汉语", "门", "头"];
  const traditionalChars = ["學習", "讓", "漢語", "門", "頭"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCharIndex((prev) => (prev + 1) % simplifiedChars.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

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
            Pilih level yang sesuai dengan kemampuan Anda. Setiap program dirancang untuk hasil maksimal bagi kebutuhan dan masa depan Anda!
          </p>
        </div>

        {/* Komparasi Terpadu: Simplified vs Traditional */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* China / Simplified Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-red-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="bg-red-50 p-6 flex items-center gap-4 border-b border-red-100">
              <img src={chinaFlag} alt="China" className="h-12 w-12 rounded-full shadow-sm" />
              <div>
                <h3 className="text-xl font-bold text-[#E63946]">HSK (China)</h3>
                <p className="text-sm font-semibold text-foreground/70">Simplified / 简体字 (jiǎn tǐ zì)</p>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-8">
              {/* Karakteristik */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Karakteristik Utama</h4>
                <ul className="space-y-3 text-sm text-foreground/90">
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E63946] mt-2 shrink-0" />
                    <span>Bentuk tulisan yang <strong>disederhanakan</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E63946] mt-2 shrink-0" />
                    <span>Lebih mudah dipahami untuk pemula</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E63946] mt-2 shrink-0" />
                    <span>Digunakan di: <strong>China, Singapura, Malaysia</strong></span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Contoh Goresan */}
                <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100/50 flex flex-col items-center">
                  <h4 className="text-xs font-bold text-[#E63946]/80 uppercase tracking-wider mb-3 text-center">Goresan</h4>
                  <div className="flex-1 flex items-center justify-center min-h-[80px]">
                    <div
                      key={`simp-${charIndex}`}
                      className="text-4xl font-medium text-foreground/90 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-500"
                    >
                      {simplifiedChars[charIndex]}
                    </div>
                  </div>
                </div>

                {/* Flow / Tujuan */}
                <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100/50 flex flex-col items-center justify-center text-center">
                  <h4 className="text-xs font-bold text-[#E63946]/80 uppercase tracking-wider mb-2">Alur</h4>
                  <p className="font-semibold text-sm mb-1 text-foreground/80">Mau China?</p>
                  <ArrowDown className="w-4 h-4 text-red-400 mb-1" />
                  <div className="font-bold text-[#E63946] text-sm mb-1">Ujian HSK</div>
                  <ArrowDown className="w-4 h-4 text-red-400 mb-1" />
                  <p className="font-bold text-sm text-foreground/90">Berbisnis</p>
                </div>
              </div>

              {/* Cocok Untuk */}
              <div className="mt-auto pt-6 border-t border-border">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Sangat Cocok Untuk:</h4>
                <ul className="space-y-3 text-sm text-foreground/90">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-[#E63946]" />
                    <span>Ujian HSK (Sertifikasi Internasional)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-[#E63946]" />
                    <span>Keperluan bisnis & pekerjaan profesional</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-[#E63946]" />
                    <span>Belajar lebih cepat untuk tingkat pemula</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Taiwan / Traditional Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="bg-blue-50 p-6 flex items-center gap-4 border-b border-blue-100">
              <img src={taiwanFlag} alt="Taiwan" className="h-12 w-12 rounded-full shadow-sm" />
              <div>
                <h3 className="text-xl font-bold text-blue-600">TOCFL (Taiwan)</h3>
                <p className="text-sm font-semibold text-foreground/70">Traditional / 繁體字 (fán tǐ zì)</p>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-8">
              {/* Karakteristik */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Karakteristik Utama</h4>
                <ul className="space-y-3 text-sm text-foreground/90">
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>Bentuk asli dengan <strong>goresan lebih banyak (rumit)</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>Banyak dipakai dalam budaya & literatur klasik</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>Digunakan di: <strong>Taiwan, Hong Kong, Makau</strong></span>
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Contoh Goresan */}
                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 flex flex-col items-center">
                  <h4 className="text-xs font-bold text-blue-600/80 uppercase tracking-wider mb-3 text-center">Goresan</h4>
                  <div className="flex-1 flex items-center justify-center min-h-[80px]">
                    <div
                      key={`trad-${charIndex}`}
                      className="text-4xl font-medium text-foreground/90 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-500"
                    >
                      {traditionalChars[charIndex]}
                    </div>
                  </div>
                </div>

                {/* Flow / Tujuan */}
                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/50 flex flex-col items-center justify-center text-center">
                  <h4 className="text-xs font-bold text-blue-600/80 uppercase tracking-wider mb-2">Alur</h4>
                  <p className="font-semibold text-sm mb-1 text-foreground/80">Mau Taiwan?</p>
                  <ArrowDown className="w-4 h-4 text-blue-400 mb-1" />
                  <div className="font-bold text-blue-600 text-sm mb-1">Ujian TOCFL</div>
                  <ArrowDown className="w-4 h-4 text-blue-400 mb-1" />
                  <p className="font-bold text-sm text-foreground/90">Keseharian Taiwan</p>
                </div>
              </div>

              {/* Cocok Untuk */}
              <div className="mt-auto pt-6 border-t border-border">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Sangat Cocok Untuk:</h4>
                <ul className="space-y-3 text-sm text-foreground/90">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <span>Persiapan sekolah/kerja di Taiwan/HK</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <span>Minat pada budaya atau literatur klasik</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <span>Mempelajari karakter asli yang lebih lengkap</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Perbandingan Level Table */}
        <div className="mt-12 bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 md:p-6 text-center bg-muted/30 border-b">
            <h3 className="text-lg md:text-xl font-bold text-foreground tracking-wide">Perbandingan Level</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-4 font-semibold text-muted-foreground border-b w-16 text-center bg-primary/5 text-sm">CEFR</th>
                  <th className="p-4 font-semibold text-muted-foreground border-b bg-primary/5 text-sm">Keterangan</th>
                  <th className="p-4 font-semibold text-[#E63946] border-b text-center bg-red-50/50">
                    <div className="text-base font-bold">HSK (China)</div>
                    <div className="text-xs font-normal opacity-90">简体字 jiǎn tǐ zì</div>
                  </th>
                  <th className="p-4 font-semibold text-blue-600 border-b text-center bg-blue-50/50">
                    <div className="text-base font-bold">TOCFL (Taiwan)</div>
                    <div className="text-xs font-normal opacity-90">繁體字 fán tǐ zì</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-bold text-center">C2</td>
                  <td className="p-4 font-medium">Sangat Mahir / Mastery</td>
                  <td className="p-4 text-center font-bold text-foreground/80 bg-red-50/30">HSK 9</td>
                  <td className="p-4 text-center bg-blue-50/30">Level 6 (Band C)<br /><span className="text-xs text-muted-foreground">精通級 (Mastery)</span></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-bold text-center">C1</td>
                  <td className="p-4 font-medium">Mahir / Advanced</td>
                  <td className="p-4 text-center font-bold text-foreground/80 bg-red-50/30">HSK 7 - 8</td>
                  <td className="p-4 text-center bg-blue-50/30">Level 5 (Band C)<br /><span className="text-xs text-muted-foreground">流利級 (Fluent)</span></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-bold text-center">B2</td>
                  <td className="p-4 font-medium">Menengah Atas / Upper-Inter</td>
                  <td className="p-4 text-center font-bold text-foreground/80 bg-red-50/30">HSK 6</td>
                  <td className="p-4 text-center bg-blue-50/30">Level 4 (Band B)<br /><span className="text-xs text-muted-foreground">高階級 (Advanced)</span></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-bold text-center">B1</td>
                  <td className="p-4 font-medium">Menengah / Intermediate</td>
                  <td className="p-4 text-center font-bold text-foreground/80 bg-red-50/30">HSK 4 - 5</td>
                  <td className="p-4 text-center bg-blue-50/30">Level 3 (Band B)<br /><span className="text-xs text-muted-foreground">進階級 (Vantage)</span></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-bold text-center">A2</td>
                  <td className="p-4 font-medium">Dasar / Elementary</td>
                  <td className="p-4 text-center font-bold text-foreground/80 bg-red-50/30">HSK 2 - 3</td>
                  <td className="p-4 text-center bg-blue-50/30">Level 2 (Band A)<br /><span className="text-xs text-muted-foreground">基礎級 (Waystage)</span></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-bold text-center">A1</td>
                  <td className="p-4 font-medium">Pemula / Beginner</td>
                  <td className="p-4 text-center font-bold text-foreground/80 bg-red-50/30">HSK 1</td>
                  <td className="p-4 text-center bg-blue-50/30">Level 1 (Band A)<br /><span className="text-xs text-muted-foreground">入門級 (Breakthrough)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Program Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
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
        <div className="text-center mt-8 max-w-3xl mx-auto w-full">
          <Card className="border-primary/20 bg-muted/30">
            <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center">
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                Info: Harga dan jadwal dikirimkan secara personal via WhatsApp
              </p>
              <Button
                size="lg"
                onClick={handleWhatsappClick}
                className="relative py-6 sm:py-8 w-full max-w-[280px] sm:max-w-[400px] rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <span className="flex w-full items-center justify-center gap-2">
                  <img src={whatsappIcon} alt="WhatsApp" className="size-6 sm:size-7" />
                  <p className="text-sm sm:text-lg font-bold">Tanya Program via WA</p>
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
