/**
 * Detección de idioma por script y por palabras funcionales.
 * Funciona con idiomas sin espacios (chino, japonés, coreano...), donde el
 * conteo por espacios falla. Devuelve 'und' cuando no hay señal suficiente,
 * para que el prompt se limite a "mantén el idioma del texto original".
 */

const CJK = /[\u3040-\u30ff\uac00-\ud7af\u4e00-\u9fff\u3400-\u4dbf]/;

export function isCJK(text) {
  return typeof text === 'string' && CJK.test(text);
}

const SCRIPT_RULES = [
  [/[\u3040-\u30ff]/, 'ja'],
  [/[\uac00-\ud7af]/, 'ko'],
  [/[\u4e00-\u9fff\u3400-\u4dbf]/, 'zh'],
  [/[\u0400-\u04ff]/, 'ru'],
  [/[\u0600-\u06ff]/, 'ar'],
  [/[\u0590-\u05ff]/, 'he'],
  [/[\u0e00-\u0e7f]/, 'th'],
  [/[\u0900-\u097f]/, 'hi'],
  [/[\u0370-\u03ff]/, 'el']
];

const STOPWORDS = {
  en: ['the', 'and', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'with', 'for', 'on', 'by', 'this', 'that', 'from', 'at', 'as', 'be', 'it', 'you', 'we', 'they', 'not', 'have', 'will', 'can', 'your', 'our', 'but', 'or', 'if'],
  es: ['el', 'la', 'los', 'las', 'de', 'en', 'que', 'un', 'una', 'para', 'por', 'con', 'del', 'al', 'es', 'su', 'este', 'esta', 'como', 'más', 'pero', 'no', 'se', 'son', 'está', 'y', 'o', 'si', 'muy'],
  fr: ['le', 'la', 'les', 'des', 'de', 'du', 'un', 'une', 'et', 'est', 'que', 'qui', 'dans', 'pour', 'avec', 'sur', 'pas', 'plus', 'ce', 'cette', 'au', 'aux', 'ne', 'vous', 'nous', 'sont'],
  de: ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'zu', 'mit', 'für', 'auf', 'nicht', 'sich', 'dem', 'den', 'von', 'im', 'als', 'auch', 'es', 'werden', 'sind', 'bei'],
  it: ['il', 'lo', 'la', 'gli', 'le', 'di', 'del', 'che', 'e', 'è', 'un', 'una', 'per', 'con', 'non', 'si', 'sono', 'questo', 'questa', 'come', 'più', 'ma'],
  pt: ['o', 'a', 'os', 'as', 'de', 'do', 'da', 'que', 'e', 'é', 'um', 'uma', 'para', 'com', 'não', 'se', 'são', 'este', 'esta', 'como', 'mais', 'mas'],
  ca: ['el', 'la', 'els', 'les', 'de', 'del', 'que', 'i', 'un', 'una', 'per', 'amb', 'no', 'és', 'són', 'aquest', 'aquesta', 'com', 'més', 'però'],
  nl: ['de', 'het', 'een', 'en', 'van', 'is', 'dat', 'op', 'te', 'voor', 'met', 'niet', 'zijn', 'als', 'ook'],
  pl: ['i', 'w', 'na', 'z', 'do', 'że', 'jest', 'nie', 'się', 'to', 'dla'],
  sv: ['och', 'att', 'det', 'som', 'en', 'ett', 'är', 'på', 'för', 'med', 'inte'],
  vi: ['và', 'của', 'là', 'có', 'không', 'được', 'trong', 'cho', 'một'],
  id: ['dan', 'yang', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'tidak'],
  tr: ['ve', 'bir', 'bu', 'için', 'ile', 'çok', 'ama']
};

const STOPWORD_INDEX = Object.fromEntries(
  Object.entries(STOPWORDS).map(([code, list]) => [code, new Set(list)])
);

export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'und';

  for (const [re, code] of SCRIPT_RULES) {
    if (re.test(text)) return code;
  }

  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length < 3) return 'und';

  const scores = {};
  let best = 'und';
  let bestScore = 0;
  let secondScore = 0;

  for (const token of tokens) {
    for (const [code, set] of Object.entries(STOPWORD_INDEX)) {
      if (set.has(token)) scores[code] = (scores[code] || 0) + 1;
    }
  }

  for (const [code, score] of Object.entries(scores)) {
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = code;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (bestScore >= 2 && bestScore > secondScore) return best;
  if (best === 'en' && bestScore >= 1 && secondScore === 0) return 'en';
  if (/[áéíóúüñ¿¡]/.test(text)) return 'es';
  return 'und';
}

const NAMES_EN = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese (keep the same script as the input: Traditional or Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  ar: 'Arabic',
  he: 'Hebrew',
  th: 'Thai',
  hi: 'Hindi',
  el: 'Greek',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ca: 'Catalan',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish'
};

const NAMES_ES = {
  en: 'inglés (English)',
  es: 'español',
  zh: 'chino (mantén el mismo sistema de escritura del original: tradicional o simplificado)',
  ja: 'japonés',
  ko: 'coreano',
  ru: 'ruso',
  ar: 'árabe',
  he: 'hebreo',
  th: 'tailandés',
  hi: 'hindi',
  el: 'griego',
  fr: 'francés',
  de: 'alemán',
  it: 'italiano',
  pt: 'portugués',
  ca: 'catalán',
  nl: 'neerlandés',
  pl: 'polaco',
  sv: 'sueco',
  vi: 'vietnamita',
  id: 'indonesio',
  tr: 'turco'
};

export function languageName(code, locale = 'en') {
  const table = locale === 'es' ? NAMES_ES : NAMES_EN;
  if (table[code]) return table[code];
  return locale === 'es' ? 'el mismo idioma que el texto de entrada' : 'the same language as the input text';
}
