import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TeacherCard from "@/components/about/TeacherCard";
import { teachers } from "@/data/teachers";
import { Lightbulb, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Tentang = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Tentang Ling Chinese Lab
              </h1>
              <p className="text-lg text-muted-foreground">
                Tempat belajar Mandarin yang menyenangkan dan efektif untuk semua kalangan
              </p>
            </div>
          </div>
        </section>

        {/* Brand Story */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Logo Brief */}
              <Card className="border-border bg-card">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <Lightbulb className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">
                      Kenapa harus Ling Chinese Lab?
                    </h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">Ling Chinese Lab</span> Lebih dari 1,1 miliar orang di dunia bisa Bahasa Mandarin (Ethnologue, 2023). Artinya, kamu nggak cuma belajar bahasa, kamu lagi buka pintu ke dunia baru: bisnis, karier, beasiswa, dan relasi internasional. 🌏🚀
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Di tengah persaingan kerja yang makin ketat: <span className="font-semibold text-foreground">data ini bukan main-main</span> untuk semua orang.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    📌 1–2% lowongan kerja di Eropa sekarang meminta kandidat yang bisa Bahasa Mandarin (OECD, 2023) – skill ini bikin CV kamu beda sendiri di mata HR.</p>
                  <p className="text-muted-foreground leading-relaxed">
                    📌 40% alumni yang kerja di perusahaan asing dengan sektor terkait Tiongkok & Asia Timur berasal dari jurusan Bahasa Mandarin (Times Indonesia) – Mandarin itu bahasa “jalur cepat” ke karier internasional.</p>
                  <p className="text-muted-foreground leading-relaxed">
                    📌 Pekerja yang bisa Bahasa Mandarin berpotensi digaji lebih dari Rp10 juta/bulan di sektor teknologi, perdagangan internasional, dan perusahaan multinasional (Suara.com) – ini bukan cuma hobi, tapi investasi masa depan. 💰📈
                  </p>
                  <p className="text-muted-foreground leading-relaxed">'Di Ling Chinese

                    Bukan sekadar hafal kosakata, tapi berani ngomong dan pakai Mandarin di dunia nyata 💬

                    Belajar dengan gaya yang nyaman, terstruktur, dan relevan untuk kerja & bisnis 💼

                    Step-by-step dari dasar sampai siap dipakai untuk interview, meeting, dan kerja sama internasional 🤝</p>
                </CardContent>
              </Card>

              {/* Motto */}
              <div className="text-center py-12 px-6 bg-primary/5 rounded-2xl border-2 border-primary/10">
                <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
                <blockquote className="text-2xl md:text-3xl font-semibold text-foreground italic">
                  "Membawa bahasa Mandarin jadi dekat dan menyenangkan untuk semua"
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* Teachers Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Para Laoshi Kami
              </h2>
              <p className="text-lg text-muted-foreground">
                Tim mentor profesional dengan pengalaman dan sertifikasi internasional
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {teachers.map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} />
              ))}
            </div>

            {/* Xin Zhong School Note */}
            <Card className="max-w-3xl mx-auto border-primary/20 bg-primary/5">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Ling Chinese Lab</span> dibangun
                  oleh para alumni <span className="font-semibold text-foreground">Xin Zhong School</span>,
                  sekolah dengan tradisi pendidikan bahasa Mandarin yang kuat. Kami memahami tantangan
                  belajar Mandarin dan berkomitmen untuk membuat proses belajar menjadi lebih mudah,
                  efektif, dan menyenangkan untuk semua kalangan.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Tentang;
