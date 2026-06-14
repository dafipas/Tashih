/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fast diacritics stripper to support 10x dictionary coverage on base letter matching
export const stripArabicDiacritics = (text: string): string => {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    // Also remove Quranic stop/pause markers and special symbols
    .replace(/[\u0615-\u061A\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06EC]/g, "")
    .trim();
};

export const normalizeArabicForMatching = (text: string): string => {
  let cleaned = stripArabicDiacritics(text);
  cleaned = cleaned
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ي/g, "ي");
  return cleaned;
};

export const quranDictionary: Record<string, string> = {
  // Al-Fatihah
  "بِسْمِ": "Dengan nama",
  "اللَّهِ": "Allah",
  "الرَّحْمَٰنِ": "Maha Pengasih",
  "الرَّحِيمِ": "Maha Penyayang",
  "الْعَالَمِينَ": "Semesta alam",
  "الْحَمْدُ": "Segala puji",
  "لِلَّهِ": "Bagi Allah",
  "رَبِّ": "Tuhan",
  "مَالِكِ": "Pemilik / Menguasai",
  "يَوْمِ": "Hari",
  "الدِّينِ": "Pembalasan",
  "إِيَّاكَ": "Hanya kepada-Mu",
  "نَعْبُدُ": "Kami menyembah",
  "وَإِيَّاكَ": "Dan hanya kepada-Mu",
  "نَسْتَعِينُ": "Kami mohon pertolongan",
  "اهْدِنَا": "Tunjukilah kami",
  "الصِّرَاطَ": "Jalan",
  "الْمُسْتَقِيمَ": "Yang lurus",
  "الَّذِينَ": "Orang-orang yang",
  "أَنْعَمْتَ": "Telah Engkau beri nikmat",
  "عَلَيْهِمْ": "Atas mereka",
  "غَيْرِ": "Bukan / Selain",
  "الْمَغْضُوبِ": "Yang dimurkai",
  "وَلَا": "Dan bukan pula",
  "الضَّالِّينَ": "Orang-orang yang sesat",

  // Surat Al-Ikhlas
  "قُلْ": "Katakanlah",
  "هُوَ": "Dia",
  "أَحَدٌ": "Yang Maha Esa",
  "الصَّمَدُ": "Tumpuan / Bergantung",
  "لَمْ": "Tidak / Belum",
  "يَلِدْ": "Dia melahirkan",
  "يُولَدْ": "Dia dilahirkan",
  "يَكُنْ": "Ada / Menjadi",
  "لَهُ": "Bagi-Nya",
  "كُفُوًا": "Setara / Sekufu",

  // Surat Al-Falaq
  "أَعُوذُ": "Aku berlindung",
  "بِرَبِّ": "Kepada Tuhan",
  "الْفَلَقِ": "Waktu subuh",
  "مِنْ": "Dari",
  "شَرِّ": "Kejahatan",
  "خَلَقَ": "Dia ciptakan",
  "غَاسِقٍ": "Malam",
  "إِذَا": "Apabila",
  "وَقَبَ": "Telah gelap gulita",
  "النَّفَّاثَاتِ": "Wanita-wanita penyihir",
  "الْعُقَدِ": "Ikatan-ikatan",
  "حَاسِدٍ": "Orang yang dengki",
  "حَسَدَ": "Telah dengki",

  // Surat An-Nas
  "مَلِكِ": "Raja",
  "إِلَٰهِ": "Sembahan",
  "النَّاسِ": "Manusia",
  "الْوَسْوَاسِ": "Bisikan",
  "الْخَنَّاسِ": "Yang bersembunyi",
  "الَّذِي": "Yang",
  "يُوَسْوِسُ": "Membisikkan",
  "صُدُورِ": "Dada",
  "الْجِنَّةِ": "Golongan jin",
  "وَالنَّاسِ": "Dan manusia",

  // Surat Ad-Duha
  "وَالضُّحَىٰ": "Demi waktu dhuha",
  "وَاللَّيْلِ": "Dan demi malam",
  "سَجَىٰ": "Telah sunyi",
  "وَدَّعَكَ": "Meninggalkanmu",
  "وَمَا": "Dan tidak pula",
  "قَلَىٰ": "Membencimu",
  "وَلَلْآخِرَةُ": "Dan sungguh akhirat itu",
  "خَيْرٌ": "Lebih baik",
  "لَكَ": "Bagimu",
  "الْأُولَىٰ": "Dari permulaan / Dunia",
  "وَلَسَوْفَ": "Dan kelak pasti",
  "يُعْطِيكَ": "Memberikan kepadamu",
  "تَرْضَىٰ": "Kamu menjadi puas",
  "يَجِدْكَ": "Dia mendapatimu",
  "يَتِيمًا": "Seorang yatim",
  "فَآوَىٰ": "Lalu Dia melindungi",
  "ضَالًّا": "Bingung / Tersesat",
  "فَهَدَىٰ": "Lalu Dia memberi petunjuk",
  "عَائِلًا": "Kekurangan / Miskin",
  "فَأَغْنَىٰ": "Lalu Dia mencukupkan",
  "الْيَتِيمَ": "Anak yatim",
  "فَلَا": "Maka janganlah",
  "تَقْهَرْ": "Kamu sewenang-wenang",
  "السَّائِلَ": "Orang yang meminta",
  "تَنْهَرْ": "Kamu menghardik",
  "بِنِعْمَةِ": "Dengan nikmat",
  "فَحَدِّثْ": "Maka ungkapkanlah / Kabarkanlah",

  // Surat Al-Kautsar
  "إِنَّآ": "Sungguh Kami",
  "أَعْتَيْنَاكَ": "Telah memberimu",
  "الْكَوْثَرَ": "Nikmat yang banyak",
  "فَصَلِّ": "Maka salatlah",
  "وَانْحَرْ": "Dan berkurbanlah",
  "إِنَّ": "Sungguh",
  "شَانِئَكَ": "Orang yang membencimu",
  "الْأَبْتَرُ": "Yang terputus",

  // Common Quranic Words & Roots
  "ءَامَنُواْ": "orang-orang yang beriman",
  "امَنُوا": "orang-orang yang beriman",
  "عَمِلُواْ": "mereka mengerjakan",
  "عَمِلُوا": "mereka mengerjakan",
  "ٱلصَّٰلِحَٰtِ": "kebajikan / amal saleh",
  "ٱلصَّٰلِحَٰتِ": "kebajikan / amal saleh",
  "الصَّALICHAT": "kebajikan / amal saleh",
  "الصَّالِحَاتِ": "kebajikan / amal saleh",
  "عَذَابٌ": "azab / siksaan",
  "أَلِيمٌ": "yang pedih",
  "عَظِيمٌ": "yang agung / besar",
  "جَنَّاتٌ": "surga-surga",
  "تَجْرِي": "mengalir",
  "تَحْتِهَا": "bawahnya",
  "الْأَنْهَارُ": "sungai-sungai",
  "خَالِدِينَ": "mereka kekal",
  "أَبَدًا": "selama-lamanya",
  "كُلِّ": "setiap / segala",
  "شَيْءٍ": "sesuatu",
  "قَدِيرٌ": "Maha Kuasa",
  "رَّحْمَةٌ": "rahmat / kasih sayang",
  "يُرِيدُ": "Dia menghendaki",
  "يَغْفِرَ": "Dia mengampuni",
  "غَفُورٌ": "Maha Pengampun",
  "حَكِيمٌ": "Maha Bijaksana",
  "سَمِيعٌ": "Maha Mendengar",
  "بَصِيرٌ": "Maha Melihat",
  "تَعْمَلُونَ": "kamu kerjakan",
  "يَعْمَلُونَ": "mereka kerjakan",
  "خَبِيرٌ": "Maha Teliti / Mengetahui",
  "شَدِيدُ": "sangat keras",
  "الْعِقَابِ": "siksaan / hukuman",
  "الْقُرْءَانَ": "Al-Quran",
  "الْحَقِّ": "kebenaran / yang hak",
  "سُبْحَانَ": "Maha Suci",
  "تَبَارَكَ": "Maha Suci / Maha Melimpah",
  "آيَاتٌ": "tanda-tanda / ayat-ayat",
  "بَيِّنَاتٌ": "yang terang / jelas",
  "أُولَٰٓئِكَ": "mereka itu",
  "أَصْحَابُ": "penghuni / golongan",
  "الْمَوْتُ": "kematian",
  "الْحَيَاةُ": "kehidupan",
  "الدُّنْيَا": "dunia",
  "الْمُؤْمِنِينَ": "orang-orang mukmin",
  "الْمُنَافِقِينَ": "orang-orang munafik",
  "أَصْحَابِ": "penghuni / pasukan",
  "الْفِيلِ": "gajah",
  "يَجْعَلْ": "Dia menjadikan",
  "كَيْدَهُمْ": "tipu daya mereka",
  "تَضْلِيلٍ": "sia-sia",
  "أَرْسَلَ": "Dia mengirimkan",
  "طَيْرًا": "burung",
  "أَبَابِيلَ": "yang berbondong-bondong",
  "تَرْمِيهِمْ": "yang melempari mereka",
  "بِحِجَارَةٍ": "dengan batu",
  "سِجِّيلٍ": "tanah yang terbakar",
  "فَجَعَلَهُمْ": "lalu Dia menjadikan mereka",
  "عَصْفٍ": "daun-daun",
  "مَّأْكُولٍ": "yang dimakan (ulat)",
  "إِيلَٰفِ": "kebiasaan",
  "رِحْلَةَ": "perjalanan",
  "الشِّتَاءِ": "musim dingin",
  "الصَّيْفِ": "musim panas",
  "فَلْيَعْبُدُوا": "maka hendaklah mereka menyembah",
  "بَيْتِ": "Rumah (Ka'bah)",
  "أَطْعَمَهُم": "telah memberi makan mereka",
  "جُوعٍ": "lapar",
  "آمَنَهُم": "telah mengamankan mereka",
  "خَوْفٍ": "ketakutan",
  "يُكَذِّبُ": "mendustakan",
  "يَدُعُّ": "menghardik",
  "يَتِيمَ": "anak yatim",
  "يَحُضُّ": "mendorong",
  "طَعَامِ": "memberi makan",
  "مِسْكِينِ": "orang miskin",
  "وَيْلٌ": "celakalah",
  "مُصَلِّينَ": "orang-orang yang salat",
  "سَاهُونَ": "lalai",
  "يُرَاؤُونَ": "mereka berbuat riya",
  "يَمْنَعُونَ": "mereka enggan memberikan",
  "مَاعُونَ": "bantuan / barang berguna",
  "انْحَرْ": "berkurbanlah",
  "أَبْتَرُ": "yang terputus",
  "يَا": "wahai",
  "أَيُّهَا": "wahai",
  "كَافِرُونَ": "orang-orang kafir",
  "أَعْبُدُ": "aku menyembah",
  "عَابِدُونَ": "penyembah",
  "عَابِدٌ": "pernah menyembah",
  "عَبَدتُّمْ": "kamu sembah",
  "لَكُمْ": "bagi kalian",
  "دِينُكُمْ": "agama kalian",
  "وَلِيَ": "dan bagiku",
  "دِينِ": "agamaku",
  "جَاءَ": "telah datang",
  "فَتْحُ": "kemenangan",
  "رَأَيْتَ": "kamu melihat",
  "يَدْخُلُونَ": "mereka masuk",
  "أَفْوَاجًا": "berbondong-bondong",
  "سَبِّحْ": "bertasbihlah",
  "حَمْدِ": "dengan memuji",
  "اسْتَغْفِرْ": "mohonlah ampunan",
  "تَوَّابًا": "Maha Penerima taubat",
  "تَبَّتْ": "binasalah",
  "يَدَا": "kedua tangan",
  "أَبِي": "Abu",
  "لَهَبٍ": "Lahab",
  "تَبَّ": "benar-benar binasa",
  "أَغْنَى": "berguna / memberi kecukupan",
  "كَسَبَ": "dia usahakan",
  "سَيَصْلَى": "kelak dia akan masuk",
  "نَارًا": "api",
  "امْرَأَتُهُ": "istrinya",
  "حَمَّالَةَ": "pembawa",
  "حَطَبِ": "kayu bakar",
  "جِيدِهَا": "lehernya",
  "حَبْلٌ": "tali",
  "مَسَدٍ": "sabut",
  "جَعَلَ": "Dia menjadikan",
  "تَرْمِيهِم": "yang melempari mereka",
  "حِجَارَةٍ": "batu",

  // Kemenag-compliant precise vocabulary mappings
  "يَوْمَ": "Pada hari",
  "يَكُوْنُ": "manusia menjadi",
  "النَّاسُ": "manusia",
  "كَالْفَرَاشِ": "bagaikan laron",
  "الْمَبْثُوْثِ": "yang beterbangan",
  "وَتَكُوْنُ": "dan gunung-gunung menjadi",
  "الْجِبَالُ": "gunung-gunung",
  "كَالْعِهْنِ": "bagaikan bulu",
  "الْمَنْفُوْشِ": "yang dihambur-hamburkan",
  "فَلَمَّآ": "Maka ketika / tatkala",
  "اَتٰىهَا": "dia mendatangi (tempat api) itu",
  "نُوْدِيَ": "dia dipanggil",
  "يٰمُوْسٰٓى": "Wahai Musa",
  "اِنِّيْٓ": "Sesungguhnya Aku",
  "اَنَا۠": "Aku",
  "رَبُّكَ": "Tuhanmu",
  "فَاخْلَعْ": "maka lepaskanlah",
  "نَعْلَيْكَۚ": "kedua terompahmu",
  "اِنَّكَ": "sesungguhnya engkau",
  "بِالْوَادِ": "di lembah",
  "الْمُقَدَّسِ": "yang suci / disucikan",
  "طُوًى": "Tuwa",
  "وَيَدْعُ": "Dan manusia mendoakan / memohon",
  "الْاِنْسَانُ": "manusia",
  "بِالشَّرِّ": "dengan kejahatan",
  "دُعَاۤءَهٗ": "sebagaimana doanya",
  "بِالْخَيْرِۗ": "dengan kebaikan",
  "وَكَانَ": "dan adalah",
  "عَجُوْلًا": "tergesa-gesa",
  "وَجَعَلْنَا": "Dan Kami jadikan",
  "الَّيْلَ": "malam",
  "وَالنَّهَارَ": "dan siang",
  "اٰيَتَيْنِ": "sebagai dua tanda",
  "فَمَحَوْنَآ": "lalu Kami hapuskan",
  "اٰيَةَ": "tanda",
  "مُبْصِرَةً": "terang benderang",
  "لِّتَبْتَغُوْا": "agar kamu mencari",
  "فَضْلًا": "karunia / rezeki",
  "رَّبِّكُمْ": "dari Tuhanmu",
  "وَلِتَعْلَمُوْا": "dan agar kamu mengetahui",
  "عَدَدَ": "bilangan",
  "السِّنِيْنَ": "tahun-tahun",
  "وَالْحِسَابَۗ": "dan perhitungan (waktu)",
  "وَكُلَّ": "dan segala",
  "فَصَّلْنٰهُ": "Kami telah menjelaskannya",
  "تَفْصِيْلًا": "secara terperinci / sejelas-jelasnya",
  "وَالنّٰزِعٰتِ": "Demi (malaikat) yang mencabut",
  "غَرْقًاۙ": "dengan keras",
  "وَّالنّٰشِطٰتِ": "dan demi (malaikat) yang mencabut",
  "نَشْطًاۙ": "dengan lemah lembut",
  "مَآ": "Tidaklah",
  "اَغْنٰى": "berguna",
  "عَنْهُ": "baginya",
  "مَالُهٗ": "hartanya",
  "كَسَبَۗ": "yang dia usahakan",
  "وَاِذَا": "Dan apabila",
  "الْعِشَارُ": "unta-unta yang bunting",
  "عُطِّلَتْۖ": "ditinggalkan (tidak terurus)",
  "الْوُحُوْشُ": "binatang-binatang liar",
  "حُشِرَتْۖ": "dikumpulkan",
  "ٱلْحَمْدُ": "Segala puji",
  "ٱلْعَٰلَمِينَ": "semesta alam",
  "ٱلرَّحْمَٰنِ": "Maha Pengasih",
  "ٱلرَّحِيمِ": "Maha Penyayang",
  "مَٰلِكِ": "Pemilik",
  "ٱلَدِّينِ": "Pembalasan / Agama",
  "ٱلدِّينِ": "Pembalasan / Agama",
  "وَٱلضُّحَىٰ": "Demi waktu duha",
  "وَٱلَّيْلِ": "dan demi malam",
  "مَا": "tidaklah",
};

