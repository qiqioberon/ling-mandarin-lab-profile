export interface Stat {
  id: number;
  label: string;
  value: string;
  description: string;
}

export const stats: Stat[] = [
  {
    id: 1,
    label: "Views Video Celine",
    value: "120K+",
    description: "Total views di TikTok"
  },
  {
    id: 2,
    label: "Jumlah Murid Celine",
    value: "50+",
    description: "Murid aktif saat ini"
  },
  {
    id: 3,
    label: "Mentor Bersertifikat HSK",
    value: "5",
    description: "Laoshi profesional"
  }
];

export const whatsappUrl = "https://wa.me/6281234567890?text=Halo%20Ling%20Mandarin%20Lab,%20saya%20ingin%20tanya%20les%20Mandarin.";
