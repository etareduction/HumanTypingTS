import { random as npRandom } from "../numpy_compat/mod.ts";
import {
  AVG_WORD_LENGTH,
  CLOSE_KEY_THRESHOLD,
  COMMON_WORD_ERROR_MULT,
  COMPLEX_WORD_ERROR_MULT,
  COMPOSED_ACCENT_ERROR_MULT,
  DEFAULT_WPM,
  DRIFT_CORRECTION_PROB,
  FAR_KEY_PENALTY,
  FAR_KEY_THRESHOLD,
  FATIGUE_CAP,
  FATIGUE_FACTOR,
  MIN_BACKSPACE_TIME,
  MIN_KEYSTROKE_TIME,
  MIN_REACTION_TIME,
  MIN_SPEED_MULTIPLIER,
  PROB_ERROR,
  PROB_NOTICE_ERROR,
  PROB_SWAP_ERROR,
  SPEED_BOOST_BIGRAM,
  SPEED_BOOST_CLOSE_KEYS,
  SPEED_BOOST_COMMON_WORD,
  SPEED_PENALTY_COMPLEX_WORD,
  TIME_BACKSPACE_MEAN,
  TIME_BACKSPACE_STD,
  TIME_COMPOSED_ACCENT_PENALTY,
  TIME_DIRECT_ACCENT_PENALTY,
  TIME_KEYSTROKE_STD,
  TIME_REACTION_MEAN,
  TIME_REACTION_STD,
  TIME_SPACE_PAUSE_MEAN,
  TIME_SPACE_PAUSE_STD,
  TIME_UPPERCASE_PENALTY,
  WPM_STD,
} from "./config.ts";
import { KeyboardLayout } from "./keyboard.ts";
import { get_word_difficulty, is_common_bigram } from "./language.ts";
import {
  pyCharAt,
  pyFormatFixed,
  pyIsUpper,
  pyLen,
  pyMax,
  pyMin,
  pySlice,
  ValueError,
} from "./_compat.ts";

export type HistoryEvent = [number, string, string];

/**
 * Mutable state for a typing simulation.
 */
export class TypingState {
  current_text = "";
  target_text = "";
  total_time = 0.0;
  history: HistoryEvent[] = [];
  last_char_typed: string | null = null;
  fatigue_multiplier = 1.0;
  mental_cursor_pos = 0;

  constructor(target_text = "") {
    this.target_text = target_text;
  }
}

/**
 * Markov-chain based simulator for realistic human typing behavior.
 *
 * It models variable speed, neighboring-key errors, swap errors, natural
 * corrections, pauses, and fatigue while producing a history of typing events.
 */
export class MarkovTyper {
  target_text: string;
  keyboard: KeyboardLayout;
  state: TypingState;
  session_wpm: number;
  base_keystroke_time: number;

  constructor(
    target_text: string,
    target_wpm: number = DEFAULT_WPM,
    layout = "qwerty",
  ) {
    if (typeof target_text !== "string" || pyLen(target_text) === 0) {
      throw new ValueError("target_text must be a non-empty string");
    }
    if (typeof target_wpm !== "number" || target_wpm <= 0) {
      throw new ValueError("target_wpm must be a positive number");
    }

    this.target_text = target_text;
    this.keyboard = new KeyboardLayout(layout);
    this.state = new TypingState(target_text);

    this.session_wpm = npRandom.normal(target_wpm, WPM_STD) as number;
    this.session_wpm = pyMax(10, this.session_wpm);
    this.base_keystroke_time = 60 / (this.session_wpm * AVG_WORD_LENGTH);

    this.state.history.push([
      0.0,
      `INIT (WPM: ${pyFormatFixed(this.session_wpm, 1)})`,
      "",
    ]);
  }

  /**
   * Return the target word around the simulated mental cursor.
   */
  _get_current_word_context(): string | null {
    const idx = this.state.mental_cursor_pos;
    if (idx >= pyLen(this.target_text)) {
      return null;
    }
    let start = idx;
    while (start > 0 && pyCharAt(this.target_text, start - 1) !== " ") {
      start -= 1;
    }
    let end = idx;
    while (
      end < pyLen(this.target_text) && pyCharAt(this.target_text, end) !== " "
    ) {
      end += 1;
    }
    return pySlice(this.target_text, start, end);
  }

