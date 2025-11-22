export interface Program {
  id: number;
  level: string;
  title: string;
  description: string;
  features: string[];
}

export const programs: Program[] = [
  {
    id: 1,
    level: "Basic",
    title: "Program Basic - Untuk Pemula Total",
    description: "Cocok untuk yang belum pernah belajar Mandarin sama sekali",
    features: [
      "Pengenalan Pinyin dan tone Mandarin",
      "Percakapan sederhana untuk perkenalan",
      "Pengenalan karakter Mandarin dasar",
      "Latihan pronunciation intensif"
    ]
  },
  {
    id: 2,
    level: "Medium",
    title: "Program Medium - Tingkat Menengah",
    description: "Untuk yang sudah menguasai dasar dan ingin level up",
    features: [
      "Grammar dan struktur kalimat kompleks",
      "Percakapan untuk situasi sehari-hari",
      "Reading comprehension untuk teks sederhana",
      "Persiapan HSK Level 3-4 & TOCFL Band A2"
    ]
  },
  {
    id: 3,
    level: "Advance",
    title: "Program Advance - Tingkat Lanjut",
    description: "Untuk yang ingin mahir dan lancar berbahasa Mandarin",
    features: [
      "Business Mandarin dan formal conversation",
      "Reading & writing karakter advanced",
      "Persiapan HSK Level 5-6 & TOCFL Band B",
      "Cultural context dan idiom Mandarin",
    ]
  }
];
