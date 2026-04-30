import { assertEquals } from "@std/assert";

import fixtures from "./fixtures.json" with { type: "json" };
import { createRandomState } from "../../mod.ts";
import {
  hasPlatformLibm,
  withFallbackLibmForTest,
} from "../../src/numpy_compat/_libm.ts";

Deno.test({
  name: "normal matches numpy RandomState seed 42",
  sanitizeResources: false,
  fn() {
    const rs = createRandomState(42);
    assertEquals(
      Array.from(rs.normal(0, 1, 20) as Float64Array),
      fixtures.normal_seed42,
    );
  },
});

Deno.test({
  name: "normal matches numpy RandomState seed 7",
  sanitizeResources: false,
  fn() {
    const rs = createRandomState(7);
    assertEquals(
      Array.from(rs.normal(0, 1, 20) as Float64Array),
      fixtures.normal_seed7,
    );
  },
});

Deno.test("normal fallback path matches fixture coverage", () => {
  withFallbackLibmForTest(() => {
    let rs = createRandomState(42);
    assertEquals(
      Array.from(rs.normal(0, 1, 20) as Float64Array),
      fixtures.normal_seed42,
    );

    rs = createRandomState(7);
    assertEquals(
      Array.from(rs.normal(0, 1, 20) as Float64Array),
      fixtures.normal_seed7,
    );
  });
});

Deno.test({
  name: "normal matches previous libm edge mismatches",
  sanitizeResources: false,
  fn() {
    if (!hasPlatformLibm()) {
      console.warn("Skipping libm edge regression; run with --allow-ffi.");
      return;
    }

    const cases = [
      {
        seed: 0,
        expected: {
          662: 0.45248909263964643,
          663: 0.0978961454126271,
          9008: -0.14711307593695994,
          9009: -0.3678592222981023,
        },
      },
      {
        seed: 1,
        expected: {
          2176: 0.7582594321492002,
          2177: 0.4037240770776158,
          6457: -0.007400048357347512,
        },
      },
      {
        seed: 7,
        expected: {
          2562: 0.045384689813286666,
          2563: 0.32409615310350665,
        },
      },
      {
        seed: 42,
        expected: {
          76: 0.08704706823817122,
          77: -0.29900735046586746,
          7697: -1.4089191026905248,
        },
      },
      {
        seed: 123456789,
        expected: {
          472: 0.42241063828084674,
          473: 0.7066273884799734,
          1430: -0.20921212833107167,
          1431: -0.3059973776495092,
        },
      },
    ];

    for (const { seed, expected } of cases) {
      const rs = createRandomState(seed);
      const maxIndex = Math.max(...Object.keys(expected).map(Number));
      const actual = rs.normal(0, 1, maxIndex + 1) as Float64Array;

      for (const [index, value] of Object.entries(expected)) {
        assertEquals(actual[Number(index)], value);
      }
    }
  },
});
