import { libmLog, libmSqrt } from "./_libm.ts";

export type NormalSizeResult = number | Float64Array;

export interface GaussianState {
  gauss: number;
  hasGauss: boolean;
  nextDouble(): number;
}

// Port target: numpy v2.4.4,
// numpy/random/src/legacy/legacy-distributions.c:18-40.
export function standardNormal(state: GaussianState): number {
  if (state.hasGauss) {
    const temp = state.gauss;
    state.hasGauss = false;
    state.gauss = 0.0;
    return temp;
  }

  let x1: number;
  let x2: number;
  let r2: number;
  do {
    x1 = 2.0 * state.nextDouble() - 1.0;
    x2 = 2.0 * state.nextDouble() - 1.0;
    r2 = x1 * x1 + x2 * x2;
  } while (r2 >= 1.0 || r2 === 0.0);

  const f = libmSqrt(-2.0 * libmLog(r2) / r2);
  state.gauss = f * x1;
  state.hasGauss = true;
  return f * x2;
}

// Port target: numpy v2.4.4,
// numpy/random/src/legacy/legacy-distributions.c:163-164 and
// numpy/random/mtrand.pyx:1476-1555.
export function normal(
  state: GaussianState,
  loc = 0.0,
  scale = 1.0,
  size?: number,
): NormalSizeResult {
  if (scale < 0) {
    throw new RangeError("scale must be non-negative");
  }
  if (size === undefined) {
    return loc + scale * standardNormal(state);
  }
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError("size must be a non-negative integer");
  }

  const out = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    out[i] = loc + scale * standardNormal(state);
  }
  return out;
}
