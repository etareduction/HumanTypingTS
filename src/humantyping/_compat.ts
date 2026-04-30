/**
 * Python compatibility helpers for places where JavaScript string or numeric
 * semantics can differ from the reference implementation.
 */

/**
 * JavaScript equivalent for Python `ValueError`.
 */
export class ValueError extends Error {
  override name = "ValueError";
}

/**
 * Return Python-style string characters.
 *
 * Python indexes strings by Unicode code point. JavaScript indexes strings by
 * UTF-16 code unit, so direct `value[i]` access can split non-BMP characters.
 */
export function pyChars(value: string): string[] {
  return Array.from(value);
}

/**
 * Return Python-style `len(value)` for strings.
 */
export function pyLen(value: string): number {
  return pyChars(value).length;
}

/**
 * Return a Python-style string index.
 */
export function pyCharAt(value: string, index: number): string {
  const chars = pyChars(value);
  const normalized = index < 0 ? chars.length + index : index;
  if (normalized < 0 || normalized >= chars.length) {
    throw new RangeError("string index out of range");
  }
  return chars[normalized];
}

function normalizeSliceIndex(
  index: number | undefined,
  length: number,
): number {
  if (index === undefined) {
    return length;
  }
  if (index < 0) {
    return Math.max(0, length + index);
  }
  return Math.min(index, length);
}

/**
 * Return a Python-style string slice for code-point indexes.
 */
export function pySlice(
  value: string,
  start = 0,
  end?: number,
): string {
  const chars = pyChars(value);
  const from = normalizeSliceIndex(start, chars.length);
  const to = normalizeSliceIndex(end, chars.length);
  return chars.slice(from, to).join("");
}

/**
 * Return Python `str.strip(chars)` behavior.
 */
export function pyStripChars(value: string, chars: string): string {
  const valueChars = pyChars(value);
  const stripChars = new Set(pyChars(chars));
  let start = 0;
  let end = valueChars.length;
  while (start < end && stripChars.has(valueChars[start])) {
    start += 1;
  }
  while (end > start && stripChars.has(valueChars[end - 1])) {
    end -= 1;
  }
  return valueChars.slice(start, end).join("");
}

/**
 * Return Python `str.isupper()` behavior for a single character.
 */
export function pyIsUpper(char: string): boolean {
  return char.toUpperCase() === char && char.toLowerCase() !== char;
}

/**
 * Return Python-style lowercase conversion.
 */
export function pyLower(value: string): string {
  return value.toLowerCase();
}

/**
 * Return Python-style uppercase conversion.
 */
export function pyUpper(value: string): string {
  return value.toUpperCase();
}

/**
 * Return Python-style `max` comparison order.
 *
 * Unlike `Math.max`, Python's `max(10, nan)` returns `10` because the later
 * `nan > 10` comparison is false.
 */
export function pyMax(first: number, ...rest: number[]): number {
  let result = first;
  for (const value of rest) {
    if (value > result) {
      result = value;
    }
  }
  return result;
}

/**
 * Return Python-style `min` comparison order.
 */
export function pyMin(first: number, ...rest: number[]): number {
  let result = first;
  for (const value of rest) {
    if (value < result) {
      result = value;
    }
  }
  return result;
}

/**
 * Return Python f-string fixed-point formatting for the non-finite values used
 * by the reference implementation.
 */
export function pyFormatFixed(value: number, digits: number): string {
  if (value === Infinity) {
    return "inf";
  }
  if (value === -Infinity) {
    return "-inf";
  }
  if (Number.isNaN(value)) {
    return "nan";
  }
  return value.toFixed(digits);
}

/**
 * Approximate Python `unicodedata.normalize("NFD", value)` followed by
 * filtering characters whose Unicode category is `Mn`.
 */
export function pyNormalizeNfdWithoutMarks(value: string): string {
  return pyChars(value.normalize("NFD")).filter((c) => !/\p{Mark}/u.test(c))
    .join("");
}
