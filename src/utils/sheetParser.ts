/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, QuestionType } from "../types";
import { quranSurahs, getJuzNumber } from "../data";

/**
 * Parses raw CSV content (supports both comma ',' and semicolon ';' delimiters)
 * and handles quotes correctly.
 */
export function parseCSV(text: string): Record<string, string>[] {
  if (!text) return [];

  // Strips UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.substring(1);
  }

  // Detect delimiter based on occurrence frequency in the first 3 lines
  const sampleLines = text.split(/\r?\n/).slice(0, 3);
  let commaCount = 0;
  let semicolonCount = 0;
  sampleLines.forEach((line) => {
    commaCount += (line.match(/,/g) || []).length;
    semicolonCount += (line.match(/;/g) || []).length;
  });
  const delimiter = semicolonCount > commaCount ? ";" : ",";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentToken = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentToken += '"';
        i++; // Skip the double-escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentToken.trim());
      currentToken = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentToken.trim());
      rows.push(currentRow);
      currentRow = [];
      currentToken = "";
    } else {
      currentToken += char;
    }
  }

  if (currentRow.length > 0 || currentToken !== "") {
    currentRow.push(currentToken.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  // Decode and clean headers: Strip ALL non-alphanumeric characters to handle parentheses like "(Arab)" or spaces/underscores.
  const headers = rows[0].map((h) =>
    h
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
  );

  const parsedRecords: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const lineCols = rows[i];
    // Skip empty rows
    if (lineCols.length === 0 || (lineCols.length === 1 && lineCols[0] === "")) {
      continue;
    }

    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (header) {
        record[header] = lineCols[idx] !== undefined ? lineCols[idx].trim() : "";
      }
    });
    parsedRecords.push(record);
  }

  return parsedRecords;
}

/**
 * Maps a single parsed flat record from Google Sheets/CSV to the strict `Question` type.
 * Uses adaptive header matching supporting English and Indonesian alternatives.
 */
