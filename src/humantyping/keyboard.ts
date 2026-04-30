import { FAR_KEY_THRESHOLD } from "./config.ts";
import { random as npRandom } from "../numpy_compat/mod.ts";
import {
  pyChars,
  pyIsUpper,
  pyLower,
  pyNormalizeNfdWithoutMarks,
  pyUpper,
  ValueError,
} from "./_compat.ts";

function setFromString(value: string): Set<string> {
  return new Set(pyChars(value));
}

/**
 * Keyboard layout model for key positions, neighbor lookup, and accent handling.
 */
export class KeyboardLayout {
  layout_name: string;
  grid: string[][];
  pos_map: Map<string, [number, number]>;
  direct_accents: Set<string>;
  composed_accents: Set<string>;

  constructor(layout_name = "qwerty") {
    this.layout_name = layout_name;
    this.grid = this._load_layout(layout_name);
    this.pos_map = this._build_pos_map();

    if (layout_name === "azerty") {
      this.direct_accents = setFromString("éèàùç");
      this.composed_accents = setFromString("âêîôûäëïöü");
    } else {
      // QWERTY has no direct accent keys
      this.direct_accents = new Set();
      this.composed_accents = setFromString("âêîôûäëïöüéèàùç");
    }
  }

  _load_layout(name: string): string[][] {
    if (name === "qwerty") {
      return [
        pyChars("`1234567890-="),
        pyChars("qwertyuiop[]\\"),
        pyChars("asdfghjkl;'"),
        pyChars("zxcvbnm,./"),
      ];
    } else if (name === "azerty") {
      return [
        pyChars("&é\"'(-è_çà)="),
        pyChars("azertyuiop^$"),
        pyChars("qsdfghjklmù*"),
        pyChars("wxcvbn,;:!"),
      ];
    } else {
      throw new ValueError(
        `Unsupported layout: '${name}'. Use 'qwerty' or 'azerty'.`,
      );
    }
  }

  _build_pos_map(): Map<string, [number, number]> {
    const mapping = new Map<string, [number, number]>();
    for (let r = 0; r < this.grid.length; r++) {
      const row = this.grid[r];
      for (let c = 0; c < row.length; c++) {
        const char = row[c];
        mapping.set(char, [r, c]);
      }
    }

    // AZERTY: map digits to the same positions as row 0 characters
    if (this.layout_name === "azerty") {
      const azerty_row0 = pyChars("&é\"'(-è_çà)");
      const azerty_digits = pyChars("1234567890");
      for (let i = 0; i < azerty_digits.length; i++) {
        const digit = azerty_digits[i];
        const base_char = azerty_row0[i];
        if (mapping.has(base_char) && !mapping.has(digit)) {
          mapping.set(digit, mapping.get(base_char)!);
        }
      }
    }

    return mapping;
  }

  /**
   * Normalize a character for keyboard position lookup.
   */
  _normalize_char(char: string): string {
    char = pyLower(char);
    if (this.composed_accents.has(char)) {
      return pyNormalizeNfdWithoutMarks(char);
    }
    return char;
  }

  /**
   * Check if a character exists on this keyboard layout.
   */
  has_key(char: string): boolean {
    return this.pos_map.has(this._normalize_char(char));
  }

  /**
   * Return the neighboring keys for a given character.
   */
  get_neighbor_keys(char: string): string[] {
    const normalized = this._normalize_char(char);

    if (!this.pos_map.has(normalized)) {
      return [];
    }

    const [r, c] = this.pos_map.get(normalized)!;
    const neighbors: string[] = [];

    const deltas = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    for (const [dr, dc] of deltas) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        0 <= nr && nr < this.grid.length && 0 <= nc &&
        nc < this.grid[nr].length
      ) {
        neighbors.push(this.grid[nr][nc]);
      }
    }

    return neighbors;
  }

  /**
   * Calculate the Euclidean distance between two keys.
   */
  get_distance(char1: string, char2: string): number {
    const norm1 = this._normalize_char(char1);
    const norm2 = this._normalize_char(char2);

    if (!this.pos_map.has(norm1) || !this.pos_map.has(norm2)) {
      return FAR_KEY_THRESHOLD;
    }

    const [r1, c1] = this.pos_map.get(norm1)!;
    const [r2, c2] = this.pos_map.get(norm2)!;

    return Math.sqrt((r1 - r2) ** 2 + (c1 - c2) ** 2);
  }

  /**
   * Return a random neighboring key, preserving case.
   */
  get_random_neighbor(char: string): string {
    const was_upper = pyIsUpper(char);
    const neighbors = this.get_neighbor_keys(char);
    let result: string;
    if (neighbors.length === 0) {
      const flat_grid = this.grid.flat();
      result = flat_grid[npRandom.choice(flat_grid.length) as number];
    } else {
      result = neighbors[npRandom.choice(neighbors.length) as number];
    }
    return was_upper ? pyUpper(result) : result;
  }

  /**
   * Return whether the character is typed with a direct accent key.
   */
  is_direct_accent(char: string): boolean {
    return this.direct_accents.has(pyLower(char));
  }

  /**
   * Return whether the character uses a composed accent sequence.
   */
  is_composed_accent(char: string): boolean {
    return this.composed_accents.has(pyLower(char));
  }
}
