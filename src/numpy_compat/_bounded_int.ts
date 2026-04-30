export type Uint32Source = () => number;

function maskFor(maxInclusive: number): number {
  let mask = maxInclusive >>> 0;
  mask |= mask >>> 1;
  mask |= mask >>> 2;
  mask |= mask >>> 4;
  mask |= mask >>> 8;
  mask |= mask >>> 16;
  return mask >>> 0;
}

// Port target: numpy v2.4.4, numpy/random/src/distributions/distributions.c:
// 1078-1102. Returns an integer in [0, maxInclusive].
export function randomInterval(
  nextUint32: Uint32Source,
  maxInclusive: number,
): number {
  if (!Number.isInteger(maxInclusive) || maxInclusive < 0) {
    throw new RangeError("maxInclusive must be a non-negative integer");
  }
  if (maxInclusive === 0) {
    return 0;
  }
  if (maxInclusive > 0xffffffff) {
    throw new RangeError("maxInclusive must fit in uint32");
  }

  const mask = maskFor(maxInclusive);
  let value: number;
  do {
    value = (nextUint32() & mask) >>> 0;
  } while (value > maxInclusive);

  return value;
}

// Convenience wrapper for randint-style half-open ranges. This mirrors
// random_bounded_uint32_fill with off=0 and rng=maxExclusive-1; see numpy
// v2.4.4 numpy/random/src/distributions/distributions.c:1603-1628.
export function rkInterval(
  nextUint32: Uint32Source,
  maxExclusive: number,
): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive integer");
  }
  return randomInterval(nextUint32, maxExclusive - 1);
}