  /**
   * Calculate the delay for typing one character.
   */
  _calculate_keystroke_time(char_to_type: string): number {
    let keystroke_time = this.base_keystroke_time *
      this.state.fatigue_multiplier;

    const current_word = this._get_current_word_context();
    if (current_word) {
      const difficulty = get_word_difficulty(current_word);
      if (difficulty === "common") {
        keystroke_time *= SPEED_BOOST_COMMON_WORD;
      } else if (difficulty === "complex") {
        keystroke_time *= SPEED_PENALTY_COMPLEX_WORD;
      }
    }

    if (this.state.last_char_typed) {
      if (is_common_bigram(this.state.last_char_typed, char_to_type)) {
        keystroke_time *= SPEED_BOOST_BIGRAM;
      } else {
        const dist = this.keyboard.get_distance(
          this.state.last_char_typed,
          char_to_type,
        );
        if (0 < dist && dist < CLOSE_KEY_THRESHOLD) {
          keystroke_time *= SPEED_BOOST_CLOSE_KEYS;
        } else if (dist > FAR_KEY_THRESHOLD) {
          keystroke_time *= FAR_KEY_PENALTY;
        }
      }
    }

    if (char_to_type === " ") {
      keystroke_time += npRandom.normal(
        TIME_SPACE_PAUSE_MEAN,
        TIME_SPACE_PAUSE_STD,
      ) as number;
    } else if (this.keyboard.is_composed_accent(char_to_type)) {
      keystroke_time += TIME_COMPOSED_ACCENT_PENALTY;
    } else if (this.keyboard.is_direct_accent(char_to_type)) {
      keystroke_time += TIME_DIRECT_ACCENT_PENALTY;
    } else if (pyIsUpper(char_to_type)) {
      keystroke_time += TIME_UPPERCASE_PENALTY;
    }

    // Apply floor to prevent unrealistic stacking of boosts
    keystroke_time = pyMax(
      MIN_SPEED_MULTIPLIER * this.base_keystroke_time,
      keystroke_time,
    );

    const dt = npRandom.normal(keystroke_time, TIME_KEYSTROKE_STD) as number;
    return pyMax(MIN_KEYSTROKE_TIME, dt);
  }

