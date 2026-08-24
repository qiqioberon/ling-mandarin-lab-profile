import triveraCertificate from "@/assets/Laoshi/Trivera/trivera_certificate.pdf";
import aureliaCertificate from "@/assets/Laoshi/Aurelia/CamScanner 24-11-2025 06.20.pdf";
import celineHsk from "@/assets/Laoshi/Celine/Celine HSK.pdf";
import celineTims from "@/assets/Laoshi/Celine/Celine TIMS.jpg";
import celineTocfl from "@/assets/Laoshi/Celine/Celine TOCFL.jpg";
import celineHskPreview from "@/assets/Laoshi/Celine/celine-hsk-1.png";
import graciaCertificate from "@/assets/Laoshi/Gracia/gracia.pdf";
import graciaPhoto from "@/assets/Laoshi/Gracia/gracia.svg";
import michellePutriHsk from "@/assets/Laoshi/MichellePutri/Michelle P HSK.pdf";
import michelleHskPreview from "@/assets/Laoshi/MichellePutri/michelle-hsk-1.png";
import michellePutriPhoto from "@/assets/Laoshi/MichellePutri/person/michelleputri.svg";
import tasyaPortfolio from "@/assets/Laoshi/Tasya/Tasya 1.jpg";
import tasyaArticle from "@/assets/Laoshi/Tasya/Tasya Article.jpg";
import tasyaHsk from "@/assets/Laoshi/Tasya/Tasya HSK.pdf";
import tasyaHskPreview from "@/assets/Laoshi/Tasya/tasya-hsk-1.png";
import tasyaPhoto from "@/assets/Laoshi/Tasya/person/tasya.svg";
import rachelHsk from "@/assets/Laoshi/Rachel/HSK.pdf";
import rachelTocfl from "@/assets/Laoshi/Rachel/TOCFL.pdf";
import rachelJinan from "@/assets/Laoshi/Rachel/Jinan University Chinese Language Level Test Score Certificate.pdf";
import schoolHsing from "@/assets/School/hsing.svg";
import schoolMedical from "@/assets/School/medical.svg";
import schoolNtcust from "@/assets/School/ntcust_long.svg";
import schoolPetra from "@/assets/School/petra.svg";
import schoolXinZhong from "@/assets/School/xin_zhong.svg";
import schoolMntnu from "@/assets/School/mntnu.svg";
import schoolFengchia from "@/assets/School/fengchia.svg";
import celinePhoto from "@/assets/Laoshi/Celine/person/celine.svg";
import triveraPhoto from "@/assets/Laoshi/Trivera/trivera_pic.svg";
import aureliaPhoto from "@/assets/Laoshi/Aurelia/person/aurellia.svg";
import ellenCertificate from "@/assets/Laoshi/Ellen/ellen_certificate.pdf";
import ellenPhoto from "@/assets/Laoshi/Ellen/ellen_pic.svg";
import jaxineTocfl from "@/assets/Laoshi/Jaxine/JAXINE - Chinese Language Proficiency - TOCFL.pdf";
import jaxinePhoto from "@/assets/Laoshi/Jaxine/WhatsApp Image 2026-05-15 at 09.23.00.jpeg";
import jaxineResume from "@/assets/Laoshi/Jaxine/陳嘉欣 resume.pdf";
import oliviaPhoto from "@/assets/Laoshi/Olivia/olivia_pic.png";
import oliviaTocfl1 from "@/assets/Laoshi/Olivia/olivia_tocfl_1.jpeg";
import oliviaTocfl2 from "@/assets/Laoshi/Olivia/olivia_tocfl_2.jpeg";
import ayakaPhoto from "@/assets/Laoshi/Ayaka/ayakafoto.jpeg";
import ayakaTocfl from "@/assets/Laoshi/Ayaka/tocflb2.pdf";
import schoolNkust from "@/assets/School/science.svg";
import schoolUph from "@/assets/School/UPH.svg";
import taiyaPhoto from "@/assets/Laoshi/Taiya/taiya.svg";
import taiyaHsk1 from "@/assets/Laoshi/Taiya/HSK6_1.jpeg";
import taiyaHsk2 from "@/assets/Laoshi/Taiya/HSK6_2.pdf";
import audreyPhoto from "@/assets/Laoshi/Audrey/audrey.svg";
import audreyHsk from "@/assets/Laoshi/Audrey/audreyHSK5.pdf";
import audreyTocfl from "@/assets/Laoshi/Audrey/audreytocfl.jpeg";


