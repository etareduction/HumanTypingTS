import { assertEquals } from "@std/assert";

import fixtures from "./fixtures.json" with { type: "json" };
import { createRandomState } from "../../mod.ts";

Deno.test("random state exposes only random, normal, and choice", () => {
  const rs = createRandomState(42);
  assertEquals(Object.keys(rs).sort(), ["choice", "normal", "random"]);
});

Deno.test("random matches numpy RandomState random_sample seed 42", () => {
  const rs = createRandomState(42);
  assertEquals(
    Array.from(rs.random(20) as Float64Array),
    fixtures.uniform_seed42,
  );
});
