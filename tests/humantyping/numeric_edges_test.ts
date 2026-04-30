import { assertEquals, assertThrows } from "@std/assert";

import { MarkovTyper, random } from "../../mod.ts";
import { ValueError } from "../../src/humantyping/_compat.ts";
import { run_monte_carlo } from "../../src/humantyping/simulation.ts";

Deno.test({
  name: "MarkovTyper preserves Python infinite target_wpm behavior",
  sanitizeResources: false,
  fn() {
    random.seed(42);
    const typer = new MarkovTyper("a", Infinity);
    const [total_time, history] = typer.run();

    assertEquals(typer.session_wpm, Infinity);
    assertEquals(typer.base_keystroke_time, 0);
    assertEquals(total_time, 0.02);
    assertEquals(history, [
      [0.0, "INIT (WPM: inf)", ""],
      [0.02, "TYPED 'a'", "a"],
    ]);
  },
});

Deno.test({
  name: "MarkovTyper preserves Python near-zero positive target_wpm behavior",
  sanitizeResources: false,
  fn() {
    random.seed(42);
    const typer = new MarkovTyper("a", 1e-300);
    const [total_time, history] = typer.run();

    assertEquals(typer.session_wpm, 10);
    assertEquals(typer.base_keystroke_time, 1.2);
    assertEquals(total_time, 0.7162120709648644);
    assertEquals(history, [
      [0.0, "INIT (WPM: 10.0)", ""],
      [0.7162120709648644, "TYPED 'a'", "a"],
    ]);
  },
});

Deno.test({
  name: "MarkovTyper preserves Python huge target_wpm behavior",
  sanitizeResources: false,
  fn() {
    random.seed(42);
    const typer = new MarkovTyper("a", 1e300);
    const [total_time, history] = typer.run();

    assertEquals(typer.session_wpm, 1e300);
    assertEquals(typer.base_keystroke_time, 1.1999999999999998e-299);
    assertEquals(total_time, 0.02);
    assertEquals(history[1], [0.02, "TYPED 'a'", "a"]);
  },
});

Deno.test("run_monte_carlo zero simulations matches Python reduction error", () => {
  const originalLog = console.log;
  console.log = () => {};
  try {
    assertThrows(
      () => run_monte_carlo("a", 60, 0),
      ValueError,
      "zero-size array to reduction operation minimum which has no identity",
    );
  } finally {
    console.log = originalLog;
  }
});
