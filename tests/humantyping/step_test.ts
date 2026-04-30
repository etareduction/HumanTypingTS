import { assertEquals } from "@std/assert";

import fixtures from "./step_fixtures.json" with { type: "json" };
import { MarkovTyper, random } from "../../mod.ts";

type StepSnapshot = {
  event: [number, string, string];
  current_text: string;
  total_time: number;
  last_char_typed: string | null;
  fatigue_multiplier: number;
  mental_cursor_pos: number;
  history_len: number;
};

type StepFixture = {
  seed: number;
  text: string;
  target_wpm: number;
  layout: string;
  session_wpm: number;
  base_keystroke_time: number;
  steps: StepSnapshot[];
};

for (
  const [name, fixture] of Object.entries(
    fixtures as unknown as Record<string, StepFixture>,
  )
) {
  Deno.test({
    name: `MarkovTyper manual step state matches Python fixture ${name}`,
    sanitizeResources: false,
    fn() {
      random.seed(fixture.seed);
      const typer = new MarkovTyper(
        fixture.text,
        fixture.target_wpm,
        fixture.layout,
      );

      assertEquals(typer.session_wpm, fixture.session_wpm);
      assertEquals(typer.base_keystroke_time, fixture.base_keystroke_time);

      for (const snapshot of fixture.steps) {
        assertEquals(typer.step(), snapshot.event);
        assertEquals(typer.state.current_text, snapshot.current_text);
        assertEquals(typer.state.total_time, snapshot.total_time);
        assertEquals(typer.state.last_char_typed, snapshot.last_char_typed);
        assertEquals(
          typer.state.fatigue_multiplier,
          snapshot.fatigue_multiplier,
        );
        assertEquals(typer.state.mental_cursor_pos, snapshot.mental_cursor_pos);
        assertEquals(typer.state.history.length, snapshot.history_len);
      }

      assertEquals(typer.step(), null);
    },
  });
}