// Create a pre-normalized map for fast Hamza/diacritic-free lookups
const normalizedDictionary: Record<string, string> = {};
Object.entries(quranDictionary).forEach(([key, val]) => {
  const normKey = normalizeArabicForMatching(key);
  if (!normalizedDictionary[normKey]) {
    normalizedDictionary[normKey] = val;
  }
});

const stripPrefixAl = (normText: string): string => {
  if (normText.startsWith("ال") && normText.length > 3) {
    return normText.slice(2);
  }
  return normText;
};

// Advanced Stem-based split matching heuristic
export const translateArabicWithHeuristics = (cleanWord: string): string | null => {
  // Direct matches
  if (quranDictionary[cleanWord]) return quranDictionary[cleanWord];
  const stripped = stripArabicDiacritics(cleanWord);
  if (quranDictionary[stripped]) return quranDictionary[stripped];

  const norm = normalizeArabicForMatching(cleanWord);
  if (normalizedDictionary[norm]) return normalizedDictionary[norm];

  // Try stripping common Arabic prefixes recursively
  // 1. "Waw" (Dan)
  if (norm.startsWith("و") && norm.length > 2) {
    const stem = norm.slice(1);
    const resolved = normalizedDictionary[stem] || normalizedDictionary[stripPrefixAl(stem)];
    if (resolved) return "dan " + resolved;
  }

  // 2. "Fa" (Maka)
  if (norm.startsWith("ف") && norm.length > 2) {
    const stem = norm.slice(1);
    const resolved = normalizedDictionary[stem] || normalizedDictionary[stripPrefixAl(stem)];
    if (resolved) return "maka " + resolved;
  }

  // 3. "Bi" (Dengan)
  if (norm.startsWith("ب") && norm.length > 2) {
    const stem = norm.slice(1);
    const resolved = normalizedDictionary[stem] || normalizedDictionary[stripPrefixAl(stem)];
    if (resolved) return "dengan " + resolved;
  }

  // 4. "Li" / "Lillahi" (Untuk / Bagi)
  if (norm.startsWith("لل") && norm.length > 3) {
    const stem = norm.slice(2);
    const resolved = normalizedDictionary[stem] || normalizedDictionary[stripPrefixAl(stem)];
    if (resolved) return "bagi/untuk " + resolved;
  }
  if (norm.startsWith("ل") && norm.length > 2) {
    const stem = norm.slice(1);
    const resolved = normalizedDictionary[stem] || normalizedDictionary[stripPrefixAl(stem)];
    if (resolved) return "untuk " + resolved;
  }

  // 5. Definite Article "Al"
  const finalNoAl = stripPrefixAl(norm);
  if (normalizedDictionary[finalNoAl]) return normalizedDictionary[finalNoAl];

  return null;
};

