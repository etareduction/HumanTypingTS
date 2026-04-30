import { assertEquals } from "@std/assert";

import { random } from "../../mod.ts";
import { KeyboardLayout } from "../../src/humantyping/keyboard.ts";
import {
  get_word_difficulty,
  is_common_bigram,
} from "../../src/humantyping/language.ts";

Deno.test("language helpers classify common, normal, and complex words", () => {
  assertEquals(get_word_difficulty("the"), "common");
  assertEquals(get_word_difficulty("'the'"), "common");
  assertEquals(get_word_difficulty("hello"), "normal");
  assertEquals(get_word_difficulty("xylophone"), "complex");
  assertEquals(get_word_difficulty("extraordinary"), "complex");
});

Deno.test("language helpers detect common bigrams", () => {
  assertEquals(is_common_bigram("t", "h"), true);
  assertEquals(is_common_bigram("T", "H"), true);
  assertEquals(is_common_bigram("x", "y"), false);
});

Deno.test("qwerty keyboard helpers match reference layout behavior", () => {
  const keyboard = new KeyboardLayout("qwerty");

  assertEquals(keyboard.has_key("a"), true);
  assertEquals(keyboard.has_key("é"), true);
  assertEquals(keyboard.has_key("😀"), false);
  assertEquals(keyboard.get_neighbor_keys("a"), ["q", "w", "s", "z", "x"]);
  assertEquals(keyboard.get_distance("a", "s"), 1);
  assertEquals(keyboard.get_distance("a", "😀"), 4);
  assertEquals(keyboard.is_direct_accent("é"), false);
  assertEquals(keyboard.is_composed_accent("é"), true);
});

Deno.test("azerty keyboard helpers match reference layout behavior", () => {
  const keyboard = new KeyboardLayout("azerty");

  assertEquals(keyboard.has_key("1"), true);
  assertEquals(keyboard.get_distance("1", "&"), 0);
  assertEquals(keyboard.is_direct_accent("é"), true);
  assertEquals(keyboard.is_composed_accent("â"), true);
});

Deno.test("keyboard random neighbor fallback matches seeded Python reference", () => {
  random.seed(42);
  assertEquals(new KeyboardLayout("qwerty").get_random_neighbor("😀"), "x");

  random.seed(99);
  assertEquals(new KeyboardLayout("qwerty").get_random_neighbor("😀"), "1");
});