export interface TeacherCertificate {
  label: string;
  file: string;
  type: "image" | "pdf";
  preview?: string;
}

export interface TeacherSchool {
  name: string;
  logo: string;
}

export interface Teacher {
  id: number;
  name: string;
  mandarinName: string;
  location: string;
  education: string;
  schools: TeacherSchool[];
  photo?: string;
  degree: string;
  xinzhongBackground: string;
  certification: string;
  experience: string;
  certificates: TeacherCertificate[];
}

const schoolOptions: Record<string, TeacherSchool> = {
  xinZhong: { name: "Xin Zhong School", logo: schoolXinZhong },
  ntcust: { name: "NTCUST", logo: schoolNtcust },
  petra: { name: "Petra Christian University", logo: schoolPetra },
  chunghsing: { name: "Taichung Chung Hsing University", logo: schoolHsing },
  chinaMedical: { name: "China Medical University, Taichung", logo: schoolMedical },
  chinaMedicalShuinan: { name: "China Medical University Shuinan Campus", logo: schoolMedical },
  mntnu: { name: "Mandarin Training Center of National Taiwan Normal University", logo: schoolMntnu },
  fengchia: { name: "Taichung Fengchia University", logo: schoolFengchia },
  nkust: { name: "National Kaohsiung University of Science and Technology", logo: schoolNkust },
  uph: { name: "Universitas Pelita Harapan", logo: schoolUph }
};

const educationText = (schools: TeacherSchool[]) => schools.map((school) => school.name).join(" / ");

