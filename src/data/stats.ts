import { teachers } from "./teachers";

export interface Stat {
  id: number;
  label: string;
  value: string;
  description: string;
}

export const stats: Stat[] = [
  {
    id: 1,
    label: "Views Video @lingchineselab",
    value: "400K+",
    description: "Total views video edukasi Mandarin di TikTok dan Instagram"
  },
  {
    id: 2,
    label: "Jumlah Murid Ling Chinese Lab",
    value: "100+",
    description: "Murid aktif saat ini"
  },
  {
    id: 3,
    label: "Mentor Bersertifikat HSK & TOCFL",
    value: teachers.length.toString(),
    description: "Laoshi profesional"
  }
];

export const whatsappUrl = "https://wa.me/6285100195519?text=Halo%20Ling%20Mandarin%20Lab,%20saya%20ingin%20tanya%20les%20Mandarin.";
