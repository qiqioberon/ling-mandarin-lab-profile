import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pdfjs, Document, Page } from 'react-pdf';
import HTMLFlipBook from 'react-pageflip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut, BookOpen, Scroll, ChevronLeft, Bookmark, Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import QuizModal, { QUIZ_DATABASE, QUIZ_TITLES } from '@/components/reader/QuizModal';
import { Input } from '@/components/ui/input';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Wrapper komponen halaman untuk HTMLFlipBook (wajib pakai forwardRef)
const PdfPageWrapper = React.forwardRef<HTMLDivElement, { pageNum: number, height: number }>(
  ({ pageNum, height }, ref) => {
    return (
      <div ref={ref} className="bg-white overflow-hidden shadow-inner cursor-pointer" data-density="soft">
        <Page 
          pageNumber={pageNum} 
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="pointer-events-none flex items-center justify-center w-full h-full [&_.react-pdf__Page__canvas]:!w-full [&_.react-pdf__Page__canvas]:!h-full [&_.react-pdf__Page__canvas]:!object-fill"
          height={height} // Patokan tinggi dinamis 
        />
      </div>
    );
  }
);
PdfPageWrapper.displayName = 'PdfPageWrapper';

export default function Read() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk fitur advanced
  const [viewMode, setViewMode] = useState<'flip' | 'scroll'>(window.innerWidth < 768 ? 'scroll' : 'flip');
  const [isSinglePageFlip, setIsSinglePageFlip] = useState(window.innerWidth < 768);
  const [scale, setScale] = useState(1.0);
  const [currentPageScroll, setCurrentPageScroll] = useState(1);
  const [bookDim, setBookDim] = useState({ width: 450, height: 636 });
  
  // Advanced Features State
  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [passedQuizzes, setPassedQuizzes] = useState<number[]>([]);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [activeQuizPage, setActiveQuizPage] = useState<number | null>(null);
  const [initialPage, setInitialPage] = useState(0);
  
  const { user } = useAuth();
  const buyerEmail = user?.email || "Tamu / Guest"; 
  const displayTitle = slug === 'test' ? 'E-Book Ling Chinese Lab Volume I' : slug;
  
  type FlipBookApi = {
    pageFlip: () => {
      turnToPage: (page: number) => void;
      flipNext: () => void;
      flipPrev: () => void;
    };
  };
  const flipBookRef = useRef<FlipBookApi | null>(null);

  useEffect(() => {
    // Responsive otomatis
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      // Jangan paksa ubah viewMode jika user yang klik manual, tapi sesuaikan ukuran buku
      const w = Math.min(450, window.innerWidth - 32); 
      setBookDim({ width: w, height: w * (636 / 450) });
    };
    handleResize(); // trigger once
    window.addEventListener('resize', handleResize);
    
    // Anti klik kanan
    const disableContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', disableContextMenu);

    // Anti Keyboard Shortcuts (Screenshot/Print/Save)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key.toLowerCase() === 's') ||
        (e.ctrlKey && e.key.toLowerCase() === 'p') ||
        (e.metaKey && e.shiftKey) || 
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        toast.error("Fitur screenshot & simpan dinonaktifkan untuk melindungi hak cipta.");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('contextmenu', disableContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const isGuestMode = localStorage.getItem('demo_guest_email') || slug === 'test' || !token;

        if (isGuestMode) {
          setPdfUrl('/preview-katalog.pdf');
          setLoading(false);
          return;
        }
        
        const res = await fetch('/api/get-reader-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ slug })
        });
        
        if (!res.ok) {
          const err = await res.json();
          // Fallback to preview PDF if testing locally or demo
          setPdfUrl('/preview-katalog.pdf');
          return;
        }
        
        const data = await res.json();
        setPdfUrl(data.signedUrl);
      } catch (err) {
        setPdfUrl('/preview-katalog.pdf');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUrl();
  }, [slug]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    if (slug) {
      const savedB = localStorage.getItem(`bookmarks_${slug}`);
      if (savedB) setBookmarks(JSON.parse(savedB));
      
      const savedQ = localStorage.getItem(`passed_${slug}`);
      if (savedQ) setPassedQuizzes(JSON.parse(savedQ));
      
      const lastRead = localStorage.getItem(`lastRead_${slug}`);
      if (lastRead) {
        const page = parseInt(lastRead);
        setInitialPage(page - 1); // 0-indexed for HTMLFlipBook
        setCurrentPageScroll(page);
        setCurrentPage(page);
      }
    }
  }, [slug]);

  // Evaluasi perpindahan halaman
  const handlePageChange = (newPage: number) => {
    // Cek apakah mereka melewati halaman kuis yang belum lulus
    const quizPages = Object.keys(QUIZ_DATABASE).map(Number).sort((a, b) => a - b);
    
    // Cari apakah ada halaman kuis yang ada di ANTARA (atau SAMA DENGAN) halaman yang mereka lewati, dan belum lulus
    // Misal: mereka dari halaman 10, mau ke halaman 12. Kuis ada di halaman 11.
    const lockedPage = quizPages.find(qp => newPage > qp && !passedQuizzes.includes(qp));
    
    if (lockedPage) {
      // Snap-back!
      toast.error(`Anda harus lulus kuis di halaman ${lockedPage} terlebih dahulu!`);
      
      // Kembalikan ke halaman kuis
      if (viewMode === 'flip') {
         flipBookRef.current?.pageFlip()?.turnToPage(lockedPage - 1); // 0-indexed
      } else {
         setCurrentPageScroll(lockedPage);
      }
      setCurrentPage(lockedPage);
      setActiveQuizPage(lockedPage); // Langsung buka kuisnya!
    } else {
      setCurrentPage(newPage);
      localStorage.setItem(`lastRead_${slug}`, newPage.toString());
    }
  };

  useEffect(() => {
    if (viewMode === 'scroll') handlePageChange(currentPageScroll);
  }, [currentPageScroll, viewMode]);

  const handlePassQuiz = (pageId: number) => {
    setPassedQuizzes(prev => {
      if (prev.includes(pageId)) return prev;
      const newP = [...prev, pageId];
      localStorage.setItem(`passed_${slug}`, JSON.stringify(newP));
      return newP;
    });
    setActiveQuizPage(null);
    toast.success("Hore! Kuis Lulus! Anda bisa lanjut membaca.");
  };

  const toggleBookmark = () => {
    setBookmarks(prev => {
      const newB = prev.includes(currentPage) ? prev.filter(p => p !== currentPage) : [...prev, currentPage].sort((a,b) => a-b);
      localStorage.setItem(`bookmarks_${slug}`, JSON.stringify(newB));
      toast.success(prev.includes(currentPage) ? 'Bookmark dihapus' : `Halaman ${currentPage} disimpan di bookmark`);
      return newB;
    });
  };

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(goToPageInput);
    if (!p || !numPages || p < 1 || p > numPages) {
       toast.error(`Masukkan halaman 1 - ${numPages}`);
       return;
    }
    
    const quizPages = Object.keys(QUIZ_DATABASE).map(Number).sort((a, b) => a - b);
    const lockedPage = quizPages.find(qp => p > qp && !passedQuizzes.includes(qp));
    if (lockedPage) {
      toast.error(`Anda harus lulus kuis di halaman ${lockedPage} terlebih dahulu!`);
      jumpToPage(lockedPage);
      setActiveQuizPage(lockedPage);
      return;
    }
    
    jumpToPage(p);
  };

  const jumpToPage = (p: number) => {
    if (viewMode === 'flip') {
       flipBookRef.current?.pageFlip()?.turnToPage(p - 1);
       // event onFlip akan memanggil handlePageChange nanti
    } else {
       setCurrentPageScroll(p);
       // event useEffect currentPageScroll akan memanggil handlePageChange
    }
    setGoToPageInput('');
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 2.5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));

  const handleScreenTap = (e: React.MouseEvent) => {
    // Abaikan jika klik terjadi di dalam modal kuis, toolbar, atau tombol
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.z-50') || target.closest('.z-\\[100\\]')) {
      return;
    }
    
    // Abaikan jika ada seleksi teks (berarti user sedang nge-block teks, bukan nge-tap)
    if (window.getSelection()?.toString()) {
      return;
    }

    const x = e.clientX;
    const width = window.innerWidth;
    
    // Tap area 30% Kanan = Next, 30% Kiri = Prev
    if (x > width * 0.7) {
      if (viewMode === 'flip') {
        flipBookRef.current?.pageFlip()?.flipNext();
      } else {
        setCurrentPageScroll(p => (numPages ? Math.min(numPages, p + 1) : p + 1));
      }
    } else if (x < width * 0.3) {
      if (viewMode === 'flip') {
        flipBookRef.current?.pageFlip()?.flipPrev();
      } else {
        setCurrentPageScroll(p => Math.max(1, p - 1));
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">Loading e-book...</div>;
  if (!pdfUrl) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white gap-4">
      <h2>Akses Ditolak / E-Book Tidak Ditemukan</h2>
      <Button variant="outline" onClick={() => navigate('/library')}>Kembali ke Library</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center select-none overflow-hidden">
      
      {/* HEADER / TOOLBAR */}
      <header className="relative w-full bg-zinc-950 text-white p-4 flex flex-col md:flex-row gap-4 justify-between items-center z-50 border-b border-zinc-800 shadow-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate('/library')} className="text-zinc-400 hover:text-white">
            <ChevronLeft className="w-4 h-4 mr-1" /> Library
          </Button>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm md:text-base truncate max-w-[150px] md:max-w-xs">{displayTitle}</h1>
            {numPages > 0 && (
              <span className="text-xs text-zinc-400 mt-0.5">
                Hal {currentPage} dari {numPages} ({Math.round((currentPage / numPages) * 100)}% selesai)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <Button 
            variant={viewMode === 'flip' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => { setViewMode('flip'); setScale(1.0); }}
            title="Mode Buku (Desktop)"
            className={viewMode === 'flip' ? 'bg-zinc-800' : ''}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Flip
          </Button>
          <Button 
            variant={viewMode === 'scroll' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('scroll')}
            title="Mode Gulir (Mobile/Zoom)"
            className={viewMode === 'scroll' ? 'bg-zinc-800' : ''}
          >
            <Scroll className="w-4 h-4 mr-2" /> Scroll
          </Button>
          {viewMode === 'flip' && (
             <>
               <div className="w-px h-6 bg-zinc-800 mx-1"></div>
               <Button 
                 variant={isSinglePageFlip ? 'secondary' : 'ghost'} 
                 size="sm" 
                 onClick={() => setIsSinglePageFlip(true)}
                 className={`text-xs ${isSinglePageFlip ? 'bg-zinc-800' : ''}`}
               >
                 1 Hal
               </Button>
               <Button 
                 variant={!isSinglePageFlip ? 'secondary' : 'ghost'} 
                 size="sm" 
                 onClick={() => setIsSinglePageFlip(false)}
                 className={`text-xs ${!isSinglePageFlip ? 'bg-zinc-800' : ''}`}
               >
                 2 Hal
               </Button>
             </>
          )}
          <div className="w-px h-6 bg-zinc-800 mx-1"></div>
          <Button variant="ghost" size="sm" onClick={toggleBookmark} className={bookmarks.includes(currentPage) ? 'text-primary' : 'text-zinc-400'}>
            <Bookmark className={`w-4 h-4 mr-1 md:mr-2 ${bookmarks.includes(currentPage) ? 'fill-current' : ''}`} />
            <span className="hidden md:inline">{bookmarks.includes(currentPage) ? 'Bookmarked' : 'Bookmark'}</span>
          </Button>
          <div className="w-px h-6 bg-zinc-800 mx-1 hidden md:block"></div>
          <form onSubmit={handleGoToPage} className="hidden md:flex items-center gap-1">
            <Input 
              type="number" 
              placeholder="Hal" 
              value={goToPageInput} 
              onChange={e => setGoToPageInput(e.target.value)}
              className="w-16 h-8 bg-zinc-800 border-zinc-700 text-white text-center text-xs focus-visible:ring-1"
              min={1} max={numPages || 100}
            />
            <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs px-2">Go</Button>
          </form>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={scale <= 0.6} title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={scale >= 2.5} title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Reading Progress Bar */}
        {numPages > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800/50">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentPage / numPages) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* VIEWER AREA */}
      <main 
        className="flex-1 w-full flex justify-center overflow-auto relative p-4 md:p-8 cursor-pointer"
        onClick={handleScreenTap}
      >
        
        {/* Indikator Tap Kiri/Kanan (Samar) */}
        <div className="fixed left-0 top-1/2 -translate-y-1/2 w-[30%] h-full opacity-0 pointer-events-none flex items-center p-4">
           <ChevronLeft className="w-12 h-12 text-white/20" />
        </div>
        <div className="fixed right-0 top-1/2 -translate-y-1/2 w-[30%] h-full opacity-0 pointer-events-none flex items-center justify-end p-4">
           <ChevronLeft className="w-12 h-12 text-white/20 rotate-180" />
        </div>

        {/* FLOATING QUIZ BUTTON */}
        {slug === 'test' && (QUIZ_DATABASE[currentPage] || QUIZ_DATABASE[currentPage + 1]) && (
          <div className="fixed bottom-24 right-4 md:right-8 z-50 animate-bounce">
            {(() => {
               // Cari halaman kuis yang relevan (bisa currentPage atau currentPage + 1 di mode spread desktop)
               const quizPage = QUIZ_DATABASE[currentPage] ? currentPage : currentPage + 1;
               const isPassed = passedQuizzes.includes(quizPage);
               
               return (
                 <Button 
                   onClick={() => setActiveQuizPage(quizPage)} 
                   className={`${isPassed ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'} text-white shadow-2xl rounded-full px-4 md:px-6 py-4 md:py-6 text-sm md:text-lg font-bold border-4 border-white/20`}
                 >
                   {isPassed ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 mr-2 text-white" /> : <Lock className="w-5 h-5 md:w-6 md:h-6 mr-2 text-yellow-300" />}
                   {isPassed ? `Kuis ${QUIZ_TITLES[quizPage] || `Bab (Hal. ${quizPage})`} Selesai` : `Mulai Kuis ${QUIZ_TITLES[quizPage] || `Bab (Hal. ${quizPage})`}`}
                 </Button>
               );
            })()}
          </div>
        )}
        
        <QuizModal 
          isOpen={activeQuizPage !== null} 
          onClose={() => setActiveQuizPage(null)} 
          questions={activeQuizPage ? QUIZ_DATABASE[activeQuizPage] : []} 
          onPass={() => activeQuizPage && handlePassQuiz(activeQuizPage)}
          pageId={activeQuizPage || 0}
        />

        {/* WATERMARK ANTI-SCREENSHOT (Tetap di luar container supaya menimpa semuanya) */}
        <div className="fixed inset-0 z-40 pointer-events-none flex flex-col items-center justify-center opacity-[0.03] rotate-[-30deg]">
          <p className="text-4xl md:text-8xl font-black text-white break-all text-center">{buyerEmail}</p>
          <p className="text-2xl md:text-6xl font-bold text-white mt-4">Ling Chinese Lab</p>
        </div>

        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => toast.error('Gagal memuat PDF: ' + error.message)}
          className={`flex flex-col items-center transition-transform duration-300 w-full`}
          style={{ transform: `scale(${viewMode === 'scroll' ? scale : 1})`, transformOrigin: 'top center' }}
        >
          {numPages && viewMode === 'flip' ? (
            <div className="flex items-center justify-center gap-2 md:gap-8 w-full max-w-7xl relative" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
              
              <Button 
                variant="secondary" 
                size="icon"
                className="hidden md:flex rounded-full shadow-lg z-10 w-12 h-12 bg-zinc-800 text-white hover:bg-zinc-700 hover:scale-110 transition shrink-0" 
                onClick={() => flipBookRef.current?.pageFlip()?.flipPrev()}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>

              <div className="flex justify-center shadow-2xl relative shrink-0">
                {/* @ts-expect-error HTMLFlipBook from react-pageflip lacks complete TS types */}
                <HTMLFlipBook
                  width={bookDim.width} 
                  height={bookDim.height} 
                  size="fixed"
                  maxShadowOpacity={0.3}
                  showCover={true}
                  startPage={initialPage}
                  mobileScrollSupport={false}
                  useMouseEvents={true}
                  usePortrait={isSinglePageFlip} // Boleh portrait (1 halaman) sesuai state
                  onFlip={(e: { data: number }) => handlePageChange(e.data + 1)}
                  ref={flipBookRef}
                  className="bg-transparent"
                  style={{ margin: '0 auto' }}
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <PdfPageWrapper key={`page_${index + 1}`} pageNum={index + 1} height={bookDim.height} />
                  ))}
                </HTMLFlipBook>
              </div>

              <Button 
                variant="secondary" 
                size="icon"
                className="hidden md:flex rounded-full shadow-lg z-10 w-12 h-12 bg-zinc-800 text-white hover:bg-zinc-700 hover:scale-110 transition shrink-0" 
                onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
              >
                <ChevronLeft className="w-8 h-8 rotate-180" />
              </Button>

              {/* Tombol mobile di bawah buku */}
              <div className="md:hidden absolute -bottom-16 left-0 right-0 flex justify-center gap-4">
                <Button variant="secondary" onClick={() => flipBookRef.current?.pageFlip()?.flipPrev()}>&lt; Prev</Button>
                <Button variant="secondary" onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}>Next &gt;</Button>
              </div>
            </div>
          ) : null}

          {numPages && viewMode === 'scroll' ? (
            <div className="flex flex-col gap-6 items-center w-full max-w-4xl pb-20">
              <Page 
                pageNumber={currentPageScroll} 
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-2xl bg-white rounded-sm overflow-hidden"
                width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 800) : 800}
              />
              
              <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-full shadow-lg border border-zinc-800 pointer-events-auto">
                <Button 
                  disabled={currentPageScroll <= 1} 
                  onClick={() => setCurrentPageScroll(p => p - 1)}
                  variant="ghost" size="sm" className="text-white hover:bg-zinc-800"
                >
                  &lt; Prev
                </Button>
                <p className="text-sm font-medium text-zinc-300">
                  {currentPageScroll} / {numPages}
                </p>
                <Button 
                  disabled={currentPageScroll >= numPages} 
                  onClick={() => setCurrentPageScroll(p => p + 1)}
                  variant="ghost" size="sm" className="text-white hover:bg-zinc-800"
                >
                  Next &gt;
                </Button>
              </div>
            </div>
          ) : null}
        </Document>

      </main>
    </div>
  );
}
