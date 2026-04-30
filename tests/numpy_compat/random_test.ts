import { assertEquals } from "@std/assert";

import fixtures from "./fixtures.json" with { type: "json" };
import { createRandomState } from "../../mod.ts";

Deno.test("random matches numpy RandomState random_sample seed 42", () => {
  const rs = createRandomState(42);
  assertEquals(
    Array.from(rs.random(20) as Float64Array),
    fixtures.uniform_seed42,
  );
});
