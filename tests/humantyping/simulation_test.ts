import { assertEquals } from "@std/assert";

import { random } from "../../mod.ts";
import {
  _demo_replay_text,
  run_monte_carlo,
} from "../../src/humantyping/simulation.ts";

Deno.test({
  name: "run_monte_carlo returns deterministic seeded values",
  sanitizeResources: false,
  fn() {
    const originalLog = console.log;
    console.log = () => {};
    try {
      random.seed(42);
      assertEquals(run_monte_carlo("a", 60, 2), [
        0.10673273818124683,
        0.15693660994558992,
      ]);
    } finally {
      console.log = originalLog;
    }
  },
});

Deno.test("demo replay text covers additions, deletions, newlines, and divergence", () => {
  assertEquals(_demo_replay_text("ab", "ab😀"), "😀");
  assertEquals(_demo_replay_text("ab😀", "ab"), "\b \b");
  assertEquals(_demo_replay_text("a\nbc", "a"), "\b \b\b \b\x1b[A\x1b[2G");
  assertEquals(_demo_replay_text("abc", "ax"), "\r\x1b[Jax");
});
