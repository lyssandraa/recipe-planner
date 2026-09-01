// Maps ISO 639-1 codes (as returned in Open Food Facts' `lang` field) to
// readable names, for the "this label is in [language]" note. Easy to
// extend: add a code as new languages show up on scanned products.
const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  pt: "Portuguese",
  el: "Greek",
  da: "Danish",
  sv: "Swedish",
  fi: "Finnish",
  no: "Norwegian",
  ro: "Romanian",
  tr: "Turkish",
  ar: "Arabic",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
  vi: "Vietnamese",
  hi: "Hindi",
  ru: "Russian",
};

export function languageName(code: string): string {
  return LANGUAGE_CODE_TO_NAME[code.toLowerCase()] ?? code;
}
