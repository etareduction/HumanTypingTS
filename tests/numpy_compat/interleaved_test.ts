import { assertEquals } from "@std/assert";

import fixtures from "./fixtures.json" with { type: "json" };
import { createRandomState } from "../../mod.ts";

Deno.test({
  name: "interleaved random, normal, and choice calls match numpy",
  sanitizeResources: false,
  fn() {
    const rs = createRandomState(42);
    const actual = [
      rs.random() as number,
      rs.normal() as number,
      rs.choice(10) as number,
      rs.normal() as number,
      rs.random() as number,
      rs.normal() as number,
      rs.choice(5, undefined, true, [0.2, 0.2, 0.2, 0.2, 0.2]) as number,
      rs.normal() as number,
    ];
    assertEquals(actual, fixtures.interleaved);
  },
});
