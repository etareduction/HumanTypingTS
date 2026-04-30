import { assertEquals } from "@std/assert";

import fixtures from "./compat_fixtures.json" with { type: "json" };
import {
  pyCharAt,
  pyChars,
  pyIsUpper,
  pyLen,
  pyLower,
  pyMax,
  pyMin,
  pyNormalizeNfdWithoutMarks,
  pySlice,
  pyStripChars,
  pyUpper,
} from "../../src/humantyping/_compat.ts";

type CompatFixtures = {
  strings: Record<string, { chars: string[]; len: number }>;
  case: Record<
    string,
    {
      lower: string;
      upper: string;
      isupper: boolean;
      nfd_without_marks: string;
    }
  >;
  strip: Array<{ value: string; chars: string; expected: string }>;
  nan_order: {
    max_10_nan_is_nan: boolean;
    max_nan_10_is_nan: boolean;
    min_10_nan_is_nan: boolean;
    min_nan_10_is_nan: boolean;
  };
};

const compatFixtures = fixtures as CompatFixtures;

Deno.test("Python compat string length and indexing use code points", () => {
  for (const [value, expected] of Object.entries(compatFixtures.strings)) {
    assertEquals(pyChars(value), expected.chars);
    assertEquals(pyLen(value), expected.len);
  }

  assertEquals(pyCharAt("a😀b", 0), "a");
  assertEquals(pyCharAt("a😀b", 1), "😀");
  assertEquals(pyCharAt("a😀b", -1), "b");
});

Deno.test("Python compat string slicing uses code points and negative indexes", () => {
  assertEquals(pySlice("a😀b", 1, 2), "😀");
  assertEquals(pySlice("a😀b", 0, -1), "a😀");
  assertEquals(pySlice("a😀b", -2), "😀b");
});

Deno.test("Python compat strip matches str.strip(chars)", () => {
  for (const fixture of compatFixtures.strip) {
    assertEquals(pyStripChars(fixture.value, fixture.chars), fixture.expected);
  }
});

Deno.test("Python compat case helpers cover known Unicode cases", () => {
  for (const [value, expected] of Object.entries(compatFixtures.case)) {
    assertEquals(pyIsUpper(value), expected.isupper);
    assertEquals(pyLower(value), expected.lower);
    assertEquals(pyUpper(value), expected.upper);
  }
});

Deno.test("Python compat max preserves comparison order with NaN", () => {
  const order = compatFixtures.nan_order;

  assertEquals(Number.isNaN(pyMax(10, Number.NaN)), order.max_10_nan_is_nan);
  assertEquals(Number.isNaN(pyMax(Number.NaN, 10)), order.max_nan_10_is_nan);
  assertEquals(Number.isNaN(pyMin(10, Number.NaN)), order.min_10_nan_is_nan);
  assertEquals(Number.isNaN(pyMin(Number.NaN, 10)), order.min_nan_10_is_nan);
  assertEquals(pyMax(10, Number.NaN), 10);
  assertEquals(pyMin(10, Number.NaN), 10);
});

Deno.test("Python compat normalization strips nonspacing marks", () => {
  for (const [value, expected] of Object.entries(compatFixtures.case)) {
    assertEquals(
      pyNormalizeNfdWithoutMarks(value),
      expected.nfd_without_marks,
    );
  }
});
