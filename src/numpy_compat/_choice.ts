import { bisectRight } from "./_bisect.ts";

export type ChoicePopulation = number | ArrayLike<number>;
export type ChoiceResult = number | Float64Array;

export interface ChoiceSource {
  nextDouble(): number;
  interval(maxInclusive: number): number;
  bounded(maxExclusive: number): number;
}

function populationSize(a: ChoicePopulation): number {
  if (typeof a === "number") {
    if (!Number.isInteger(a)) {
      throw new TypeError("a must be an integer or a 1-D numeric array");
    }
    if (a <= 0) {
      throw new RangeError("a must be greater than 0");
    }
    return a;
  }
  if (a.length <= 0) {
    throw new RangeError("a cannot be empty");
  }
  return a.length;
}

function take(a: ChoicePopulation, index: number): number {
  return typeof a === "number" ? index : a[index];
}

function validateProbabilities(
  p: ArrayLike<number>,
  popSize: number,
): number[] {
  if (p.length !== popSize) {
    throw new RangeError("a and p must have same size");
  }

  const probs = Array.from(p);
  let sum = 0;
  let compensation = 0;
  for (const value of probs) {
    if (Number.isNaN(value)) {
      throw new RangeError("probabilities contain NaN");
    }
    if (value < 0) {
      throw new RangeError("probabilities are not non-negative");
    }
    const y = value - compensation;
    const t = sum + y;
    compensation = (t - sum) - y;
    sum = t;
  }

  const atol = Math.sqrt(Number.EPSILON);
  if (Math.abs(sum - 1.0) > atol) {
    throw new RangeError("probabilities do not sum to 1");
  }

  return probs;
}

function cumulativeNormalized(p: ArrayLike<number>): number[] {
  const cdf = new Array<number>(p.length);
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    sum += p[i];
    cdf[i] = sum;
  }
  for (let i = 0; i < cdf.length; i++) {
    cdf[i] /= sum;
  }
  return cdf;
}

function uniqueInEncounterOrder(values: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

function permutationIndices(source: ChoiceSource, n: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = source.interval(i);
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  return indices;
}

// Port target: numpy v2.4.4, numpy/random/mtrand.pyx:861-1070. The
// replace=false, p=null branch follows permutation() via mtrand.pyx:4739-4743
// and shuffle() via mtrand.pyx:4683-4690.
export function choice(
  source: ChoiceSource,
  a: ChoicePopulation,
  size?: number,
  replace = true,
  p?: ArrayLike<number>,
): ChoiceResult {
  const popSize = populationSize(a);
  const isScalar = size === undefined;
  const count = isScalar ? 1 : size;

  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("size must be a non-negative integer");
  }

  const probs = p === undefined ? undefined : validateProbabilities(p, popSize);
  let indices: number[];

  if (replace) {
    if (probs !== undefined) {
      const cdf = cumulativeNormalized(probs);
      indices = new Array<number>(count);
      for (let i = 0; i < count; i++) {
        indices[i] = bisectRight(cdf, source.nextDouble());
      }
    } else {
      indices = new Array<number>(count);
      for (let i = 0; i < count; i++) {
        indices[i] = source.bounded(popSize);
      }
    }
  } else {
    if (count > popSize) {
      throw new RangeError(
        "Cannot take a larger sample than population when 'replace=false'",
      );
    }

    if (probs !== undefined) {
      if (probs.filter((value) => value > 0).length < count) {
        throw new RangeError("Fewer non-zero entries in p than size");
      }
      const mutableP = probs.slice();
      const found: number[] = [];
      while (found.length < count) {
        if (found.length > 0) {
          for (const index of found) {
            mutableP[index] = 0;
          }
        }
        const cdf = cumulativeNormalized(mutableP);
        const candidates = new Array<number>(count - found.length);
        for (let i = 0; i < candidates.length; i++) {
          candidates[i] = bisectRight(cdf, source.nextDouble());
        }
        found.push(...uniqueInEncounterOrder(candidates));
      }
      indices = found;
    } else {
      indices = permutationIndices(source, popSize).slice(0, count);
    }
  }

  if (isScalar) {
    return take(a, indices[0]);
  }

  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = take(a, indices[i]);
  }
  return out;
}
