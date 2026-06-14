/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { quranSurahs, getJuzNumber } from "./data";
import { fallbackQuestions } from "./fallbackQuestions";
import { Question, QuestionType, QuizConfig } from "./types";
import { parseCSV, mapRecordToQuestion } from "./utils/sheetParser";
import { MushafView } from "./components/MushafView";
import { QuestionsConfig } from "./components/QuestionsConfig";
import { MicControl } from "./components/MicControl";
import { MushafModal } from "./components/MushafModal";
import { BookOpen, Sparkles, Award, Volume2, Heart, Info, Play, Sliders, Eye, EyeOff, PlusCircle, Bookmark, Compass, Hash, AlertCircle, Mic, Maximize, Minimize, Database, Download, Upload, RefreshCw, FileText, ChevronRight, ArrowLeft, Home, Check } from "lucide-react";
import { db } from "./firebase";
import { doc, setDoc, deleteDoc, collection, onSnapshot, writeBatch, getDocs, getDoc } from "firebase/firestore";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.warn("Firestore Operation Mode (System uses offline/local storage smoothly):", JSON.stringify(errInfo));
}

// Helper to extract sheet ID and construct direct Google Sheet CSV export URL
const getGoogleSheetCsvUrl = (url: string): string | null => {
  const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!matches) return null;
  const sheetId = matches[1];
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
};

