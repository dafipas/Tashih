/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Search, BookOpen, Volume2, Bookmark, Check, AlertCircle, PlusCircle, Sparkles } from "lucide-react";
import { Surah } from "../types";
import { quranSurahs } from "../data";

// Fast diacritics stripper to support 10x dictionary coverage on base letter matching
const stripArabicDiacritics = (text: string) => {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .trim();
};

const quranDictionary: Record<string, string> = {
  // Al-Fatihah / Juz 30 and Common words
  "بِسْمِ": "Dengan nama",
  "اللَّهِ": "Allah",
  "الرَّحْمَٰنِ": "Maha Pengasih",
  "الرَّحِيمِ": "Maha Penyayang",
  "الحمد": "Segala puji",
  "الْحَمْدُ": "Segala puji",
  "لله": "Bagi Allah",
  "لِلَّهِ": "Bagi Allah",
  "رب": "Tuhan",
  "رَبِّ": "Tuhan",
  "العالمين": "Semesta alam",
  "الْعَالَمِينَ": "Semesta alam",
  "الرحمن": "Maha Pengasih",
  "الرحيم": "Maha Penyayang",
  "مالك": "Pemilik / Menguasai",
  "مَالِكِ": "Pemilik / Menguasai",
  "يوم": "Hari",
  "يَوْمِ": "Hari",
  "الدين": "Pembalasan",
  "الدِّينِ": "Pembalasan",
  "إياك": "Hanya kepada-Mu",
  "إِيَّاكَ": "Hanya kepada-Mu",
  "نعبد": "Kami menyembah",
  "نَعْبُدُ": "Kami menyembah",
  "وإياك": "Dan hanya kepada-Mu",
  "وَإِيَّاكَ": "Dan hanya kepada-Mu",
  "نستعين": "Kami mohon pertolongan",
  "نَسْتَعِينُ": "Kami mohon pertolongan",
  "اهدنا": "Tunjukilah kami",
  "اهْدِنَا": "Tunjukilah kami",
  "الصراط": "Jalan",
  "الصِّرَاطَ": "Jalan",
  "المستقيم": "Yang lurus",
  "الْمُسْتَقِيمَ": "Yang lurus",
  "الذين": "Orang-orang yang",
  "الَّذِينَ": "Orang-orang yang",
  "أنعمت": "Telah Engkau beri nikmat",
  "أَنْعَمْتَ": "Telah Engkau beri nikmat",
  "عليهم": "Atas mereka",
  "عَلَيْهِمْ": "Atas mereka",
  "غير": "Bukan / Selain",
  "غَيْرِ": "Bukan / Selain",
  "المغضub": "Yang dimurkai",
  "المغضوب": "Yang dimurkai",
  "الْمَغْضُوبِ": "Yang dimurkai",
  "ولا": "Dan bukan pula",
  "وَلَا": "Dan bukan pula",
  "الضالين": "Orang-orang yang sesat",
  "الضَّالِّينَ": "Orang-orang yang sesat",
  "ذَٰلِكَ": "itu / demikian itu",
  "الْكِتَابُ": "kitab",
  "رَيْبَ": "keraguan",
  "فِيهِ": "di dalamnya",
  "هُدًى": "petunjuk",
  "لِلْمُتَّقِينَ": "bagi orang bertaqwa",
  
  // Surat Al-Ikhlas, Al-Falaq, An-Nas, dll
  "قل": "Katakanlah",
  "قُلْ": "Katakanlah",
  "أعوذ": "Aku berlindung",
  "أَعُوذُ": "Aku berlindung",
  "برب": "Kepada Tuhan",
  "بِرَبِّ": "Kepada Tuhan",
  "ملك": "Raja",
  "مَلِكِ": "Raja",
  "إله": "Sembahan",
  "إِلَٰهِ": "Sembahan",
  "الناس": "Manusia",
  "النَّاسِ": "Manusia",
  "من": "Dari",
  "مِنْ": "Dari",
  "شر": "Kejahatan",
  "شَرِّ": "Kejahatan",
  "الوسواس": "Bisikan",
  "الْوَسْوَاسِ": "Bisikan",
  "الخناس": "Yang bersembunyi",
  "الْخَنَّاسِ": "Yang bersembunyi",
  "الذي": "Yang",
  "الَّذِي": "Yang",
  "يوسوس": "Membisikkan",
  "يُوَسْوِسُ": "Membisikkan",
  "صدور": "Dada",
  "صُدُورِ": "Dada",
  "الجنة": "Golongan jin",
  "الْجِنَّةِ": "Golongan jin",
  "والناس": "Dan manusia",
  "وَالنَّاسِ": "Dan manusia",
  "ناس": "Manusia",
  
  "الفلق": "Waktu subuh",
  "الْفَلَقِ": "Waktu subuh",
  "ما": "Apa yang / Sesuatu",
  "خلق": "Dia ciptakan",
  "خَلَقَ": "Dia ciptakan",
  "غاسق": "Malam",
  "غَاسِقٍ": "Malam",
  "إذا": "Apabila",
  "إِذَا": "Apabila",
  "وقب": "Telah gelap gulita",
  "وَقَبَ": "Telah gelap gulita",
  "النfaثat": "Wanita-wanita penyihir",
  "النَّفَّاثَاتِ": "Wanita-wanita penyihir",
  "العقد": "Ikatan-ikatan",
  "الْعُقَدِ": "Ikatan-ikatan",
  "حاسد": "Orang yang dengki",
  "حَاسِدٍ": "Orang yang dengki",
  "حسد": "Telah dengki",
  "حَسَدَ": "Telah dengki",
  
  "هو": "Dia",
  "هُوَ": "Dia",
  "احد": "Yang Maha Esa",
  "أَحَدٌ": "Yang Maha Esa",
  "الصمد": "Tumpuan / Bergantung",
  "الصَّمَدُ": "Tumpuan / Bergantung",
  "لم": "Tidak / Belum",
  "لَمْ": "Tidak / Belum",
  "يلد": "Dia melahirkan",
  "يَلِدْ": "Dia melahirkan",
  "يولد": "Dia dilahirkan",
  "يُولَدْ": "Dia dilahirkan",
  "يكن": "Ada / Menjadi",
  "يَكُنْ": "Ada / Menjadi",
  "له": "Bagi-Nya / Untuk-Nya",
  "لَهُ": "Bagi-Nya / Untuk-Nya",
  "كفوا": "Setara / Sekufu",
  "كُفُوًا": "Setara / Sekufu",
  
  // Ad-Duha
  "والضحى": "Demi waktu dhuha",
  "وَالضُّحَىٰ": "Demi waktu dhuha",
  "والليل": "Dan demi malam",
  "وَاللَّيْلِ": "Dan demi malam",
  "سجى": "Telah sunyi",
  "سَجَىٰ": "Telah sunyi",
  "ودعك": "Meninggalkanmu",
  "وَدَّعَكَ": "Meninggalkanmu",
  "وما": "Dan tidak pula",
  "وَمَا": "Dan tidak pula",
  "قلى": "Membencimu",
  "قَلَىٰ": "Membencimu",
  "وللآخرة": "Dan sungguh akhirat itu",
  "وَلَلْآخِرَةُ": "Dan sungguh akhirat itu",
  "خير": "Lebih baik",
  "خَيْرٌ": "Lebih baik",
  "لك": "Bagimu",
  "لَكَ": "Bagimu",
  "الأولى": "Dari permulaan / Dunia",
  "الْأُولَىٰ": "Dari permulaan / Dunia",
  "ولسوف": "Dan kelak pasti",
  "وَلَسَوْفَ": "Dan kelak pasti",
  "يعطيك": "Memberikan kepadamu",
  "يُعْطِيكَ": "Memberikan kepadamu",
  "ترضى": "Kamu menjadi puas / senang",
  "تَرْضَىٰ": "Kamu menjadi puas / senang",
  "يجدk": "Dia mendapatimu",
  "يَجِدْكَ": "Dia mendapatimu",
  "يتيما": "Seorang yatim",
  "يَتِيمًا": "Seorang yatim",
  "فآوى": "Lalu Dia melindungi",
  "فَآوَىٰ": "Lalu Dia melindungi",
  "ضالا": "Bingung / Tersesat",
  "ضَالًّا": "Bingung / Tersesat",
  "فهدى": "Lalu Dia memberi petunjuk",
  "فَهَدَىٰ": "Lalu Dia memberi petunjuk",
  "عائلا": "Miskin / Berkurang",
  "عَائِلًا": "Miskin / Berkurang",
  "فأغنى": "Lalu Dia memberi kecukupan",
  "فَأَغْنَىٰ": "Lalu Dia memberi kecukupan",
  "اليتيم": "Anak yatim",
  "الْيَتِيمَ": "Anak yatim",
  "فلا": "Maka janganlah",
  "فَلَا": "Maka janganlah",
  "تقهر": "Kamu sewenang-wenang",
  "تَقْهَرْ": "Kamu sewenang-wenang",
  "السائل": "Orang yang meminta",
  "السَّائِلَ": "Orang yang meminta",
  "تنher": "Kamu menghardik",
  "تَنْهَرْ": "Kamu menghardik",
  "بنعمة": "Dengan nikmat",
  "بِنِعْمَةِ": "Dengan nikmat",
  "فحدث": "Maka ungkapkanlah / Ceritakanlah",
  "فَحَدِّثْ": "Maka ungkapkanlah / Ceritakanlah",
};

