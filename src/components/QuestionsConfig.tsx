/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { quranSurahs } from "../data";
import { QuestionType, QuizConfig } from "../types";
import { Settings, Target, Hash, Compass, FileText, Sparkles, Check } from "lucide-react";

interface QuestionsConfigProps {
  config: QuizConfig;
  onChangeConfig: (newConfig: QuizConfig) => void;
  onManualRandomize: () => void;
  isGenerating: boolean;
  isOfflineMode: boolean;
}

export const QuestionsConfig: React.FC<QuestionsConfigProps> = ({
  config,
  onChangeConfig,
  onManualRandomize,
  isGenerating,
  isOfflineMode
}) => {
  const currentSurah = quranSurahs.find((s) => s.number === config.selectedSurah) || quranSurahs[0];
  const [localStart, setLocalStart] = useState<number>(config.startVerse);
  const [localEnd, setLocalEnd] = useState<number>(config.endVerse);

  // Sync limits when chosen Surah changes
  useEffect(() => {
    setLocalStart(1);
    setLocalEnd(currentSurah.totalVerses);
    onChangeConfig({
      ...config,
      startVerse: 1,
      endVerse: currentSurah.totalVerses
    });
  }, [config.selectedSurah]);

  const handleStartVerseChange = (val: number) => {
    const sanVal = Math.min(Math.max(1, val), currentSurah.totalVerses);
    setLocalStart(sanVal);
    
    let sanEnd = localEnd;
    if (sanEnd < sanVal) {
      sanEnd = sanVal;
      setLocalEnd(sanEnd);
    }
    
    onChangeConfig({
      ...config,
      startVerse: sanVal,
      endVerse: sanEnd
    });
  };

  const handleEndVerseChange = (val: number) => {
    const sanVal = Math.min(Math.max(localStart, val), currentSurah.totalVerses);
    setLocalEnd(sanVal);
    onChangeConfig({
      ...config,
      endVerse: sanVal
    });
  };

  const applyPresetConfig = (surahNumber: number, start: number, end: number, type: QuestionType) => {
    const targetSurah = quranSurahs.find((s) => s.number === surahNumber) || quranSurahs[0];
    setLocalStart(start);
    setLocalEnd(end);
    onChangeConfig({
      ...config,
      selectedSurah: surahNumber,
      startVerse: start,
      endVerse: end,
      questionType: type,
      showOverlayAnswer: false
    });
  };

  return (
    <div id="settings-panel" className="bg-white border border-red-100 rounded-2xl shadow-sm p-5 space-y-6">
      
      {/* Settings Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="p-2 bg-red-50 text-red-700 rounded-lg">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-red-950 text-sm sm:text-base font-sans">
            Konfigurasi Pengacakan Soal
          </h2>
          <p className="text-[11px] text-gray-500 font-medium">
            Atur lingkup ayat yang akan diacak di panggung utama
          </p>
        </div>
      </div>

      {/* 1. Surah Select Dropdown */}
      <div className="space-y-1.5">
        <label htmlFor="surah-select" className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-red-700" /> 1. Pilih Surat Target:
        </label>
        <select
          id="surah-select"
          value={config.selectedSurah}
          onChange={(e) => onChangeConfig({ ...config, selectedSurah: Number(e.target.value) })}
          className="w-full bg-gray-50 border border-gray-200 hover:border-red-600 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-red-650/30 transition-all cursor-pointer"
        >
          {quranSurahs.map((surah) => (
            <option key={surah.number} value={surah.number}>
              QS. {surah.number}. {surah.name} ({surah.arabic}) - {surah.totalVerses} Ayat
            </option>
          ))}
        </select>
      </div>

      {/* 2. Verse Range selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="start-verse-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-red-700" /> Mulai Ayat:
          </label>
          <input
            id="start-verse-input"
            type="number"
            min={1}
            max={currentSurah.totalVerses}
            value={localStart}
            onChange={(e) => handleStartVerseChange(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="end-verse-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-red-700" /> Akhir Ayat:
          </label>
          <input
            id="end-verse-input"
            type="number"
            min={localStart}
            max={currentSurah.totalVerses}
            value={localEnd}
            onChange={(e) => handleEndVerseChange(Number(e.target.value))}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300"
          />
        </div>
      </div>

      <div className="text-[10px] text-red-800 bg-red-50/50 border border-red-100 p-2.5 rounded-lg text-center font-medium">
        Lingkup Cakupan Acak: <strong className="text-red-900">QS. {currentSurah.name} Ayat {localStart} s/d {localEnd}</strong>
      </div>

      {/* 3. Question Type Selector (Sambung Ayat / Arti Pemahaman) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
          <Target className="w-3.5 h-3.5 text-red-700" /> 2. Pilih Model Soal Ujian:
        </label>
        <div className="grid grid-cols-1 gap-2">
          
          <button
            id="mode-sambung"
            type="button"
            onClick={() => onChangeConfig({ ...config, questionType: QuestionType.SAMBUNG_AYAT })}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              config.questionType === QuestionType.SAMBUNG_AYAT
                ? "bg-red-50 border-red-500 text-red-955 text-red-900 font-bold shadow-sm"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${config.questionType === QuestionType.SAMBUNG_AYAT ? "bg-red-600 text-white" : "bg-gray-200 text-gray-600"}`}>
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="block text-xs font-bold">Sambung Ayat Teruskan</span>
              <span className="block text-[10px] text-gray-500 font-medium">Menguji hafalan kelanjutan ayat suci</span>
            </div>
          </button>

          <button
            id="mode-arti"
            type="button"
            onClick={() => onChangeConfig({ ...config, questionType: QuestionType.ARTI_PEMAHAMAN })}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              config.questionType === QuestionType.ARTI_PEMAHAMAN
                ? "bg-red-50 border-red-500 text-red-955 text-red-900 font-bold shadow-sm"
                : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className={`p-1.5 rounded-lg ${config.questionType === QuestionType.ARTI_PEMAHAMAN ? "bg-red-600 text-white" : "bg-gray-200 text-gray-600"}`}>
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="block text-xs font-bold">Arti & Pemahaman (Tafsir Mandiri)</span>
              <span className="block text-[10px] text-gray-500 font-medium">Menguji kandungan pelajaran utama serta terjemahan</span>
            </div>
          </button>

        </div>
      </div>

      {/* SPECIAL DEDICATED CONFIG: Pengaturan Khusus Waktu & Durasi */}
      <div className="space-y-4 border-t border-red-100 pt-5 mt-4 bg-gradient-to-br from-amber-50/20 to-red-50/10 p-4 rounded-2xl border border-red-50">
        <div className="flex items-center gap-1.5 justify-between">
          <label className="block text-xs font-black text-red-900 uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-red-750" /> 3. PENGATURAN KHUSUS DURASI WAKTU:
          </label>
          <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 tracking-wider">PRESTISIURAN</span>
        </div>
        
        <p className="text-[11px] text-gray-500 leading-normal mb-1">
          Sesuaikan tempo ujian agar relevan dengan konsentrasi kandidat dan kelancaran live panggung:
        </p>

        <div className="space-y-4">
          {/* A. Durasi Mengacak Roda */}
          <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-650" />
                Durasi Mengacak Otomatis:
              </span>
              <span className="text-xs font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-105">
                {config.spinDuration !== undefined ? config.spinDuration : 15} detik
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={1}
              max={60}
              value={config.spinDuration !== undefined ? config.spinDuration : 15}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChangeConfig({ ...config, spinDuration: val });
              }}
              className="w-full accent-red-700 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
            />

            {/* Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-bold">Preset:</span>
              {[3, 5, 10, 15, 20].map((sec) => (
                <button
                  type="button"
                  key={`spin-preset-${sec}`}
                  onClick={() => onChangeConfig({ ...config, spinDuration: sec })}
                  className={`px-2 py-0.5 text-[9px] font-black tracking-wide rounded-md border transition-all cursor-pointer ${
                    (config.spinDuration !== undefined ? config.spinDuration : 15) === sec
                      ? "bg-red-700 text-white border-red-700"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {sec}s {sec === 3 ? "(Instan)" : sec === 5 ? "(Cepat)" : sec === 15 ? "(Standar)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* B. Delay Membuka Soal (Countdown Juz ke Ayat) */}
          <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                Jeda Membuka Soal (Countdown Juz ke Ayat):
              </span>
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-105">
                {config.revealDelay !== undefined ? config.revealDelay : 3} detik
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={15}
              value={config.revealDelay !== undefined ? config.revealDelay : 3}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChangeConfig({ ...config, revealDelay: val });
              }}
              className="w-full accent-amber-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
            />

            {/* Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 font-bold">Preset:</span>
              {[0, 2, 3, 5, 8].map((sec) => (
                <button
                  type="button"
                  key={`reveal-preset-${sec}`}
                  onClick={() => onChangeConfig({ ...config, revealDelay: sec })}
                  className={`px-2 py-0.5 text-[9px] font-black tracking-wide rounded-md border transition-all cursor-pointer ${
                    (config.revealDelay !== undefined ? config.revealDelay : 3) === sec
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {sec}s {sec === 0 ? "(Langsung)" : sec === 3 ? "(Wajarlah)" : sec === 5 ? "(Tenang)" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 italic leading-relaxed pt-1 select-none">
          *<strong>Durasi mengacak</strong> menentukan lama putaran otomatis roda panggung. <strong>Jeda membuka soal</strong> menentukan waktu persiapan kandidat (menampilkan nomor Juz besar di panggung) sebelum potongan naskah ayat Arab suci ditampilkan ke publik.
        </p>
      </div>

      {/* 4. Juz Quick Presets */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-red-700" /> Saring Cepat Preset Surat Terkenal:
        </label>
        <div className="grid grid-cols-2 gap-2">
          
          <button
            id="preset-alfatihah"
            type="button"
            onClick={() => applyPresetConfig(1, 1, 7, QuestionType.SAMBUNG_AYAT)}
            className="px-2.5 py-1.5 text-left border border-gray-100 hover:border-red-600 rounded-lg text-[11px] bg-gray-50 text-red-900 font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3 text-red-700" /> QS. Al-Fatihah (Juz 1)
          </button>

          <button
            id="preset-ad-duha"
            type="button"
            onClick={() => applyPresetConfig(93, 1, 11, QuestionType.SAMBUNG_AYAT)}
            className="px-2.5 py-1.5 text-left border border-gray-100 hover:border-red-600 rounded-lg text-[11px] bg-gray-50 text-red-900 font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3 text-red-700" /> QS. Ad-Duha (Juz 30)
          </button>

          <button
            id="preset-alkautsar"
            type="button"
            onClick={() => applyPresetConfig(108, 1, 3, QuestionType.SAMBUNG_AYAT)}
            className="px-2.5 py-1.5 text-left border border-gray-100 hover:border-red-600 rounded-lg text-[11px] bg-gray-50 text-red-900 font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3 text-red-700" /> QS. Al-Kautsar (Juz 30)
          </button>

          <button
            id="preset-alikhlas"
            type="button"
            onClick={() => applyPresetConfig(112, 1, 4, QuestionType.ARTI_PEMAHAMAN)}
            className="px-2.5 py-1.5 text-left border border-gray-100 hover:border-red-600 rounded-lg text-[11px] bg-gray-50 text-red-900 font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            <FileText className="w-3 h-3 text-red-700" /> QS. Al-Ikhlas (Tafsir HM)
          </button>

        </div>
      </div>

    </div>
  );
};
