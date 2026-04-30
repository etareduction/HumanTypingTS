// Port target: numpy v2.4.4, numpy/random/mtrand.pyx:1013-1018 and
// 1038-1044 use cdf.searchsorted(..., side='right').
export function bisectRight(values: ArrayLike<number>, needle: number): number {
  let lo = 0;
  let hi = values.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (needle < values[mid]) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return lo;
}
