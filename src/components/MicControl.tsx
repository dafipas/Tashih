/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Mic, Volume2, Octagon, CheckCircle, Sparkles, AlertCircle, BookOpen } from "lucide-react";

interface MicControlProps {
  onBismillahDetected: (command?: string) => void;
  onStopDetected: (command?: string) => void;
  isSpinning: boolean;
  
  // Mic status synced globally
  isMicActive: boolean;
  onToggleMicActive: (active: boolean) => void;

  // NEW PROPS FOR DETEKSI BACAAN (AUTOMATIC READING DETECTION)
  isReadingDetectionEnabled: boolean;
  onToggleReadingDetection: (enabled: boolean) => void;
  targetAnswerArabic?: string;
  targetAnswerTranslation?: string;
  onReadingMatched?: () => void;

  // Al Quran Modal trigger
  onOpenMushaf?: () => void;
  micError?: string;
  onSetMicError?: (err: string) => void;
}

export const MicControl: React.FC<MicControlProps> = ({
  onBismillahDetected,
  onStopDetected,
  isSpinning,
  isMicActive,
  onToggleMicActive,
  isReadingDetectionEnabled,
  onToggleReadingDetection,
  targetAnswerArabic = "",
  targetAnswerTranslation = "",
  onReadingMatched,
  onOpenMushaf,
  micError: externalMicError = "",
  onSetMicError
}) => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [transcript, setTranscript] = useState<string>("");
  const [localMicError, setLocalMicError] = useState<string>("");
  const [matchStatus, setMatchStatus] = useState<"idle" | "listening" | "matched">("idle");

  const micError = externalMicError || localMicError;

  const setMicError = (msg: string) => {
    if (onSetMicError) {
       onSetMicError(msg);
    } else {
       setLocalMicError(msg);
    }
  };
  const [matchedPhrases, setMatchedPhrases] = useState<string[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const lastTriggeredIndexRef = useRef<number>(-1);
  const SpeechRecognitionInstanceRef = useRef<any>(null);

  // Throttler to prevent multiple rapid next-verse triggers on a single match
  const lastMatchTimeRef = useRef<number>(0);

  // Use refs for callbacks to prevent re-creation loops
  const onBismillahRef = useRef(onBismillahDetected);
  const onStopRef = useRef(onStopDetected);
  const onReadingMatchedRef = useRef(onReadingMatched);

  useEffect(() => {
    onBismillahRef.current = onBismillahDetected;
  }, [onBismillahDetected]);

  useEffect(() => {
    onStopRef.current = onStopDetected;
  }, [onStopDetected]);

  useEffect(() => {
    onReadingMatchedRef.current = onReadingMatched;
  }, [onReadingMatched]);

  const targetAnswerArabicRef = useRef(targetAnswerArabic);
  const targetAnswerTranslationRef = useRef(targetAnswerTranslation);
  const isReadingDetectionEnabledRef = useRef(isReadingDetectionEnabled);

  useEffect(() => {
    targetAnswerArabicRef.current = targetAnswerArabic;
    targetAnswerTranslationRef.current = targetAnswerTranslation;
    isReadingDetectionEnabledRef.current = isReadingDetectionEnabled;
  }, [targetAnswerArabic, targetAnswerTranslation, isReadingDetectionEnabled]);

  // Translit Quran to Latin using diacritics info directly
  const quranToLatin = (arabic: string): string => {
    const letters: Record<string, string> = {
      'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ا': 'a', 'ء': 'a', 'ى': 'a',
      'ب': 'b', 'ت': 't', 'ث': 'ts', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
      'د': 'd', 'ذ': 'dz', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sy',
      'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
      'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
      'ه': 'h', 'ة': 'h', 'و': 'w', 'ي': 'y', ' ': ' '
    };

    const vowels: Record<string, string> = {
      '\u064E': 'a', // Fathah
      '\u0650': 'i', // Kasrah
      '\u064F': 'u', // Dammah
      '\u064B': 'an', // Fathatayn
      '\u064D': 'in', // Kasratayn
      '\u064C': 'un', // Dammatayn
      '\u0670': 'a', // Khanjariyah (Superscript Alif)
    };

    const shaddah = '\u0651';
    let result = "";
    let lastConsonant = "";
    
    // Clean Quranic verse numbers (e.g. ﴿٤﴾) and non-arabic punctuation
    const cleanArabic = arabic
      .replace(/﴿[٠-٩]+﴾/g, "")
      .replace(/[0-9]/g, "")
      .trim();

    for (let i = 0; i < cleanArabic.length; i++) {
      const char = cleanArabic[i];
      
      if (letters[char] !== undefined) {
        const latinChar = letters[char];
        result += latinChar;
        if (latinChar !== ' ') {
          lastConsonant = latinChar;
        } else {
          lastConsonant = "";
        }
      } else if (vowels[char] !== undefined) {
        result += vowels[char];
      } else if (char === shaddah) {
        if (lastConsonant && lastConsonant.length === 1) {
          result = result.substring(0, result.length - 1) + lastConsonant + lastConsonant;
        }
      }
    }

    return result
      .replace(/yy+/g, "y")
      .replace(/ww+/g, "w")
      .replace(/aa+/g, "a")
      .replace(/ii+/g, "i")
      .replace(/uu+/g, "u")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Simplify vowel/consonant repetitions to make loose phonetic matches highly sensitive
  const simplifyPhonetics = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[’'`‘"”]/g, "")
      .replace(/aa+/g, "a")
      .replace(/ii+/g, "i")
      .replace(/uu+/g, "u")
      .replace(/ee+/g, "e")
      .replace(/oo+/g, "o")
      .replace(/sy/g, "s")
      .replace(/sh/g, "s")
      .replace(/kh/g, "h")
      .replace(/dh/g, "d")
      .replace(/dz/g, "z")
      .replace(/tz/g, "z")
      .replace(/ts/g, "t")
      .replace(/th/g, "t")
      .replace(/gh/g, "g")
      .replace(/q/g, "k")   // map 'q' to 'k' so "maliki" matches "maliqi"
      .replace(/c/g, "k")
      .replace(/f/g, "p")   // dialect tolerance
      .replace(/v/g, "p")
      .replace(/[\s+-]+/g, " ")
      .trim();
  };

  // Dynamic phonetic matcher for Arabic recitation mapped to Latin scripts
  const checkPhoneticRecitation = (spokenText: string) => {
    if (!isReadingDetectionEnabledRef.current || !targetAnswerArabicRef.current) return;

    // Throttle checks to once every 2.5 seconds per correct verse transition
    const now = Date.now();
    if (now - lastMatchTimeRef.current < 2500) return;

    const cleanSpoken = spokenText.toLowerCase().trim();
    if (cleanSpoken.length < 3) return;

    // Direct Diacritics Translation! Extremely robust!
    const latinTarget = quranToLatin(targetAnswerArabicRef.current);
    
    const cleanPhoneticSource = simplifyPhonetics(latinTarget);
    const cleanSpokenTarget = simplifyPhonetics(cleanSpoken);

    // Break into individual words
    const spokenWords = cleanSpokenTarget.split(" ").filter(w => w.length >= 3);
    const sourceWords = cleanPhoneticSource.split(" ").filter(w => w.length >= 3);

    let hitCount = 0;
    const foundKeywords: string[] = [];

    // Loose match checker
    for (const sWord of spokenWords) {
      const match = sourceWords.find(pWord => 
        pWord.includes(sWord) || sWord.includes(pWord) ||
        (sWord.length >= 4 && pWord.length >= 4 && 
         (pWord.startsWith(sWord.substring(0, 3)) || sWord.startsWith(pWord.substring(0, 3))))
      );
      if (match) {
        hitCount++;
        if (!foundKeywords.includes(match)) foundKeywords.push(match);
      }
    }

    // Threshold: Match at least 1-2 words depending on verse length, then trigger transition
    const threshold = Math.max(1, Math.min(2, sourceWords.length));
    
    // Check translation keys as fallback
    let translationHitMatch = false;
    if (targetAnswerTranslationRef.current) {
      const translationWords = targetAnswerTranslationRef.current.toLowerCase().replace(/[^a-z ]/g, "").split(" ").filter(w => w.length > 4);
      let translationHits = 0;
      for (const sWord of spokenWords) {
        if (translationWords.some(tWord => tWord.includes(sWord) || sWord.includes(tWord))) {
          translationHits++;
          if (!foundKeywords.includes(sWord)) foundKeywords.push(sWord);
        }
      }
      if (translationHits >= 2) {
        translationHitMatch = true;
      }
    }

    if (hitCount >= threshold || translationHitMatch) {
      lastMatchTimeRef.current = now;
      setMatchStatus("matched");
      // Pick up the Arabic words representation as successfully detected label
      setMatchedPhrases(foundKeywords.length > 0 ? foundKeywords : ["Lafal Sesuai"]);
      
      if (onReadingMatchedRef.current) {
        onReadingMatchedRef.current();
      }

      // Revert to listening status after briefly showing success status
      setTimeout(() => {
        setMatchStatus("listening");
        setMatchedPhrases([]);
      }, 4000);
    }
  };

  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setMicError("Browser Anda tidak mendukung Web Speech API perekaman suara secara penuh. Disarankan menggunakan browser Google Chrome atau Safari terbaru di luar frame sandboxed.");
      return;
    }

    if (!isMicActive) {
      if (SpeechRecognitionInstanceRef.current) {
        SpeechRecognitionInstanceRef.current.onend = null;
        try {
          SpeechRecognitionInstanceRef.current.stop();
        } catch (e) {
          // ignore
        }
        SpeechRecognitionInstanceRef.current = null;
      }
      setMatchStatus("idle");
      return;
    }

    setMatchStatus("listening");
    let recognition: any = null;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "id-ID"; // Set to Indonesian to accurately translate Arabic names & sounds spoken by Indonesians

      recognition.onstart = () => {
        setMicError("");
        lastTriggeredIndexRef.current = -1;
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript + " ";
        }

        const normalizedText = fullTranscript.toLowerCase().trim();
        setTranscript(fullTranscript.trim());

        // Comprehensive voice detection helpers for Bismillah & Stop command triggers
        const isBismillahCommand = (text: string) => {
          return text.includes("bismillah") || 
                 text.includes("bismilah") || 
                 text.includes("basmalah");
        };

        const isStopCommand = (text: string) => {
          return text.includes("stop") || 
                 text.includes("henti") || 
                 text.includes("berhenti") ||
                 text.includes("selesai") ||
                 text.includes("cukup") ||
                 text.includes("sudah");
        };

        // Determine latest result phrase to prevent redundant rapid command firing 
        const resultIndex = event.results.length - 1;
        if (resultIndex > lastTriggeredIndexRef.current) {
          const latestResult = event.results[resultIndex];
          const latestPhrase = latestResult[0].transcript.toLowerCase().trim();

          if (isBismillahCommand(latestPhrase)) {
            lastTriggeredIndexRef.current = resultIndex;
            const matchedWord = "Bismillah";
            onBismillahRef.current(matchedWord);
            setTranscript(`✓ Perintah "${matchedWord}" didengar!`);
            return; // Skip reading checks if bismillah/start is triggered
          } else if (isStopCommand(latestPhrase)) {
            lastTriggeredIndexRef.current = resultIndex;
            const matchedWord = "STOP";
            onStopRef.current(matchedWord);
            setTranscript(`✓ Perintah "${matchedWord}" didengar!`);
            return; // Skip reading checks if stop is triggered
          }
        }

        // Execute dynamic reading verification
        checkPhoneticRecitation(normalizedText);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition warning/error:", event.error);
        if (event.error === "not-allowed") {
          setMicError("Akses mikrofon ditolak oleh browser.");
          onToggleMicActive(false);
        }
      };

      recognition.onend = () => {
        // Automatically restart speech model if mic control toggled on
        if (isMicActive && SpeechRecognitionInstanceRef.current) {
          try {
            SpeechRecognitionInstanceRef.current.start();
          } catch (e) {
            // Already listening
          }
        }
      };

      SpeechRecognitionInstanceRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      console.error("Speech recognition construction error:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognition) {
        recognition.onend = null;
        try {
          recognition.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isMicActive]);

  // Keep-alive watchdog timer to guarantee continuous mic monitoring and high sensitivity
  useEffect(() => {
    let watchRef: any;
    if (isMicActive && isSupported) {
      watchRef = setInterval(() => {
        if (SpeechRecognitionInstanceRef.current) {
          try {
            // Test start if it went idle passively
            SpeechRecognitionInstanceRef.current.start();
          } catch (e) {
            // Already active and alive, skip
          }
        }
      }, 3500);
    }
    return () => {
      if (watchRef) clearInterval(watchRef);
    };
  }, [isMicActive, isSupported]);

  const handleSimulatedSpeech = (inputText: string) => {
    const text = inputText.toLowerCase().trim();
    setTranscript(`Simulasi: "${inputText}"`);

    // Voice detection helpers for commands
    const isBismillahCommand = (t: string) => {
      return t.includes("bismillah") || 
             t.includes("bismilah") || 
             t.includes("basmalah");
    };

    const isStopCommand = (t: string) => {
      return t.includes("stop") || 
             t.includes("henti") || 
             t.includes("berhenti") ||
             t.includes("selesai") ||
             t.includes("cukup") ||
             t.includes("sudah");
    };

    if (isBismillahCommand(text)) {
      onBismillahRef.current("Bismillah");
      setTranscript(`✓ Perintah "Bismillah" didengar via simulasi!`);
    } else if (isStopCommand(text)) {
      onStopRef.current("STOP");
      setTranscript(`✓ Perintah "STOP" didengar via simulasi!`);
    } else {
      checkPhoneticRecitation(text);
    }
  };

  const toggleListen = () => {
    onToggleMicActive(!isMicActive);
  };

  return (
    <div id="mic-controller" className="bg-white border-2 border-red-100 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 max-w-4xl mx-auto mt-4">
      
      {/* 1. Header with dynamic toggle switches */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-red-50/20 p-4 rounded-2xl border border-red-100/50">
        
        {/* Mic Indicator Icon & Text */}
        <div className="flex items-center gap-3 animate-[fadeIn_0.3s_ease]">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl transition-all ${isMicActive ? "bg-red-650 bg-red-600 text-white animate-pulse scale-105 shadow-md shadow-red-200/50" : "bg-gray-150 text-gray-400"}`}>
              <Mic className="w-5 h-5" />
            </div>
            {onOpenMushaf && (
              <button
                type="button"
                id="btn-open-mushaf-from-mic"
                onClick={onOpenMushaf}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-amber-600"
                title="Buka Al-Quran Utsmani Terjemah Perkata"
              >
                <BookOpen className="w-5 h-5 animate-[pulse_2s_infinite]" />
              </button>
            )}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-red-955 font-sans tracking-wide">Papan Suara Asisten Tahfidz</h3>
            <span className="text-xs text-gray-500 font-medium flex items-center gap-1 font-sans">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isMicActive ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
              {isMicActive ? "Asisten mendengarkan dengan peka..." : "Asisten suara mati"}
            </span>
          </div>
        </div>

        {/* Toggles Panel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle 1: Microphone Switch */}
          {isSupported ? (
            <button
              id="btn-toggle-mic-main"
              onClick={toggleListen}
              className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm flex items-center gap-2 cursor-pointer border ${
                isMicActive 
                  ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-200" 
                  : "bg-red-650 bg-red-600 text-white hover:bg-red-750 border-red-600"
              }`}
            >
              {isMicActive ? "Matikan Mikrofon" : "Aktifkan Mikrofon"}
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-gray-100 rounded-xl text-xs text-gray-500 border border-gray-200 font-bold uppercase">
              Tidak Didukung Browser
            </span>
          )}

          {/* Toggle 2: SISTEM DETEKSI BACAAN (ON/OFF SETTING) */}
          <button
            type="button"
            id="btn-toggle-reading-detection"
            onClick={() => onToggleReadingDetection(!isReadingDetectionEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm flex items-center gap-2 cursor-pointer border ${
              isReadingDetectionEnabled 
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isReadingDetectionEnabled ? "bg-emerald-600" : "bg-gray-400"}`} />
            Deteksi Bacaan: {isReadingDetectionEnabled ? "AKTIF" : "NONAKTIF"}
          </button>

          {/* NEW TOGGLE 3: Al Quran Utsmani Button */}
          {onOpenMushaf && (
            <button
              type="button"
              id="btn-open-mushaf-toggles"
              onClick={onOpenMushaf}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 border border-amber-650 border-amber-600 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow-amber-200/50"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buka Al Quran Utsmani</span>
            </button>
          )}
        </div>

      </div>

      {/* 2. Microphones Access Error Alert */}
      {micError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl flex items-start gap-2 text-xs font-semibold animate-pulse">
          <AlertCircle className="w-4.5 h-4.5 text-red-650 shrink-0 mt-0.5" />
          <p>{micError} Pastikan izin microphone dikonfirmasi di tab alamat browser Anda agar deteksi suara & perataan kognitif berjalan peka.</p>
        </div>
      )}

      {/* 3. Panel Interaktif: Petunjuk Lafadz & Realtime Output Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Petunjuk Komando Suara */}
        <div className="lg:col-span-5 bg-gray-50/50 p-4 rounded-xl border border-gray-150 text-xs text-gray-750 font-medium space-y-2">
          <div className="flex items-center gap-1.5 text-red-900 font-extrabold text-sm border-b border-gray-200 pb-1.5">
            <Volume2 className="w-4 h-4 text-red-600" />
            <span>Panduan Pintar Suara</span>
          </div>
          <ul className="space-y-1.5 text-gray-650 leading-relaxed list-disc list-inside">
            <li>Katakan <strong className="text-red-700 font-extrabold uppercase">"Bismillah"</strong> / <strong className="text-red-700 font-extrabold uppercase">"Mulai"</strong> untuk mengacak soal sewaktu-waktu.</li>
            <li>Katakan <strong className="text-red-750 text-red-700 font-extrabold uppercase">"STOP"</strong> untuk mengunci soalan ujian santri.</li>
            {isReadingDetectionEnabled && (
              <li className="text-emerald-900 font-bold">
                <span className="text-emerald-700">★ Deteksi Bacaan Aktif:</span> Santri cukup melafalkan potongan ayat kelanjutan dengan benar, maka sistem akan langsung berpindah otomatis! Sebut kata kunci terjemahan Arab juga dapat memicu transisi.
              </li>
            )}
          </ul>
        </div>

        {/* Realtime Output visual feed */}
        <div className="lg:col-span-7 bg-gray-50/50 p-4 rounded-xl border border-gray-150 flex flex-col justify-between space-y-3.5">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Output Suara Mikrofon:</span>
            <div className="text-xs font-mono font-bold text-red-950 italic min-h-[44px] flex items-center bg-white border border-gray-100 rounded-xl px-3.5 py-2 mt-1.5 shadow-inner select-all leading-relaxed">
              {transcript ? `"${transcript}"` : "(Mendengarkan ucapan lafal deklamasi santri...)"}
            </div>
          </div>

          {/* DYNAMIC FEEDBACK FOR READING DETECTION SYSTEM */}
          {isReadingDetectionEnabled && isMicActive && (
            <div className={`p-2.5 rounded-xl border text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
              matchStatus === "matched" 
                ? "bg-emerald-50 border-emerald-350 text-emerald-900 animate-bounce shadow-md shadow-emerald-100" 
                : "bg-amber-50/50 border-amber-100 text-amber-900"
            }`}>
              {matchStatus === "matched" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm animate-pulse">✓ BACAAN BENAR TERDETEKSI!</p>
                    <p className="text-[10px] text-emerald-700 font-medium">Kata cocok: {matchedPhrases.join(", ")} | Sistem berpindah otomatis.</p>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-[spin_5s_infinite_linear]" />
                  <p className="text-[10px] font-medium leading-relaxed">
                    Sedang memindai kecocokan suara deklamasi ayat kelanjutan di atas (QS. {targetAnswerArabic ? "Harakat didukung" : "Silakan acak soal"})...
                  </p>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 4. EMERGENCY PANEL FOR RECOVERY */}
      {isSpinning && (
        <div id="emergency-section" className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="bg-red-100 text-red-700 p-2 rounded-xl">
              <Octagon className="w-6 h-6 animate-spin text-red-650" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-red-955 text-red-950">Acakan sedang aktif di panggung...</h4>
              <p className="text-xs text-red-700 font-medium">Katakan "STOP" dekat mikrofon atau klik tombol darurat di samping jika suara bising.</p>
            </div>
          </div>
          <button
            id="btn-emergency-stop-active"
            onClick={() => onStopRef.current("STOP")}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-1.5 transition-all cursor-pointer block"
          >
            <Octagon className="w-4 h-4" /> KUNCI ACAK SEKARANG
          </button>
        </div>
      )}

    </div>
  );
};
