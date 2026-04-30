import { assertEquals } from "@std/assert";

import { type HistoryEvent, MarkovTyper } from "../../mod.ts";

class NonTerminatingTyper extends MarkovTyper {
  emitted = 0;

  override step(): HistoryEvent | null {
    this.emitted += 1;
    const event: HistoryEvent = [this.emitted, "LOOP", this.state.current_text];
    this.state.history.push(event);
    return event;
  }
}

Deno.test({
  name: "MarkovTyper.run stops after the reference max-step guard",
  sanitizeResources: false,
  fn() {
    const typer = new NonTerminatingTyper("a");
    const [, history] = typer.run();

    assertEquals(typer.emitted, 11);
    assertEquals(history.length, 12);
    assertEquals(history.at(-1), [11, "LOOP", ""]);
  },
});
