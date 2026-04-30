// List of very common English words
export const COMMON_WORDS: Set<string> = new Set([
  "the",
  "be",
  "to",
  "of",
  "and",
  "a",
  "in",
  "that",
  "have",
  "it",
  "for",
  "not",
  "on",
  "with",
  "he",
  "as",
  "you",
  "do",
  "at",
  "this",
  "but",
  "his",
  "by",
  "from",
  "they",
  "we",
  "say",
  "her",
  "she",
  "or",
  "an",
  "will",
  "my",
  "one",
  "all",
  "would",
  "there",
  "their",
  "what",
  "so",
  "up",
  "out",
  "if",
  "about",
  "who",
  "get",
  "which",
  "go",
  "me",
  "when",
  "make",
  "can",
  "like",
  "time",
  "no",
  "just",
  "him",
  "know",
  "take",
  "people",
  "into",
  "year",
  "your",
  "good",
  "some",
  "could",
  "them",
  "see",
  "other",
  "than",
  "then",
  "now",
  "look",
  "only",
  "come",
  "its",
  "over",
  "think",
  "also",
  "back",
  "after",
  "use",
  "two",
  "how",
  "our",
  "work",
  "first",
  "well",
  "way",
  "even",
  "new",
  "want",
  "because",
]);

// Common bigrams in English (for burst typing)
export const COMMON_BIGRAMS: Set<string> = new Set([
  "th",
  "he",
  "in",
  "er",
  "an",
  "re",
  "on",
  "at",
  "en",
  "nd",
  "ti",
  "es",
  "or",
  "te",
  "of",
  "ed",
  "is",
  "it",
  "al",
  "ar",
  "st",
  "to",
  "nt",
  "ng",
  "se",
  "ha",
  "as",
  "ou",
  "io",
  "le",
  "ve",
  "co",
  "me",
  "de",
  "hi",
  "ri",
  "ro",
  "ic",
  "ne",
  "ea",
  "ra",
  "ce",
]);

export const PUNCTUATION_CHARS = ".,!?;:'\"-()[]{}/";

/**
 * Classify a word as `common`, `complex`, or `normal`.
 */
export function get_word_difficulty(word: string): string {
  const word_lower = pyStripChars(pyLower(word), PUNCTUATION_CHARS);
  if (COMMON_WORDS.has(word_lower)) {
    return "common";
  }
  const is_long = pyLen(word_lower) > 8;
  const has_complex_chars = pyChars(word_lower).some((c) => "zxqj".includes(c));
  if (is_long || has_complex_chars) {
    return "complex";
  }
  return "normal";
}

/**
 * Check whether two adjacent characters form a common English bigram.
 */
export function is_common_bigram(char1: string, char2: string): boolean {
  const bigram = pyLower(char1 + char2);
  return COMMON_BIGRAMS.has(bigram);
}
import { pyChars, pyLen, pyLower, pyStripChars } from "./_compat.ts";
