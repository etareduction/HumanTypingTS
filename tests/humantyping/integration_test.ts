import { assertEquals, assertRejects, assertThrows } from "@std/assert";

import { HumanTyper, random } from "../../mod.ts";
import {
  _extract_char,
  _press_action,
} from "../../src/humantyping/integration.ts";
import { ValueError } from "../../src/humantyping/_compat.ts";

function pressRecorder(): {
  pressed: string[];
  target: { press(key: string): Promise<void> };
} {
  const pressed: string[] = [];
  return {
    pressed,
    target: {
      press(key: string): Promise<void> {
        pressed.push(key);
        return Promise.resolve();
      },
    },
  };
}

Deno.test("_extract_char matches Python action parsing", () => {
  assertEquals(_extract_char("TYPED 'x'"), "x");
  assertEquals(_extract_char("TYPED_ERROR '6'"), "6");
  assertEquals(_extract_char("TYPED_SWAP 'ht'"), "ht");
  assertEquals(_extract_char("TYPED ''"), "");

  assertThrows(
    () => _extract_char("BACKSPACE"),
    ValueError,
    "substring not found",
  );
  assertThrows(
    () => _extract_char("TYPED x"),
    ValueError,
    "substring not found",
  );
});

Deno.test("_press_action covers integration event branches", async () => {
  const { pressed, target } = pressRecorder();

  await _press_action(target, "TYPED 'a'");
  await _press_action(target, "TYPED_ERROR '6'");
  await _press_action(target, "TYPED_SWAP '😀b'");
  await _press_action(target, "BACKSPACE");

  assertEquals(pressed, ["a", "6", "😀", "b", "Backspace"]);
});

Deno.test({
  name: "HumanTyper presses Playwright target keys in generated order",
  sanitizeResources: false,
  async fn() {
    random.seed(11);
    const { pressed, target } = pressRecorder();

    await new HumanTyper(1_000_000).type(target, "😀");

    assertEquals(pressed, ["😀"]);
  },
});

Deno.test("HumanTyper.type invalid text matches Python error", async () => {
  const { target } = pressRecorder();

  await assertRejects(
    () => new HumanTyper().type(target, ""),
    ValueError,
    "text must be a non-empty string",
  );
  await assertRejects(
    () => new HumanTyper().type(target, undefined as unknown as string),
    ValueError,
    "text must be a non-empty string",
  );
});

Deno.test("HumanTyper constructor invalid wpm matches Python error", () => {
  for (const wpm of [0, -1, "x"]) {
    assertThrows(
      () => new HumanTyper(wpm as number),
      ValueError,
      "wpm must be a positive number",
    );
  }
});