export function mapRecordToQuestion(
  row: Record<string, string>,
  index: number,
  prefix: string = "sheet"
): Question | null {
  const getVal = (candidates: string[]): string => {
    for (const key of candidates) {
      if (row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
    return "";
  };

  const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Parse Surah Name
  let surahName = getVal(["surahname", "namasurat", "nama", "namasura", "namasurat"]) || "";

  // 2. Parse Surah Number
  const sNumStr = getVal([
    "surahnumber",
    "nomorsurat",
    "nosurat",
    "surah",
    "surat",
    "idsurat",
    "no",
    "idsura"
  ]);
  
  let surahNumber = Number(sNumStr);

  // If Surah Number is empty/NaN, but Surah Name exists, try to look up the number!
  if ((isNaN(surahNumber) || !surahNumber) && surahName) {
    const normName = normalizeString(surahName);
    const foundSura = quranSurahs.find(
      s => normalizeString(s.name) === normName || normalizeString(s.arabic) === normName
    );
    if (foundSura) {
      surahNumber = foundSura.number;
    } else {
      // Try partial match
      const foundSuraPartial = quranSurahs.find(
        s => normalizeString(s.name).includes(normName) || normName.includes(normalizeString(s.name))
      );
      if (foundSuraPartial) {
        surahNumber = foundSuraPartial.number;
      } else {
        surahNumber = 1; // fallback
      }
    }
  }

  if (isNaN(surahNumber) || !surahNumber) {
    surahNumber = 1;
  }

  // Ensure clean, correct surah name spelling from the database list matching the ID
  const correctSurah = quranSurahs.find(s => s.number === surahNumber);
  if (correctSurah) {
    surahName = correctSurah.name;
  } else if (!surahName) {
    surahName = "Al-Fatihah";
  }

  // 3. Parse Verses boundary
  const vStartStr = getVal([
    "versestart",
    "mulaiayat",
    "ayatstart",
    "ayatmulai",
    "noayat",
    "nomorayat",
    "mulai"
  ]);
  const verseStart = Number(vStartStr) || 1;

  const vEndStr = getVal([
    "verseend",
    "akhirayat",
    "ayatend",
    "ayatakhir",
    "akhir"
  ]);
  const verseEnd = Number(vEndStr) || verseStart;

  // 4. Parse Question Type (Sambung Ayat vs Arti Pemahaman)
  const rawType = getVal([
    "type",
    "tipesoal",
    "jenis",
    "tipe",
    "model",
    "kategori",
    "tipesoalujian",
    "kategorisoal"
  ]).toLowerCase();

  let type = QuestionType.SAMBUNG_AYAT;
  if (
    rawType.includes("arti") ||
    rawType.includes("tafsir") ||
    rawType.includes("pemahaman") ||
    rawType.includes("meaning") ||
    rawType.includes("makna") ||
    rawType.includes("comprehension") ||
    rawType.includes("paham")
  ) {
    type = QuestionType.ARTI_PEMAHAMAN;
  }

  // 5. Parse Text Arabic Soal
  const questionArabic = getVal([
    "questionarabic",
    "tekssoalarab",
    "soalarab",
    "arabsoal",
    "soal",
    "teksarabsoal",
    "potonganayat",
    "ayatsoal",
    "arab",
    "teksarab",
    "soalarab",
    "soalteksarab",
    "soaltulis"
  ]);
  if (!questionArabic) {
    return null; // A question cannot exist without its starting Arabic reference
  }

  // 6. Parse Text Arabic Kunci Jawaban
  const answerArabic = getVal([
    "answerarabic",
    "teksjawabanarab",
    "jawabanarab",
    "arabjawaban",
    "jawaban",
    "kunciarab",
    "kunci",
    "teksarabjawaban",
    "sambunganayat",
    "jawabanayat",
    "jawabantulis",
    "teksjawaban",
    "kuncijawaban",
    "kuncijawabanarab",
    "arabkunci"
  ]);
  if (!answerArabic) {
    return null; // A question cannot exist without its target continuation/answer Arabic reference
  }

  // 7. Parse auxiliary fields
  const questionPrompt =
    getVal(["questionprompt", "instruksisoal", "prompt", "petunjuk", "instruksi", "soalinstruksi", "deskripsisoal"]) ||
    (type === QuestionType.SAMBUNG_AYAT
      ? "Lanjutkan potongan ayat suci berikut dengan lancar & tepat:"
      : "Sebutkan arti, kandungan makna, serta pemahaman penting dari ayat di atas:");

  const questionTranslation =
    getVal(["questiontranslation", "terjemahansoal", "artisoal", "terjemah", "terjemahan", "artipotongan", "artisoaltulis"]) ||
    `Potongan ayat Al-Quran kustom Surat ${surahName} ayat ${verseStart}`;

  const answerTranslation =
    getVal(["answertranslation", "terjemahanjawaban", "artijawaban", "artikunci", "artisambungan", "terjemahan", "terjemah"]) ||
    `Terjemahan dari Surat ${surahName} ayat ${verseEnd}`;

  const explanation =
    getVal(["explanation", "penjelasan", "kandungan", "detail", "hikmah", "penjelasanhikmah", "tafsir", "info", "keterangan", "keterangantafsir"]) ||
    "";

  // 8. Auto-calculate physical dimensions if missing
  const juzStr = getVal(["juz", "juznumber", "nomorjuz", "nojuz", "juzke"]);
  const juzNumber = Number(juzStr) || getJuzNumber(surahNumber, verseStart);

  const pgStr = getVal(["page", "halaman", "mushafpage", "halamanmushaf", "no_halaman"]);
  const mushafPage = Number(pgStr) || Math.floor(Math.random() * 600) + 1;

  return {
    id: `${prefix}_${Date.now()}_${index}`,
    surahNumber,
    surahName,
    verseStart,
    verseEnd,
    type,
    questionPrompt,
    questionArabic,
    questionTranslation,
    answerArabic,
    answerTranslation,
    explanation,
    juzNumber,
    mushafPage
  };
}
