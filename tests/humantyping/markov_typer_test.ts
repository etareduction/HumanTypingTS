import { assertEquals } from "@std/assert";

import fixtures from "./markov_fixtures.json" with { type: "json" };
import { MarkovTyper, random } from "../../mod.ts";

type MarkovFixture = {
  seed: number;
  text: string;
  target_wpm: number;
  layout: string;
  total_time: number;
  history: [number, string, string][];
};

for (
  const [name, fixture] of Object.entries(
    fixtures as unknown as Record<string, MarkovFixture>,
  )
) {
  Deno.test({
    name: `MarkovTyper matches HumanTyping fixture ${name}`,
    sanitizeResources: false,
    fn() {
      random.seed(fixture.seed);
      const typer = new MarkovTyper(
        fixture.text,
        fixture.target_wpm,
        fixture.layout,
      );
      const [total_time, history] = typer.run();

      assertEquals(total_time, fixture.total_time);
      assertEquals(history, fixture.history);
    },
  });
}

Deno.test({
  name: "MarkovTyper preserves Python NaN target_wpm behavior",
  sanitizeResources: false,
  fn() {
    random.seed(5);
    const typer = new MarkovTyper("a", Number.NaN);
    const [total_time, history] = typer.run();

    assertEquals(typer.session_wpm, 10);
    assertEquals(typer.base_keystroke_time, 1.2);
    assertEquals(total_time, 0.7104338954431773);
    assertEquals(history, [
      [0.0, "INIT (WPM: 10.0)", ""],
      [0.7104338954431773, "TYPED 'a'", "a"],
    ]);
  },
});