import { getWordWordTranslation as getWordWordTranslationUtil } from "../utils/quranUtils";

const getWordWordTranslation = (word: string, indonesianVerse: string, index: number, totalWords: number): string => {
  return getWordWordTranslationUtil(word, indonesianVerse, index, totalWords);
};

interface MushafModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSurahNumber: number;
  highlightStart: number;
  highlightEnd: number;
  onAddAsCustomQuestion?: (selectedVerseDetail: {
    surahNumber: number;
    surahName: string;
    nomorAyat: number;
    teksArab: string;
    teksIndonesia: string;
    nextTeksArab: string;
    nextTeksIndonesia: string;
  }) => void;
}

interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksIndonesia: string;
}

export const MushafModal: React.FC<MushafModalProps> = ({
  isOpen,
  onClose,
  initialSurahNumber,
  highlightStart,
  highlightEnd,
  onAddAsCustomQuestion
}) => {
  const [selectedSurahNum, setSelectedSurahNum] = useState<number>(initialSurahNumber);
  const [ayats, setAyats] = useState<Ayat[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isTerjemahPerkata, setIsTerjemahPerkata] = useState<boolean>(false);
  const [jumpAyat, setJumpAyat] = useState<number>(highlightStart || 1);

  const currentSurahMeta = quranSurahs.find(s => s.number === selectedSurahNum) || quranSurahs[0];

  useEffect(() => {
    if (isOpen) {
      setSelectedSurahNum(initialSurahNumber);
    }
  }, [isOpen, initialSurahNumber]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSurat = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`https://equran.id/api/v2/surat/${selectedSurahNum}`);
        if (!response.ok) {
          throw new Error("Gagal mengambil data ayat dari API server");
        }
        const result = await response.json();
        
        if (result && result.code === 200 && result.data && result.data.ayat) {
          const formattedAyats = result.data.ayat.map((a: any) => ({
            nomorAyat: a.nomorAyat,
            teksArab: a.teksArab,
            teksIndonesia: a.teksIndonesia
          }));
          setAyats(formattedAyats);
        } else {
          throw new Error("Format data API tidak sesuai");
        }
      } catch (err: any) {
        console.warn("Using offline simulated view for Mushaf modal", err);
        // Fallback simulated verses for the elected range
        const fallbackList: Ayat[] = [];
        const limit = Math.min(currentSurahMeta.totalVerses, 15);
        for (let i = 1; i <= limit; i++) {
          fallbackList.push({
            nomorAyat: i,
            teksArab: `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ - قِرَاءَةُ سُورَةِ ${currentSurahMeta.arabic} الآيَةُ ﴿${i}﴾`,
            teksIndonesia: `[Tampilan Luring] Membaca Mushaf Surat ${currentSurahMeta.name} Ayat ke-${i}. Silakan sambungkan internet Anda untuk memuat naskah lengkap digital Madinah secara otomatis.`
          });
        }
        setAyats(fallbackList);
        setError("Sistem berjalan dalam mode luring rasyid offline. Menampilkan teks panduan visual.");
      } finally {
        setLoading(false);
      }
    };

    fetchSurat();
  }, [selectedSurahNum, isOpen]);

  // Autoscroll to active range/jumpAyat when loading completes or when modal opens
  useEffect(() => {
    if (!isOpen || loading || ayats.length === 0) return;
    
    // Choose start target
    const targetVerse = selectedSurahNum === initialSurahNumber ? (highlightStart || 1) : 1;
    setJumpAyat(targetVerse);

    const timer = setTimeout(() => {
      const targetElement = document.getElementById(`mushaf-ayat-${selectedSurahNum}-${targetVerse}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [ayats, loading, isOpen, selectedSurahNum, initialSurahNumber, highlightStart]);

  const handleScrollToAyat = (customVerse?: number) => {
    const targetVerse = customVerse || jumpAyat;
    if (!targetVerse || targetVerse < 1 || targetVerse > currentSurahMeta.totalVerses) {
      alert(`Ayat tidak valid! Silakan masukkan ayat antara 1 s.d. ${currentSurahMeta.totalVerses}`);
      return;
    }
    const targetElement = document.getElementById(`mushaf-ayat-${selectedSurahNum}-${targetVerse}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Temporary animation highlight
      const targetCard = targetElement;
      targetCard.style.boxShadow = "0 0 0 4px #f59e0b";
      targetCard.style.borderColor = "#f59e0b"; // gold/amber border
      setTimeout(() => {
        targetCard.style.boxShadow = "";
        targetCard.style.borderColor = "";
      }, 2000);
    } else {
      alert("Halaman Mushaf sedang memuat...");
    }
  };

  if (!isOpen) return null;

  // Filter surahs for selection search
  const filteredSurahs = quranSurahs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString().includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 bg-red-955/80 bg-red-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[100] animate-[fadeIn_0.2s_ease_out]">
      <div 
        id="mushaf-modal-card"
        className="bg-white border-8 border-red-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
      >
        {/* Inner gold border */}
        <div className="absolute inset-1.5 border border-amber-500/50 rounded-2xl pointer-events-none z-10" />

        {/* Modal Header */}
        <div className="bg-red-800 text-white p-4 sm:p-5 relative z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-amber-500/40">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-white text-red-700 flex items-center justify-center font-bold shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-lg tracking-tight flex items-center gap-1.5">
                MUSHAF AL-QURAN DIGITAL LENGKAP
              </h2>
              <p className="text-[10px] text-red-100 font-medium">
                Sarat Panduan Uji: <span className="font-bold text-yellow-300">QS. {currentSurahMeta.name} ({currentSurahMeta.arabic})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Quick selectors or indicators */}
            <span className="bg-white/10 border border-white/20 text-yellow-300 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
              Highlight Ayat: {highlightStart} s/d {highlightEnd}
            </span>
            <button
              id="clos-mushaf-modal"
              onClick={onClose}
              className="p-1 px-3 bg-red-900 hover:bg-red-950 text-white rounded-lg border border-red-700 transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span className="text-[11px] font-bold">TUTUP</span>
            </button>
          </div>
        </div>

        {/* Modal Main Layout: Left Selection Column for 114 Surahs, Right scroll for verses */}
        <div className="flex-1 flex overflow-hidden bg-[#faf8f5]">
          
          {/* Side Panel: Surah List (114 Surahs Selection Panel) */}
          <div className="w-64 border-r border-red-90/20 border-red-100 hidden md:flex flex-col bg-white">
            
            {/* Search Input */}
            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari surat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-red-650"
                />
              </div>
            </div>

            {/* Scrollable list of 114 Surahs */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredSurahs.map((s) => {
                const isActive = s.number === selectedSurahNum;
                return (
                  <button
                    key={s.number}
                    onClick={() => setSelectedSurahNum(s.number)}
                    className={`w-full p-2.5 px-3.5 text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? "bg-red-50 text-red-950 font-bold border-l-4 border-red-600" 
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                        isActive ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {s.number}
                      </span>
                      <span>{s.name}</span>
                    </div>
                    <span className="text-gray-400 font-serif text-[11px]">{s.arabic}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Content / Ayat displays */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* UNIFIED NAVIGATION & STUDY ACTION BAR (Surah Search, Ayat Search, and Terjemah Perkata Toggle) */}
            <div className="bg-[#fdfaf6] border-b border-red-100 p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm relative z-20">
              
              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Surah Selector Dropdown */}
                <div className="flex flex-col min-w-[200px]">
                  <label htmlFor="mushaf-surah-select-actionbar" className="text-[10px] uppercase font-black text-red-800/60 select-none tracking-widest mb-1">
                    📖 Pilih Surat
                  </label>
                  <select
                    id="mushaf-surah-select-actionbar"
                    value={selectedSurahNum}
                    onChange={(e) => {
                      setSelectedSurahNum(Number(e.target.value));
                      setJumpAyat(1);
                    }}
                    className="w-full bg-white hover:bg-gray-50 border border-red-150 rounded-xl px-3 py-1.5 text-xs text-red-950 font-extrabold cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-red-650"
                  >
                    {quranSurahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        QS. {s.number} {s.name} ({s.totalVerses} Ayat)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Ayat number search / jump */}
                <div className="flex flex-col">
                  <label htmlFor="mushaf-ayat-input-actionbar" className="text-[10px] uppercase font-black text-red-800/60 select-none tracking-widest mb-1">
                    🔍 Lompat ke Ayat
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="mushaf-ayat-input-actionbar"
                      type="number"
                      min={1}
                      max={currentSurahMeta.totalVerses}
                      value={jumpAyat || ""}
                      onChange={(e) => setJumpAyat(Number(e.target.value))}
                      placeholder={`1-${currentSurahMeta.totalVerses}`}
                      className="w-20 bg-white border border-red-150 rounded-xl px-2.5 py-1 text-xs text-center text-red-955 font-extrabold focus:outline-none focus:ring-1 focus:ring-red-650 shadow-sm animate-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleScrollToAyat();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleScrollToAyat()}
                      className="bg-red-700 hover:bg-red-850 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border border-red-800 flex items-center justify-center font-sans uppercase"
                    >
                      Buka
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Toggle for Word-by-Word Study (PILIHAN TERJEMAH PERKATA) */}
              <div className="flex items-center self-end md:self-center gap-2">
                <button
                  type="button"
                  id="btn-perkata-toggle-actionbar"
                  onClick={() => setIsTerjemahPerkata(!isTerjemahPerkata)}
                  className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-md border flex items-center gap-2 cursor-pointer ${
                    isTerjemahPerkata 
                      ? "bg-emerald-600 border-emerald-750 text-white hover:bg-emerald-700 animate-[pulse_2.5s_infinite]" 
                      : "bg-white hover:bg-[#fbf9f4] text-emerald-800 border-emerald-600/30"
                  }`}
                  title="Aktifkan atau matikan terjemahan kata per kata di bawah naskah Quran"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isTerjemahPerkata ? "text-white animate-spin" : "text-emerald-650"}`} />
                  <span>Terjemah Perkata: {isTerjemahPerkata ? "AKTIF" : "MATI"}</span>
                </button>
              </div>

            </div>

            {/* Quick alert bar if offline/info */}
            {error && (
              <div className="bg-red-50 border-b border-red-100 p-2 text-[10px] text-red-700 flex items-center justify-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Scrollable Ayats panel */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              {/* Surah Bismillah Banner if not At-Taubah */}
              {selectedSurahNum !== 9 && (
                <div className="text-center py-6 border-b border-dashed border-red-100">
                  <div className="font-arabic text-2xl text-red-955 font-bold select-all tracking-wide">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>
                  <p className="text-[10px] text-gray-500 italic mt-1">"Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang."</p>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-red-800 font-bold animate-pulse">Menghubungkan Server Lajnah Al-Quran...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {ayats.map((ayat, index) => {
                    // Check if this verse is in the highlighted configured test range
                    const isHighlighted = 
                      selectedSurahNum === initialSurahNumber &&
                      ayat.nomorAyat >= highlightStart && 
                      ayat.nomorAyat <= highlightEnd;

                    return (
                      <div 
                        key={ayat.nomorAyat}
                        id={`mushaf-ayat-${selectedSurahNum}-${ayat.nomorAyat}`}
                        className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                          isHighlighted 
                            ? "bg-red-500/10 border-red-550 border-red-400 ring-2 ring-red-600/30 shadow-md transform scale-[1.01]" 
                            : "bg-white border-gray-150 border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        {/* Highlight Badge */}
                        {isHighlighted && (
                          <span className="absolute top-2.5 left-2.5 bg-red-600 text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-all">
                            <Bookmark className="w-2.5 h-2.5 text-white" /> Target Saringan Ujian
                          </span>
                        )}

                        <div className="flex flex-col space-y-4">
                          
                          {/* Verse Number & Arabic row */}
                          <div className="flex justify-between items-start gap-4">
                            
                            {/* Verse designator badge */}
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold select-none ${
                              isHighlighted ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"
                            }`}>
                              {ayat.nomorAyat}
                            </span>

                            {/* Full Arabic text or Word-by-Word Translation Grid */}
                            <div className="flex-1 text-right select-all">
                              {isTerjemahPerkata ? (
                                <div className="flex flex-row-reverse flex-wrap gap-x-4 gap-y-6 justify-start text-right select-all font-arabic" dir="rtl">
                                  {ayat.teksArab.split(/\s+/).map((word, wordIdx, wordsArr) => {
                                    const translation = getWordWordTranslation(word, ayat.teksIndonesia, wordIdx, wordsArr.length);
                                    return (
                                      <div key={wordIdx} className="flex flex-col items-center justify-center min-w-[64px] border-b border-dashed border-red-200 pb-2 hover:bg-amber-50/50 transition-all rounded p-1" dir="rtl">
                                        <span className="text-xl sm:text-2xl text-red-950 font-bold leading-relaxed font-arabic">
                                          {word}
                                        </span>
                                        <span className="text-[10px] sm:text-[11px] text-emerald-800 font-sans font-bold mt-1 text-center whitespace-normal max-w-[130px] leading-snug" dir="ltr">
                                          {translation}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="arabic-text text-2xl sm:text-3xl text-red-950 font-bold leading-loose tracking-wide font-arabic" dir="rtl">
                                  {ayat.teksArab}
                                </p>
                              )}
                            </div>

                          </div>

                          {/* Indonesian translation text with dynamic "+" test maker button */}
                          <div className="pt-2 border-t border-gray-100/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 font-bold select-none uppercase tracking-wider mb-0.5 font-sans">Terjemah:</p>
                              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
                                {ayat.teksIndonesia}
                              </p>
                            </div>

                            {/* Quick Add Question Button */}
                            {onAddAsCustomQuestion && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextAyat = ayats[index + 1];
                                  onAddAsCustomQuestion({
                                    surahNumber: selectedSurahNum,
                                    surahName: currentSurahMeta.name,
                                    nomorAyat: ayat.nomorAyat,
                                    teksArab: ayat.teksArab,
                                    teksIndonesia: ayat.teksIndonesia,
                                    nextTeksArab: nextAyat ? nextAyat.teksArab : "",
                                    nextTeksIndonesia: nextAyat ? nextAyat.teksIndonesia : ""
                                  });
                                }}
                                className="self-end md:self-center shrink-0 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] sm:text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer hover:shadow-red-500/20"
                                title="Jadikan ayat ini sebagai Soal Ujian"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>+ Tambah Jadi Soal</span>
                              </button>
                            )}
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick helpful notice bottom bar */}
            <div className="bg-white border-t border-gray-100 p-3 px-4 flex justify-between items-center text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 nav h-3 text-red-600" /> Verse highlights help identify questions.
              </span>
              <span>Total verses listed: {ayats.length}</span>
            </div>

          </div>

        </div>

        {/* Modal Royal Gilded Footer */}
        <div className="bg-red-50 text-center py-2.5 text-[10px] border-t border-red-100 text-red-800 font-serif font-bold">
          PERLAJNAHAN MUSHAF AL-QURAN DIGITAL SANTRIS INDONESIA
        </div>

      </div>
    </div>
  );
};