  /**
   * Advance the simulation by one event.
   *
   * @returns The emitted history event, or `null` when typing is complete.
   */
  step(): HistoryEvent | null {
    // 1. Check for completion
    if (this.state.current_text === this.target_text) {
      return null;
    }

    // --- MONITORING & CORRECTION PHASE ---

    // Calculate divergence point
    let first_error_pos = pyLen(this.target_text);
    const min_len = pyMin(
      pyLen(this.state.current_text),
      pyLen(this.target_text),
    );
    for (let i = 0; i < min_len; i++) {
      if (
        pyCharAt(this.state.current_text, i) !== pyCharAt(this.target_text, i)
      ) {
        first_error_pos = i;
        break;
      }
    }

    // Also consider over-typing as an error
    if (
      pyLen(this.state.current_text) > pyLen(this.target_text) &&
      first_error_pos === pyLen(this.target_text)
    ) {
      first_error_pos = pyLen(this.target_text);
    }

    // Do we have an error?
    if (first_error_pos < pyLen(this.state.current_text)) {
      let should_correct = false;

      const last_action = this.state.history.length
        ? this.state.history[this.state.history.length - 1][1]
        : "";

      // Case 0: CONTINUED BACKSPACING (Critical)
      if (last_action.includes("BACKSPACE")) {
        should_correct = true;
      } // Case A: End of text (Always correct)
      else if (this.state.mental_cursor_pos >= pyLen(this.target_text)) {
        should_correct = true;
      } // Case B: End of Word / Context Check
      else if (pyLen(this.state.current_text) > 0) {
        const last_char = pyCharAt(
          this.state.current_text,
          pyLen(this.state.current_text) - 1,
        );
        const distance = pyLen(this.state.current_text) - first_error_pos;

        // Check at word boundaries (Strict)
        if (" \n\t.,;!?:()[]{}<>\"'".includes(last_char)) {
          should_correct = true;
        } // Drift Check (Don't let errors linger)
        else if (distance >= 2) {
          if ((npRandom.random() as number) < DRIFT_CORRECTION_PROB) {
            should_correct = true;
          }
        } // Immediate reaction (1 char past error)
        else if (distance === 1) {
          if ((npRandom.random() as number) < PROB_NOTICE_ERROR) {
            should_correct = true;
          }
        }
      }

      if (should_correct) {
        // Reaction time (only if we weren't already backspacing)
        if (!last_action.includes("BACKSPACE")) {
          const dt = npRandom.normal(
            TIME_REACTION_MEAN,
            TIME_REACTION_STD,
          ) as number;
          this.state.total_time += pyMax(MIN_REACTION_TIME, dt);
        }

        // Perform Backspace
        const dt = pyMax(
          MIN_BACKSPACE_TIME,
          npRandom.normal(TIME_BACKSPACE_MEAN, TIME_BACKSPACE_STD) as number,
        );
        this.state.total_time += dt;
        this.state.current_text = pySlice(this.state.current_text, 0, -1);

        const event: HistoryEvent = [
          this.state.total_time,
          "BACKSPACE",
          this.state.current_text,
        ];
        this.state.history.push(event);

        // Sync mental cursor immediately
        this.state.mental_cursor_pos = pyLen(this.state.current_text);
        return event;
      }
    }

    // --- TYPING PHASE ---

    // Sync mental cursor if we backspaced (redundant safety)
    if (this.state.mental_cursor_pos > pyLen(this.state.current_text)) {
      this.state.mental_cursor_pos = pyLen(this.state.current_text);
    }

    if (this.state.mental_cursor_pos >= pyLen(this.target_text)) {
      return null;
    }

    const char_intended = pyCharAt(
      this.target_text,
      this.state.mental_cursor_pos,
    );

    // If the character is not on our keyboard, type it literally (no error modeling)
    if (!this.keyboard.has_key(char_intended) && char_intended !== " ") {
      this.state.fatigue_multiplier = pyMin(
        FATIGUE_CAP,
        this.state.fatigue_multiplier * FATIGUE_FACTOR,
      );
      let dt = this.base_keystroke_time * this.state.fatigue_multiplier;
      dt = pyMax(
        MIN_KEYSTROKE_TIME,
        npRandom.normal(dt, TIME_KEYSTROKE_STD) as number,
      );
      this.state.total_time += dt;
      this.state.current_text += char_intended;
      this.state.last_char_typed = char_intended;
      const event: HistoryEvent = [
        this.state.total_time,
        `TYPED '${char_intended}'`,
        this.state.current_text,
      ];
      this.state.history.push(event);
      this.state.mental_cursor_pos += 1;
      return event;
    }

    this.state.fatigue_multiplier = pyMin(
      FATIGUE_CAP,
      this.state.fatigue_multiplier * FATIGUE_FACTOR,
    );

    // Swap Error (Anticipation)
    // Example: "the" -> "hte". We type char_after first, then char_intended.
    if (pyLen(this.target_text) > this.state.mental_cursor_pos + 1) {
      const char_after = pyCharAt(
        this.target_text,
        this.state.mental_cursor_pos + 1,
      );
      if (char_after !== " " && char_after !== char_intended) {
        if ((npRandom.random() as number) < PROB_SWAP_ERROR) {
          // Type the anticipated character first
          const dt1 = this._calculate_keystroke_time(char_after);
          this.state.total_time += dt1;
          this.state.current_text += char_after;

          // Then type the intended character (producing a real swap)
          const dt2 = this._calculate_keystroke_time(char_intended);
          this.state.total_time += dt2;
          this.state.current_text += char_intended;

          this.state.last_char_typed = char_intended;
          const event: HistoryEvent = [
            this.state.total_time,
            `TYPED_SWAP '${char_after}${char_intended}'`,
            this.state.current_text,
          ];
          this.state.history.push(event);
          this.state.mental_cursor_pos += 2;
          return event;
        }
      }
    }

    // Normal Typing (Success or Error)
    let current_prob_error = PROB_ERROR;
    const word_diff = get_word_difficulty(
      this._get_current_word_context() || "",
    );
    if (word_diff === "complex") {
      current_prob_error *= COMPLEX_WORD_ERROR_MULT;
    } else if (word_diff === "common") {
      current_prob_error *= COMMON_WORD_ERROR_MULT;
    }
    if (this.keyboard.is_composed_accent(char_intended)) {
      current_prob_error *= COMPOSED_ACCENT_ERROR_MULT;
    }

    if ((npRandom.random() as number) < current_prob_error) {
      // Generate Error
      const wrong_char = this.keyboard.get_random_neighbor(char_intended);
      const dt = this._calculate_keystroke_time(wrong_char);
      this.state.total_time += dt;
      this.state.current_text += wrong_char;
      this.state.last_char_typed = wrong_char;
      const event: HistoryEvent = [
        this.state.total_time,
        `TYPED_ERROR '${wrong_char}'`,
        this.state.current_text,
      ];
      this.state.history.push(event);
      this.state.mental_cursor_pos += 1;
    } else {
      // Success
      const dt = this._calculate_keystroke_time(char_intended);
      this.state.total_time += dt;
      this.state.current_text += char_intended;
      this.state.last_char_typed = char_intended;
      const event: HistoryEvent = [
        this.state.total_time,
        `TYPED '${char_intended}'`,
        this.state.current_text,
      ];
      this.state.history.push(event);
      this.state.mental_cursor_pos += 1;
    }

    return this.state.history[this.state.history.length - 1];
  }

  /**
   * Run the simulation until completion.
   *
   * @returns A tuple containing total simulated time and the full event history.
   */
  run(): [number, HistoryEvent[]] {
    let steps = 0;
    const max_steps = pyLen(this.target_text) * 10;
    while (this.step() !== null) {
      steps += 1;
      if (steps > max_steps) {
        break;
      }
    }
    return [this.state.total_time, this.state.history];
  }
}
