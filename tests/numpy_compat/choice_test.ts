import { assertEquals } from "@std/assert";

import fixtures from "./fixtures.json" with { type: "json" };
import { createRandomState } from "../../mod.ts";

Deno.test("choice uniform with replacement matches numpy", () => {
  const rs = createRandomState(42);
  assertEquals(
    Array.from(rs.choice(10, 20) as Float64Array),
    fixtures.choice_uniform,
  );
});

Deno.test("choice weighted with replacement matches numpy", () => {
  const rs = createRandomState(42);
  assertEquals(
    Array.from(
      rs.choice(5, 20, true, [0.1, 0.2, 0.3, 0.2, 0.2]) as Float64Array,
    ),
    fixtures.choice_weighted,
  );
});

Deno.test("choice uniform without replacement matches numpy", () => {
  const rs = createRandomState(42);
  assertEquals(
    Array.from(rs.choice(20, 10, false) as Float64Array),
    fixtures.choice_no_replace,
  );
});

Deno.test("choice weighted without replacement matches numpy", () => {
  const rs = createRandomState(42);
  assertEquals(
    Array.from(
      rs.choice(5, 4, false, [0.1, 0.2, 0.3, 0.2, 0.2]) as Float64Array,
    ),
    fixtures.choice_weighted_no_replace,
  );
});
