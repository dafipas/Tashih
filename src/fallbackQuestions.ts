/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, QuestionType } from "./types";

export const fallbackQuestions: Question[] = [
  {
    id: "fb_1",
    surahNumber: 1,
    surahName: "Al-Fatihah",
    verseStart: 2,
    verseEnd: 3,
    type: QuestionType.SAMBUNG_AYAT,
    questionArabic: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ﴿٢﴾ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ﴿٣﴾",
    questionTranslation: "Segala puji bagi Allah, Tuhan semesta alam [2], Maha Pengasih, Maha Penyayang [3]",
    questionPrompt: "Lanjutkan ayat berikut dengan tepat:",
    answerArabic: "مَٰلِكِ يَوْمِ ٱلدِّينِ ﴿٤﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾",
    answerTranslation: "Pemilik hari pembalasan [4], Hanya kepada-Mulah kami menyembah dan hanya kepada-Mulah kami memohon pertolongan [5]",
    explanation: "Ayat ini mengajarkan ketundukan total, pengakuan atas kekuasaan Allah pada hari akhirat, dan pemurnian tauhid ibadah serta doa.",
    juzNumber: 1,
    mushafPage: 1
  },
  {
    id: "fb_2",
    surahNumber: 1,
    surahName: "Al-Fatihah",
    verseStart: 5,
    verseEnd: 5,
    type: QuestionType.ARTI_PEMAHAMAN,
    questionArabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾",
    questionTranslation: "Hanya kepada-Mulah kami menyembah dan hanya kepada-Mulah kami memohon pertolongan [5]",
    questionPrompt: "Sebutkan pemahaman utama yang terkandung dalam ayat di atas:",
    answerArabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
    answerTranslation: "Ayat ini merupakan inti dari tauhid ibadah dan istianah. Seseorang wajib memurnikan ibadah semata-mata karena Allah (ikhlas), serta mengakui kelemahan dirinya sehingga memerlukan pertolongan Allah dalam meniti ketaatan tersebut.",
    explanation: "Para ulama menyebut kalimat ini sebagai kunci utama dari seluruh pesan dalam kitab suci Al-Quran.",
    juzNumber: 1,
    mushafPage: 1
  },
  {
    id: "fb_3",
    surahNumber: 93,
    surahName: "Ad-Duha",
    verseStart: 1,
    verseEnd: 3,
    type: QuestionType.SAMBUNG_AYAT,
    questionArabic: "وَٱلضُّحَىٰ ﴿١﴾ وَٱلَّيْلِ إِذَا سَجَىٰ ﴿٢﴾ مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ ﴿٣﴾",
    questionTranslation: "Demi waktu duha (ketika matahari naik sepenggalah) [1], dan demi malam apabila telah sunyi [2], Tuhanmu tidak meninggalkanmu (Muhammad) dan tidak (pula) membencimu [3]",
    questionPrompt: "Lanjutkan ayat berikutnya:",
    answerArabic: "وَلَلْءَاخِرَةُ خَيْرٌ لَّكَ مِنَ ٱلْأُولَىٰ ﴿٤﴾ وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ ﴿٥﴾",
    answerTranslation: "Dan sungguh, yang akhir itu lebih baik bagimu dari yang permulaan [4], Dan sungguh, kelak Tuhanmu pasti memberikan karunia-Nya kepadamu, sehingga engkau menjadi puas [5]",
    explanation: "Surah Ad-Duha diturunkan sebagai penghibur hati Nabi Muhammad SAW ketika wahyu sempat terputus sementara waktu dan kaum musyrik mengolok-olok beliau.",
    juzNumber: 30,
    mushafPage: 596
  },
  {
    id: "fb_4",
    surahNumber: 93,
    surahName: "Ad-Duha",
    verseStart: 6,
    verseEnd: 8,
    type: QuestionType.ARTI_PEMAHAMAN,
    questionArabic: "أَلَمْ يَجِدْكَ يَتِيمًا فَـَٔاوَىٰ ﴿٦﴾ وَوَجَدَكَ ضَآلًّا فَهَدَىٰ ﴿٧﴾ وَوَجَدَكَ عَآئِلًا فَأَغْنَىٰ ﴿٨﴾",
    questionTranslation: "Bukankah Dia mendapatimu sebagai seorang yatim, lalu Dia melindungimu? [6] Dan Dia mendapatimu sebagai seorang yang bingung, lalu Dia memberikan petunjuk? [7] Dan Dia mendapatimu sebagai seorang yang kekurangan, lalu Dia memberikan kecukupan? [8]",
    questionPrompt: "Jelaskan hikmah serta pesan sosial yang terkandung dalam rangkaian ayat tersebut:",
    answerArabic: "فَأَمَّا ٱلْيَتِيمَ فَلَا تَقْهَرْ ﴿٩﴾ وَأَمَّا ٱلسَّآئِلَ فَلَا تَنْهَرْ ﴿١٠﴾ وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ ﴿١١﴾",
    answerTranslation: "Mengingat masa lalu Rasulullah yang yatim, bingung, dan kekurangan, Allah mengingatkan kewajiban moral untuk: tidak berlaku sewenang-wenang kepada anak yatim, tidak menghardik orang miskin yang meminta bantuan, serta mensyukuri nikmat Allah dengan menceritakannya.",
    explanation: "Ayat ini mengaitkan pengalaman spiritual dan pemeliharaan ilahi masa lalu dengan kewajiban etika sosial sehari-hari.",
    juzNumber: 30,
    mushafPage: 596
  },
  {
    id: "fb_5",
    surahNumber: 108,
    surahName: "Al-Kautsar",
    verseStart: 1,
    verseEnd: 2,
    type: QuestionType.SAMBUNG_AYAT,
    questionArabic: "إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ ﴿١﴾ فَصَلِّ لِرَبِّكَ وَٱنْحَرْ ﴿٢﴾",
    questionTranslation: "Sungguh, Kami telah memberimu (Muhammad) nikmat yang banyak [1]. Maka laksanakanlah salat karena Tuhanmu; dan berkurbanlah [2]",
    questionPrompt: "Lanjutkan ayat penutup surah ini:",
    answerArabic: "إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ ﴿٣﴾",
    answerTranslation: "Sungguh, orang-orang yang membencimu dialah yang terputus (dari rahmat Allah) [3]",
    explanation: "Surah terpendek dalam Al-Quran yang menegaskan limpahan nikmat kepada Rasulullah dan jaminan bahwa musuh-musuh beliau berada dalam kehinaan.",
    juzNumber: 30,
    mushafPage: 602
  },
  {
    id: "fb_6",
    surahNumber: 112,
    surahName: "Al-Ikhlas",
    verseStart: 1,
    verseEnd: 2,
    type: QuestionType.ARTI_PEMAHAMAN,
    questionArabic: "قُلْ هُوَ ٱللَّهُ أَحَدٌ ﴿١﴾ ٱللَّهُ ٱلصَّمَدُ ﴿٢﴾",
    questionTranslation: "Katakanlah (Muhammad), 'Dialah Allah, Yang Maha Esa' [1]. 'Allah tempat meminta segala sesuatu' [2]",
    questionPrompt: "Terangkan makna 'Ash-Shamad' dan signifikansinya dalam akidah Islam:",
    answerArabic: "ٱللَّهُ ٱلصَّمَدُ",
    answerTranslation: "Makna 'Ash-Shamad' adalah Yang Maha Dibutuhkan, tumpuan segala makhluk dalam memohon kebutuhan mereka. Dia Mandiri dan tidak membutuhkan ciptaan-Nya, namun seluruh ciptaan bergantung sepenuhnya kepada-Nya.",
    explanation: "Surah Al-Ikhlas setara dengan sepertiga Al-Quran karena memurnikan pengenalan akidah tauhid kepada Allah.",
    juzNumber: 30,
    mushafPage: 604
  }
];
