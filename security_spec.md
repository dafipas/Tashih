# Security Specification: Tashih Randomizer

This document details the Security Architecture, Data Invariants, Hostile Payloads, and verification suite for the Firestore database of the Tashih Randomizer application.

## 1. Data Invariants

1. **Question Entity Integrity**:
   - `id` must be a valid alphanumeric or hyphenated string of length <= 128.
   - `surahNumber` must be an integer between 1 and 114.
   - `verseStart` and `verseEnd` must be positive integers.
   - `type` must be one of `sambung_ayat`, `arti_pemahaman`, or `random`.
   - `juzNumber` must be an integer between 1 and 30.
   - `mushafPage` must be an integer between 1 and 604.
   - Strings such as `questionArabic`, `answerArabic`, `surahName`, etc., must not exceed rational size bounds to prevent Denial of Wallet (DoW) attacks.

2. **SessionState Integrity** (The "global_stage" synchronization state):
   - `sessionId` must be "global_stage".
   - `showAnswer`, `isSpinning`, `isMicActive`, `isReadingDetectionEnabled` must be booleans.
   - `lastActionTime` must be a valid integer tracking epoch milliseconds.
   - `config` must contain valid properties like `selectedSurah` (0-114), `startVerse`, `endVerse`, `questionType` (valid enum).
   - `googleSheetsUrl` and `googleSheetsWebhookUrl` must be non-empty strings under size limits.

---

## 2. The "Dirty Dozen" Payloads (Aesthetic & Input Attacks)

Below are twelve malicious payloads representing bypass attempts on type, boundary, representation, size, and structure.

### Payload 1: Question ID Poisoning (Junk String Identifier)
- **Path**: `questions/malicious$$$$###page_id`
- **Violation**: Document ID contains non-alphanumeric special characters.
```json
{
  "id": "malicious$$$$###page_id",
  "surahNumber": 1,
  "surahName": "Al-Fatihah",
  "verseStart": 1,
  "verseEnd": 7,
  "type": "sambung_ayat",
  "questionArabic": "بِسْمِ اللَّهِ",
  "questionTranslation": "Dengan nama Allah",
  "questionPrompt": "Lanjutkan",
  "answerArabic": "الرَّحْمَنِ الرَّحِيمِ",
  "answerTranslation": "Yang Maha Pengasih lagi Maha Penyayang",
  "explanation": "Default explanation",
  "juzNumber": 1,
  "mushafPage": 1
}
```

### Payload 2: Excessive Size Payload (Denial of Wallet Attack on Questions)
- **Path**: `questions/dow_q`
- **Violation**: `questionArabic` contains a 500KB string designed to exhaust Firestore storage.
```json
{
  "id": "dow_q",
  "surahNumber": 1,
  "surahName": "Al-Fatihah",
  "verseStart": 1,
  "verseEnd": 7,
  "type": "sambung_ayat",
  "questionArabic": "[500KB of spaces and text]",
  "questionTranslation": "Dengan nama Allah",
  "questionPrompt": "Lanjutkan",
  "answerArabic": "الرَّحْمَنِ الرَّحِيمِ",
  "answerTranslation": "Yang Maha Pengasih lagi Maha Penyayang",
  "explanation": "Default explanation",
  "juzNumber": 1,
  "mushafPage": 1
}
```

### Payload 3: Invalid Surah Number (Boundary Bounds)
- **Path**: `questions/invalid_surah`
- **Violation**: `surahNumber` is set to 999 (invalid index range).
```json
{
  "id": "invalid_surah",
  "surahNumber": 999,
  "surahName": "Al-Fatihah",
  "verseStart": 1,
  "verseEnd": 7,
  "type": "sambung_ayat",
  "questionArabic": "بِسْمِ اللَّهِ",
  "questionTranslation": "Dengan nama Allah",
  "questionPrompt": "Lanjutkan",
  "answerArabic": "الرَّحْمَنِ الرَّحِيمِ",
  "answerTranslation": "Yang Maha Pengasih lagi Maha Penyayang",
  "explanation": "Default explanation",
  "juzNumber": 1,
  "mushafPage": 1
}
```

### Payload 4: Invalid Question Type Enum
- **Path**: `questions/invalid_type`
- **Violation**: `type` is set to a malicious non-enum value `hack_and_modify`.
```json
{
  "id": "invalid_type",
  "surahNumber": 1,
  "surahName": "Al-Fatihah",
  "verseStart": 1,
  "verseEnd": 7,
  "type": "hack_and_modify",
  "questionArabic": "بِسْمِ اللَّهِ",
  "questionTranslation": "Dengan nama Allah",
  "questionPrompt": "Lanjutkan",
  "answerArabic": "الرَّحْمَنِ الرَّحِيمِ",
  "answerTranslation": "Yang Maha Pengasih lagi Maha Penyayang",
  "explanation": "Default explanation",
  "juzNumber": 1,
  "mushafPage": 1
}
```

