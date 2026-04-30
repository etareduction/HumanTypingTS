import mt19937 from "@stdlib/random-base-mt19937";
import uniform from "@stdlib/random-base-uniform";

import { randomInterval, rkInterval } from "./_bounded_int.ts";
import { choice, type ChoicePopulation, type ChoiceResult } from "./_choice.ts";
import { normal, type NormalSizeResult } from "./_normal.ts";
import { randomSample, type RandomSizeResult } from "./_random.ts";

type Mt19937 = (() => number) & {
  normalized: () => number;
  state: Uint32Array;
};

type UniformFactory = {
  factory: (
    a: number,
    b: number,
    options: { prng: () => number },
  ) => () => number;
};

const N = 624;
const STATE_SECTION_OFFSET = 2;
const OTHER_SECTION_OFFSET = N + 3;
const SEED_SECTION_OFFSET = N + 5;
const STATE_FIXED_LENGTH = N + 6;
const STATE_ARRAY_VERSION = 1;
const NUM_STATE_SECTIONS = 3;
const KNUTH_MULTIPLIER = 1812433253;

function createZeroSeedState(): Uint32Array {
  const stateArray = new Uint32Array(STATE_FIXED_LENGTH + 1);
  stateArray[0] = STATE_ARRAY_VERSION;
  stateArray[1] = NUM_STATE_SECTIONS;
  stateArray[STATE_SECTION_OFFSET] = N;
  stateArray[OTHER_SECTION_OFFSET] = 1;
  stateArray[OTHER_SECTION_OFFSET + 1] = N;
  stateArray[SEED_SECTION_OFFSET] = 1;
  stateArray[SEED_SECTION_OFFSET + 1] = 0;

  const state = new Uint32Array(
    stateArray.buffer,
    stateArray.byteOffset +
      ((STATE_SECTION_OFFSET + 1) * Uint32Array.BYTES_PER_ELEMENT),
    N,
  );
  state[0] = 0;
  for (let i = 1; i < N; i++) {
    const previous = state[i - 1] >>> 0;
    state[i] =
      (Math.imul(previous ^ (previous >>> 30), KNUTH_MULTIPLIER) + i) >>> 0;
  }

  return stateArray;
}

function createMt19937(seed: number): Mt19937 {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError("seed must be an integer in [0, 2**32 - 1]");
  }

  if (seed === 0) {
    return mt19937.factory({
      state: createZeroSeedState(),
    }) as unknown as Mt19937;
  }

  return mt19937.factory({ seed }) as unknown as Mt19937;
}

export type NumpyRandomResult = RandomSizeResult;
export type NumpyNormalResult = NormalSizeResult;
export type NumpyChoicePopulation = ChoicePopulation;
export type NumpyChoiceResult = ChoiceResult;

export class InternalRandomState {
  gauss = 0.0;
  hasGauss = false;

  readonly #mt: Mt19937;
  readonly #uniform01: () => number;

  constructor(seed: number) {
    this.#mt = createMt19937(seed);
    this.#uniform01 = (uniform as UniformFactory).factory(0.0, 1.0, {
      prng: this.#mt.normalized,
    });
  }

  nextDouble(): number {
    return this.#uniform01();
  }

  nextUint32(): number {
    return this.#mt();
  }

  interval(maxInclusive: number): number {
    return randomInterval(() => this.nextUint32(), maxInclusive);
  }

  bounded(maxExclusive: number): number {
    return rkInterval(() => this.nextUint32(), maxExclusive);
  }

  random(size?: number): RandomSizeResult {
    return randomSample(this, size);
  }

  normal(loc = 0.0, scale = 1.0, size?: number): NormalSizeResult {
    return normal(this, loc, scale, size);
  }

  choice(
    a: ChoicePopulation,
    size?: number,
    replace = true,
    p?: ArrayLike<number>,
  ): ChoiceResult {
    return choice(this, a, size, replace, p);
  }
}