// Helper to deduplicate a questions pool by ID and by full content (Arabic text matches)
const deduplicateQuestions = (pool: Question[]): Question[] => {
  if (!pool || !Array.isArray(pool)) return [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  return pool.filter((q) => {
    if (!q || !q.id) return false;
    const arabicQuestionStr = (q.questionArabic || "").trim();
    const arabicAnswerStr = (q.answerArabic || "").trim();
    const contentKey = `${q.surahNumber}_${q.verseStart}_${q.type}_${arabicQuestionStr}_${arabicAnswerStr}`;
    
    if (seenIds.has(q.id) || (arabicQuestionStr && seenContent.has(contentKey))) {
      return false;
    }
    seenIds.add(q.id);
    if (arabicQuestionStr) {
      seenContent.add(contentKey);
    }
    return true;
  });
};

export default function App() {
  const [configSambung, setConfigSambung] = useState<QuizConfig>(() => {
    try {
      const cached = localStorage.getItem("tashih_quiz_config_sambung");
      if (cached) {
        return {
          selectedSurah: 93,
          startVerse: 1,
          endVerse: 11,
          showOverlayAnswer: false,
          spinDuration: 5,
          revealDelay: 3,
          ...JSON.parse(cached),
          questionType: QuestionType.SAMBUNG_AYAT
        };
      }
      const oldCached = localStorage.getItem("tashih_quiz_config");
      const parsed = oldCached ? JSON.parse(oldCached) : {};
      return {
        selectedSurah: 93,
        startVerse: 1,
        endVerse: 11,
        showOverlayAnswer: false,
        spinDuration: 5,
        revealDelay: 3,
        ...parsed,
        questionType: QuestionType.SAMBUNG_AYAT
      };
    } catch (e) {}
    return {
      selectedSurah: 93,
      startVerse: 1,
      endVerse: 11,
      questionType: QuestionType.SAMBUNG_AYAT,
      showOverlayAnswer: false,
      spinDuration: 5,
      revealDelay: 3
    };
  });

  const [configTerjamah, setConfigTerjamah] = useState<QuizConfig>(() => {
    try {
      const cached = localStorage.getItem("tashih_quiz_config_terjamah");
      if (cached) {
        return {
          selectedSurah: 112,
          startVerse: 1,
          endVerse: 4,
          showOverlayAnswer: false,
          spinDuration: 3,
          revealDelay: 0,
          ...JSON.parse(cached),
          questionType: QuestionType.ARTI_PEMAHAMAN
        };
      }
      const oldCached = localStorage.getItem("tashih_quiz_config");
      const parsed = oldCached ? JSON.parse(oldCached) : {};
      return {
        selectedSurah: 112,
        startVerse: 1,
        endVerse: 4,
        showOverlayAnswer: false,
        spinDuration: 3,
        revealDelay: 0,
        ...parsed,
        questionType: QuestionType.ARTI_PEMAHAMAN
      };
    } catch (e) {}
    return {
      selectedSurah: 112,
      startVerse: 1,
      endVerse: 4,
      questionType: QuestionType.ARTI_PEMAHAMAN,
      showOverlayAnswer: false,
      spinDuration: 3,
      revealDelay: 0
    };
  });

  const [appMode, setAppMode] = useState<"home" | "sambung_ayat" | "terjamah" >("home");

  const config = appMode === "terjamah" ? configTerjamah : configSambung;

  const handleUpdateConfig = async (newCfg: QuizConfig) => {
    const isTerjamah = appMode === "terjamah";
    if (isTerjamah) {
      setConfigTerjamah(newCfg);
      try {
        localStorage.setItem("tashih_quiz_config_terjamah", JSON.stringify(newCfg));
      } catch (e) {}
    } else {
      setConfigSambung(newCfg);
      try {
        localStorage.setItem("tashih_quiz_config_sambung", JSON.stringify(newCfg));
      } catch (e) {}
    }

    const now = Date.now();
    lastActionTimeRef.current = now;

    try {
      const docRef = doc(db, "sessions", "global_stage");
      await setDoc(docRef, {
        config: newCfg,
        configSambung: isTerjamah ? configSambung : newCfg,
        configTerjamah: isTerjamah ? newCfg : configTerjamah,
        lastActionTime: now
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "sessions/global_stage");
    }
  };

  const [activeTab, setActiveTab] = useState<"display" | "settings">("display");
  const [currentQuestionSambung, setCurrentQuestionSambung] = useState<Question | null>(null);
  const [currentQuestionTerjamah, setCurrentQuestionTerjamah] = useState<Question | null>(null);
  const currentQuestion = appMode === "terjamah" ? currentQuestionTerjamah : currentQuestionSambung;
  const setCurrentQuestion = (q: Question | null) => {
    if (appMode === "terjamah") {
      setCurrentQuestionTerjamah(q);
    } else {
      setCurrentQuestionSambung(q);
    }
  };
  const [questionsPool, setQuestionsPool] = useState<Question[]>(() => {
    try {
      const cached = localStorage.getItem("tashih_questions_pool");
      return deduplicateQuestions(cached ? JSON.parse(cached) : fallbackQuestions);
    } catch (e) {
      return deduplicateQuestions(fallbackQuestions);
    }
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "sambung_ayat" | "arti_pemahaman" | "custom">("all");
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [revealCountdown, setRevealCountdown] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [lastSpeechCommand, setLastSpeechCommand] = useState<string>("");
  const [stopBeepActive, setStopBeepActive] = useState<boolean>(false);

  // Deletion and reset state-based confirmation flags (to bypass sandboxed iframe alert blocks)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const defaultSheetsUrlSambung = "https://docs.google.com/spreadsheets/d/1R8GrCQMD1IDRwmbunoPDFDCFwhF8sy0u944MoOReUbw/edit?usp=sharing";
  const defaultSheetsUrlTerjamah = "https://docs.google.com/spreadsheets/d/11tUWxeerOWRjtVgmyy_HsfDRQ145UkawiR-lWia8fgA/edit?usp=sharing";

  // Google Sheets state and Syncing mechanisms - Split for Sambung Ayat & Tarjamah
  const [googleSheetsUrlSambung, setGoogleSheetsUrlSambung] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("tashih_sheets_url_sambung");
      if (cached) return cached;
      const oldCached = localStorage.getItem("tashih_google_sheets_url");
      return oldCached || defaultSheetsUrlSambung;
    } catch (e) {
      return defaultSheetsUrlSambung;
    }
  });

  const [googleSheetsUrlTerjamah, setGoogleSheetsUrlTerjamah] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("tashih_sheets_url_terjamah");
      if (cached) return cached;
      const oldCached = localStorage.getItem("tashih_google_sheets_url");
      return oldCached || defaultSheetsUrlTerjamah;
    } catch (e) {
      return defaultSheetsUrlTerjamah;
    }
  });

  const [sheetUrlSambungInput, setSheetUrlSambungInput] = useState<string>(googleSheetsUrlSambung);
  const [sheetUrlTerjamahInput, setSheetUrlTerjamahInput] = useState<string>(googleSheetsUrlTerjamah);
  const [sheetSyncStatus, setSheetSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sheetSyncError, setSheetSyncError] = useState<string>("");
  const [sheetParsedQuestions, setSheetParsedQuestions] = useState<Question[] | null>(null);
  const [lastSyncMode, setLastSyncMode] = useState<"sambung_ayat" | "terjamah" | null>(null);
  const [syncConfigTab, setSyncConfigTab] = useState<"sambung_ayat" | "terjamah">("sambung_ayat");

  const defaultWebhookUrlSambung = "https://script.google.com/macros/s/AKfycbyY84OQ96CRqRawmpmIX0SQsVpgwLySSpK3YmFuNWJox8FXHesARvse-tPnNOyO19ku/exec";
  const defaultWebhookUrlTerjamah = "https://script.google.com/macros/s/AKfycbyDhTzSQLc0pLAAUfNv2qWr9hQbGYYfo8TP1P81Fyz5FCtfbiHJQq9mvDs0caDPxhy5og/exec";

  // Google Sheets Webhook App Script syncing state - Split for Sambung Ayat & Tarjamah
  const [googleSheetsWebhookUrlSambung, setGoogleSheetsWebhookUrlSambung] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("tashih_sheets_webhook_url_sambung");
      if (cached) return cached;
      const oldCached = localStorage.getItem("tashih_google_sheets_webhook_url");
      return oldCached || defaultWebhookUrlSambung;
    } catch (e) {
      return defaultWebhookUrlSambung;
    }
  });

  const [googleSheetsWebhookUrlTerjamah, setGoogleSheetsWebhookUrlTerjamah] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("tashih_sheets_webhook_url_terjamah");
      if (cached) return cached;
      const oldCached = localStorage.getItem("tashih_google_sheets_webhook_url");
      return oldCached || defaultWebhookUrlTerjamah;
    } catch (e) {
      return defaultWebhookUrlTerjamah;
    }
  });

  const [webhookUrlSambungInput, setWebhookUrlSambungInput] = useState<string>(googleSheetsWebhookUrlSambung);
  const [webhookUrlTerjamahInput, setWebhookUrlTerjamahInput] = useState<string>(googleSheetsWebhookUrlTerjamah);

  // Derive legacy config values based on the active appMode for perfect compatibility
  const googleSheetsUrl = appMode === "terjamah" ? googleSheetsUrlTerjamah : googleSheetsUrlSambung;
  const googleSheetsWebhookUrl = appMode === "terjamah" ? googleSheetsWebhookUrlTerjamah : googleSheetsWebhookUrlSambung;
  const sheetUrlInput = syncConfigTab === "sambung_ayat" ? sheetUrlSambungInput : sheetUrlTerjamahInput;
  const webhookUrlInput = syncConfigTab === "sambung_ayat" ? webhookUrlSambungInput : webhookUrlTerjamahInput;

  const setSheetUrlInput = (val: string) => {
    if (syncConfigTab === "sambung_ayat") {
      setSheetUrlSambungInput(val);
    } else {
      setSheetUrlTerjamahInput(val);
    }
  };

  const setWebhookUrlInput = (val: string) => {
    if (syncConfigTab === "sambung_ayat") {
      setWebhookUrlSambungInput(val);
    } else {
      setWebhookUrlTerjamahInput(val);
    }
  };

  const [isSendingToWebhook, setIsSendingToWebhook] = useState<boolean>(false);

  // Mushaf Overlay modal state
  const [isMushafOpen, setIsMushafOpen] = useState<boolean>(false);
  const [showSesiUjian, setShowSesiUjian] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem("tashih_show_sesi_ujian");
      return cached !== "false";
    } catch (e) {
      return true;
    }
  });
  const [showVoiceAndBank, setShowVoiceAndBank] = useState<boolean>(false);
  const [isReadingDetectionEnabled, setIsReadingDetectionEnabled] = useState<boolean>(true);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [micError, setMicError] = useState<string>("");
  const [shownQuestionIdsSambung, setShownQuestionIdsSambung] = useState<string[]>([]);
  const [shownQuestionIdsTerjamah, setShownQuestionIdsTerjamah] = useState<string[]>([]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleToggleFullscreen = () => {
    const rootEl = document.getElementById("tashih-root") || document.documentElement;
    if (rootEl) {
      if (!document.fullscreenElement) {
        rootEl.requestFullscreen().catch((err) => {
          console.warn("Actual fullscreen API blocked by frame sandbox:", err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.warn("Exit fullscreen error:", err);
        });
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Custom manual question addition states
  const [customSurah, setCustomSurah] = useState<number>(93);
  const [customVerse, setCustomVerse] = useState<number>(1);
  const [customQType, setCustomQType] = useState<QuestionType>(QuestionType.SAMBUNG_AYAT);
  const [customQPrompt, setCustomQPrompt] = useState<string>("Lanjutkan potongan ayat suci berikut:");
  const [customQArabic, setCustomQArabic] = useState<string>("");
  const [customQTrans, setCustomQTrans] = useState<string>("");
  const [customAArabic, setCustomAArabic] = useState<string>("");
  const [customATrans, setCustomATrans] = useState<string>("");
  const [customExplain, setCustomExplain] = useState<string>("Pertanyaan Hafalan Kustom dari Penguji");

  // Spinning slot simulation states
  const [spinningSurahName, setSpinningSurahName] = useState<string>("Ad-Duha");
  const [spinningVerseNum, setSpinningVerseNum] = useState<number>(1);

  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const revealQuestionRef = useRef<Question | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTimeRef = useRef<number>(0);
  const activeOscillatorsRef = useRef<{ osc: OscillatorNode; gainNode: GainNode; audioCtx: AudioContext }[]>([]);

  // Refs for safe async state access
  const isSpinningRef = useRef<boolean>(false);
  const spinningVerseNumRef = useRef<number>(1);
  const questionsPoolRef = useRef<Question[]>([]);

  React.useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  React.useEffect(() => {
    spinningVerseNumRef.current = spinningVerseNum;
  }, [spinningVerseNum]);

  React.useEffect(() => {
    questionsPoolRef.current = questionsPool;
  }, [questionsPool]);

  const activeQuestionsRef = React.useRef<Question[]>([]);

  const modePool = React.useMemo(() => {
    return questionsPool.filter((q) => {
      if (appMode === "sambung_ayat" && q.type !== QuestionType.SAMBUNG_AYAT) {
        return false;
      }
      if (appMode === "terjamah" && q.type !== QuestionType.ARTI_PEMAHAMAN) {
        return false;
      }
      return true;
    });
  }, [questionsPool, appMode]);

  const activeQuestions = React.useMemo(() => {
    return modePool.filter((q) => {
      const matchSearch = q.surahName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          `juz ${getJuzNumber(q.surahNumber, q.verseStart)}`.includes(searchTerm.toLowerCase());
      
      if (typeFilter === "all") return matchSearch;
      if (typeFilter === "sambung_ayat") return matchSearch && q.type === QuestionType.SAMBUNG_AYAT;
      if (typeFilter === "arti_pemahaman") return matchSearch && q.type === QuestionType.ARTI_PEMAHAMAN;
      if (typeFilter === "custom") {
        return matchSearch && (q.id.startsWith("custom_") || q.id.startsWith("mushaf-custom-") || q.id.startsWith("gen_dummy_"));
      }
      return matchSearch;
    });
  }, [modePool, searchTerm, typeFilter]);

  React.useEffect(() => {
    activeQuestionsRef.current = activeQuestions;
  }, [activeQuestions]);

  const availableJuzsList = React.useMemo(() => {
    const targetQuestions = activeQuestions.length > 0 ? activeQuestions : modePool;
    return Array.from(
      new Set(
        targetQuestions.map((q) => q.juzNumber || getJuzNumber(q.surahNumber, q.verseStart))
      )
    ).filter((juz): juz is number => typeof juz === "number" && juz >= 1 && juz <= 30)
     .sort((a, b) => a - b);
  }, [activeQuestions, modePool]);

  const selectedSurahMeta = quranSurahs.find((s) => s.number === config.selectedSurah) || quranSurahs[0];

  const syncState = async (updates: Partial<any>) => {
    // Apply locally first to keep user response immediate and resilient
    if (updates.isSpinning !== undefined) setIsSpinning(updates.isSpinning);
    if (updates.showAnswer !== undefined) setShowAnswer(updates.showAnswer);
    if (updates.appMode !== undefined) setAppMode(updates.appMode);
    if (updates.typeFilter !== undefined) setTypeFilter(updates.typeFilter);

    const targetMode = updates.appMode || appMode;

    if (updates.currentQuestionSambung !== undefined) {
      setCurrentQuestionSambung(updates.currentQuestionSambung);
    }
    if (updates.currentQuestionTerjamah !== undefined) {
      setCurrentQuestionTerjamah(updates.currentQuestionTerjamah);
    }

    if (updates.shownQuestionIdsSambung !== undefined) {
      setShownQuestionIdsSambung(updates.shownQuestionIdsSambung);
    }
    if (updates.shownQuestionIdsTerjamah !== undefined) {
      setShownQuestionIdsTerjamah(updates.shownQuestionIdsTerjamah);
    }

    if (updates.currentQuestion !== undefined) {
      if (targetMode === "terjamah") {
        setCurrentQuestionTerjamah(updates.currentQuestion);
        updates.currentQuestionTerjamah = updates.currentQuestion;
      } else {
        setCurrentQuestionSambung(updates.currentQuestion);
        updates.currentQuestionSambung = updates.currentQuestion;
      }
    }

    if (updates.spinningSurahName !== undefined) setSpinningSurahName(updates.spinningSurahName);
    if (updates.spinningVerseNum !== undefined) setSpinningVerseNum(updates.spinningVerseNum);
    if (updates.isMicActive !== undefined) setIsMicActive(updates.isMicActive);
    if (updates.isReadingDetectionEnabled !== undefined) setIsReadingDetectionEnabled(updates.isReadingDetectionEnabled);
    if (updates.lastSpeechCommand !== undefined) setLastSpeechCommand(updates.lastSpeechCommand);
    if (updates.stopBeepActive !== undefined) setStopBeepActive(updates.stopBeepActive);
    if (updates.revealCountdown !== undefined) setRevealCountdown(updates.revealCountdown);

    if (updates.googleSheetsUrlSambung !== undefined) {
      setGoogleSheetsUrlSambung(updates.googleSheetsUrlSambung);
      setSheetUrlSambungInput(updates.googleSheetsUrlSambung);
      try {
        localStorage.setItem("tashih_sheets_url_sambung", updates.googleSheetsUrlSambung);
      } catch (e) {
        console.warn(e);
      }
    }
    if (updates.googleSheetsUrlTerjamah !== undefined) {
      setGoogleSheetsUrlTerjamah(updates.googleSheetsUrlTerjamah);
      setSheetUrlTerjamahInput(updates.googleSheetsUrlTerjamah);
      try {
        localStorage.setItem("tashih_sheets_url_terjamah", updates.googleSheetsUrlTerjamah);
      } catch (e) {
        console.warn(e);
      }
    }
    if (updates.googleSheetsWebhookUrlSambung !== undefined) {
      setGoogleSheetsWebhookUrlSambung(updates.googleSheetsWebhookUrlSambung);
      setWebhookUrlSambungInput(updates.googleSheetsWebhookUrlSambung);
      try {
        localStorage.setItem("tashih_sheets_webhook_url_sambung", updates.googleSheetsWebhookUrlSambung);
      } catch (e) {
        console.warn(e);
      }
    }
    if (updates.googleSheetsWebhookUrlTerjamah !== undefined) {
      setGoogleSheetsWebhookUrlTerjamah(updates.googleSheetsWebhookUrlTerjamah);
      setWebhookUrlTerjamahInput(updates.googleSheetsWebhookUrlTerjamah);
      try {
        localStorage.setItem("tashih_sheets_webhook_url_terjamah", updates.googleSheetsWebhookUrlTerjamah);
      } catch (e) {
        console.warn(e);
      }
    }

    const now = Date.now();
    lastActionTimeRef.current = now;

    try {
      const docRef = doc(db, "sessions", "global_stage");
      // Filter out isMicActive from database write so mic status remains purely local to this device
      const dbUpdates = { ...updates };
      delete dbUpdates.isMicActive;

      await setDoc(docRef, {
        ...dbUpdates,
        sessionId: "global_stage",
        lastActionTime: now
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "sessions/global_stage");
    }
  };

  // Helper to synchronize pool data to both State, LocalStorage, and Server (and Firestore)
  const updateQuestionsPool = async (rawPool: Question[]) => {
    const newPool = deduplicateQuestions(rawPool);
    setQuestionsPool(newPool);
    try {
      localStorage.setItem("tashih_questions_pool", JSON.stringify(newPool));
    } catch (e) {
      console.warn("localStorage failed", e);
    }

    try {
      let querySnap;
      try {
        querySnap = await getDocs(collection(db, "questions"));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, "questions");
        return;
      }

      const existingDocs = new Map<string, any>();
      querySnap.forEach((docRef) => {
        existingDocs.set(docRef.id, docRef.ref);
      });

      const newPoolIds = new Set(newPool.map(q => q.id));
      const batch = writeBatch(db);

      // Delete any question on Firestore that is no longer in our local pool
      let deleteCount = 0;
      existingDocs.forEach((ref, id) => {
        if (!newPoolIds.has(id)) {
          batch.delete(ref);
          deleteCount++;
        }
      });

      // Write/update current questions from the pool
      newPool.forEach((q) => {
        batch.set(doc(db, "questions", q.id), q);
      });

      console.log(`Syncing questions pool to Firestore: writing ${newPool.length} questions, deleting ${deleteCount} stale ones.`);

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "questions");
      }
    } catch (err) {
      console.warn("Failed syncing questions update with Firestore", err);
    }

    try {
      await fetch("/api/quran/questions-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pool: newPool })
      });
    } catch (err) {
      console.warn("Failed saving updated questions pool to backup REST server", err);
    }
  };

  const [autoSyncInCycle, setAutoSyncInCycle] = useState<boolean>(false);

  // Automatically pull questions from both spreadsheets and merge them silently on load or change
  const autoSyncBothSheets = async (sambungUrl: string, terjamahUrl: string) => {
    if (autoSyncInCycle) return;
    setAutoSyncInCycle(true);

    const sambungUrlClean = (sambungUrl || "").trim();
    const terjamahUrlClean = (terjamahUrl || "").trim();

    if (!sambungUrlClean && !terjamahUrlClean) {
      setAutoSyncInCycle(false);
      return;
    }

    let cachedSambungLast = "";
    let cachedTerjamahLast = "";
    try {
      cachedSambungLast = localStorage.getItem("tashih_sheets_url_sambung_last_pulled") || "";
      cachedTerjamahLast = localStorage.getItem("tashih_sheets_url_terjamah_last_pulled") || "";
    } catch (e) {}

    const needsSambung = sambungUrlClean && (sambungUrlClean !== cachedSambungLast);
    const needsTerjamah = terjamahUrlClean && (terjamahUrlClean !== cachedTerjamahLast);

    if (!needsSambung && !needsTerjamah) {
      setAutoSyncInCycle(false);
      return;
    }

    console.log("AutoSync: Syncing Google Sheets in the background...", {
      sambungUrlClean,
      terjamahUrlClean,
      needsSambung,
      needsTerjamah
    });

    try {
      let finalSambungQuestions: Question[] = [];
      let finalTerjamahQuestions: Question[] = [];

      // Get current questions pool safely
      const currentPool = questionsPoolRef.current;
      const untouchedQuestions = currentPool.filter(
        q => q.type !== QuestionType.SAMBUNG_AYAT && q.type !== QuestionType.ARTI_PEMAHAMAN
      );

      if (needsSambung) {
        console.log("AutoSync: Pulling Sambung Ayat sheet silently:", sambungUrlClean);
        try {
          let csv = "";
          try {
            const res = await fetch(`/api/google-sheet?url=${encodeURIComponent(sambungUrlClean)}`);
            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
              const data = await res.json();
              if (data.success && data.csv) {
                csv = data.csv;
              }
            }
          } catch (e) {
            console.warn("AutoSync: Express proxy for Sambung Ayat failed, trying direct browser fetch:", e);
          }

          if (!csv) {
            const directCsvUrl = getGoogleSheetCsvUrl(sambungUrlClean);
            if (directCsvUrl) {
              const directRes = await fetch(directCsvUrl);
              if (directRes.ok) {
                csv = await directRes.text();
              }
            }
          }

          if (csv) {
            const parsedRows = parseCSV(csv);
            parsedRows.forEach((row, idx) => {
              const q = mapRecordToQuestion(row, idx, "gsheet");
              if (q) {
                q.type = QuestionType.SAMBUNG_AYAT;
                finalSambungQuestions.push(q);
              }
            });
            console.log(`AutoSync: Loaded ${finalSambungQuestions.length} Sambung Ayat questions.`);
            try {
              localStorage.setItem("tashih_sheets_url_sambung_last_pulled", sambungUrlClean);
            } catch (e) {}
          } else {
            console.warn("AutoSync: Failed to fetch Sambung Ayat sheet via either proxy or direct browser link.");
          }
        } catch (err) {
          console.warn("AutoSync: Sambung Ayat sheet fetch error:", err);
        }
      }

      if (needsTerjamah) {
        console.log("AutoSync: Pulling Tarjamah sheet silently:", terjamahUrlClean);
        try {
          let csv = "";
          try {
            const res = await fetch(`/api/google-sheet?url=${encodeURIComponent(terjamahUrlClean)}`);
            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
              const data = await res.json();
              if (data.success && data.csv) {
                csv = data.csv;
              }
            }
          } catch (e) {
            console.warn("AutoSync: Express proxy for Tarjamah failed, trying direct browser fetch:", e);
          }

          if (!csv) {
            const directCsvUrl = getGoogleSheetCsvUrl(terjamahUrlClean);
            if (directCsvUrl) {
              const directRes = await fetch(directCsvUrl);
              if (directRes.ok) {
                csv = await directRes.text();
              }
            }
          }

          if (csv) {
            const parsedRows = parseCSV(csv);
            parsedRows.forEach((row, idx) => {
              const q = mapRecordToQuestion(row, idx, "gsheet");
              if (q) {
                q.type = QuestionType.ARTI_PEMAHAMAN;
                finalTerjamahQuestions.push(q);
              }
            });
            console.log(`AutoSync: Loaded ${finalTerjamahQuestions.length} Tarjamah questions.`);
            try {
              localStorage.setItem("tashih_sheets_url_terjamah_last_pulled", terjamahUrlClean);
            } catch (e) {}
          } else {
            console.warn("AutoSync: Failed to fetch Tarjamah sheet via either proxy or direct browser link.");
          }
        } catch (err) {
          console.warn("AutoSync: Tarjamah sheet fetch error:", err);
        }
      }

      // If we downloaded new questions, merge and update
      if (finalSambungQuestions.length > 0 || finalTerjamahQuestions.length > 0) {
        const currentSambung = currentPool.filter(q => q.type === QuestionType.SAMBUNG_AYAT);
        const currentTerjamah = currentPool.filter(q => q.type === QuestionType.ARTI_PEMAHAMAN);

        const sambungPoolToUse = finalSambungQuestions.length > 0 ? finalSambungQuestions : currentSambung;
        const terjamahPoolToUse = finalTerjamahQuestions.length > 0 ? finalTerjamahQuestions : currentTerjamah;

        const combinedPool = [...untouchedQuestions, ...sambungPoolToUse, ...terjamahPoolToUse];
        const dedupedCombined = deduplicateQuestions(combinedPool);

        console.log(`AutoSync: Applying background pool upgrade. Size: ${dedupedCombined.length}`);
        await updateQuestionsPool(dedupedCombined);
      }
    } catch (e) {
      console.warn("AutoSync: Background synchronization failed:", e);
    } finally {
      setAutoSyncInCycle(false);
    }
  };

  useEffect(() => {
    if (googleSheetsUrlSambung && googleSheetsUrlTerjamah) {
      const timer = setTimeout(() => {
        autoSyncBothSheets(googleSheetsUrlSambung, googleSheetsUrlTerjamah);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [googleSheetsUrlSambung, googleSheetsUrlTerjamah]);

  // 1. Subscription to real-time questions pool in Firestore
  useEffect(() => {
    let isSeeding = false;
    const unsubscribe = onSnapshot(collection(db, "questions"), async (snapshot) => {
      if (isSeeding) return;
      const items: Question[] = [];
      snapshot.forEach((snapDoc) => {
        items.push(snapDoc.data() as Question);
      });

      if (items.length > 0) {
        const dedupedItems = deduplicateQuestions(items);
        setQuestionsPool(dedupedItems);
        localStorage.setItem("tashih_questions_pool", JSON.stringify(dedupedItems));
      } else {
        // Firestore questions bank is empty!
        // Check if we have cached questions in localStorage
        const cached = localStorage.getItem("tashih_questions_pool");
        let cachedItems: Question[] = [];
        if (cached) {
          try {
            cachedItems = JSON.parse(cached) as Question[];
          } catch (e) {
            console.warn("Parsing local cache failed", e);
          }
        }

        const poolToUse = deduplicateQuestions((cachedItems && cachedItems.length > 0) ? cachedItems : fallbackQuestions);
        
        console.log("Firestore questions empty, seeding/restoring pool of size", poolToUse.length);
        isSeeding = true;
        setQuestionsPool(poolToUse);
        localStorage.setItem("tashih_questions_pool", JSON.stringify(poolToUse));

        try {
          const batch = writeBatch(db);
          poolToUse.forEach((q) => {
            batch.set(doc(db, "questions", q.id), q);
          });
          await batch.commit();
          console.log("Database successfully seeded/restored from local data.");
        } catch (err) {
          console.warn("Failed seeding backup/restored questions to Firestore", err);
        } finally {
          isSeeding = false;
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "questions");
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscription to real-time stage sessions in Firestore
  useEffect(() => {
    const docRef = doc(db, "sessions", "global_stage");
    
    const ensureInitialSession = async () => {
      try {
        const snap = await getDoc(docRef);
        
        let shouldSeed = true;
        if (snap.exists() && snap.data().isSeeded) {
          shouldSeed = false;
        }

        // Run seeding if it was never performed on this database
        if (shouldSeed) {
          console.log("Firestore questions bank fits initial setup, seeding default questions...");
          const qSnap = await getDocs(collection(db, "questions"));
          if (qSnap.empty) {
            const batch = writeBatch(db);
            fallbackQuestions.forEach((q: Question) => {
              const qRef = doc(db, "questions", q.id);
              batch.set(qRef, q);
            });
            await batch.commit();
            console.log("Primary database seeding complete!");
          }
        }

        const defaultCfg = {
          selectedSurah: 93,
          startVerse: 1,
          endVerse: 11,
          questionType: QuestionType.SAMBUNG_AYAT,
          showOverlayAnswer: false,
          spinDuration: 5,
          revealDelay: 3
        };

        const defaultUrlSambung = "https://docs.google.com/spreadsheets/d/1R8GrCQMD1IDRwmbunoPDFDCFwhF8sy0u944MoOReUbw/edit?usp=sharing";
        const defaultUrlTerjamah = "https://docs.google.com/spreadsheets/d/11tUWxeerOWRjtVgmyy_HsfDRQ145UkawiR-lWia8fgA/edit?usp=sharing";
        const defaultWebhookSambung = "https://script.google.com/macros/s/AKfycbyY84OQ96CRqRawmpmIX0SQsVpgwLySSpK3YmFuNWJox8FXHesARvse-tPnNOyO19ku/exec";
        const defaultWebhookTerjamah = "https://script.google.com/macros/s/AKfycbyDhTzSQLc0pLAAUfNv2qWr9hQbGYYfo8TP1P81Fyz5FCtfbiHJQq9mvDs0caDPxhy5og/exec";

        if (!snap.exists()) {
          await setDoc(docRef, {
            sessionId: "global_stage",
            currentQuestion: null,
            showAnswer: false,
            isSpinning: false,
            spinningSurahName: "Ad-Duha",
            spinningVerseNum: 1,
            isMicActive: false,
            isReadingDetectionEnabled: true,
            lastActionTime: Date.now(),
            isSeeded: true,
            config: defaultCfg,
            googleSheetsUrlSambung: defaultUrlSambung,
            googleSheetsUrlTerjamah: defaultUrlTerjamah,
            googleSheetsWebhookUrlSambung: defaultWebhookSambung,
            googleSheetsWebhookUrlTerjamah: defaultWebhookTerjamah,
            appMode: "home",
            typeFilter: "all"
          });
        } else {
          const updates: any = {};
          if (shouldSeed) {
            updates.isSeeded = true;
          }
          if (!snap.data().config) {
            updates.config = defaultCfg;
          }
          if (!snap.data().googleSheetsUrlSambung) {
            updates.googleSheetsUrlSambung = snap.data().googleSheetsUrl || defaultUrlSambung;
          }
          if (!snap.data().googleSheetsUrlTerjamah) {
            updates.googleSheetsUrlTerjamah = snap.data().googleSheetsUrl || defaultUrlTerjamah;
          }
          if (!snap.data().googleSheetsWebhookUrlSambung) {
            updates.googleSheetsWebhookUrlSambung = snap.data().googleSheetsWebhookUrl || defaultWebhookSambung;
          }
          if (!snap.data().googleSheetsWebhookUrlTerjamah) {
            updates.googleSheetsWebhookUrlTerjamah = snap.data().googleSheetsWebhookUrl || defaultWebhookTerjamah;
          }
          if (Object.keys(updates).length > 0) {
            await setDoc(docRef, updates, { merge: true });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "sessions/global_stage");
      }
    };
    ensureInitialSession();

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.lastActionTime && data.lastActionTime <= lastActionTimeRef.current) {
          return;
        }

        const lastAct = data.lastActionTime || 0;
        const now = Date.now();
        const isStale = (now - lastAct) > 15000;

        if (data.isSpinning !== undefined) {
          // If the spinning state is stale, force it to false to prevent spontaneous spinning on load
          setIsSpinning(isStale ? false : data.isSpinning);
        }
        if (data.showAnswer !== undefined) {
          setShowAnswer(data.showAnswer);
        }
        if (data.currentQuestionSambung !== undefined) {
          setCurrentQuestionSambung(data.currentQuestionSambung);
        }
        if (data.currentQuestionTerjamah !== undefined) {
          setCurrentQuestionTerjamah(data.currentQuestionTerjamah);
        }
        if (data.shownQuestionIdsSambung !== undefined) {
          setShownQuestionIdsSambung(data.shownQuestionIdsSambung);
        }
        if (data.shownQuestionIdsTerjamah !== undefined) {
          setShownQuestionIdsTerjamah(data.shownQuestionIdsTerjamah);
        }
        if (data.currentQuestion !== undefined) {
          const targetMode = data.appMode || appMode;
          if (targetMode === "terjamah") {
            setCurrentQuestionTerjamah(data.currentQuestion);
          } else {
            setCurrentQuestionSambung(data.currentQuestion);
          }
        }
        if (data.spinningSurahName !== undefined) {
          setSpinningSurahName(data.spinningSurahName);
        }
        if (data.spinningVerseNum !== undefined) {
          setSpinningVerseNum(data.spinningVerseNum);
        }
        if (data.configSambung !== undefined) {
          setConfigSambung(data.configSambung);
          try {
            localStorage.setItem("tashih_quiz_config_sambung", JSON.stringify(data.configSambung));
          } catch (e) {}
        }
        if (data.configTerjamah !== undefined) {
          setConfigTerjamah(data.configTerjamah);
          try {
            localStorage.setItem("tashih_quiz_config_terjamah", JSON.stringify(data.configTerjamah));
          } catch (e) {}
        }
        if (data.config !== undefined) {
          const isTerjamah = (data.appMode !== undefined ? data.appMode : appMode) === "terjamah";
          if (isTerjamah) {
            setConfigTerjamah(data.config);
            try {
              localStorage.setItem("tashih_quiz_config_terjamah", JSON.stringify(data.config));
            } catch (e) {}
          } else {
            setConfigSambung(data.config);
            try {
              localStorage.setItem("tashih_quiz_config_sambung", JSON.stringify(data.config));
            } catch (e) {}
          }
        }
        // isMicActive is left out of DB load to keep microphone status strictly local & prevent classroom echo trigger loops
        if (data.isReadingDetectionEnabled !== undefined) {
          setIsReadingDetectionEnabled(data.isReadingDetectionEnabled);
        }
        if (data.appMode !== undefined) {
          setAppMode(data.appMode);
        }
        if (data.typeFilter !== undefined) {
          setTypeFilter(data.typeFilter);
        }
        if (data.lastSpeechCommand !== undefined) {
          setLastSpeechCommand(data.lastSpeechCommand);
        }
        if (data.stopBeepActive !== undefined) {
          setStopBeepActive(data.stopBeepActive);
        }
        if (data.revealCountdown !== undefined) {
          setRevealCountdown(data.revealCountdown);
        }

        if (data.googleSheetsUrlSambung !== undefined) {
          setGoogleSheetsUrlSambung(data.googleSheetsUrlSambung);
          setSheetUrlSambungInput(data.googleSheetsUrlSambung);
          try {
            localStorage.setItem("tashih_sheets_url_sambung", data.googleSheetsUrlSambung);
          } catch (e) {
            console.warn(e);
          }
        }
        if (data.googleSheetsUrlTerjamah !== undefined) {
          setGoogleSheetsUrlTerjamah(data.googleSheetsUrlTerjamah);
          setSheetUrlTerjamahInput(data.googleSheetsUrlTerjamah);
          try {
            localStorage.setItem("tashih_sheets_url_terjamah", data.googleSheetsUrlTerjamah);
          } catch (e) {
            console.warn(e);
          }
        }
        if (data.googleSheetsWebhookUrlSambung !== undefined) {
          setGoogleSheetsWebhookUrlSambung(data.googleSheetsWebhookUrlSambung);
          setWebhookUrlSambungInput(data.googleSheetsWebhookUrlSambung);
          try {
            localStorage.setItem("tashih_sheets_webhook_url_sambung", data.googleSheetsWebhookUrlSambung);
          } catch (e) {
            console.warn(e);
          }
        }
        if (data.googleSheetsWebhookUrlTerjamah !== undefined) {
          setGoogleSheetsWebhookUrlTerjamah(data.googleSheetsWebhookUrlTerjamah);
          setWebhookUrlTerjamahInput(data.googleSheetsWebhookUrlTerjamah);
          try {
            localStorage.setItem("tashih_sheets_webhook_url_terjamah", data.googleSheetsWebhookUrlTerjamah);
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "sessions/global_stage");
    });

    return () => unsubscribe();
  }, []);

  const prevIsSpinningRef = useRef<boolean>(false);
  
  // Audio chime transitions based on unified state changes (works across all browsers!)
  useEffect(() => {
    if (isSpinning && !prevIsSpinningRef.current) {
      stopAllActiveSynthesizedTones();
      playSynthesizedTone(380, 0.2, "sine");
    } else if (!isSpinning && prevIsSpinningRef.current) {
      // Shuffling has stopped! Instantly stop all active ticking noises
      stopAllActiveSynthesizedTones();
      
      // Play a beautiful, shorter, highly responsive final celebratory chord (1.6s) to end exactly when scrambling ends
      const finalGrandChord = [130.81, 196.00, 261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; 
      playSynthesizedTone(finalGrandChord, 1.6, "triangle", 0.4);
    }
    prevIsSpinningRef.current = isSpinning;
  }, [isSpinning]);

  // Handle ticking wheel random names simulation based on isSpinning (shuffles available JUZ numbers or SOAL indices)
  useEffect(() => {
    if (isSpinning) {
      // Find all unique Juz numbers or Soal indices in the active/selected questions
      const baseQuestions = activeQuestionsRef.current.length > 0 ? activeQuestionsRef.current : questionsPoolRef.current;
      const targetQuestions = baseQuestions.filter(q => {
        if (appMode === "sambung_ayat") return q.type === QuestionType.SAMBUNG_AYAT;
        if (appMode === "terjamah") return q.type === QuestionType.ARTI_PEMAHAMAN;
        return true;
      });
      
      const isTerjamahMode = appMode === "terjamah";
      let actualNumbers: number[] = [];
      
      if (isTerjamahMode) {
        const count = targetQuestions.length > 0 ? targetQuestions.length : 15;
        actualNumbers = Array.from({ length: count }, (_, i) => i + 1);
      } else {
        const availableJuzs: number[] = Array.from(
          new Set(
            targetQuestions.map((q) => q.juzNumber || getJuzNumber(q.surahNumber, q.verseStart))
          )
        ).filter((juz): juz is number => typeof juz === "number" && juz >= 1 && juz <= 30)
         .sort((a, b) => a - b);
        actualNumbers = availableJuzs.length > 0 ? availableJuzs : Array.from({ length: 30 }, (_, i) => i + 1);
      }

      let tickCount = 0;
      spinIntervalRef.current = setInterval(() => {
        const randomNum = actualNumbers[Math.floor(Math.random() * actualNumbers.length)];
        
        // Use "JUZ" or "SOAL" as a special marker prefix and set the random number
        setSpinningSurahName(isTerjamahMode ? "SOAL" : "JUZ");
        setSpinningVerseNum(randomNum);

        tickCount++;
        const frequency = 320 + (tickCount % 12) * 65;
        playSynthesizedTone(frequency, 0.11, "triangle", 0.45);
      }, 110);
    } else {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
    }
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
    };
  }, [isSpinning]);

  // Automatic stop timer for rolling/spinning
  useEffect(() => {
    let autoStopTimer: NodeJS.Timeout | null = null;
    if (isSpinning) {
      const dur = (config.spinDuration !== undefined ? config.spinDuration : 15) * 1000;
      autoStopTimer = setTimeout(() => {
        if (isSpinningRef.current) {
          handleStopSpin("AUTO_STOP_CONFIG");
        }
      }, dur);
    }
    return () => {
      if (autoStopTimer) {
        clearTimeout(autoStopTimer);
      }
    };
  }, [isSpinning, config.spinDuration]);

  // Check server API connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/quran/generate-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surahNumber: 1, surahName: "Al-Fatihah", startVerse: 1, endVerse: 7 })
        });
        if (res.status === 503) {
          setIsOfflineMode(true);
        }
      } catch (err) {
        setIsOfflineMode(true);
      }
    };
    checkStatus();
  }, []);

  // Synthesize custom wave beep sound on start or stop (supports single tone or multi-voice chords)
  const playSynthesizedTone = (frequency: number | number[], duration: number, type: "sine" | "triangle" | "sawtooth" = "sine", volume = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const frequencies = Array.isArray(frequency) ? frequency : [frequency];
      const dest = audioCtx.destination;

      frequencies.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        // Control volume drop so it doesn't pop loudly
        // Share total volume across active voices to prevent clipping
        const voiceVolume = volume / frequencies.length;
        gainNode.gain.setValueAtTime(voiceVolume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(dest);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);

        // Track osc
        activeOscillatorsRef.current.push({ osc, gainNode, audioCtx });

        // Clean up from tracking once ended
        setTimeout(() => {
          try {
            osc.disconnect();
            gainNode.disconnect();
          } catch (e) {}
          activeOscillatorsRef.current = activeOscillatorsRef.current.filter(item => item.osc !== osc);
        }, (duration + 0.1) * 1000);
      });
    } catch (e) {
      console.warn("AudioContext tone blocked as browser requires user click first.", e);
    }
  };

  const stopAllActiveSynthesizedTones = () => {
    activeOscillatorsRef.current.forEach(({ osc, gainNode, audioCtx }) => {
      try {
        osc.stop();
        osc.disconnect();
        gainNode.disconnect();
      } catch (e) {}
      try {
        if (audioCtx && audioCtx.state !== "closed") {
          audioCtx.close();
        }
      } catch (e) {}
    });
    activeOscillatorsRef.current = [];
  };

  // TRIGGER SPINNING (Acak Soal)
  const handleStartSpin = (commandPhrase?: string) => {
    if (isSpinning) return;

    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    revealQuestionRef.current = null;

    // Shift automatically to display tab so they see the shuffling
    setActiveTab("display");
    syncState({
      isSpinning: true,
      showAnswer: false,
      lastSpeechCommand: commandPhrase || "Bismillah",
      stopBeepActive: false,
      revealCountdown: 0
    });
  };

  // TRIGGER STOP SPINNING (Hentikan Acak secara instan dengan efek selesai dramatis)
  const handleStopSpin = async (commandPhrase?: string) => {
    if (!isSpinningRef.current && !isSpinning) return;

    const cmd = commandPhrase || "STOP";

    // Select the question from the active selected pool first, or fallback to full pool
    const targetList = activeQuestionsRef.current.length > 0 ? activeQuestionsRef.current : questionsPool;

    if (targetList && targetList.length > 0) {
      const isTerjamahMode = appMode === "terjamah";
      const landingNum = spinningVerseNumRef.current;
      
      const shownIds = isTerjamahMode ? shownQuestionIdsTerjamah : shownQuestionIdsSambung;
      let availableTargetList = targetList.filter(q => !shownIds.includes(q.id));
      let resetShownNow = false;

      if (availableTargetList.length === 0) {
        availableTargetList = targetList;
        resetShownNow = true;
      }

      let pickedQuestion: Question;
      
      if (isTerjamahMode) {
        // In Terjamah mode, landingNum is the 1-based index in the targetList
        const targetIndex = (landingNum - 1) % availableTargetList.length;
        pickedQuestion = availableTargetList[targetIndex >= 0 ? targetIndex : 0];
      } else {
        // Filter questions pool to match the landing Juz
        const matchingQuestions = availableTargetList.filter(
          (q) => (q.juzNumber || getJuzNumber(q.surahNumber, q.verseStart)) === landingNum
        );
        
        // If there are questions for this landing Juz, choose one of those!
        // Otherwise, pick a random question from the available target list
        pickedQuestion = matchingQuestions.length > 0
          ? matchingQuestions[Math.floor(Math.random() * matchingQuestions.length)]
          : availableTargetList[Math.floor(Math.random() * availableTargetList.length)];
      }

      const nextShownList = resetShownNow ? [pickedQuestion.id] : [...shownIds, pickedQuestion.id];

      const finalJuzNum = pickedQuestion.juzNumber || getJuzNumber(pickedQuestion.surahNumber, pickedQuestion.verseStart);
      const displayLabel = isTerjamahMode ? "SOAL" : "JUZ";
      const displayNum = isTerjamahMode ? (targetList.indexOf(pickedQuestion) + 1) : finalJuzNum;

      const delay = config.revealDelay !== undefined ? config.revealDelay : 3;

      if (delay > 0) {
        // Stop spinning but enter countdown transition first
        syncState({
          isSpinning: false,
          currentQuestion: null,
          showAnswer: false,
          spinningSurahName: displayLabel,
          spinningVerseNum: displayNum,
          stopBeepActive: true,
          lastSpeechCommand: cmd,
          revealCountdown: delay,
          [isTerjamahMode ? "shownQuestionIdsTerjamah" : "shownQuestionIdsSambung"]: nextShownList
        });

        revealQuestionRef.current = pickedQuestion;

        if (revealTimerRef.current) clearInterval(revealTimerRef.current);

        let timeLeft = delay;
        revealTimerRef.current = setInterval(() => {
          timeLeft -= 1;
          const currentPicked = revealQuestionRef.current || pickedQuestion;
          const currentDisplayNum = isTerjamahMode ? (targetList.indexOf(currentPicked) + 1) : (currentPicked.juzNumber || getJuzNumber(currentPicked.surahNumber, currentPicked.verseStart));
          
          if (timeLeft <= 0) {
            if (revealTimerRef.current) {
              clearInterval(revealTimerRef.current);
              revealTimerRef.current = null;
            }
            syncState({
              currentQuestion: currentPicked,
              revealCountdown: 0,
              spinningSurahName: displayLabel,
              spinningVerseNum: currentDisplayNum
            });
            revealQuestionRef.current = null;
          } else {
            syncState({
              revealCountdown: timeLeft,
              spinningSurahName: displayLabel,
              spinningVerseNum: currentDisplayNum
            });
          }
        }, 1000);

      } else {
        // Direct immediate reveal
        syncState({
          isSpinning: false,
          currentQuestion: pickedQuestion,
          showAnswer: false,
          spinningSurahName: displayLabel,
          spinningVerseNum: displayNum,
          stopBeepActive: true,
          lastSpeechCommand: cmd,
          revealCountdown: 0,
          [isTerjamahMode ? "shownQuestionIdsTerjamah" : "shownQuestionIdsSambung"]: nextShownList
        });
      }
    } else {
      alert("Bank soal kosong! Harap tambahkan soal terlebih dahulu melalui menu Pengaturan atau gunakan tombol 'Default awal'!");
    }
  };

  // Helper to get questionsPool sorted by surahNumber then verseStart
  const getSortedPool = () => {
    return [...questionsPool].sort((a, b) => {
      if (a.surahNumber !== b.surahNumber) {
        return a.surahNumber - b.surahNumber;
      }
      return a.verseStart - b.verseStart;
    });
  };

  const handleNextVerse = async () => {
    if (!currentQuestion) {
      if (questionsPool.length > 0) {
        syncState({ currentQuestion: questionsPool[0], showAnswer: false });
      } else {
        alert("Bank soal kosong!");
      }
      return;
    }

    const currentSurahMeta = quranSurahs.find(s => s.number === currentQuestion.surahNumber);
    const totalVerses = currentSurahMeta ? currentSurahMeta.totalVerses : 7;
    let nextVerse = currentQuestion.verseStart + 1;
    let nextSurahNumber = currentQuestion.surahNumber;

    if (nextVerse > totalVerses) {
      nextSurahNumber = currentQuestion.surahNumber + 1;
      if (nextSurahNumber > 114) {
        nextSurahNumber = 1;
      }
      nextVerse = 1;
    }

    const nextSurahMeta = quranSurahs.find(s => s.number === nextSurahNumber) || quranSurahs[0];
    const nextSurahName = nextSurahMeta.name;

    // Instantly transition answer display states and play comfortable transition tick
    playSynthesizedTone(330, 0.08, "sine", 0.35);

    const isSambung = currentQuestion.type === QuestionType.SAMBUNG_AYAT;

    // Check if we can instantly and perfectly transition with 100% real Arabic continuation text in-memory
    let instantArabic = "";
    let instantTranslation = "";
    
    if (nextSurahNumber === currentQuestion.surahNumber && 
        currentQuestion.answerArabic && 
        !currentQuestion.answerArabic.includes("شَدَّ") && 
        !currentQuestion.answerArabic.includes("قِرَاءَةُ")) {
      instantArabic = currentQuestion.answerArabic;
      instantTranslation = currentQuestion.answerTranslation;
    }

    // Prepare temporary state so there is 100% absolute zero screen freeze or visual lag
    const initialImmediateQuestion: Question = {
      id: `next-verse-immediate-${Date.now()}`,
      surahNumber: nextSurahNumber,
      surahName: nextSurahName,
      verseStart: nextVerse,
      verseEnd: nextVerse,
      questionArabic: instantArabic, // Instantly utilizes the 100% real continuation if available, otherwise empty triggers the lovely shimmer loader
      questionTranslation: instantTranslation || `Menyelaraskan surat ${nextSurahName} Ayat ${nextVerse}...`,
      questionPrompt: isSambung ? "Lanjutkan potongan ayat suci berikut dengan lancar:" : "Sebutkan pelajaran penting dan hikmah dari surah ini:",
      answerArabic: "",
      answerTranslation: "Memuat naskah kelanjutan...",
      explanation: instantArabic ? "Melanjutkan ke ayat berikutnya dari naskah hafalan." : "Sistem menyinkronkan naskah lengkap digital Madinah untuk panggung...",
      juzNumber: getJuzNumber(nextSurahNumber, nextVerse),
      mushafPage: Math.min(604, Math.max(1, Math.floor(604 * (nextSurahNumber / 114)))),
      type: currentQuestion.type || QuestionType.SAMBUNG_AYAT
    };

    // Render placeholder instantly
    syncState({ currentQuestion: initialImmediateQuestion, showAnswer: false });

    // Fetch official, complete diacritics dataset from high speed CDN and hot-swap silently (takes ~100ms)
    try {
      const resVal = await fetch(`https://equran.id/api/v2/surat/${nextSurahNumber}`);
      if (resVal.ok) {
        const result = await resVal.json();
        if (result && result.code === 200 && result.data && result.data.ayat) {
          const ayatList = result.data.ayat;
          const questionAyat = ayatList.find((a: any) => a.nomorAyat === nextVerse);
          const answerAyat = ayatList.find((a: any) => a.nomorAyat === (nextVerse + 1)) || {
            teksArab: "شَدَّ ذَلِكَ الْقُرْآنَ فِي الصُّدُورِ",
            teksIndonesia: "Selesai akhir surah."
          };

          if (questionAyat) {
            const richQuestion: Question = {
              id: `next-verse-rich-${Date.now()}`,
              surahNumber: nextSurahNumber,
              surahName: nextSurahName,
              verseStart: nextVerse,
              verseEnd: nextVerse,
              questionArabic: questionAyat.teksArab,
              questionTranslation: questionAyat.teksIndonesia,
              questionPrompt: isSambung ? "Lanjutkan potongan ayat suci berikut dengan lancar dan tepat:" : "Sebutkan pelajaran penting dan hikmah dari surah ini:",
              answerArabic: answerAyat.teksArab,
              answerTranslation: answerAyat.teksIndonesia,
              explanation: `Latihan sambung ayat Surat ${nextSurahName} ayat ${nextVerse} ke ayat ${nextVerse + 1}. Tajwid & Waqaf terintegrasi secara otomatis.`,
              juzNumber: getJuzNumber(nextSurahNumber, nextVerse),
              mushafPage: Math.min(604, Math.max(1, Math.floor(604 * (nextSurahNumber / 114)))),
              type: currentQuestion.type || QuestionType.SAMBUNG_AYAT
            };
            syncState({ currentQuestion: richQuestion });
          }
        }
      }
    } catch (err) {
      console.warn("Using offline fallback mode", err);
    } finally {
      playSynthesizedTone(523.25, 0.08, "sine", 0.25); // Quiet success click chirp
    }
  };

  const handleReadingMatched = () => {
    // Joyful classic major chord success arpeggio: C5 -> E5 -> G5 (clear sound)
    playSynthesizedTone(523.25, 0.12, "sine", 0.35);
    setTimeout(() => playSynthesizedTone(659.25, 0.12, "sine", 0.35), 90);
    setTimeout(() => playSynthesizedTone(783.99, 0.22, "sine", 0.4), 180);

    // Turn on showAnswer immediately to show the correct continuation verse
    syncState({ showAnswer: true });

    // Wait 3.5 seconds to allow verifying, then advance to the next verse automatically
    setTimeout(() => {
      handleNextVerse();
    }, 3500);
  };

  // A helper to send newly created custom questions to the Google Sheets Webapp Webhook securely via CORS proxy
  const saveQuestionToWebhookIfConfigured = async (q: Question) => {
    if (!googleSheetsWebhookUrl.trim()) return;
    
    setIsSendingToWebhook(true);
    const payload = {
      id: q.id,
      Nomor_Surat: q.surahNumber,
      Nama_Surat: q.surahName,
      Nomor_Ayat: q.verseStart,
      Deskripsi_Soal: q.questionPrompt,
      Teks_Arab_Soal: q.questionArabic,
      Terjemahan_Soal: q.questionTranslation,
      Teks_Arab_Jawaban: q.answerArabic,
      Terjemahan_Jawaban: q.answerTranslation,
      Keterangan: q.explanation,
      juz: q.juzNumber,
      mushafPage: q.mushafPage,
      // Camelcase versions
      surahNumber: q.surahNumber,
      surahName: q.surahName,
      verseStart: q.verseStart,
      questionPrompt: q.questionPrompt,
      questionArabic: q.questionArabic,
      questionTranslation: q.questionTranslation,
      answerArabic: q.answerArabic,
      answerTranslation: q.answerTranslation,
      explanation: q.explanation
    };

    try {
      let success = false;
      try {
        const response = await fetch("/api/google-sheet-webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            webhookUrl: googleSheetsWebhookUrl.trim(),
            payload: payload
          })
        });

        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.success) {
            console.log("Custom question appended to Google Sheet Webhook successfully server-side.", data);
            success = true;
          } else {
            console.warn("Server-side Google Sheet Webhook had an error:", data.error);
          }
        }
      } catch (e) {
        console.warn("Failed pushing to webhook via server-side API, attempting direct client-side fallback:", e);
      }

      // Direct Client-Side Fallback for Static Hostings (Vercel, Netlify)
      if (!success) {
        console.log("Attempting direct client-side POST to Google Webhook with CORS-tolerant mode...");
        await fetch(googleSheetsWebhookUrl.trim(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          mode: "no-cors" // Safe bypass for Google Apps Script redirects
        });
        console.log("Direct client-side webhook request completed successfully in no-cors mode.");
      }
    } catch (err) {
      console.error("Failed pushing to Google Sheet Webhook:", err);
    } finally {
      setIsSendingToWebhook(false);
    }
  };

  // A helper to request Google Sheets Webapp Webhook to delete a question
  const deleteQuestionFromWebhookIfConfigured = async (q: Question) => {
    if (!googleSheetsWebhookUrl.trim()) return;
    
    setIsSendingToWebhook(true);
    const payload = {
      action: "delete",
      id: q.id,
      Nomor_Surat: q.surahNumber,
      Nama_Surat: q.surahName,
      Nomor_Ayat: q.verseStart,
      Teks_Arab_Soal: q.questionArabic,
      // synonyms as fallback
      questionArabic: q.questionArabic,
      surahNumber: q.surahNumber,
      verseStart: q.verseStart
    };

    try {
      let success = false;
      try {
        const response = await fetch("/api/google-sheet-webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            webhookUrl: googleSheetsWebhookUrl.trim(),
            payload: payload
          })
        });

        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("application/json")) {
          const data = await response.json();
          if (data.success) {
            console.log("Question delete request sent to Google Sheet Webhook successfully.", data);
            success = true;
          } else {
            console.warn("Delete Webhook response was unsuccessful:", data.error);
          }
        }
      } catch (e) {
        console.warn("Failed sending delete request to Google Sheet Webhook via server-side API, trying direct client-side fallback:", e);
      }

      // Direct Client-Side Fallback for Static Hostings (Vercel, Netlify)
      if (!success) {
        console.log("Attempting direct client-side delete webhook call with CORS-tolerant mode...");
        await fetch(googleSheetsWebhookUrl.trim(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          mode: "no-cors" // Safe bypass for Google Apps Script redirects
        });
        console.log("Direct client-side delete webhook completed successfully in no-cors mode.");
      }
    } catch (err) {
      console.error("Failed sending delete request to Google Sheet Webhook:", err);
    } finally {
      setIsSendingToWebhook(false);
    }
  };

  // Add the custom manual question to active screen
  const handleApplyCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQArabic.trim() || !customAArabic.trim()) {
      alert("Harap lengkapi teks Arab pertanyaan dan teks Arab kelanjutan jawaban!");
      return;
    }
    const targetSurahMeta = quranSurahs.find(s => s.number === customSurah) || quranSurahs[0];
    const newQuestion: Question = {
      id: `custom_${Date.now()}`,
      surahNumber: customSurah,
      surahName: targetSurahMeta.name,
      verseStart: customVerse,
      verseEnd: customVerse,
      type: customQType,
      questionPrompt: customQPrompt,
      questionArabic: customQArabic,
      questionTranslation: customQTrans || (customQType === QuestionType.SAMBUNG_AYAT ? `Potongan ayat Al-Quran kustom Surat ${targetSurahMeta.name} ayat ${customVerse}` : `Terjemahan Soal Surat ${targetSurahMeta.name} ayat ${customVerse}`),
      answerArabic: customAArabic,
      answerTranslation: customATrans || (customQType === QuestionType.SAMBUNG_AYAT ? `Sambungan ayat dari Surat ${targetSurahMeta.name} ayat ${customVerse + 1}` : `Terjemahan Kunci Surat ${targetSurahMeta.name} ayat ${customVerse + 1}`),
      explanation: customExplain,
      juzNumber: getJuzNumber(customSurah, customVerse),
      mushafPage: Math.floor(Math.random() * 600) + 1
    };
    
    // updateQuestionsPool will automatically deduplicate using the helper
    updateQuestionsPool([newQuestion, ...questionsPool]);
    syncState({ currentQuestion: newQuestion, showAnswer: false });
    
    // Play alert sound to confirm
    playSynthesizedTone(440, 0.25, "sine");

    // Asynchronously push to Google Apps Script Webhook securely via server-side proxy
    saveQuestionToWebhookIfConfigured(newQuestion);

    // Reset inputs immediately to prevent any accidental double submissions/duplicate rendering
    setCustomQArabic("");
    setCustomQTrans("");
    setCustomAArabic("");
    setCustomATrans("");
    setCustomQPrompt("Lanjutkan potongan ayat suci berikut:");
    setCustomExplain("Pertanyaan Hafalan Kustom dari Penguji");
  };

  // Google Sheets fetching engine (utilizes CORS bypass endpoint)
  const handleFetchGoogleSheet = async () => {
    const inputUrl = syncConfigTab === "sambung_ayat" ? sheetUrlSambungInput : sheetUrlTerjamahInput;
    if (!inputUrl || !inputUrl.trim()) {
      setSheetSyncError("Harap masukkan link Google Sheet terlebih dahulu.");
      setSheetSyncStatus("error");
      return;
    }
    
    setSheetSyncStatus("loading");
    setSheetSyncError("");
    setSheetParsedQuestions(null);
    
    try {
      let rawCSV = "";
      try {
        const res = await fetch(`/api/google-sheet?url=${encodeURIComponent(inputUrl.trim())}`);
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success && data.csv) {
            rawCSV = data.csv;
          } else if (data.error) {
            console.warn("Server API returned error, falling back to direct browser fetch:", data.error);
          }
        } else {
          console.warn("Server API returned unexpected content-type / status, falling back to direct browser fetch. Status:", res.status);
        }
      } catch (e) {
        console.warn("Express proxy fetch failed or is not available, falling back to direct browser fetch:", e);
      }

      // Fallback to direct client-side fetch if server proxy didn't return valid CSV
      if (!rawCSV) {
        const directCsvUrl = getGoogleSheetCsvUrl(inputUrl.trim());
        if (directCsvUrl) {
          console.log("Fetching directly from Google Sheets via browser:", directCsvUrl);
          const directRes = await fetch(directCsvUrl);
          if (!directRes.ok) {
            throw new Error(`Gagal menarik data langsung dari Google Sheets. Pastikan spreadsheet diatur publik 'Siapa saja yang memiliki link dapat melihat' sebagai Viewer. (Status: ${directRes.status})`);
          }
          rawCSV = await directRes.text();
        } else {
          throw new Error("Format link Google Sheets tidak valid. Pastikan link memiliki format '/d/SPREADSHEET_ID'.");
        }
      }

      const parsedRows = parseCSV(rawCSV);
      const mappedQuestions: Question[] = [];
      
      parsedRows.forEach((row, idx) => {
        const q = mapRecordToQuestion(row, idx, "gsheet");
        if (q) {
          // Force matching the imported questions to the target mode's type for perfect separation
          q.type = syncConfigTab === "sambung_ayat" ? QuestionType.SAMBUNG_AYAT : QuestionType.ARTI_PEMAHAMAN;
          mappedQuestions.push(q);
        }
      });
      
      if (mappedQuestions.length === 0) {
        throw new Error("Tidak ditemukan baris soal yang valid. Periksa kembali nama kolom (header) dan pastikan teks Arab terisi.");
      }
      
      setSheetParsedQuestions(mappedQuestions);
      setSheetSyncStatus("success");
      playSynthesizedTone([261.63, 329.63, 392.00, 523.25], 1.2, "sine");
    } catch (err: any) {
      console.error(err);
      setSheetSyncError(err.message || "Gagal memproses spreadsheet.");
      setSheetSyncStatus("error");
      playSynthesizedTone(150, 0.4, "sine");
    }
  };

  const handleApplyGoogleSheetSync = async () => {
    if (!sheetParsedQuestions || sheetParsedQuestions.length === 0) return;
    
    try {
      // 1. Sync State & Sync link URL to global_stage config in Firebase
      if (syncConfigTab === "sambung_ayat") {
        await syncState({ googleSheetsUrlSambung: sheetUrlSambungInput.trim() });
      } else {
        await syncState({ googleSheetsUrlTerjamah: sheetUrlTerjamahInput.trim() });
      }
      
      // 2. Decouple/Merge with the existing questions pool:
      // Retain the other type (and custom manual types), and overwrite the old pool for the active type.
      const targetType = syncConfigTab === "sambung_ayat" ? QuestionType.SAMBUNG_AYAT : QuestionType.ARTI_PEMAHAMAN;
      const untouchedQuestions = questionsPool.filter(q => q.type !== targetType);
      
      const newPool = [...untouchedQuestions, ...sheetParsedQuestions];
      
      // 3. Fully replace/upgrade active questions pool in Firestore database and server file
      await updateQuestionsPool(newPool);
      
      // Set first question active
      if (sheetParsedQuestions.length > 0) {
        await syncState({ currentQuestion: sheetParsedQuestions[0], showAnswer: false });
      }
      
      alert(`Sukses sinkronisasi! ${sheetParsedQuestions.length} soal (${syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"}) telah dimuat dan disinkronkan ke semua perangkat secara real-time!`);
      setSheetParsedQuestions(null);
      setSheetSyncStatus("idle");
    } catch (err: any) {
      alert(`Gagal menyimpan ke database: ${err.message}`);
    }
  };

  const handleDownloadTemplateCSV = () => {
    const headers = "Nomor_Surat,Nama_Surat,Mulai_Ayat,Akhir_Ayat,Tipe_Soal,Teks_Soal_Arab,Terjemahan_Soal,Teks_Jawaban_Arab,Terjemahan_Jawaban,Penjelasan_Hikmah,Juz,Halaman_Mushaf\n";
    const row1 = "1,Al-Fatihah,2,3,sambung_ayat,ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ﴿٢﴾ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ﴿٣﴾,Segala puji bagi Allah...,مَٰلِكِ يَوْمِ ٱلدِّينِ ﴿٤﴾,Pemilik hari pembalasan...,Sangat dianjurkan dibaca...,1,1\n";
    const row2 = "93,Ad-Duha,1,3,arti_pemahaman,وَٱلضُّحَىٰ ﴿١﴾ وَٱلَّيْلِ إِذَا سَجَىٰ ﴿٢﴾,Demi waktu duha...,وَٱلضُّحَىٰ,Menjelaskan rasa syukur...,Tafsir dhuha...,30,596\n";
    const blob = new Blob([headers + row1 + row2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "tashih_template_soal.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(questionsPool, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `tashih_bank_soal_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            // Validate structure
            const valid = parsed.every(q => q.surahNumber && q.questionArabic && q.answerArabic);
            if (valid) {
              updateQuestionsPool(parsed);
              if (parsed.length > 0) {
                syncState({ currentQuestion: parsed[0], showAnswer: false });
              }
              alert(`Berhasil mengimpor ${parsed.length} soal dari file JSON!`);
            } else {
              alert("Format JSON tidak valid. Pastikan berisi array soal dengan atribut minimal surahNumber, questionArabic, dan answerArabic.");
            }
          } else {
            alert("Data JSON harus berupa array.");
          }
        } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
          const parsedRows = parseCSV(content);
          const mappedqs: Question[] = [];
          parsedRows.forEach((row, idx) => {
            const q = mapRecordToQuestion(row, idx, "csvlocal");
            if (q) mappedqs.push(q);
          });
          if (mappedqs.length > 0) {
            updateQuestionsPool(mappedqs);
            syncState({ currentQuestion: mappedqs[0], showAnswer: false });
            alert(`Berhasil mengimpor ${mappedqs.length} soal dari file CSV!`);
          } else {
            alert("Gagal memetakan kolom CSV. Periksa nama kolom atau isi teks Arab.");
          }
        }
      } catch (err: any) {
        alert(`Gagal membaca file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="tashih-root" className="min-h-screen bg-[#faf8f5] text-gray-900 pb-24 font-sans relative">
      
      {/* Top Gilded red and white decorative banner */}
      <div className="h-2.5 bg-gradient-to-r from-red-650 from-red-600 via-white to-red-650 to-red-600 w-full shadow-sm" />

      {/* Main App Bar / Header Banner in Premium Crimson Red */}
      <header className="bg-red-800 text-white py-6 sm:py-8 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-red-950 opacity-15 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border-2 border-red-200 shadow-lg flex items-center justify-center text-red-700">
              <BookOpen className="w-6 h-6 animate-float" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif text-white uppercase tracking-wider">
                  TASHIH
                </h1>
              </div>
              <p className="text-xs text-red-100 font-medium">
                Sistem pengacak lembar soal hafalan Al-Quran dengan kendali suara
              </p>
            </div>
          </div>

          <div id="quick-indicators" className="flex items-center gap-3 flex-wrap">
            {/* Global Microphone Toggle Icon Button */}
            <button
              type="button"
              id="btn-header-mic-toggle"
              onClick={() => {
                const nextVal = !isMicActive;
                syncState({ isMicActive: nextVal });
                playSynthesizedTone(nextVal ? 440 : 300, 0.15, "sine");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 select-none border ${
                isMicActive 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 animate-[pulse_2s_infinite]" 
                  : "bg-white hover:bg-gray-50 text-gray-800 border-red-200"
              }`}
              title={isMicActive ? "Matikan Mikrofon Asisten" : "Aktifkan Mikrofon Asisten"}
            >
              <Mic className={`w-3.5 h-3.5 ${isMicActive ? "text-white animate-bounce" : "text-red-700"}`} />
              <span>{isMicActive ? "Mic Aktif" : "Mic Mati"}</span>
            </button>

            {/* Mode Layar Penuh (Projector Button) */}
            <button
              type="button"
              id="btn-header-fullscreen-toggle"
              onClick={handleToggleFullscreen}
              className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 select-none border ${
                isFullscreen
                  ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-500"
                  : "bg-white hover:bg-gray-50 text-gray-800 border-red-200"
              }`}
              title={isFullscreen ? "Keluar Layar Penuh" : "Aktifkan Layar Penuh untuk Proyektor"}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}</span>
            </button>

            {/* Header Switcher button */}
            <button
              type="button"
              id="btn-header-subview-toggle"
              onClick={() => {
                setShowVoiceAndBank(!showVoiceAndBank);
                playSynthesizedTone(350, 0.1, "sine");
              }}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-red-200 text-gray-800 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer active:scale-95 select-none"
            >
              {!showVoiceAndBank ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="text-red-800">Ujian (aktif)</span>
                </>
              ) : (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="text-gray-700">Dashboard</span>
                </>
              )}
            </button>

            {lastSpeechCommand && (
              <div className="bg-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-bold animate-pulse font-mono flex items-center gap-1 shadow-inner">
                <Volume2 className="w-3.5 h-3.5" /> KOMANDO: "{lastSpeechCommand}"
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 mt-8">

        {appMode !== "home" && (
          <div className="flex items-center justify-between gap-4 mb-6 select-none animate-[fadeIn_0.2s_ease_out]">
            <button
              type="button"
              id="btn-back-to-home"
              onClick={() => {
                setAppMode("home");
                setIsSpinning(false);
                syncState({ appMode: "home", isSpinning: false });
                playSynthesizedTone(300, 0.15, "sine");
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md hover:shadow-red-500/10 transition-all cursor-pointer border border-red-500 active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>← Kembali ke Menu Utama</span>
            </button>
            <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm">
              <span className={`w-2 h-2 rounded-full animate-pulse ${appMode === "terjamah" ? "bg-emerald-600" : "bg-red-600"}`} />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                Mode Ujian: {appMode === "terjamah" ? "Terjamah (Soal)" : "Sambung Ayat (Juz)"}
              </span>
            </div>
          </div>
        )}

        {/* STOP ALERT / BEEP VISUAL BANNER (shown only when STOP is detected) */}
        {stopBeepActive && (
          <div className="bg-red-600 text-white p-4 rounded-2xl mb-6 shadow-xl border-2 border-white flex items-center justify-center gap-3 animate-bounce">
            <Volume2 className="w-6 h-6 animate-ping" />
            <div>
              <h4 className="font-extrabold text-sm sm:text-base">✓ ACAKAN DIHENTIKAN ("STOP" Suara / Tombol Terdeteksi)</h4>
              <p className="text-xs text-red-100">Nada bel stop berbunyi! Pertanyaan ujian sedang dimuat dari server...</p>
            </div>
            <span className="bg-white text-red-700 font-mono font-bold text-xs px-2.5 py-1 rounded">BEEP CHIME!</span>
          </div>
        )}
        
        {/* TAB 1: LAYAR UTAMA MUSHAF / PUBLIC DISPLAY */}
        {activeTab === "display" && (
          <div className="space-y-6 animate-[fadeIn_0.2s_ease_out]">
            
            {appMode === "home" ? (
              <div id="home-landing-page" className="flex flex-col items-center justify-center py-12 max-w-xl mx-auto space-y-12 animate-[fadeIn_0.4s_ease_out]">
                
                {/* Modern clean logo mark centered */}
                <div className="text-center select-none space-y-6 sm:space-y-8">
                  <div className="py-2">
                    <span className="font-arabic text-2xl sm:text-3xl md:text-4xl text-red-700 font-bold block leading-relaxed animate-float filter drop-shadow-sm" dir="rtl">
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </span>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t border-red-100/50 max-w-sm mx-auto">
                    <h2 className="text-xl sm:text-2xl font-black tracking-[0.2em] text-red-950 font-serif uppercase">
                      PILIH METODE UJIAN
                    </h2>
                    <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full" />
                  </div>
                </div>

                {/* Modern circular buttons side-by-side */}
                <div className="grid grid-cols-2 gap-8 sm:gap-14 w-full justify-center items-center">
                  
                  {/* Sambung Ayat Card style circular */}
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      type="button"
                      id="card-menu-sambung-ayat"
                      onClick={() => {
                        setAppMode("sambung_ayat");
                        setTypeFilter("sambung_ayat");
                        setCurrentQuestionSambung(null);
                        syncState({ 
                          appMode: "sambung_ayat", 
                          typeFilter: "sambung_ayat", 
                          currentQuestionSambung: null,
                          currentQuestion: null 
                        });
                        playSynthesizedTone([261.63, 329.63, 392.00], 0.45, "sine");
                      }}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-red-50 to-white hover:from-red-600 hover:to-red-800 hover:text-white border-[5px] border-red-800 flex items-center justify-center text-red-800 shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all duration-300 group cursor-pointer"
                      title="Menu Sambung Ayat"
                    >
                      <Compass className="w-10 h-10 sm:w-14 sm:h-14 group-hover:rotate-12 transition-all duration-300" />
                    </button>
                    <span className="text-xs sm:text-sm font-extrabold text-red-950 tracking-wider text-center uppercase">
                      Sambung Ayat
                    </span>
                  </div>

                  {/* Terjamah Card style circular */}
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      type="button"
                      id="card-menu-terjamah"
                      onClick={() => {
                        setAppMode("terjamah");
                        setTypeFilter("arti_pemahaman");
                        setCurrentQuestionTerjamah(null);
                        syncState({ 
                          appMode: "terjamah", 
                          typeFilter: "arti_pemahaman", 
                          currentQuestionTerjamah: null,
                          currentQuestion: null 
                        });
                        playSynthesizedTone([293.66, 349.23, 440.00], 0.45, "sine");
                      }}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-red-50 to-white hover:from-red-600 hover:to-red-800 hover:text-white border-[5px] border-red-800 flex items-center justify-center text-red-800 shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all duration-300 group cursor-pointer"
                      title="Menu Terjamah"
                    >
                      <FileText className="w-10 h-10 sm:w-14 sm:h-14 group-hover:-translate-y-1 transition-all duration-300" />
                    </button>
                    <span className="text-xs sm:text-sm font-extrabold text-red-950 tracking-wider text-center uppercase">
                      Terjamah Al Quran
                    </span>
                  </div>

                </div>

              </div>
            ) : (
              <>
                {/* Immersive Mushaf View centered gracefully (Always Visible) */}
                <MushafView
                  question={currentQuestion}
                  showAnswer={showAnswer}
                  setShowAnswer={setShowAnswer}
                  isSpinning={isSpinning}
                  currentSpinningSurahName={spinningSurahName}
                  currentSpinningVerseNum={spinningVerseNum}
                  availableJuzs={availableJuzsList}
                  onBismillahClick={() => handleStartSpin()}
                  onStopSpin={() => handleStopSpin()}
                  onNextVerse={handleNextVerse}
                  isMicActive={isMicActive}
                  onToggleMicActive={(val) => {
                    syncState({ isMicActive: val });
                    if (val) setMicError("");
                  }}
                  onOpenMushaf={() => setIsMushafOpen(true)}
                  micError={micError}
                  onClearMicError={() => setMicError("")}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={handleToggleFullscreen}
                  revealCountdown={revealCountdown}
                  spinDuration={config.spinDuration || 15}
                  isMushafOpen={isMushafOpen}
                  setIsMushafOpen={setIsMushafOpen}
                  appMode={appMode}
                  typeFilter={typeFilter}
                  modePool={modePool}
                  onSelectQuestion={(q) => {
                    syncState({ currentQuestion: q, showAnswer: false });
                    playSynthesizedTone(523.25, 0.15, "sine");
                    document.getElementById("mushaf-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  onRandomInstant={() => {
                    if (modePool.length > 0) {
                      const randomIdx = Math.floor(Math.random() * modePool.length);
                      const rq = modePool[randomIdx];
                      syncState({ currentQuestion: rq, showAnswer: false });
                      playSynthesizedTone([261.63, 329.60, 392.00], 0.3, "sine");
                      document.getElementById("mushaf-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                  onBackToHome={() => {
                    setAppMode("home");
                    setIsSpinning(false);
                    syncState({ appMode: "home", isSpinning: false });
                    playSynthesizedTone(300, 0.15, "sine");
                  }}
                  onDeselectQuestion={() => {
                    syncState({ 
                      currentQuestion: null,
                      currentQuestionSambung: null,
                      currentQuestionTerjamah: null,
                      showAnswer: false 
                    });
                    playSynthesizedTone(300, 0.15, "sine");
                  }}
                  onAddAsCustomQuestion={activeTab !== "display" ? (verseDetail) => {
                // 1. Populate custom form states so operator can see/edit them!
                setCustomSurah(verseDetail.surahNumber);
                setCustomVerse(verseDetail.nomorAyat);
                setCustomQArabic(verseDetail.teksArab);
                setCustomQTrans(verseDetail.teksIndonesia);
                
                if (verseDetail.nextTeksArab) {
                  setCustomAArabic(verseDetail.nextTeksArab);
                  setCustomATrans(verseDetail.nextTeksIndonesia);
                  setCustomQPrompt("Lanjutkan sambungan potongan ayat suci berikut dengan lancar:");
                } else {
                  setCustomAArabic("Shadaqallahul adziim.");
                  setCustomATrans("Maha benar Allah dengan segala firman-Nya.");
                  setCustomQPrompt("Sebutkan hikmah penting dari akhir surah ini:");
                }
                setCustomExplain(`Soal kustom dari mushaf Al-Quran surat ${verseDetail.surahName} ayat ${verseDetail.nomorAyat}.`);

                // 2. Automatically package it as the active question so they can test it instantly!
                const generatedQuestion: Question = {
                  id: `mushaf-custom-${Date.now()}`,
                  surahNumber: verseDetail.surahNumber,
                  surahName: verseDetail.surahName,
                  verseStart: verseDetail.nomorAyat,
                  verseEnd: verseDetail.nomorAyat,
                  questionArabic: verseDetail.teksArab,
                  questionTranslation: verseDetail.teksIndonesia,
                  questionPrompt: verseDetail.nextTeksArab ? "Lanjutkan potongan ayat suci berikut dengan lancar:" : "Sebutkan pelajaran penting dari ayat terakhir berikut:",
                  answerArabic: verseDetail.nextTeksArab || "Shadaallahul adziim.",
                  answerTranslation: verseDetail.nextTeksIndonesia || "Selesai akhir surah.",
                  explanation: `Ujian hafalan kustom dari Mushaf interaktif surat ${verseDetail.surahName} ayat ${verseDetail.nomorAyat}. Dilengkapi analisis tajwid & maqra otomatis.`,
                  juzNumber: getJuzNumber(verseDetail.surahNumber, verseDetail.nomorAyat),
                  mushafPage: Math.floor(Math.random() * 604) + 1,
                  type: QuestionType.SAMBUNG_AYAT
                };

                // Update current question
                updateQuestionsPool([generatedQuestion, ...questionsPool]);
                syncState({ currentQuestion: generatedQuestion, showAnswer: false });

                // Save to Google Sheet Webhook if configured
                saveQuestionToWebhookIfConfigured(generatedQuestion);

                // Close modal
                setIsMushafOpen(false);

                // Play confirm sound
                playSynthesizedTone(523.25, 0.3, "sine"); // C5 sound
              } : undefined}
            />



            {/* Manual Acak Trigger (Always accessible below MushafView) */}
            <div 
              id="sticky-btn-wrapper" 
              className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border flex justify-center max-w-md mx-auto transition-all duration-300 border-red-100"
            >
              <button
                id="btn-spin-manual-display"
                onPointerDown={() => {
                  playSynthesizedTone(523.25, 0.08, "sine");
                }}
                onClick={() => {
                  if (isSpinning) {
                    handleStopSpin();
                  } else {
                    handleStartSpin();
                  }
                }}
                className={`w-full py-4 px-6 rounded-xl font-extrabold text-sm sm:text-base tracking-wide transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                  isSpinning 
                    ? "bg-red-700 hover:bg-red-800 text-white animate-pulse" 
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>{isSpinning ? "HENTIKAN ACAKAN (STOP)" : "ACAK SOAL BARU"}</span>
              </button>
            </div>

            {showVoiceAndBank && (
              <div id="interactive-bank-soal" className="bg-white border-2 border-red-100 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5 animate-[fadeIn_0.3s_ease_out]">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-150 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="bg-red-50 text-red-700 p-2 rounded-xl border border-red-100 shadow-sm">
                      <Bookmark className="w-5 h-5 text-red-650" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-red-950 font-sans tracking-tight">
                        📋 Daftar Bank Soal Pilihan (Sesi Ujian)
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Daftar list soal yang dipilih & ditambahkan. Klik <strong>"Aktifkan ke Layar"</strong> untuk mementaskan soal ke layar 16:9.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Sembunyikan/Tampilkan Toggle */}
                  <button
                    type="button"
                    id="btn-toggle-show-sesi"
                    onClick={() => {
                      const nextVal = !showSesiUjian;
                      setShowSesiUjian(nextVal);
                      try {
                        localStorage.setItem("tashih_show_sesi_ujian", String(nextVal));
                      } catch (e) {
                        console.warn(e);
                      }
                      playSynthesizedTone(nextVal ? 300 : 200, 0.1, "sine");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      showSesiUjian 
                        ? "bg-red-50 text-red-800 border-red-200 hover:bg-red-100" 
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-extrabold animate-pulse"
                    }`}
                    title={showSesiUjian ? "Sembunyikan seluruh modul Bank Soal" : "Tampilkan seluruh modul Bank Soal"}
                  >
                    {showSesiUjian ? <EyeOff className="w-3.5 h-3.5 text-red-650" /> : <Eye className="w-3.5 h-3.5 text-emerald-650" />}
                    <span>{showSesiUjian ? "Sembunyikan Sesi" : "Tampilkan Sesi"}</span>
                  </button>

                  {/* Reset Default Bank Soal */}
                  {showResetConfirm ? (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl animate-fadeIn">
                      <span className="text-[10px] font-bold text-red-950 font-sans">Reset ke Awal?</span>
                      <button
                        type="button"
                        onClick={() => {
                          updateQuestionsPool(fallbackQuestions);
                          syncState({ currentQuestion: fallbackQuestions[0], showAnswer: false });
                          setShowResetConfirm(false);
                          playSynthesizedTone(330, 0.2, "sine");
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-extrabold cursor-pointer transition-all"
                      >
                        Ya
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetConfirm(false);
                          playSynthesizedTone(300, 0.1, "sine");
                        }}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-extrabold cursor-pointer transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetConfirm(true);
                        playSynthesizedTone(280, 0.15, "sine");
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-800 text-gray-600 rounded-xl text-xs font-bold border border-gray-200 hover:border-red-200 transition-all cursor-pointer flex items-center gap-1"
                      title="Setel ulang daftar bank soal ke data bawaan awal"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Default awal</span>
                    </button>
                  )}

                  {/* Clear / Empty Bank Soal */}
                  {showClearConfirm ? (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl animate-fadeIn">
                      <span className="text-[10px] font-bold text-red-950 font-sans">Hapus semua?</span>
                      <button
                        type="button"
                        onClick={() => {
                          updateQuestionsPool([]);
                          syncState({ currentQuestion: null, showAnswer: false });
                          setShowClearConfirm(false);
                          playSynthesizedTone(150, 0.35, "sawtooth");
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-extrabold cursor-pointer transition-all"
                      >
                        Ya
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowClearConfirm(false);
                          playSynthesizedTone(300, 0.1, "sine");
                        }}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-extrabold cursor-pointer transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowClearConfirm(true);
                        playSynthesizedTone(280, 0.15, "sine");
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-800 text-gray-600 rounded-xl text-xs font-bold border border-gray-200 hover:border-red-200 transition-all cursor-pointer flex items-center gap-1"
                      title="Kosongkan seluruh bank soal"
                    >
                      <span>🗑 Kosongkan Bank</span>
                    </button>
                  )}

                  {/* Reset Riwayat Acakan */}
                  {(shownQuestionIdsSambung.length > 0 || shownQuestionIdsTerjamah.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        syncState({
                          shownQuestionIdsSambung: [],
                          shownQuestionIdsTerjamah: []
                        });
                        playSynthesizedTone(330, 0.15, "sine");
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center gap-1"
                      title="Setel ulang riwayat acakan agar semua soal dapat diacak kembali"
                    >
                      <span>🔄 Ulang Riwayat ({shownQuestionIdsSambung.length + shownQuestionIdsTerjamah.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {showSesiUjian && (
                <>
                  {/* SEARCH & FILTERS CONTROLS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-red-50/20 p-3 sm:p-4 rounded-2xl border border-red-100/50">
                
                {/* Search Bar */}
                <div className="md:col-span-6 space-y-1">
                  <label htmlFor="soal-search" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Cari Surat / Kata Kunci:
                  </label>
                  <div className="relative">
                    <input
                      id="soal-search"
                      type="text"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Contoh: Ad-Duha, Al-Ikhlas, atau Juz 30..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button 
                        type="button" 
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-700 text-xs font-bold font-mono"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="md:col-span-6 space-y-1">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Filter Tipe Soal:
                  </span>
                  <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-100">
                    <button
                      type="button"
                      onClick={() => setTypeFilter("all")}
                      className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg tracking-wide transition-all cursor-pointer ${
                        typeFilter === "all" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Semua ({modePool.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter("custom")}
                      className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg tracking-wide transition-all cursor-pointer ${
                        typeFilter === "custom" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Kustom ({modePool.filter(q => q.id.startsWith("custom_") || q.id.startsWith("mushaf-custom-") || q.id.startsWith("gen_dummy_")).length})
                    </button>
                  </div>
                </div>

              </div>

              {/* QUESTIONS LIST WITH PRECISE SOAL & JAWABAN VERSE NUMBERS AND PREVIEW */}
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                
                {modePool.filter((q) => {
                  const matchSearch = q.surahName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                      `juz ${getJuzNumber(q.surahNumber, q.verseStart)}`.includes(searchTerm.toLowerCase());
                  
                  if (typeFilter === "all") return matchSearch;
                  if (typeFilter === "custom") {
                    return matchSearch && (q.id.startsWith("custom_") || q.id.startsWith("mushaf-custom-") || q.id.startsWith("gen_dummy_"));
                  }
                  return matchSearch;
                }).length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Info className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-500">Tidak ada soal yang cocok dengan pencarian Anda.</p>
                    <button
                      onClick={() => { setSearchTerm(""); setTypeFilter("all"); }}
                      className="text-[11px] text-red-600 font-extrabold underline mt-1 cursor-pointer"
                    >
                      Bersihkan Saringan
                    </button>
                  </div>
                ) : (
                  modePool.filter((q) => {
                    const matchSearch = q.surahName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        `juz ${getJuzNumber(q.surahNumber, q.verseStart)}`.includes(searchTerm.toLowerCase());
                    
                    if (typeFilter === "all") return matchSearch;
                    if (typeFilter === "custom") {
                      return matchSearch && (q.id.startsWith("custom_") || q.id.startsWith("mushaf-custom-") || q.id.startsWith("gen_dummy_"));
                    }
                    return matchSearch;
                  }).map((q, index) => {
                    const isCurrentlyActive = currentQuestion?.id === q.id;
                    const isSambungAyat = q.type === QuestionType.SAMBUNG_AYAT;
                    
                    // Question verses range description string
                    const soalVerseText = `Ayat ${q.verseStart}${q.verseEnd > q.verseStart ? ` - ${q.verseEnd}` : ""}`;
                    
                    // Answer verses range description string (for sambung ayat it continues, for tafsir it explains the target verses)
                    const jawabanVerseText = isSambungAyat 
                      ? `Lanjutan Ayat ${q.verseEnd + 1} dst.` 
                      : `Detail Pelajaran / Tafsir Ayat ${q.verseStart}`;

                    return (
                      <div
                        key={q.id}
                        id={`pool-item-${q.id}`}
                        className={`border-2 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#ffffff] hover:shadow-md ${
                          isCurrentlyActive 
                            ? "border-emerald-500 bg-emerald-50/15 ring-2 ring-emerald-500/20" 
                            : "border-red-50 hover:border-red-100"
                        }`}
                      >
                        {/* LEFT SPECIFICATION DETAILS COLUMN */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-md font-extrabold uppercase">
                              JUZ {getJuzNumber(q.surahNumber, q.verseStart)}
                            </span>
                            <span className={`font-sans text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                              isSambungAyat ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                            }`}>
                              {isSambungAyat ? "Sambung Ayat (Isti'naf)" : "Arti & Pemahaman"}
                            </span>
                            {q.id.startsWith("custom_") || q.id.startsWith("mushaf-custom-") ? (
                              <span className="font-sans text-[9px] bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md font-bold uppercase">
                                Kustom Operator
                              </span>
                            ) : null}
                            {isSambungAyat ? (
                              shownQuestionIdsSambung.includes(q.id) && (
                                <span className="font-sans text-[9px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 text-emerald-750" strokeWidth={3} />
                                  Sudah Keluar
                                </span>
                              )
                            ) : (
                              shownQuestionIdsTerjamah.includes(q.id) && (
                                <span className="font-sans text-[9px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold uppercase flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 text-emerald-750" strokeWidth={3} />
                                  Sudah Keluar
                                </span>
                              )
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-extrabold text-gray-900">
                              QS. {q.surahNumber}. {q.surahName}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 font-semibold pt-0.5">
                              <p className="flex items-center gap-1 bg-red-50/50 text-red-950 px-2 py-0.5 rounded border border-red-100/30">
                                📚 Soal: <span className="font-bold text-red-700">{soalVerseText}</span>
                              </p>
                              <p className="flex items-center gap-1 bg-emerald-50 text-emerald-950 px-2 py-0.5 rounded border border-emerald-100/30">
                                🔑 Jawaban: <span className="font-bold text-emerald-700">{jawabanVerseText}</span>
                              </p>
                            </div>
                          </div>

                          {/* PREVIEW ARAB TEXT SNIPPETS FOR CONVENIENCE */}
                          <div className="bg-gray-50/50 px-3 py-2 rounded-xl border border-gray-100 text-right space-y-1 cursor-default">
                            <div className="flex items-center justify-between text-[8px] uppercase tracking-wider text-gray-400 select-none pb-1 border-b border-gray-100">
                              <span>Pratinjau Lembar</span>
                              <span>Arab Quranic Preview</span>
                            </div>
                            <p className="font-arabic text-sm text-red-950 tracking-wider truncate leading-relaxed">
                              {q.questionArabic}
                            </p>
                            <p className="font-arabic text-sm text-emerald-800 tracking-wider font-semibold truncate leading-relaxed pt-0.5">
                              {q.answerArabic}
                            </p>
                          </div>

                        </div>

                        {/* RIGHT ACTION COLUMN */}
                        <div className="flex items-center gap-2 md:flex-col justify-end shrink-0 sm:self-center">
                          {isCurrentlyActive ? (
                            <div className="flex items-center gap-1.5 bg-emerald-500 text-white py-2 px-3.5 rounded-xl font-extrabold text-xs shadow-sm animate-pulse">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                              <span>Sedang Tayang 🎥</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const isTerjamahMode = q.type === QuestionType.ARTI_PEMAHAMAN;
                                const shownIds = isTerjamahMode ? shownQuestionIdsTerjamah : shownQuestionIdsSambung;
                                const nextShownList = shownIds.includes(q.id) ? shownIds : [...shownIds, q.id];
                                syncState({
                                  currentQuestion: q,
                                  showAnswer: false,
                                  [isTerjamahMode ? "shownQuestionIdsTerjamah" : "shownQuestionIdsSambung"]: nextShownList
                                });
                                playSynthesizedTone(523.25, 0.15, "sine"); // high beep
                                
                                // scroll smoothly to mushaf card at the top so it is visible
                                document.getElementById("mushaf-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
                              }}
                              className="py-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition-all shadow hover:shadow-md cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Aktifkan ke Layar</span>
                            </button>
                          )}

                           {deleteConfirmId === q.id ? (
                            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1.5 rounded-xl animate-fadeIn">
                              <span className="text-[10px] font-bold text-red-900 px-1 select-none">Hapus?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuestionsPool(questionsPool.filter((item) => item.id !== q.id));
                                  if (isCurrentlyActive) {
                                    syncState({ currentQuestion: null });
                                  }
                                  // Asynchronously trigger deletion from Google Sheet if Webhook is active
                                  deleteQuestionFromWebhookIfConfigured(q);
                                  
                                  setDeleteConfirmId(null);
                                  playSynthesizedTone(220, 0.25, "sawtooth");
                                }}
                                className="px-2 py-1 bg-red-650 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-extrabold cursor-pointer transition-all"
                              >
                                Ya
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(null);
                                  playSynthesizedTone(300, 0.1, "sine");
                                }}
                                className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-extrabold cursor-pointer transition-all"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(q.id);
                                playSynthesizedTone(250, 0.15, "sine");
                              }}
                              className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                              title="Hapus Soal"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a1 1 0 001 1h3m-10 0H5" />
                              </svg>
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}

              </div>
            </>
          )}
        </div>
      )}

    {/* Mic Control Widget - Persistent and always active on Layar Utama */}
    <MicControl
      onBismillahDetected={handleStartSpin}
      onStopDetected={handleStopSpin}
      isSpinning={isSpinning}
      isMicActive={isMicActive}
      onToggleMicActive={(val) => {
        syncState({ isMicActive: val });
        if (val) setMicError("");
      }}
      isReadingDetectionEnabled={isReadingDetectionEnabled}
      onToggleReadingDetection={(val) => syncState({ isReadingDetectionEnabled: val })}
      targetAnswerArabic={currentQuestion?.answerArabic || ""}
      targetAnswerTranslation={currentQuestion?.answerTranslation || ""}
      onReadingMatched={handleReadingMatched}
      micError={micError}
      onSetMicError={setMicError}
    />

    {/* Elegant toggler for Voice control & Bank Soal */}
    <div id="wrapper-toggle-control" className="flex justify-center pt-3 pb-6 select-none">
      <button
        type="button"
        id="btn-toggle-voice-bank"
        onClick={() => setShowVoiceAndBank(!showVoiceAndBank)}
        className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-400 hover:text-red-650 hover:text-red-600 rounded-full text-[10px] sm:text-xs font-bold shadow-sm flex items-center gap-1.5 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-red-150"
        title="Sembunyikan atau Tampilkan Fitur Kontrol Suara (Mic) & Daftar Sesi Bank Soal"
      >
        <Sliders className={`w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-transform duration-300 ${showVoiceAndBank ? "rotate-90" : ""}`} />
        <span className="text-[10px] text-gray-400 group-hover:text-gray-500 transition-colors font-medium">
          {showVoiceAndBank ? "Sembunyikan Panel Kontrol" : "Tampilkan Panel Kontrol"}
        </span>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
        </span>
      </button>
    </div>

              </>
            )}

  </div>
)}

    {/* TAB 2: PENGATURAN SOAL (OPERATOR INTERFACE) */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeIn_0.2s_ease_out]">
            
            {/* Saring block info */}
            <div className="md:col-span-4 space-y-6">
              
              <div className="bg-red-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="bg-white/10 p-2 rounded-xl inline-block mb-3">
                    <Award className="w-6 h-6 text-yellow-300" />
                  </div>
                  <h3 className="text-lg font-bold font-serif text-yellow-300">Panduan Penguji</h3>
                  <p className="text-xs text-red-100 leading-relaxed mt-2">
                    Sebagai operator penguji, Anda dapat mengubah parameter soal di sini tanpa mengganggu kenyamanan kandidat/santri yang menatap layar proyektor utama di panggung.
                  </p>
                  <p className="text-xs text-red-200 mt-2">
                    Ubah target surat dan ayat secara bebas, lalu klik "Acak Soal" atau lafalkan "Bismillah" untuk mulai melempar acakan ke panggung.
                  </p>
                </div>

                <div className="bg-red-950/50 p-3 rounded-xl border border-red-700/50 text-[11px] text-red-200">
                  <p className="font-bold text-white mb-1">Membuka Kunci Jawaban:</p>
                  Gunakan tab "Layar Utama" untuk mencocokkan kelanjutan ayat atau detail pemahaman tafsir setelah santri menyampaikan jawaban lisan.
                </div>
              </div>

              {/* QUICK ACCESSIBLE MUSHAF TRIGGER ON SETTINGS AS WELL */}
              <div className="bg-white border border-amber-500/10 p-4 rounded-xl shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-gray-900 block font-sans">Alat Bantu Penguji:</h4>
                <button
                  onClick={() => setIsMushafOpen(true)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  Tinjau Semua Mushaf Surat {selectedSurahMeta.name}
                </button>
              </div>

            </div>

            {/* Config panel and Manual Question Creator */}
            <div className="md:col-span-8 space-y-6">
              
              {/* Core Saring Config card */}
              <QuestionsConfig
                config={config}
                onChangeConfig={handleUpdateConfig}
                onManualRandomize={isSpinning ? handleStopSpin : handleStartSpin}
                isGenerating={isGenerating}
                isOfflineMode={isOfflineMode}
              />

              {/* BRAND NEW: TAMBAHKAN SOAL MANUAL FORM */}
              <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-5 space-y-4">
                
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="p-2 bg-red-50 text-red-700 rounded-lg">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-red-950 text-sm sm:text-base font-sans">
                      Input & Tambah Soal Manual Kustom
                    </h2>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Buat pertanyaan Anda sendiri dan sajikan langsung di layar utama
                    </p>
                  </div>
                </div>

                <form onSubmit={handleApplyCustomQuestion} className="space-y-4">
                  
                  {/* Segmented type switcher between Sambung Ayat and Tarjamah */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Kategori Soal Kustom:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl">
                      <button
                        type="button"
                        id="tab-custom-type-sambung"
                        onClick={() => {
                          setCustomQType(QuestionType.SAMBUNG_AYAT);
                          setCustomQPrompt("Lanjutkan potongan ayat suci berikut:");
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          customQType === QuestionType.SAMBUNG_AYAT
                            ? "bg-red-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Sambung Ayat
                      </button>
                      <button
                        type="button"
                        id="tab-custom-type-terjamah"
                        onClick={() => {
                          setCustomQType(QuestionType.ARTI_PEMAHAMAN);
                          setCustomQPrompt("Sebutkan terjemahan atau makna ayat suci Al-Quran berikut:");
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          customQType === QuestionType.ARTI_PEMAHAMAN
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Terjamah Al Quran
                      </button>
                    </div>
                  </div>
                  
                  {/* Surah and Verse pickers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="custom-surah-pick" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Compass className="w-3 h-3 text-red-650" /> Sura Soal:
                      </label>
                      <select
                        id="custom-surah-pick"
                        value={customSurah}
                        onChange={(e) => setCustomSurah(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-semibold"
                      >
                        {quranSurahs.map(s => (
                          <option key={s.number} value={s.number}>
                            QS. {s.number}. {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="custom-verse-pick" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <Hash className="w-3 h-3 text-red-650" /> Nomor Ayat:
                      </label>
                      <input
                        id="custom-verse-pick"
                        type="number"
                        min={1}
                        value={customVerse}
                        onChange={(e) => setCustomVerse(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Prompt instruction text (e.g. "Lanjutkan potongan ayat...") */}
                  <div className="space-y-1">
                    <label htmlFor="custom-prompt-input" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Instruksi Soal (Petunjuk):
                    </label>
                    <input
                      id="custom-prompt-input"
                      type="text"
                      placeholder="Contoh: Lanjutkan potongan ayat suci berikut:"
                      value={customQPrompt}
                      onChange={(e) => setCustomQPrompt(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>

                  {/* Question Arabic Text */}
                  <div className="space-y-1">
                    <label htmlFor="custom-q-arabic" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Teks Arab Soal (Potongan Ayat Pertama) *wajib:
                    </label>
                    <textarea
                      id="custom-q-arabic"
                      dir="rtl"
                      rows={2}
                      placeholder="Masukkan ayat Al-Quran dengan harakat di sini..."
                      value={customQArabic}
                      onChange={(e) => setCustomQArabic(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-right font-arabic text-lg sm:text-xl text-red-950 font-medium tracking-wide focus:ring-1 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  {/* Question Translation */}
                  <div className="space-y-1">
                    <label htmlFor="custom-q-translation" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Terjemahan Soal (Indonesia):
                    </label>
                    <input
                      id="custom-q-translation"
                      type="text"
                      placeholder="Masukkan arti ayat soal..."
                      value={customQTrans}
                      onChange={(e) => setCustomQTrans(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>

                  {/* Answer Arabic Text */}
                  <div className="space-y-1">
                    <label htmlFor="custom-a-arabic" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Teks Arab Jawaban (Kelanjutan Ayat Benar) *wajib:
                    </label>
                    <textarea
                      id="custom-a-arabic"
                      dir="rtl"
                      rows={2}
                      placeholder="Masukkan sambungan ayat yang benar..."
                      value={customAArabic}
                      onChange={(e) => setCustomAArabic(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-right font-arabic text-lg sm:text-xl text-red-900 font-bold tracking-wide focus:ring-1 focus:ring-red-600 focus:outline-none"
                    />
                  </div>

                  {/* Answer Translation */}
                  <div className="space-y-1">
                    <label htmlFor="custom-a-translation" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Terjemahan Jawaban / Keterangan Kunci:
                    </label>
                    <input
                      id="custom-a-translation"
                      type="text"
                      placeholder="Arti kelanjutan ayat..."
                      value={customATrans}
                      onChange={(e) => setCustomATrans(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Bawa & Tampilkan Soal Manual Ini ke Layar Utama
                  </button>

                </form>

              </div>
                   {/* BRAND NEW: GOOGLE SHEETS SYNC SYSTEM & BACKUPS */}
              <div id="gsheets-sync-card" className="bg-white border text-left border-amber-200 rounded-2xl shadow-sm p-5 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 pointer-events-none opacity-40" />
                
                <div className="flex items-start gap-3">
                  <div className="bg-amber-50 text-amber-950 p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                    <Database className="w-5 h-5 text-amber-700 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 text-sm sm:text-base font-sans leading-none pb-1">
                      Pemisahan Database Google Sheets & Webhook
                    </h3>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Kelola draf bank soal secara terpisah untuk Program Sambung Ayat dan Program Tarjamah. Masing-masing dilengkapi penarikan spreadsheet mandiri & webhook autosave.
                    </p>
                  </div>
                </div>

                {/* Tab Switcher for Sambung Ayat vs. Tarjamah Database Setup */}
                <div className="grid grid-cols-2 p-1 bg-amber-50 border border-amber-100 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSyncConfigTab("sambung_ayat");
                      setSheetSyncStatus("idle");
                      setSheetParsedQuestions(null);
                    }}
                    className={`py-2 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      syncConfigTab === "sambung_ayat"
                        ? "bg-amber-600 text-white shadow-sm font-bold"
                        : "text-amber-900 hover:bg-amber-100/50"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Sambung Ayat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSyncConfigTab("terjamah");
                      setSheetSyncStatus("idle");
                      setSheetParsedQuestions(null);
                    }}
                    className={`py-2 text-xs font-extrabold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      syncConfigTab === "terjamah"
                        ? "bg-amber-600 text-white shadow-sm font-bold"
                        : "text-amber-900 hover:bg-amber-100/50"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Tarjamah
                  </button>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Google Sheets Sync Box */}
                  <div className="bg-amber-50/10 border border-amber-100/50 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1 font-sans">
                        <FileText className="w-4 h-4 text-amber-700" />
                        Tarik Soal Google Sheets ({syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"})
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadTemplateCSV}
                        className="text-[10px] bg-white border border-amber-200 hover:bg-amber-50 text-amber-800 px-2 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Unduh Template CSV
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                        1. Buat Google Sheet baru dengan kolom-kolom persis di template.<br />
                        2. Bagikan sheet (Klik <strong>Bagikan</strong> &rarr; Ganti akses ke <strong>Siapa saja yang memiliki link dapat melihat sebagai Viewer</strong>).<br />
                        3. Tempel link Google Sheet {syncConfigTab === "sambung_ayat" ? "KHUSUS untuk bank soal Sambung Ayat" : "KHUSUS untuk bank soal Tarjamah Al-Quran"} di bawah.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                          value={syncConfigTab === "sambung_ayat" ? sheetUrlSambungInput : sheetUrlTerjamahInput}
                          onChange={(e) => {
                            if (syncConfigTab === "sambung_ayat") {
                              setSheetUrlSambungInput(e.target.value);
                            } else {
                              setSheetUrlTerjamahInput(e.target.value);
                            }
                          }}
                          className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-800 placeholder-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleFetchGoogleSheet}
                          disabled={sheetSyncStatus === "loading"}
                          className={`px-4 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0 ${
                            sheetSyncStatus === "loading"
                              ? "bg-amber-100 text-amber-400 cursor-not-allowed"
                              : "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                          }`}
                        >
                          {sheetSyncStatus === "loading" ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span>Tarik Soal</span>
                        </button>
                      </div>
                    </div>

                    {/* Active Synced Sheet Badge */}
                    {googleSheetsUrl && (
                      <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg flex items-center justify-between text-xs text-emerald-950">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          <span className="font-bold text-[10px] font-sans">Koneksi Aktif ({syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"})</span>
                        </div>
                        <span className="text-[10px] font-mono select-all truncate max-w-[150px] sm:max-w-[280px] text-emerald-800 text-right">
                          {googleSheetsUrl}
                        </span>
                      </div>
                    )}

                    {sheetSyncStatus === "error" && (
                      <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-[10px] text-red-800 font-medium">
                        {sheetSyncError}
                      </div>
                    )}

                    {sheetSyncStatus === "success" && sheetParsedQuestions && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-2.5 animate-fadeIn">
                        <div className="text-xs text-amber-950 font-bold flex items-center gap-1 font-sans">
                          <span className="px-1.5 py-0.5 bg-amber-200 rounded text-[10px]">{sheetParsedQuestions.length}</span>
                          <span>Soal Valid Ditemukan!</span>
                        </div>
                        <p className="text-[10px] text-amber-900 font-medium font-sans">
                          Soal di atas akan disimpan ke bank soal kategori <strong>{syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"}</strong> Anda. Soal kategori lain tidak akan terganggu.
                        </p>
                        <button
                          type="button"
                          onClick={handleApplyGoogleSheetSync}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          Konfirmasi & Simpan ke Bank Soal
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Google Sheets Webhook Autosave Box */}
                  <div className="bg-amber-50/10 border border-amber-100/50 p-4 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1 font-sans">
                      <Database className="w-4 h-4 text-amber-700" />
                      Simpan Otomatis Soal Baru ({syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"})
                    </span>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                      Simpan instan setiap soal manual {syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"} yang Anda buat langsung ke baris Google Sheet Anda! Masukkan URL Web App Google Apps Script Anda di bawah:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={syncConfigTab === "sambung_ayat" ? webhookUrlSambungInput : webhookUrlTerjamahInput}
                        onChange={(e) => {
                          if (syncConfigTab === "sambung_ayat") {
                            setWebhookUrlSambungInput(e.target.value);
                          } else {
                            setWebhookUrlTerjamahInput(e.target.value);
                          }
                        }}
                        className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 text-gray-800 placeholder-gray-300"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const val = syncConfigTab === "sambung_ayat" ? webhookUrlSambungInput : webhookUrlTerjamahInput;
                          if (!val.trim()) {
                            alert("Harap isi URL salinan Web App Apps Script!");
                            return;
                          }
                          if (syncConfigTab === "sambung_ayat") {
                            await syncState({ googleSheetsWebhookUrlSambung: val.trim() });
                          } else {
                            await syncState({ googleSheetsWebhookUrlTerjamah: val.trim() });
                          }
                          alert(`Sukses menyimpan konfigurasi webhook penyimpanan Google Sheets (${syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"})!`);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-all shrink-0"
                      >
                        Simpan Webhook
                      </button>
                    </div>
                    {googleSheetsWebhookUrl && (
                      <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-emerald-950">
                          <span className="font-bold text-[10px] text-emerald-900 font-sans flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Autosave Aktif ({syncConfigTab === "sambung_ayat" ? "Sambung Ayat" : "Tarjamah"})
                          </span>
                          {isSendingToWebhook && (
                            <span className="text-[10px] text-amber-700 animate-pulse font-bold font-sans">
                              Mengirim data ke Sheet...
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-emerald-800 font-medium font-mono select-all truncate">
                          {googleSheetsWebhookUrl}
                        </p>
                      </div>
                    )}
                    {/* Collapsible Apps Script Code Section */}
                    <div className="bg-gray-50 border border-gray-150 p-2.5 rounded-lg">
                      <details className="group">
                        <summary className="text-[10px] font-bold text-gray-700 cursor-pointer list-none flex items-center justify-between font-sans">
                          <span>Salin Kode Google Apps Script (Klik untuk melihat)</span>
                          <span className="transition group-open:rotate-180 text-gray-500">▼</span>
                        </summary>
                        <div className="mt-2 text-[9px] text-gray-600 space-y-1.5 font-mono select-all bg-white border p-2 rounded max-h-48 overflow-y-auto leading-relaxed">
                          <p className="font-bold text-gray-800 pb-1 font-sans">1. Buka Google Sheet &rarr; Ekstensi &rarr; Apps Script<br />2. Hapus semua kode bawaan, lalu paste kode berikut:<br />3. Klik Deploy &rarr; New Deployment &rarr; Choose type: Web app &rarr; Execute as: Me &rarr; Who has access: Anyone<br />4. Klik Deploy &rarr; Izinkan Akses &rarr; Salin URL Web App dan tempel di atas.</p>
                          <hr className="my-1 border-gray-100" />
                          <pre>{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    var lastRow = sheet.getLastRow();
    
    // Auto-initialize standard headers if empty
    if (lastRow === 0) {
      sheet.appendRow([
        "ID", "Nomor_Surat", "Nama_Surat", "Nomor_Ayat", "Akhir_Ayat",
        "Tipe_Soal", "Deskripsi_Soal", "Teks_Soal_Arab", "Terjemahan_Soal",
        "Teks_Jawaban_Arab", "Terjemahan_Jawaban", "Keterangan", "Juz", "Halaman"
      ]);
      lastRow = 1;
    }
    
    var lastCol = Math.max(1, sheet.getLastColumn());
    var headersRange = sheet.getRange(1, 1, 1, lastCol);
    var headers = headersRange.getValues()[0];
    
    // Normalize headers helper function
    function normalize(str) {
      if (!str) return "";
      return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
    }
    
    var normalizedHeaders = headers.map(normalize);
    
    // Mapping keys and synonyms from the payload
    var synonymMap = {
      id: ["id", "no", "nomor"],
      surahNumber: ["surahnumber", "nomorsurat", "nosurat", "surah", "surat", "idsurat", "no", "idsura", "surahnomer"],
      surahName: ["surahname", "namasurat", "nama", "namasura"],
      verseStart: ["versestart", "mulaiayat", "ayatstart", "ayatmulai", "noayat", "nomorayat", "mulai", "ayat"],
      verseEnd: ["verseend", "akhirayat", "ayatend", "ayatakhir", "akhir"],
      type: ["type", "tipesoal", "jenis", "tipe", "model", "kategori", "tipesoalujian", "kategorisoal", "jenissoal"],
      questionPrompt: ["questionprompt", "instruksisoal", "prompt", "petunjuk", "instruksi", "soalinstruksi", "deskripsisoal"],
      questionArabic: ["questionarabic", "tekssoalarab", "teksarabsoal", "soalarab", "arabsoal", "soal", "teksarabsoal", "potonganayat", "ayatsoal", "arab", "teksarab", "soalarab", "soalteksarab", "soaltulis"],
      questionTranslation: ["questiontranslation", "terjemahansoal", "artisoal", "terjemah", "artipotongan", "artisoaltulis"],
      answerArabic: ["answerarabic", "teksjawabanarab", "jawabanarab", "arabjawaban", "jawaban", "kunciarab", "kunci", "teksarabjawaban", "sambunganayat", "jawabanayat", "jawabantulis", "teksjawaban", "kuncijawaban", "kuncijawabanarab", "arabkunci"],
      answerTranslation: ["answertranslation", "terjemahanjawaban", "artijawaban", "artikunci", "artisambungan", "artijawabanarab"],
      explanation: ["explanation", "penjelasan", "kandungan", "detail", "hikmah", "penjelasanhikmah", "tafsir", "info", "keterangan"],
      juzNumber: ["juz", "juznumber", "nomorjuz", "nojuz", "juzke"],
      mushafPage: ["page", "halaman", "mushafpage", "halamanmushaf", "no_halaman"]
    };

    var action = data.action || "insert";

    if (action === "delete") {
      // Deletion action
      var targetId = data.id;
      var targetArabic = data.questionArabic;
      var deletedCount = 0;
      
      // Let's look for matching row from bottom to top so row indexing remains correct
      var dataRange = sheet.getRange(2, 1, Math.max(1, lastRow - 1), lastCol);
      var rows = dataRange.getValues();
      
      // Column index of id and questionArabic
      var idColIdx = -1;
      var arabicColIdx = -1;
      for (var j = 0; j < normalizedHeaders.length; j++) {
        var nh = normalizedHeaders[j];
        if (synonymMap.id.indexOf(nh) !== -1) idColIdx = j;
        if (synonymMap.questionArabic.indexOf(nh) !== -1) arabicColIdx = j;
      }
      
      for (var r = rows.length - 1; r >= 0; r--) {
        var rowNum = r + 2; // Row numbers are 1-based and we started from row 2
        var currentRow = rows[r];
        
        var matches = false;
        // Match by ID first
        if (targetId && idColIdx !== -1 && String(currentRow[idColIdx]).trim() === String(targetId).trim()) {
          matches = true;
        }
        // Fallback: match by Arabic text (since ID column might not exist or be empty)
        if (!matches && targetArabic && arabicColIdx !== -1) {
          var cleanRowArabic = String(currentRow[arabicColIdx]).trim().replace(/\\s+/g, " ");
          var cleanTargetArabic = String(targetArabic).trim().replace(/\\s+/g, " ");
          if (cleanRowArabic === cleanTargetArabic && cleanTargetArabic !== "") {
            matches = true;
          }
        }
        
        if (matches) {
          sheet.deleteRow(rowNum);
          deletedCount++;
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        action: "delete",
        deletedCount: deletedCount 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Otherwise "insert" or "update" action
    // Prepare a row array filled with empty strings
    var newRowValues = [];
    for (var i = 0; i < lastCol; i++) {
      newRowValues.push("");
    }
    
    // For each payload key, find its value
    for (var key in synonymMap) {
      var synonyms = synonymMap[key];
      // Get the value sent in JSON (try camelcase first, then properties)
      var val = data[key];
      if (val === undefined || val === null) {
        // Find if any synonym was passed directly in raw payload
        for (var s = 0; s < synonyms.length; s++) {
          var syn = synonyms[s];
          if (data[syn] !== undefined && data[syn] !== null) {
            val = data[syn];
            break;
          }
        }
      }
      
      if (val !== undefined && val !== null) {
        // Find which column matches this key's synonyms
        var bestIndex = -1;
        for (var c = 0; c < normalizedHeaders.length; c++) {
          var header = normalizedHeaders[c];
          if (synonyms.indexOf(header) !== -1) {
            bestIndex = c;
            break;
          }
        }
        
        if (bestIndex !== -1) {
          newRowValues[bestIndex] = val;
        }
      }
    }
    
    // Append the dynamically mapped row
    sheet.appendRow(newRowValues);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      action: "insert" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Local Backups Box */}
                  <div className="border border-gray-150 p-3.5 rounded-lg space-y-3 bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1 font-sans">
                      <Download className="w-4 h-4 text-gray-500" />
                      Ekspor & Impor File Cadangan Lokal
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                      {/* Export Button */}
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className="py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-4 h-4 text-blue-500" />
                        Unduh Backup (.JSON)
                      </button>

                      {/* Import Label/Button */}
                      <label className="py-2.5 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center">
                        <Download className="w-4 h-4 text-emerald-500" />
                        <span>Unggah File (.JSON / .CSV)</span>
                        <input
                          type="file"
                          accept=".json,.csv,.txt"
                          onChange={handleLoadLocalFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* MENU TABS - "tidak tampak jelas misal icon kecil putih dengan sedikt aksen merah" */}
      {(showVoiceAndBank || activeTab === "settings") && (
        <div className="flex items-center justify-center gap-3 mt-10 mb-8 select-none">
          <button
            id="btn-tab-display-bot"
            onClick={() => setActiveTab("display")}
            className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm border ${
              activeTab === "display"
                ? "bg-white text-gray-800 border-red-500 shadow-red-100/50"
                : "bg-white text-gray-400 hover:text-gray-600 border-gray-150"
            }`}
            title="Layar Utama Mushaf"
          >
            <BookOpen className={`w-3.5 h-3.5 transition-colors duration-200 ${activeTab === "display" ? "text-red-500" : "text-gray-400"}`} />
            <span>Layar Utama</span>
            {activeTab === "display" && (
              <span className="w-1 h-1 rounded-full bg-red-500" />
            )}
          </button>

          <button
            id="btn-tab-settings-bot"
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-sm border ${
              activeTab === "settings"
                ? "bg-white text-gray-800 border-red-500 shadow-red-100/50"
                : "bg-white text-gray-400 hover:text-gray-600 border-gray-150"
            }`}
            title="Atur & Tambah Soal"
          >
            <Sliders className={`w-3.5 h-3.5 transition-colors duration-200 ${activeTab === "settings" ? "text-red-500" : "text-gray-400"}`} />
            <span>Atur & Soal</span>
            {activeTab === "settings" && (
              <span className="w-1 h-1 rounded-full bg-red-500" />
            )}
          </button>
        </div>
      )}

      {isMushafOpen && activeTab !== "display" && (
        <MushafModal
          isOpen={isMushafOpen}
          onClose={() => setIsMushafOpen(false)}
          initialSurahNumber={currentQuestion?.surahNumber || config?.selectedSurah || 1}
          highlightStart={currentQuestion?.verseStart || 1}
          highlightEnd={currentQuestion?.verseEnd || 1}
          onAddAsCustomQuestion={(verseDetail) => {
            // 1. Populate custom form states so operator can see/edit them!
            setCustomSurah(verseDetail.surahNumber);
            setCustomVerse(verseDetail.nomorAyat);
            setCustomQArabic(verseDetail.teksArab);
            setCustomQTrans(verseDetail.teksIndonesia);
            
            if (verseDetail.nextTeksArab) {
              setCustomAArabic(verseDetail.nextTeksArab);
              setCustomATrans(verseDetail.nextTeksIndonesia);
              setCustomQPrompt("Lanjutkan sambungan potongan ayat suci berikut dengan lancar:");
            } else {
              setCustomAArabic("Shadaqallahul adziim.");
              setCustomATrans("Maha benar Allah dengan segala firman-Nya.");
              setCustomQPrompt("Sebutkan hikmah penting dari akhir surah ini:");
            }
            setCustomExplain(`Soal kustom dari mushaf Al-Quran surat ${verseDetail.surahName} ayat ${verseDetail.nomorAyat}.`);

            // 2. Automatically package it as the active question so they can test it instantly!
            const generatedQuestion: Question = {
              id: `mushaf-custom-${Date.now()}`,
              surahNumber: verseDetail.surahNumber,
              surahName: verseDetail.surahName,
              verseStart: verseDetail.nomorAyat,
              verseEnd: verseDetail.nomorAyat,
              questionArabic: verseDetail.teksArab,
              questionTranslation: verseDetail.teksIndonesia,
              questionPrompt: verseDetail.nextTeksArab ? "Lanjutkan potongan ayat suci berikut dengan lancar:" : "Sebutkan pelajaran penting dari ayat terakhir berikut:",
              answerArabic: verseDetail.nextTeksArab || "Shadaqallahul adziim.",
              answerTranslation: verseDetail.nextTeksIndonesia || "Selesai akhir surah.",
              explanation: `Ujian hafalan kustom dari Mushaf interaktif surat ${verseDetail.surahName} ayat ${verseDetail.nomorAyat}. Dilengkapi analisis tajwid & maqra otomatis.`,
              juzNumber: getJuzNumber(verseDetail.surahNumber, verseDetail.nomorAyat),
              mushafPage: Math.floor(Math.random() * 604) + 1,
              type: QuestionType.SAMBUNG_AYAT
            };

            // Update current question
            updateQuestionsPool([generatedQuestion, ...questionsPool]);
            syncState({ currentQuestion: generatedQuestion, showAnswer: false });

            // Save to Google Sheet Webhook if configured
            saveQuestionToWebhookIfConfigured(generatedQuestion);

            // Close modal
            setIsMushafOpen(false);

            // Play confirm sound
            playSynthesizedTone(523.25, 0.3, "sine"); // C5 sound
          }}
        />
      )}

      {/* Decorative Traditional Footer Credits in Red & White */}
      <footer className="mt-20 border-t border-gray-200 py-8 text-center text-xs text-gray-500 space-y-2.5">
        <p className="font-extrabold text-red-800">TASHIH TAHFIDZ RANDOMIZER v1.2.0</p>
        <p className="max-w-xl mx-auto text-[11px] leading-relaxed text-gray-400 select-none">
          Dirancang dengan format visual tinggi sesuai standar Musabaqah Hifzhil Quran nasional Republik Indonesia. Menghadirkan asisten kecerdasan buatan server-side yang andal.
        </p>
      </footer>

    </div>
  );
}