### Payload 5: Invalid Juz Number (Boundary Bounds)
- **Path**: `questions/invalid_juz`
- **Violation**: `juzNumber` is set to 35 (Quran has at most 30 Juzs).
```json
{
  "id": "invalid_juz",
  "surahNumber": 2,
  "surahName": "Al-Baqarah",
  "verseStart": 1,
  "verseEnd": 5,
  "type": "sambung_ayat",
  "questionArabic": "الم",
  "questionTranslation": "Alif Lam Mim",
  "questionPrompt": "Lanjutkan",
  "answerArabic": "ذَلِكَ الْكِتَابُ",
  "answerTranslation": "Kitab ini tidak ada keraguan",
  "explanation": "Default",
  "juzNumber": 35,
  "mushafPage": 2
}
```

### Payload 6: Invalid Mushaf Page (Boundary Bounds)
- **Path**: `questions/invalid_page`
- **Violation**: `mushafPage` is set to 700 (standard Mushaf has exactly 604 pages).
```json
{
  "id": "invalid_page",
  "surahNumber": 2,
  "surahName": "Al-Baqarah",
  "verseStart": 1,
  "verseEnd": 5,
  "type": "sambung_ayat",
  "questionArabic": "الم",
  "questionTranslation": "Alif Lam Mim",
  "questionPrompt": "Lanjutkan",
  "answerArabic": "ذَلِكَ الْكِتَابُ",
  "answerTranslation": "Kitab ini tidak ada keraguan",
  "explanation": "Default",
  "juzNumber": 1,
  "mushafPage": 700
}
```

### Payload 7: Session Configuration Injection (Grave Configuration Bypass)
- **Path**: `sessions/global_stage`
- **Violation**: Injecting random fields into the session state object like `network_credentials_leak`.
```json
{
  "sessionId": "global_stage",
  "showAnswer": false,
  "isSpinning": false,
  "isMicActive": false,
  "isReadingDetectionEnabled": true,
  "lastActionTime": 1781293812000,
  "network_credentials_leak": "malicious_admin_value"
}
```

### Payload 8: Session with Malicious ID String
- **Path**: `sessions/attacker_defined_stage`
- **Violation**: Session ID is not "global_stage" (session hijacking).
```json
{
  "sessionId": "attacker_defined_stage",
  "showAnswer": false,
  "isSpinning": false,
  "isMicActive": false,
  "isReadingDetectionEnabled": true,
  "lastActionTime": 1781293812000
}
```

### Payload 9: Session with Negative Action Time
- **Path**: `sessions/global_stage`
- **Violation**: `lastActionTime` is set to a negative integer to break chronology checks.
```json
{
  "sessionId": "global_stage",
  "showAnswer": false,
  "isSpinning": false,
  "isMicActive": false,
  "isReadingDetectionEnabled": true,
  "lastActionTime": -999999
}
```

### Payload 10: Session Config with Hostile SelectedSurah
- **Path**: `sessions/global_stage`
- **Violation**: `config.selectedSurah` is set to -50 which is completely invalid for surahs.
```json
{
  "sessionId": "global_stage",
  "showAnswer": false,
  "isSpinning": false,
  "isMicActive": false,
  "isReadingDetectionEnabled": true,
  "lastActionTime": 1781293812000,
  "config": {
    "selectedSurah": -50,
    "startVerse": 1,
    "endVerse": 11,
    "questionType": "sambung_ayat",
    "showOverlayAnswer": false
  }
}
```

### Payload 11: Phantom Parameter Injection in Session Config
- **Path**: `sessions/global_stage`
- **Violation**: Attempting to bypass validations by adding extra keys `superAdminMode` inside config to escalate privilege or bypass testing rules.
```json
{
  "sessionId": "global_stage",
  "showAnswer": false,
  "isSpinning": false,
  "isMicActive": false,
  "isReadingDetectionEnabled": true,
  "lastActionTime": 1781293812000,
  "config": {
    "selectedSurah": 1,
    "startVerse": 1,
    "endVerse": 7,
    "questionType": "sambung_ayat",
    "showOverlayAnswer": false,
    "superAdminMode": true
  }
}
```

### Payload 12: Invalid Webhook URL injection
- **Path**: `sessions/global_stage`
- **Violation**: Injecting an oversized 10KB random junk string into `googleSheetsWebhookUrl`.
```json
{
  "sessionId": "global_stage",
  "showAnswer": false,
  "isSpinning": false,
  "isMicActive": false,
  "isReadingDetectionEnabled": true,
  "lastActionTime": 1781293812000,
  "googleSheetsWebhookUrl": "https://[10KB of duplicate text]"
}
```

---

## 3. The Test Runner Suite Description

The validation pipeline will enforce:
1. `isValidId` check on path variable document ID strings.
2. `isValidQuestion` validation function on both `create` and `update` for `questions/` collection.
3. `isValidSessionState` validation function covering exact fields on `sessions/` writes.
4. Total size restriction on every string and integer field.
5. Absolute block on any unauthorized write operations that violate type safety.