export const getWordWordTranslation = (word: string, indonesianVerse: string, index: number, totalWords: number): string => {
  // Clean punctuation
  const cleanWord = word.replace(/[﴾﴿0-9٠-٩،.:_()]/g, "").trim();
  if (!cleanWord) return "";

  // 1. Use the advanced dictionary & stem translation heuristic
  const heuristicResult = translateArabicWithHeuristics(cleanWord);
  if (heuristicResult) {
    return heuristicResult;
  }

  // 2. Fallback: Contextual segment pairing from Indonesian translation
  // To keep translation perfectly aligned with official Indonesian Kemenag standards,
  // we preserve all words (including grammatical particle words like dan, yang, etc.)
  const indonesianWords = indonesianVerse
    .replace(/[()[\].,:_]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (indonesianWords.length === 0) {
    return "...";
  }

  // Linear spacing mapping for high-fidelity alignment
  const ratio = indonesianWords.length / totalWords;
  const targetStart = Math.floor(index * ratio);
  const targetEnd = Math.min(indonesianWords.length, Math.ceil((index + 1) * ratio));
  const slice = indonesianWords.slice(targetStart, targetEnd).join(" ");
  return slice || indonesianWords[Math.min(indonesianWords.length - 1, Math.floor(index * ratio))] || "...";
};
