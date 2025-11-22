export interface Testimonial {
  id: number;
  name: string;
  age: number;
  mandarinName: string;
  text: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sari Wijaya",
    age: 28,
    mandarinName: "思慧 (Sī Huì)",
    text: "Belajar dengan Laoshi Celine sangat menyenangkan! Sekarang saya bisa ngobrol dengan klien Mandarin di kantor."
  },
  {
    id: 2,
    name: "Budi Santoso",
    age: 35,
    mandarinName: "文杰 (Wén Jié)",
    text: "Metode mengajar di Ling Chinese Lab sangat efektif. Dalam 6 bulan saya lulus HSK 4!"
  },
  {
    id: 3,
    name: "Rina Kusuma",
    age: 22,
    mandarinName: "丽娜 (Lì Nà)",
    text: "Dari nol sampai bisa baca dan tulis karakter Mandarin, thanks to Laoshi Linda!"
  },
  {
    id: 4,
    name: "Andreas Tan",
    age: 40,
    mandarinName: "安德 (Ān Dé)",
    text: "Untuk yang sudah dewasa seperti saya, cara ngajar Laoshi Michael sangat pas dan sabar."
  },
  {
    id: 5,
    name: "Putri Amanda",
    age: 16,
    mandarinName: "小美 (Xiǎo Měi)",
    text: "Awalnya takut belajar Mandarin, tapi Laoshi Stefani bikin jadi seru dan nggak boring!"
  },
  {
    id: 6,
    name: "David Lim",
    age: 30,
    mandarinName: "大卫 (Dà Wèi)",
    text: "Business Mandarin saya meningkat pesat setelah les dengan Laoshi Kevin. Recommended!"
  }
];
