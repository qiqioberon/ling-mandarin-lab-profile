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
  certificateImage: string;
  certificatePdf: string;
}

export const teachers: Teacher[] = [
  {
    id: 1,
    name: "Celine",
    mandarinName: "小玲 (Xiǎo Líng)",
    location: "Jakarta & Online",
    education: "Xin Zhong School",
    degree: "Lulusan Mandarin",
    xinzhongBackground: "Alumni Xin Zhong School dengan prestasi akademik unggulan",
    certification: "HSK Level 5",
    experience: "3 tahun mengajar, spesialisasi anak usia 5-15 tahun dan pemula dewasa",
    certificateImage: "https://example.com/certificates/celine-cert-thumb.jpg",
    certificatePdf: "https://example.com/certificates/celine-hsk5.pdf"
  },
  {
    id: 2,
    name: "Linda",
    mandarinName: "琳达 (Lín Dá)",
    location: "Surabaya & Online",
    education: "Universitas Petra, Chinese Literature",
    degree: "S1 Sastra Mandarin",
    xinzhongBackground: "Alumni Xin Zhong School, aktif dalam kompetisi Mandarin nasional",
    certification: "HSK Level 6, Teaching Certificate",
    experience: "5 tahun mengajar, fokus pada persiapan HSK dan conversation",
    certificateImage: "https://example.com/certificates/linda-cert-thumb.jpg",
    certificatePdf: "https://example.com/certificates/linda-hsk6.pdf"
  },
  {
    id: 3,
    name: "Michael",
    mandarinName: "文豪 (Wén Háo)",
    location: "Bandung & Online",
    education: "Xin Zhong School, Taiwan Normal University",
    degree: "S1 Teaching Chinese as Second Language",
    xinzhongBackground: "Alumni Xin Zhong School, melanjutkan studi di Taiwan",
    certification: "HSK Level 6, TCSOL Certificate",
    experience: "4 tahun mengajar, spesialisasi business Mandarin dan HSK preparation",
    certificateImage: "https://example.com/certificates/michael-cert-thumb.jpg",
    certificatePdf: "https://example.com/certificates/michael-tcsol.pdf"
  },
  {
    id: 4,
    name: "Stefani",
    mandarinName: "思琪 (Sī Qí)",
    location: "Jakarta & Online",
    education: "Xin Zhong School",
    degree: "Lulusan Mandarin",
    xinzhongBackground: "Alumni Xin Zhong School dengan nilai terbaik di kelas",
    certification: "HSK Level 5",
    experience: "2 tahun mengajar, fokus pada anak-anak dan remaja",
    certificateImage: "https://example.com/certificates/stefani-cert-thumb.jpg",
    certificatePdf: "https://example.com/certificates/stefani-hsk5.pdf"
  },
  {
    id: 5,
    name: "Kevin",
    mandarinName: "凯文 (Kǎi Wén)",
    location: "Medan & Online",
    education: "Xin Zhong School, Beijing Language and Culture University",
    degree: "S1 Chinese Language",
    xinzhongBackground: "Alumni Xin Zhong School, pernah tinggal di Beijing selama 4 tahun",
    certification: "HSK Level 6, Native-like fluency",
    experience: "6 tahun mengajar, spesialisasi advanced conversation dan cultural context",
    certificateImage: "https://example.com/certificates/kevin-cert-thumb.jpg",
    certificatePdf: "https://example.com/certificates/kevin-hsk6.pdf"
  }
];
