import { assertThrows } from "@std/assert";

import { MarkovTyper } from "../../mod.ts";
import { ValueError } from "../../src/humantyping/_compat.ts";
import { KeyboardLayout } from "../../src/humantyping/keyboard.ts";

Deno.test("MarkovTyper invalid target_text matches Python error", () => {
  for (const targetText of ["", undefined, 123]) {
    assertThrows(
      () => new MarkovTyper(targetText as string),
      ValueError,
      "target_text must be a non-empty string",
    );
  }
});

Deno.test("MarkovTyper invalid target_wpm matches Python error", () => {
  for (const targetWpm of [0, -1, "x"]) {
    assertThrows(
      () => new MarkovTyper("a", targetWpm as number),
      ValueError,
      "target_wpm must be a positive number",
    );
  }
});

Deno.test("unsupported keyboard layout matches Python error", () => {
  assertThrows(
    () => new KeyboardLayout("dvorak"),
    ValueError,
    "Unsupported layout: 'dvorak'. Use 'qwerty' or 'azerty'.",
  );
});
