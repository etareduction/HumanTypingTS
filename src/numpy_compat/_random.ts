export type RandomSizeResult = number | Float64Array;

export interface UniformSource {
  nextDouble(): number;
}

// Port target: numpy v2.4.4, numpy/random/mtrand.pyx:395-455. The 53-bit
// conversion itself is delegated to @stdlib/random-base-mt19937.normalized.
export function randomSample(
  source: UniformSource,
  size?: number,
): RandomSizeResult {
  if (size === undefined) {
    return source.nextDouble();
  }
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError("size must be a non-negative integer");
  }

  const out = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    out[i] = source.nextDouble();
  }
  return out;
}
