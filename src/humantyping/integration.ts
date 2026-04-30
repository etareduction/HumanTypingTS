import { delay as sleep } from "@std/async/delay";
import type { ElementHandle, Locator } from "playwright";

import { pyChars, pyLen, ValueError } from "./_compat.ts";
import { DEFAULT_WPM } from "./config.ts";
import { MarkovTyper } from "./typer.ts";

/**
 * Playwright target that supports key presses.
 */
export type PlaywrightTypeTarget =
  | Pick<Locator, "press">
  | Pick<ElementHandle, "press">;

/**
 * Extract the typed character(s) from an action string like `TYPED 'x'` or
 * `TYPED_SWAP 'ht'`.
 */
export function _extract_char(action: string): string {
  const first_quote = action.indexOf("'");
  const last_quote = action.lastIndexOf("'");
  if (first_quote === -1 || last_quote === -1) {
    throw new ValueError("substring not found");
  }
  return action.slice(first_quote + 1, last_quote);
}

export async function _press_action(
  page_element: PlaywrightTypeTarget,
  action: string,
): Promise<void> {
  if (action.includes("BACKSPACE")) {
    await page_element.press("Backspace");
  } else if (action.includes("TYPED_SWAP")) {
    for (const char of pyChars(_extract_char(action))) {
      await page_element.press(char);
    }
  } else if (action.includes("TYPED_ERROR")) {
    const char = _extract_char(action);
    await page_element.press(char);
  } else if (action.includes("TYPED")) {
    const char = _extract_char(action);
    await page_element.press(char);
  }
}

/**
 * A helper class to integrate realistic typing into automation frameworks
 * like Playwright.
 *
 * @example
 * ```ts
 * const typer = new HumanTyper(70);
 * const input = page.locator("input[name='search']");
 * await input.click();
 * await typer.type(input, "Hello world!");
 * ```
 */
export class HumanTyper {
  wpm: number;
  layout: string;

  constructor(wpm: number = DEFAULT_WPM, layout = "qwerty") {
    if (typeof wpm !== "number" || wpm <= 0) {
      throw new ValueError("wpm must be a positive number");
    }
    this.wpm = wpm;
    this.layout = layout;
  }

  /**
   * Types text into a Playwright element with realistic human behavior.
   *
   * This simulates variable typing speed based on word complexity, realistic
   * errors, natural corrections with backspace, and fatigue over longer texts.
   *
   * @param page_element Playwright `Locator` or `ElementHandle` to type into.
   * @param text Text to type with human-like behavior.
   */
  async type(page_element: PlaywrightTypeTarget, text: string): Promise<void> {
    if (typeof text !== "string" || pyLen(text) === 0) {
      throw new ValueError("text must be a non-empty string");
    }

    const typer = new MarkovTyper(text, this.wpm, this.layout);
    const [, history] = typer.run();

    let last_time = 0.0;

    for (const [t, action] of history) {
      const delay = t - last_time;
      if (delay > 0) {
        await sleep(delay * 1000);
      }
      last_time = t;

      await _press_action(page_element, action);
    }
  }
}