export const teachers: Teacher[] = [
  {
    id: 1,
    name: "Celine",
    mandarinName: "Laoshi Celine",
    location: "Jakarta & Online",
    schools: [schoolOptions.xinZhong, schoolOptions.ntcust],
    education: educationText([schoolOptions.xinZhong, schoolOptions.ntcust]),
    photo: celinePhoto,
    degree: "Sertifikasi pengajaran Mandarin",
    xinzhongBackground: "Alumni Xin Zhong School yang melanjutkan studi di NTCUST dengan fokus pengajaran HSK dan TOCFL.",
    certification: "HSK 5 - TOCFL - TIMS Teaching Certificate",
    experience: "Berpengalaman membimbing anak dan dewasa pemula hingga menengah dengan fokus pengucapan yang rapi.",
    certificates: [
      { label: "HSK - Celine", file: celineHsk, type: "pdf", preview: celineHskPreview },
      { label: "TIMS - Celine", file: celineTims, type: "image" },
      { label: "TOCFL - Celine", file: celineTocfl, type: "image" }
    ]
  },
  {
    id: 2,
    name: "Tasya",
    mandarinName: "Laoshi Tasya",
    location: "Surabaya & Online",
    schools: [schoolOptions.xinZhong, schoolOptions.petra],
    education: educationText([schoolOptions.xinZhong, schoolOptions.petra]),
    photo: tasyaPhoto,
    degree: "Lulusan program intensif bahasa Mandarin & mahasiswi Petra",
    xinzhongBackground: "Aktif di komunitas Xin Zhong dan menerapkan pendekatan kreatif dari Petra Christian University untuk murid remaja.",
    certification: "HSK - Artikel & karya tulis Mandarin",
    experience: "3 tahun mengajar, fokus meningkatkan percaya diri berbicara dan pemahaman bacaan.",
    certificates: [
      { label: "HSK - Tasya", file: tasyaHsk, type: "pdf", preview: tasyaHskPreview },
      { label: "Artikel Mandarin - Tasya", file: tasyaArticle, type: "image" },
      { label: "Portofolio Tasya", file: tasyaPortfolio, type: "image" }
    ]
  },
  {
    id: 3,
    name: "Trivera",
    mandarinName: "Laoshi Trivera",
    location: "Bandung & Online",
    schools: [schoolOptions.fengchia],
    education: educationText([schoolOptions.fengchia]),
    photo: triveraPhoto,
    degree: "Spesialisasi pengajaran anak-anak",
    xinzhongBackground: "Lulusan China Medical University di Taichung yang terbiasa mengajar siswa usia dini dengan pendekatan fun learning.",
    certification: "TOCFL C1",
    experience: "4 tahun mengajar, memadukan latihan percakapan dan permainan kosakata.",
    certificates: [{ label: "Sertifikat Trivera", file: triveraCertificate, type: "pdf" }]
  },
  {
    id: 4,
    name: "Gracia",
    mandarinName: "Laoshi Gracia",
    location: "Jakarta & Online",
    schools: [schoolOptions.chunghsing],
    education: educationText([schoolOptions.chunghsing]),
    photo: graciaPhoto,
    degree: "Sertifikasi TOCFL",
    xinzhongBackground: "Lulusan NTCUST dengan fokus pengembangan kemampuan dasar percakapan.",
    certification: "TOCFL B1",
    experience: "Mendampingi banyak pemula dewasa memulai percakapan sehari-hari dalam Mandarin.",
    certificates: [{ label: "Sertifikat Gracia", file: graciaCertificate, type: "pdf" }]
  },
  {
    id: 5,
    name: "Michelle Putri",
    mandarinName: "Laoshi Michelle Putri",
    location: "Medan & Online",
    schools: [schoolOptions.chunghsing],
    education: educationText([schoolOptions.chunghsing]),
    photo: michellePutriPhoto,
    degree: "Sertifikasi HSK",
    xinzhongBackground: "Lulusan Taichung Chung Hsing University yang aktif membina kelas persiapan ujian.",
    certification: "HSK",
    experience: "5 tahun mengajar, membantu siswa menaklukkan ujian HSK lewat latihan intensif.",
    certificates: [{ label: "HSK - Michelle Putri", file: michellePutriHsk, type: "pdf", preview: michelleHskPreview }]
  },
  {
    id: 6,
    name: "Rachel",
    mandarinName: "Laoshi Rachel",
    location: "Online",
    schools: [schoolOptions.ntcust],
    education: educationText([schoolOptions.ntcust]),
    degree: "Sertifikasi menyusul",
    xinzhongBackground: "Lulusan NTCUST yang tengah menyiapkan sertifikat terbarunya.",
    certification: "HSK • TOCFL • Jinan University Score",
    experience: "Berpengalaman mengajar percakapan sehari-hari dan kelas privat fleksibel.",
    certificates: [
      { label: "HSK - Rachel", file: rachelHsk, type: "pdf" },
      { label: "TOCFL - Rachel", file: rachelTocfl, type: "pdf" },
      { label: "Jinan University Score", file: rachelJinan, type: "pdf" }
    ]
  },
  {
    id: 7,
    name: "Aurelia Kelly",
    mandarinName: "Laoshi Aurelia Kelly",
    location: "Online",
    schools: [schoolOptions.xinZhong],
    education: educationText([schoolOptions.xinZhong]),
    photo: aureliaPhoto,
    degree: "Sertifikasi pengajaran Mandarin",
    xinzhongBackground: "Berbasis di Xin Zhong School dengan fokus pendampingan percakapan dasar dan persiapan ujian.",
    certification: "TOCFL B1",
    experience: "Mendampingi pemula dewasa memulai percakapan sehari-hari dengan latihan terstruktur.",
    certificates: [{ label: "Sertifikat Aurelia Kelly", file: aureliaCertificate, type: "pdf" }]
  },
  {
    id: 8,
    name: "Ellen",
    mandarinName: "Laoshi Ellen",
    location: "Online",
    schools: [schoolOptions.mntnu],
    education: educationText([schoolOptions.mntnu]),
    photo: ellenPhoto,
    degree: "TOCFL C1",
    xinzhongBackground: "Berpengalaman mengajar percakapan dasar dan persiapan ujian.",
    certification: "TOCFL C1",
    experience: "Mendampingi pemula memulai percakapan sehari-hari dengan latihan terstruktur.",
    certificates: [{ label: "Sertifikat Ellen", file: ellenCertificate, type: "pdf" }]
  },
  {
    id: 9,
    name: "Ms. Jaxine",
    mandarinName: "陳嘉欣 Laoshi",
    location: "Online",
    schools: [schoolOptions.chinaMedicalShuinan],
    education: educationText([schoolOptions.chinaMedicalShuinan]),
    photo: jaxinePhoto,
    degree: "Sertifikasi TOCFL",
    xinzhongBackground: "Lulusan China Medical University Shuinan Campus.",
    certification: "TOCFL",
    experience: "Berpengalaman mengajar bahasa Mandarin.",
    certificates: [
      { label: "TOCFL - Jaxine", file: jaxineTocfl, type: "pdf" },
      { label: "Resume - Jaxine", file: jaxineResume, type: "pdf" }
    ]
  },
  {
    id: 10,
    name: "Olivia",
    mandarinName: "Laoshi Olivia",
    location: "Online",
    schools: [schoolOptions.ntcust],
    education: educationText([schoolOptions.ntcust]),
    photo: oliviaPhoto,
    degree: "Sertifikasi TOCFL",
    xinzhongBackground: "Lulusan NTCUST.",
    certification: "TOCFL",
    experience: "Berpengalaman mengajar bahasa Mandarin.",
    certificates: [
      { label: "Sertifikat Olivia", file: oliviaTocfl1, type: "image" },
      { label: "TOCFL", file: oliviaTocfl2, type: "image" }
    ]
  },
  {
    id: 11,
    name: "Ayaka",
    mandarinName: "溫愛麗 Ayaka Laoshi",
    location: "Online",
    schools: [schoolOptions.nkust],
    education: educationText([schoolOptions.nkust]),
    photo: ayakaPhoto,
    degree: "Sertifikasi TOCFL",
    xinzhongBackground: "Lulusan National Kaohsiung University of Science and Technology.",
    certification: "TOCFL B2",
    experience: "Berpengalaman mengajar bahasa Mandarin.",
    certificates: [
      { label: "TOCFL B2 - Ayaka", file: ayakaTocfl, type: "pdf" }
    ]
  },
  {
    id: 12,
    name: "Janice Taiya",
    mandarinName: "戴美钿 Janice Taiya Laoshi",
    location: "Online",
    schools: [schoolOptions.uph],
    education: educationText([schoolOptions.uph]),
    photo: taiyaPhoto,
    degree: "Sertifikasi HSK 6",
    xinzhongBackground: "Lulusan Universitas Pelita Harapan.",
    certification: "HSK 6",
    experience: "Berpengalaman mengajar bahasa Mandarin.",
    certificates: [
      { label: "HSK 6 (1) - Janice", file: taiyaHsk1, type: "image" },
      { label: "HSK 6 (2) - Janice", file: taiyaHsk2, type: "pdf" }
    ]
  },
  {
    id: 13,
    name: "Audrey",
    mandarinName: "劉如玉 Audrey Laoshi",
    location: "Online",
    schools: [schoolOptions.nkust],
    education: educationText([schoolOptions.nkust]),
    photo: audreyPhoto,
    degree: "Sertifikasi HSK 5 & TOCFL B1",
    xinzhongBackground: "Lulusan National Kaohsiung University of Science and Technology.",
    certification: "HSK 5 & TOCFL B1",
    experience: "Berpengalaman mengajar bahasa Mandarin.",
    certificates: [
      { label: "HSK 5 - Audrey", file: audreyHsk, type: "pdf" },
      { label: "TOCFL B1 - Audrey", file: audreyTocfl, type: "image" }
    ]
  }
];

