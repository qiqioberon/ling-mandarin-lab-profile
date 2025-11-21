import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import TikTokSection from "@/components/home/TikTokSection";
import ProgramsSection from "@/components/home/ProgramsSection";
import TeachersPreview from "@/components/home/TeachersPreview";
import TestimonialsSection from "@/components/home/TestimonialsSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main>
        <HeroSection />
        <TikTokSection />
        <ProgramsSection />
        <TeachersPreview />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
