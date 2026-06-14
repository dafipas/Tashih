/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum QuestionType {
  SAMBUNG_AYAT = "sambung_ayat",
  ARTI_PEMAHAMAN = "arti_pemahaman",
  RANDOM = "random"
}

export interface Surah {
  number: number;
  name: string;
  arabic: string;
  totalVerses: number;
  revelation: "Makkiyah" | "Madaniyah";
}

export interface Question {
  id: string;
  surahNumber: number;
  surahName: string;
  verseStart: number;
  verseEnd: number;
  type: QuestionType;
  questionArabic: string; // The cue verse(s) in Arabic
  questionTranslation: string; // The Indonesian translation/meaning of the cue
  questionPrompt: string; // Dynamic instructions like "Lanjutkan ayat berikut..." or "Sebutkan arti & kandungan makna..."
  answerArabic: string; // The correct continuation or answers
  answerTranslation: string; // The correct translation explanation or answers
  explanation: string; // Brief theological background or context
  juzNumber: number;
  mushafPage: number;
}

export interface QuizConfig {
  selectedSurah: number; // 0 for all Surahs, otherwise 1-114
  startVerse: number;
  endVerse: number;
  questionType: QuestionType;
  showOverlayAnswer: boolean;
  spinDuration?: number;
  revealDelay?: number;
}
