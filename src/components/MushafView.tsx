/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Question, QuestionType } from "../types";
import { Eye, EyeOff, BookOpen, AlertCircle, HelpCircle, Volume2, ChevronDown, ChevronUp, Sparkles, ChevronRight, Mic, Maximize, Minimize, Square, Play, Home, Hash, RefreshCw } from "lucide-react";
import { getJuzNumber } from "../data";
import { getWordWordTranslation } from "../utils/quranUtils";
import { MushafModal } from "./MushafModal";

interface MushafViewProps {
  question: Question | null;
  showAnswer: boolean;
  setShowAnswer: (show: boolean) => void;
  isSpinning: boolean;
  currentSpinningSurahName?: string;
  currentSpinningVerseNum?: number;
  availableJuzs?: number[];
  onBismillahClick?: () => void;
  onStopSpin?: () => void;
  onNextVerse?: () => void;
  onNextSurah?: () => void;
  isMicActive?: boolean;
  onToggleMicActive?: (active: boolean) => void;
  onOpenMushaf?: () => void;
  micError?: string;
  onClearMicError?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  revealCountdown?: number;
  spinDuration?: number;
  isMushafOpen?: boolean;
  setIsMushafOpen?: (open: boolean) => void;
  onAddAsCustomQuestion?: (verseDetail: any) => void;
  onBackToHome?: () => void;
  appMode?: "home" | "sambung_ayat" | "terjamah";
  typeFilter?: string;
  modePool?: Question[];
  onSelectQuestion?: (q: Question) => void;
  onRandomInstant?: () => void;
  onDeselectQuestion?: () => void;
}

