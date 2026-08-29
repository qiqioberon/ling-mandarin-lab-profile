import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ChevronRight, MessageCircle, Mail, Clock } from 'lucide-react';
import { whatsappUrl } from '@/data/stats';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Bagaimana cara membeli e-book?',
    a: 'Buka halaman E-Book, pilih produk, lalu klik Beli. Isi data pembeli dan selesaikan pembayaran. Setelah pembayaran terkonfirmasi, akses e-book otomatis aktif di halaman Library menggunakan email Anda.',
  },
  {
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Ada dua jalur. (1) Bayar Online — QRIS, Virtual Account, dan e-Wallet, akses langsung terbuka setelah bayar. (2) Scan QRIS — scan kode QR memakai aplikasi bank atau e-wallet apa saja, bayar sesuai nominal yang tertera, lalu unggah bukti. Diverifikasi tim kami maksimal 1×24 jam.',
  },
  {
    q: 'Berapa lama akses saya aktif setelah membayar?',
    a: 'Akses bersifat permanen untuk akun email yang Anda gunakan saat membeli. Selama akun tersebut aktif, Anda bisa membuka e-book kapan saja di halaman Library.',
  },
  {
    q: 'Bagaimana kalau sudah transfer tapi akses belum terbuka?',
    a: 'Untuk transfer manual, verifikasi dilakukan maksimal 1×24 jam. Jika lewat dari itu, hubungi kami via WhatsApp dengan menyertakan kode pesanan (diawali LCL-) dan bukti transfer, dan kami akan segera memeriksanya.',
  },
  {
    q: 'Apakah e-book bisa diunduh atau dicetak?',
    a: 'Tidak. E-book hanya bisa dibaca di dalam website dan diberi watermark sesuai akun Anda. Ini untuk melindungi karya penulis dari penyebaran ulang.',
  },
  {
    q: 'Bagaimana kebijakan pengembalian dana?',
    a: (
      <>
        Karena produk bersifat digital dan akses langsung diberikan, pembelian pada dasarnya tidak dapat direfund. Rincian
        selengkapnya ada di{' '}
        <Link to="/refund-policy" className="text-primary underline">
          Kebijakan Pengembalian Dana
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Saya tidak menerima kode OTP, apa yang harus dilakukan?',
    a: 'Periksa folder Spam/Promosi di email Anda, dan pastikan email yang dimasukkan sama persis dengan email saat membeli. Tunggu 1–2 menit lalu coba kirim ulang. Jika tetap tidak masuk, hubungi kami via WhatsApp.',
  },
  {
    q: 'Bisakah akun saya dipakai di beberapa perangkat?',
    a: 'Bisa, selama Anda masuk dengan email yang sama. Namun akun bersifat pribadi — membagikan akses ke orang lain melanggar ketentuan dan dapat menyebabkan akun ditutup.',
  },
  {
    q: 'Apakah ada versi cetak?',
    a: 'Saat ini kami hanya menyediakan versi digital (e-book) yang dibaca di dalam website. Belum ada versi cetak.',
  },
  {
    q: 'Bagaimana cara menghubungi customer service?',
    a: 'Hubungi kami melalui WhatsApp atau email yang tercantum di bagian bawah halaman ini pada jam operasional. Kami akan membalas secepatnya.',
  },
];

const Faq = () => {
  return (
    <div className="min-h-screen bg-background w-full flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">Beranda</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">FAQ</span>
          </div>

          <h1 className="text-3xl font-bold text-primary mb-8">Pertanyaan yang Sering Diajukan</h1>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 bg-cream rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Masih butuh bantuan?</h2>
            <ul className="space-y-3 text-sm text-foreground">
              <li className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span>
                  WhatsApp:{' '}
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline font-semibold">
                    +62 851-0019-5519
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Email: <strong>lingchineselab@gmail.com</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Jam operasional: Senin–Jumat, 09.00–17.00 WIB</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Faq;
