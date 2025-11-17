import annieCertificate from "@/assets/Laoshi/Annie/Annie Laoshi.jpg";
import celineHsk from "@/assets/Laoshi/Celine/Celine HSK.pdf";
import celineTims from "@/assets/Laoshi/Celine/Celine TIMS.jpg";
import celineTocfl from "@/assets/Laoshi/Celine/Celine TOCFL.jpg";
import michelleOliviaTocfl from "@/assets/Laoshi/MichelleOlivia/Michelle TOCFL A2.pdf";
import michellePutriHsk from "@/assets/Laoshi/MichellePutri/Michelle P HSK.pdf";
import tasyaPortfolio from "@/assets/Laoshi/Tasya/Tasya 1.jpg";
import tasyaArticle from "@/assets/Laoshi/Tasya/Tasya Article.jpg";
import tasyaHsk from "@/assets/Laoshi/Tasya/Tasya HSK.pdf";

export interface TeacherCertificate {
  label: string;
  file: string;
  type: "image" | "pdf";
}

export interface Teacher {
  id: number;
  name: string;
  mandarinName: string;
  location: string;
  education: string;
  degree: string;
  xinzhongBackground: string;
  certification: string;
  experience: string;
  certificates: TeacherCertificate[];
}

export const teachers: Teacher[] = [
  {
    id: 1,
    name: "Celine",
    mandarinName: "Laoshi Celine",
    location: "Jakarta & Online",
    education: "Xin Zhong School",
    degree: "Sertifikasi pengajaran Mandarin",
    xinzhongBackground: "Alumni Xin Zhong School dengan fokus pengajaran HSK dan TOCFL.",
    certification: "HSK 5 - TOCFL - TIMS Teaching Certificate",
    experience: "Berpengalaman membimbing anak dan dewasa pemula hingga menengah dengan fokus pengucapan yang rapi.",
    certificates: [
      { label: "HSK - Celine", file: celineHsk, type: "pdf" },
      { label: "TIMS - Celine", file: celineTims, type: "image" },
      { label: "TOCFL - Celine", file: celineTocfl, type: "image" }
    ]
  },
  {
    id: 2,
    name: "Tasya",
    mandarinName: "Laoshi Tasya",
    location: "Surabaya & Online",
    education: "Xin Zhong School",
    degree: "Lulusan program intensif bahasa Mandarin",
    xinzhongBackground: "Aktif di komunitas Xin Zhong dan kerap membawakan materi kreatif untuk murid remaja.",
    certification: "HSK - Artikel & karya tulis Mandarin",
    experience: "3 tahun mengajar, fokus meningkatkan percaya diri berbicara dan pemahaman bacaan.",
    certificates: [
      { label: "HSK - Tasya", file: tasyaHsk, type: "pdf" },
      { label: "Artikel Mandarin - Tasya", file: tasyaArticle, type: "image" },
      { label: "Portofolio Tasya", file: tasyaPortfolio, type: "image" }
    ]
  },
  {
    id: 3,
    name: "Annie",
    mandarinName: "Laoshi Annie",
    location: "Bandung & Online",
    education: "Xin Zhong School",
    degree: "Spesialisasi pengajaran anak-anak",
    xinzhongBackground: "Alumni Xin Zhong yang terbiasa mengajar siswa usia dini dengan pendekatan fun learning.",
    certification: "Sertifikasi pengajaran Xin Zhong",
    experience: "4 tahun mengajar, memadukan latihan percakapan dan permainan kosakata.",
    certificates: [{ label: "Sertifikat Annie", file: annieCertificate, type: "image" }]
  },
  {
    id: 4,
    name: "Michelle Olivia",
    mandarinName: "Laoshi Michelle Olivia",
    location: "Jakarta & Online",
    education: "Xin Zhong School",
    degree: "Sertifikasi TOCFL",
    xinzhongBackground: "Alumni Xin Zhong dengan fokus pengembangan kemampuan dasar percakapan.",
    certification: "TOCFL A2",
    experience: "Mendampingi banyak pemula dewasa memulai percakapan sehari-hari dalam Mandarin.",
    certificates: [{ label: "TOCFL A2 - Michelle Olivia", file: michelleOliviaTocfl, type: "pdf" }]
  },
  {
    id: 5,
    name: "Michelle Putri",
    mandarinName: "Laoshi Michelle Putri",
    location: "Medan & Online",
    education: "Xin Zhong School",
    degree: "Sertifikasi HSK",
    xinzhongBackground: "Alumni Xin Zhong yang aktif membina kelas persiapan ujian.",
    certification: "HSK",
    experience: "5 tahun mengajar, membantu siswa menaklukkan ujian HSK lewat latihan intensif.",
    certificates: [{ label: "HSK - Michelle Putri", file: michellePutriHsk, type: "pdf" }]
  },
  {
    id: 6,
    name: "Rachel",
    mandarinName: "Laoshi Rachel",
    location: "Online",
    education: "Xin Zhong School",
    degree: "Sertifikasi menyusul",
    xinzhongBackground: "Instruktur Xin Zhong yang tengah menyiapkan sertifikat terbarunya.",
    certification: "Sertifikat sedang diproses",
    experience: "Berpengalaman mengajar percakapan sehari-hari dan kelas privat fleksibel.",
    certificates: []
  }
];