export const MushafView: React.FC<MushafViewProps> = ({
  question,
  showAnswer,
  setShowAnswer,
  isSpinning,
  currentSpinningSurahName,
  currentSpinningVerseNum,
  availableJuzs,
  onBismillahClick,
  onStopSpin,
  onNextVerse,
  onNextSurah,
  isMicActive = false,
  onToggleMicActive,
  onOpenMushaf,
  micError = "",
  onClearMicError,
  isFullscreen = false,
  onToggleFullscreen,
  revealCountdown = 0,
  spinDuration = 15,
  isMushafOpen = false,
  setIsMushafOpen,
  onAddAsCustomQuestion,
  onBackToHome,
  appMode,
  typeFilter,
  modePool = [],
  onSelectQuestion,
  onRandomInstant,
  onDeselectQuestion
}) => {
  const [showQuestionTranslation, setShowQuestionTranslation] = useState<boolean>(true);
  const [showAnswerTranslation, setShowAnswerTranslation] = useState<boolean>(true);
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  const [isWordByWord, setIsWordByWord] = useState<boolean>(appMode === "terjamah");
  const [localSpinningJuz, setLocalSpinningJuz] = useState<number>(1);

  useEffect(() => {
    if (appMode === "terjamah") {
      setIsWordByWord(true);
    } else {
      setIsWordByWord(false);
    }
  }, [appMode]);

  // Determine if spinning is actually active for the current viewing mode to prevent cross-tab shuffling noise
  const isSpinningActive = isSpinning && (
    (appMode === "sambung_ayat" && typeFilter === "sambung_ayat") ||
    (appMode === "terjamah" && typeFilter === "arti_pemahaman")
  );

  // Local countdown timer for auto-stop visual feedback
  const [timeLeft, setTimeLeft] = useState<number>(spinDuration);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSpinningActive) {
      setTimeLeft(spinDuration);
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpinningActive, spinDuration]);

  // Real-time ticking for beautiful responsive shuffle display on all screens
  useEffect(() => {
    let tickInterval: NodeJS.Timeout | null = null;
    if (isSpinningActive) {
      const actualJuzs = availableJuzs && availableJuzs.length > 0 
        ? availableJuzs 
        : Array.from({ length: 30 }, (_, i) => i + 1);

      tickInterval = setInterval(() => {
        const randomJuz = actualJuzs[Math.floor(Math.random() * actualJuzs.length)];
        setLocalSpinningJuz(randomJuz);
      }, 110);
    }
    return () => {
      if (tickInterval) clearInterval(tickInterval);
    };
  }, [isSpinningActive, availableJuzs]);

  const renderWordByWordText = (arabicText: string, translationText: string, isAnswer: boolean) => {
    const words = arabicText.split(/\s+/).filter(Boolean);
    return (
      <div 
        dir="rtl" 
        className="flex flex-wrap justify-center gap-x-2.5 sm:gap-x-4 gap-y-3 sm:gap-y-4 pt-4 pb-4 leading-loose mt-4 w-full"
      >
        {words.map((word, index) => {
          const trans = getWordWordTranslation(word, translationText, index, words.length);
          return (
            <div 
              key={index} 
              className={`flex flex-col items-center px-2 py-1 sm:py-1.5 rounded-xl border transition-all duration-155 select-text cursor-help ${
                isAnswer 
                  ? "bg-emerald-50/40 hover:bg-emerald-100/75 border-emerald-200/50" 
                  : "bg-amber-50/40 hover:bg-amber-100/75 border-amber-250/50"
              }`}
            >
              <span className={`font-arabic font-extrabold text-xl sm:text-2xl ${isAnswer ? "text-emerald-950" : "text-amber-950"}`}>
                {word}
              </span>
              <span className="w-full h-[1px] bg-gray-200/30 my-0.5" />
              <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold text-center leading-normal max-w-[70px] break-words">
                {trans}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Reset internal display states when question ID changes
  useEffect(() => {
    setShowQuestionTranslation(true);
    setShowAnswerTranslation(true);
    setShowExplanation(true);
  }, [question?.id]);

  // Sample beautiful quranic phrases to swap dynamically during visual spin
  const spinningArabicTexts = [
    "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    "الرَّحْمَٰنِ الرَّحِيمِ مَالِكِ يَوْمِ الدِّينِ",
    "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
    "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ",
    "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ",
    "فَصَلِّ لِرَبِّكَ وَانْحَرْ",
    "قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ",
    "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ",
    "إِنَّ مَعَ الْعُسْرِ يُسْرًا"
  ];

  const activeSpinningPhrase = spinningArabicTexts[(currentSpinningVerseNum || 0) % spinningArabicTexts.length];

  return (
    <div 
      id="mushaf-layout" 
      className={isFullscreen ? "fixed inset-0 z-[99999] w-screen h-screen bg-[#0f0e0e]/95 flex flex-col items-center justify-center p-4 md:p-8" : "w-full max-w-4xl mx-auto px-1 sm:px-0"}
    >
      {/* Outer Mushaf Card Frame with strict 16:9 aspect ratio */}
      <div 
        id="mushaf-card"
        className={`relative bg-[#ffffff] border-[8px] md:border-[12px] rounded-2xl shadow-2xl overflow-hidden flex flex-col p-1 sm:p-2 transition-all duration-300 select-none border-red-800 mushaf-glow-red ${
          isFullscreen
            ? "w-full max-w-5xl aspect-video max-h-[88vh]"
            : "w-full aspect-video"
        }`}
        style={{ backgroundImage: "linear-gradient(135deg, #ffffff 0%, #fefcfb 100%)" }}
      >
        {/* Inner Gold Gilded Border Lines */}
        <div className="absolute inset-1.5 md:inset-2 border-2 border-amber-500/60 rounded-lg pointer-events-none z-0" />
        <div className="absolute inset-2 md:inset-3 border border-amber-500/30 rounded-lg pointer-events-none z-0" />
        
        {/* Traditional Corner Ornaments */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 rounded-tl-sm pointer-events-none z-0 border-red-600" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 rounded-tr-sm pointer-events-none z-0 border-red-600" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 rounded-bl-sm pointer-events-none z-0 border-red-600" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 rounded-br-sm pointer-events-none z-0 border-red-600" />

        {/* Header Ribbon Indicator inside the 16:9 card */}
        <div className="relative z-10 flex justify-between items-center px-4 sm:px-6 pt-2.5 pb-2 border-b font-bold shrink-0 border-red-100/90 text-red-955 text-red-950">
          {!isSpinningActive && question ? (
            <>
              <span className="flex items-center gap-1.5 animate-fadeIn">
                {isFullscreen && onBackToHome && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBackToHome();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 border border-red-500/20 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    <Home className="w-3.5 h-3.5 text-white" />
                    <span>Menu Utama</span>
                  </button>
                )}
                {isFullscreen && onDeselectQuestion && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeselectQuestion();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 border border-amber-500/20 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    <Hash className="w-3.5 h-3.5 text-white" />
                    <span>Kembali ke Daftar Soal</span>
                  </button>
                )}
                <span className="font-mono text-[9px] sm:text-[11px] text-white bg-red-650 bg-red-600 px-2 py-0.5 rounded font-bold uppercase shadow-sm">
                  JUZ {getJuzNumber(question.surahNumber, question.verseStart)}
                </span>
                {showAnswer ? (
                  <span className="font-mono text-[9px] sm:text-[11px] text-white bg-emerald-600 px-2 py-0.5 rounded font-bold uppercase shadow-sm animate-pulse">
                    KUNCI JAWABAN
                  </span>
                ) : (
                  <span className="font-mono text-[9px] sm:text-[11px] text-white bg-amber-600 px-2 py-0.5 rounded font-bold uppercase shadow-sm">
                    SOAL UJIAN
                  </span>
                )}
              </span>
              <span className="font-sans font-extrabold uppercase tracking-wider text-red-800 text-[11px] sm:text-sm">
                QS. {question.surahName} : Ayat {question.verseStart}
                {question.verseEnd > question.verseStart ? `-${question.verseEnd}` : ""}
              </span>
              <div className="flex items-center gap-2">
                {isFullscreen && onBismillahClick && (
                  <button
                    type="button"
                    id="fullscreen-header-start-spin-active"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBismillahClick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] sm:text-xs font-black shadow-md border border-red-500 cursor-pointer active:scale-95 transition-all"
                    title="Mulai Acak Soal Baru"
                  >
                    <Play className="w-3 h-3 text-white fill-white" />
                    <span>Mulai Acak</span>
                  </button>
                )}
                <span className="font-sans font-bold text-[9px] sm:text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">
                  Hal {question.mushafPage}
                </span>
                {onToggleFullscreen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFullscreen();
                    }}
                    className={`p-1 rounded-md transition-all cursor-pointer border ${
                      isFullscreen 
                        ? "bg-amber-600 border-amber-500 text-white hover:bg-amber-700" 
                        : "bg-white border-gray-200 text-gray-500 hover:text-red-700 hover:bg-gray-55"
                    }`}
                    title={isFullscreen ? "Keluar Layar Penuh (Esc)" : "Mode Layar Penuh"}
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 animate-fadeIn">
                {isFullscreen && onBackToHome && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBackToHome();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 border border-red-500/20 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    <Home className="w-3.5 h-3.5 text-white" />
                    <span>Kembali ke Menu Utama</span>
                  </button>
                )}
                <span className="text-red-700/50 text-[10px] uppercase font-bold tracking-widest">TASHIH DIGITAL</span>
              </span>
              <span className="text-red-700 font-extrabold text-[11px] sm:text-xs uppercase tracking-widest animate-pulse">
                SISTEM ACAK TAHFIDZ DIGITAL
              </span>
              <div className="flex items-center gap-2">
                {isFullscreen && isSpinningActive && onStopSpin && (
                  <button
                    type="button"
                    id="fullscreen-header-stop-spin"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStopSpin();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] sm:text-xs font-black shadow-md border border-red-500 cursor-pointer active:scale-95 transition-all animate-[pulse_1.5s_infinite]"
                    title="Hentikan Acak Soal"
                  >
                    <Square className="w-3 h-3 text-white fill-white" />
                    <span>Hentikan</span>
                  </button>
                )}
                {isFullscreen && !isSpinningActive && !revealCountdown && onBismillahClick && (
                  <button
                    type="button"
                    id="fullscreen-header-start-spin-idle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBismillahClick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-red-650 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] sm:text-xs font-black shadow-md border border-red-500 cursor-pointer active:scale-95 transition-all"
                    title="Mulai Acak Soal Baru"
                  >
                    <Play className="w-3 h-3 text-white fill-white" />
                    <span>Mulai Acak</span>
                  </button>
                )}
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">STAGE SCREEN</span>
                {onToggleFullscreen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFullscreen();
                    }}
                    className={`p-1 rounded-md transition-all cursor-pointer border ${
                      isFullscreen 
                        ? "bg-amber-600 border-amber-500 text-white hover:bg-amber-700" 
                        : "bg-white border-gray-200 text-gray-500 hover:text-red-700 hover:bg-gray-55"
                    }`}
                    title={isFullscreen ? "Keluar Layar Penuh (Esc)" : "Mode Layar Penuh"}
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Center Screen Container */}
        <div className="relative flex-1 flex flex-col justify-center items-center overflow-hidden z-10 px-4 sm:px-8 py-2 md:py-3">
          
          {/* SPINNING PLACEHOLDER CAROUSEL */}
          {isSpinningActive ? (
            <div id="spinning-loader" className="flex flex-col items-center justify-center space-y-2 sm:space-y-4 py-2 text-center w-full animate-fadeIn">
              
              {/* Rotating glowing sphere */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-dashed border-red-650 border-red-600 rounded-full animate-spin-slow opacity-85" />
                <div className="absolute inset-1.5 bg-red-50 rounded-full animate-pulse opacity-70" />
                <BookOpen className="w-7 h-7 sm:w-9 sm:h-9 text-red-700 z-10" />
              </div>

              <div className="space-y-1.5 w-full">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold tracking-widest uppercase animate-bounce">
                  <span>MENGACAK SOAL...</span>
                </div>

                <div className="bg-red-50/40 p-2.5 sm:p-4 rounded-xl border border-red-200/50 max-w-md mx-auto">
                  <div className="arabic-text text-xl sm:text-2xl text-center text-red-950 font-semibold font-arabic h-10 flex items-center justify-center select-none animate-pulse" dir="rtl">
                    {activeSpinningPhrase}
                  </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 sm:p-5 rounded-2xl max-w-xs mx-auto text-center flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-amber-700/90 tracking-widest leading-none">
                    {currentSpinningSurahName === "SOAL" ? "TARGET ACAK SOAL" : "TARGET ACAK JUZ"}
                  </span>
                  <div className="font-extrabold text-red-600 text-4xl sm:text-5xl my-1.5 animate-[pulse_0.4s_infinite]">
                    {currentSpinningSurahName === "SOAL"
                      ? `SOAL ${String(currentSpinningVerseNum !== undefined ? currentSpinningVerseNum : localSpinningJuz).padStart(2, "0")}`
                      : `JUZ ${localSpinningJuz}`}
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 mb-2">
                    Auto-stop dalam <span className="text-red-700 font-extrabold select-none px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md border border-red-100">{timeLeft}s</span>
                  </span>

                  {onStopSpin && (
                    <button
                      type="button"
                      id="btn-stop-spin-fullscreen"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopSpin();
                      }}
                      className="mt-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-650 bg-red-650 bg-red-650 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow border border-red-500 cursor-pointer animate-[pulse_2s_infinite]"
                      title="Hentikan acakan secara manual"
                    >
                      <Square className="w-3 h-3 text-white fill-white" />
                      <span>Hentikan (STOP)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : revealCountdown && revealCountdown > 0 ? (
            <div id="reveal-countdown-container" className="flex flex-col items-center justify-center space-y-4 py-4 text-center w-full animate-fadeIn">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                {/* Rotating golden/red glowing dashed outlines */}
                <div className="absolute inset-x-0 inset-y-0 border-4 border-dashed border-red-650 border-red-600 rounded-full animate-spin-slow opacity-85" />
                <div className="absolute inset-1.5 bg-red-50 rounded-full animate-pulse opacity-75" />
                <span className="font-sans font-black text-3xl sm:text-4xl text-red-700 z-10 animate-bounce">
                  {revealCountdown}
                </span>
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600 text-white text-[9px] sm:text-[10px] font-extrabold tracking-widest uppercase shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>PERSIAPAN PESERTA...</span>
                </div>

                <div className="bg-red-50/45 border border-red-200/50 p-4 rounded-xl shadow-sm">
                  <span className="text-[9px] uppercase font-black text-gray-400 tracking-widest block leading-none mb-1">SOAL YANG AKAN MUNCUL</span>
                  <div className="font-extrabold text-red-800 text-3xl sm:text-4xl my-1">
                    {currentSpinningSurahName === "SOAL"
                      ? `SOAL ${String(currentSpinningVerseNum !== undefined ? currentSpinningVerseNum : localSpinningJuz).padStart(2, "0")}`
                      : `SOAL JUZ ${currentSpinningVerseNum !== undefined ? currentSpinningVerseNum : localSpinningJuz}`}
                  </div>
                  <p className="text-[10px] font-semibold text-gray-500 leading-normal">
                    Harap tenang! Butir soal akan terbuka secara otomatis setelah hitungan mundur berakhir.
                  </p>
                </div>
              </div>
            </div>
          ) : question ? (
            /* NON-SPINNING ACTIVE PRESENTATION STAGE */
            <div className="w-full h-full flex flex-col justify-between overflow-y-auto pr-1 select-text scrollbar-thin">
              
              {!showAnswer ? (
                /* === SCREEN 1: QUESTION IS ACTIVE === */
                <div id="stage-screen-question" className="flex flex-col justify-center h-full space-y-2.5 sm:space-y-4 py-1 animate-[fadeIn_0.22s_ease_out]">
                  
                  {/* Top Prompt Instruction details */}
                  <div className="flex items-center justify-between gap-2 border-b border-gray-150/40 pb-2">
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-white bg-red-600 px-2.5 py-1 rounded-full shadow-sm">
                      <HelpCircle className="w-3 h-3 text-white" /> INSTRUKSI TAHFIDZ:
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm md:text-base text-red-950 italic font-extrabold text-center mt-1 tracking-wide select-all leading-relaxed">
                    "{question.questionPrompt}"
                  </p>

                  {/* Core Question Text Box (Arabic) - Enhanced with Stage Spotlight Golden Highlights */}
                  <div className="relative bg-amber-50/50 border-2 border-amber-500 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(217,119,6,0.25)] ring-4 ring-amber-500/35 overflow-hidden flex flex-col items-center">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500 text-white flex items-center justify-center rounded-bl-xl font-bold font-mono text-[10px] shadow-sm select-none">
                      QS
                    </div>
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5 select-none">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      <span className="text-[10px] font-extrabold uppercase text-amber-900/70 tracking-widest">
                        🎯 SOROTAN AYAT UJIAN: {question.verseStart} {question.verseEnd > question.verseStart ? `sampai ${question.verseEnd}` : ""}
                      </span>
                    </div>
                    <div className="absolute top-1.5 left-3 text-[9px] uppercase font-black text-amber-800 tracking-wider select-none">
                      📖 Teks Ayat Soal Yang Sedang Diujikan
                    </div>

                    {!question || !question.questionArabic ? (
                      <div className="flex flex-col items-center justify-center py-6 sm:py-10 space-y-3 animate-pulse w-full select-none">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div className="absolute inset-0 border-4 border-dashed border-amber-600 rounded-full animate-spin" />
                          <BookOpen className="w-5 h-5 text-amber-700 animate-pulse" />
                        </div>
                        <span className="text-xs text-amber-900 font-extrabold font-sans uppercase tracking-widest block">Menyelaraskan Naskah Al-Quran...</span>
                      </div>
                    ) : !isWordByWord ? (
                      <div className="arabic-text text-2xl sm:text-3xl md:text-4xl text-right font-black text-red-950 tracking-wide font-arabic leading-loose select-all selection:bg-amber-200 mt-5 pt-3 pb-4 w-full" dir="rtl">
                        {question.questionArabic}
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-red-800/80 font-mono text-sm font-black text-red-900 bg-red-50/50 ml-3 shrink-0 align-middle">
                          {question.verseStart}
                        </span>
                      </div>
                    ) : (
                      renderWordByWordText(question.questionArabic, question.questionTranslation, false)
                    )}
                  </div>

                  {/* Question Translation / Indonesian meaning hidden by default, but shown for Terjamah mode */}
                  {(appMode === "terjamah" || question.type === QuestionType.ARTI_PEMAHAMAN) && showQuestionTranslation && (
                    <div id="question-translation-box" className="bg-amber-50/40 border border-amber-250 rounded-xl p-3.5 sm:px-4 mt-2 animate-fadeIn text-center space-y-2.5">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-amber-200/50 pb-2">
                        <span className="text-[9px] uppercase font-bold text-amber-850 tracking-wider leading-none">
                          Terjemahan Kemenag RI (Kementerian Agama Republik Indonesia)
                        </span>
                        
                        {/* Interactive Word-by-word Switcher with a tiny glowing indicator */}
                        <div className="flex items-center gap-1 bg-amber-100/50 border border-amber-200 p-0.5 rounded-lg text-[9px] font-bold">
                          <button
                            type="button"
                            onClick={() => setIsWordByWord(false)}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${!isWordByWord ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-200"}`}
                          >
                            Utuh
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsWordByWord(true)}
                            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${isWordByWord ? "bg-amber-600 text-white shadow-sm" : "text-amber-900 hover:bg-amber-200"}`}
                          >
                            Per Kata
                          </button>
                        </div>
                      </div>
                      
                      {!isWordByWord ? (
                        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-bold select-all">
                          {question.questionTranslation}
                        </p>
                      ) : (
                        <div className="text-[10px] text-amber-900 italic font-medium leading-none flex items-center justify-center gap-1.5 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                          <span>Sentuh / arahkan kursor ke tiap kata Arab di atas untuk melihat terjemahan per kata</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                /* === SCREEN 2: ANSWER IS PRESENTED (SWAPS THE SCREEN) === */
                <div id="stage-screen-answer" className="flex flex-col justify-center h-full space-y-2 sm:space-y-3.5 py-1 animate-[fadeIn_0.22s_ease_out]">
                  
                  {/* Top Answer Alert */}
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold text-white bg-emerald-600 px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">
                      <BookOpen className="w-3 h-3" /> Jawaban Sambungan / Kunci Benar:
                    </span>
                    {question.type === QuestionType.SAMBUNG_AYAT ? (
                      <p className="text-[11px] sm:text-xs text-emerald-800 font-bold mt-1 uppercase tracking-wider">
                        Lanjutan Ayat {question.verseEnd + 1} Seterusnya
                      </p>
                    ) : (
                      <p className="text-[11px] sm:text-xs text-emerald-800 font-bold mt-1 uppercase tracking-wider">
                        Pelajaran Khusus & Pemahaman
                      </p>
                    )}
                  </div>

                  {/* Core Answer Text Box (Arabic) - Enhanced with Spotlight Emerald Highlights */}
                  <div className="relative bg-emerald-50/45 border-2 border-emerald-500 rounded-2xl p-4 sm:p-6 shadow-[0_0_30px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/25 overflow-hidden flex flex-col items-center">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500 text-white flex items-center justify-center rounded-bl-xl font-bold font-mono text-[10px] shadow-sm select-none">
                      ANS
                    </div>
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5 select-none">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                      <span className="text-[10px] font-extrabold uppercase text-emerald-900/70 tracking-widest">
                        ✅ KUNCI JAWABAN: AYAT {question.verseEnd + 1} SETERUSNYA
                      </span>
                    </div>
                    <div className="absolute top-1.5 left-3 text-[9px] uppercase font-black text-emerald-800 tracking-wider select-none">
                      Kunci Jawaban Sambungan Ayat
                    </div>

                    {!isWordByWord ? (
                      <div className="arabic-text text-2xl sm:text-3xl md:text-4xl text-right font-black text-emerald-950 tracking-wide font-arabic leading-loose mt-5 pt-3 pb-4 select-all selection:bg-emerald-100 w-full" dir="rtl">
                        {question.answerArabic}
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-emerald-800/80 font-mono text-sm font-black text-emerald-900 bg-emerald-50/50 ml-3 shrink-0 align-middle">
                          {question.verseEnd + 1}
                        </span>
                      </div>
                    ) : (
                      renderWordByWordText(question.answerArabic, question.answerTranslation, true)
                    )}
                  </div>

                  {/* Answer interpretation and Tadabur */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3">
                    
                    {/* Translation detail */}
                    {showAnswerTranslation && (
                      <div className="md:col-span-6 bg-emerald-50/10 border border-emerald-100 rounded-lg p-2 sm:p-3 relative">
                        {appMode === "terjamah" || question.type === QuestionType.ARTI_PEMAHAMAN ? (
                          <div className="space-y-2">
                            <div>
                              <span className="text-[8px] uppercase font-bold text-teal-800/60 select-none block tracking-widest">
                                Terjemah Ayat Soal (Awal)
                              </span>
                              <p className="text-[11px] sm:text-xs text-slate-800 leading-relaxed font-bold mt-0.5 select-all">
                                {question.questionTranslation}
                              </p>
                            </div>
                            <div className="border-t border-emerald-100/50 pt-1.5 mt-1.5">
                              <span className="text-[8px] uppercase font-bold text-emerald-800/60 select-none block tracking-widest">
                                Terjemah Ayat Jawaban (Lanjutan)
                              </span>
                              <p className="text-[11px] sm:text-xs text-emerald-950 leading-relaxed font-bold mt-0.5 select-all">
                                {question.answerTranslation}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-[8px] uppercase font-bold text-emerald-800/50 select-none block tracking-widest">
                              Arti / Tafsir Kunci
                            </span>
                            <p className="text-[11px] sm:text-xs text-gray-700 leading-relaxed font-medium mt-0.5 select-all">
                              {question.answerTranslation}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Tajwid detail */}
                    {showExplanation && (
                      <div className="md:col-span-6 bg-red-50/10 border border-red-100/50 rounded-lg p-2 sm:p-3 relative">
                        <span className="text-[8px] uppercase font-bold text-red-800/50 select-none block tracking-widest">
                          Hukum Tajwid & Waqaf
                        </span>
                        <p className="text-[11px] sm:text-xs text-red-950 leading-relaxed font-semibold mt-0.5 select-all text-justify">
                          {question.explanation}
                        </p>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* Persistent Navigation Panel (Ayat & Surat Berikutnya) inside the card */}
              <div id="persistent-nav-footer" className="mt-auto pt-2 border-t border-red-50/70 flex items-center justify-between gap-2 shrink-0 select-none">
                <div className="text-[10px] text-gray-400 font-medium italic flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Hafalan Aktif Sesi Ini</span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {isFullscreen && onDeselectQuestion && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeselectQuestion();
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-855 text-white rounded-xl text-[10px] sm:text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-amber-500/20"
                      title="Kembali ke Daftar Nomor Soal"
                    >
                      <Hash className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>Kembali ke Daftar Soal</span>
                    </button>
                  )}

                  {onOpenMushaf && (
                    <button
                      type="button"
                      id="btn-nav-mushaf-open"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMushaf();
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] sm:text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-amber-400"
                      title="Buka Al-Quran Utsmani Terjemah Perkata"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-white" />
                      <span>Al-Quran</span>
                    </button>
                  )}

                  {onToggleMicActive && (
                    <button
                      type="button"
                      id="btn-nav-mic-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMicActive(!isMicActive);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border ${
                        isMicActive 
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 animate-[pulse_2s_infinite]" 
                          : "bg-white hover:bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                      title={isMicActive ? "Matikan Mikrofon Asisten" : "Aktifkan Mikrofon Asisten"}
                    >
                      <Mic className={`w-3.5 h-3.5 ${isMicActive ? "text-white animate-bounce" : "text-red-700"}`} />
                      <span>{isMicActive ? "Mic Aktif" : "Mic Mati"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-nav-next-verse"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNextVerse?.();
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-[10px] sm:text-xs font-black shadow-sm flex items-center gap-1 transition-all active:scale-95 cursor-pointer border border-amber-400/20 shadow-md animate-pulse"
                    title="Geser ke ayat berikutnya"
                  >
                    <span>Ayat Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* CONVENIENT INTERACTIVE QUESTIONS GRID INSIDE THE MUSHAF CARD */
            <div id="mushaf-welcome-state" className="w-full max-w-2xl px-4 sm:px-6 py-4 space-y-4 sm:space-y-5 flex flex-col items-center justify-center animate-[fadeIn_0.5s_ease_out]">
              
              {/* Proportional Basmalah Header */}
              <div className="text-center select-none space-y-1">
                <span className="font-arabic text-xl sm:text-2xl text-amber-500 font-bold block leading-relaxed" dir="rtl">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </span>
                <h3 className="text-[11px] sm:text-xs font-black uppercase text-red-900 tracking-[0.15em] font-sans">
                  Lembar Ujian: {appMode === "terjamah" ? "Terjemah Al Quran" : "Sambung Ayat"}
                </h3>
              </div>

              {/* Grid content container */}
              <div className="w-full bg-white border border-red-55 border-red-100/50 rounded-2xl p-4 shadow-sm space-y-3.5">
                
                {/* Meta stats bar */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-gray-400 select-none border-b border-gray-100 pb-2">
                  <span className="flex items-center gap-1.5 text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full animate-ping bg-red-500" />
                    TOTAL: {modePool.length} SOAL TERSEDIA
                  </span>
                  <span>PILIH NOMOR SOAL DI BAWAH INI:</span>
                </div>

                {modePool.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 leading-normal bg-red-50/10 rounded-xl border border-dashed border-red-100/20">
                    <p className="font-semibold">Belum ada soal tersedia di bank soal.</p>
                    <p className="text-[10px] mt-1">Silakan tarik atau impor data soal baru terlebih dahulu di menu Dashboard.</p>
                  </div>
                ) : (
                  <div className="max-h-[145px] sm:max-h-[205px] overflow-y-auto pr-1 select-none scrollbar-thin">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2 text-center">
                      {modePool.map((q, idx) => {
                        const numberLabel = idx + 1;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              if (onSelectQuestion) {
                                onSelectQuestion(q);
                              }
                            }}
                            className="h-10 rounded-xl flex items-center justify-center font-extrabold text-sm border transition-all duration-200 cursor-pointer active:scale-95 bg-gradient-to-b from-gray-50 to-white hover:from-white hover:to-white border-gray-200 text-gray-850 hover:border-amber-400 hover:text-amber-600 hover:-translate-y-0.5 shadow-sm"
                            title={`QS ${q.surahName} Ayat ${q.verseStart}`}
                          >
                            <span className="text-xs sm:text-sm font-black">{String(numberLabel).padStart(2, '0')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons inside the central frame */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                {onBismillahClick && modePool.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onBismillahClick()}
                    className="px-5 py-2.5 rounded-full text-xs font-black text-white shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer uppercase select-none bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 border border-red-500/20 shadow-red-650/15"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse fill-current" />
                    <span>Acak Soal (Spin)</span>
                  </button>
                )}

                {onRandomInstant && modePool.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onRandomInstant()}
                    className="px-5 py-2.5 rounded-full text-xs font-extrabold border bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5 uppercase select-none"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Acak Instan</span>
                  </button>
                )}

                {isFullscreen && onBackToHome && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBackToHome();
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-full shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 uppercase border border-gray-200"
                  >
                    <Home className="w-3.5 h-3.5 text-gray-500" />
                    <span>Menu Utama</span>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Elegant Bottom Footer Inside Card */}
        <div className="relative z-10 flex justify-center items-center py-1 sm:py-1.5 border-t border-red-100/70 text-red-800/40 text-[9px] sm:text-[10px] font-serif tracking-widest italic bg-red-50/10 shrink-0 select-none">
        </div>

      </div>

      {/* 2. Microphones Access Error Alert inside Mushaf View */}
      {micError && (
        <div className="mt-4 bg-red-50 border-2 border-red-200 text-red-900 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-[fadeIn_0.3s_ease]">
          <div className="flex items-start gap-3 text-xs sm:text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-red-650 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-extrabold text-red-950 uppercase tracking-wide">Pemberitahuan Mikrofon:</p>
              <p className="text-gray-700 font-semibold">{micError}</p>
              {window.self !== window.top && (
                <p className="text-[11px] text-amber-700 font-extrabold mt-1">
                  💡 Tips: Browser memblokir mikrofon di dalam frame demo. Silakan buka aplikasi di Tab Baru (klik link / tombol di sudut kanan atas browser) agar izin mic Anda berfungsi dengan sukses!
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={onClearMicError}
              className="px-3.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-95 border border-gray-350"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Traditional MushafModal inside the layout wrapper to support proper presentation during absolute browser fullscreen */}
      {isMushafOpen && setIsMushafOpen && (
        <MushafModal
          isOpen={isMushafOpen}
          onClose={() => setIsMushafOpen(false)}
          initialSurahNumber={question?.surahNumber || 1}
          highlightStart={question?.verseStart || 1}
          highlightEnd={question?.verseEnd || 1}
          onAddAsCustomQuestion={onAddAsCustomQuestion}
        />
      )}

    </div>
  );
};
