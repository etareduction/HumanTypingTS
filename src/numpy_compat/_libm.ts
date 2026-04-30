type Libm = {
  symbols: {
    log(x: number): number;
    sqrt(x: number): number;
  };
};

const SCALE_BITS = 220n;
const SCALE = 1n << SCALE_BITS;
const TWO_52 = 1n << 52n;
const TWO_53 = 1n << 53n;
const SUBNORMAL_SCALE = 2 ** 56;
const SQRT2_MANTISSA_CUTOFF = 6369051672525773n;
const LN2_Q =
  1167950688773872517954935089893261764285717328480531383045641523573n;

const buffer = new ArrayBuffer(8);
const view = new DataView(buffer);

function openLibm(): Libm | undefined {
  for (
    const name of ["libm.so.6", "libm.so", "libSystem.B.dylib", "ucrtbase.dll"]
  ) {
    try {
      return Deno.dlopen(name, {
        log: { parameters: ["f64"], result: "f64" },
        sqrt: { parameters: ["f64"], result: "f64" },
      }) as Libm;
    } catch {
      // Try the next platform-specific libc/libm name.
    }
  }
}

let libm: Libm | undefined;
let didTryOpenLibm = false;
let forceFallback = false;

function getLibm(): Libm | undefined {
  if (forceFallback) {
    return undefined;
  }
  if (!didTryOpenLibm) {
    didTryOpenLibm = true;
    libm = openLibm();
  }
  return libm;
}

export function libmLog(x: number): number {
  return getLibm()?.symbols.log(x) ?? fallbackLog(x);
}

export function libmSqrt(x: number): number {
  return getLibm()?.symbols.sqrt(x) ?? Math.sqrt(x);
}

export function hasPlatformLibm(): boolean {
  return getLibm() !== undefined;
}

export function withFallbackLibmForTest<T>(fn: () => T): T {
  const previous = forceFallback;
  forceFallback = true;
  try {
    return fn();
  } finally {
    forceFallback = previous;
  }
}

// Fallback for runtimes without Deno FFI. It keeps common RandomState normal
// streams aligned, but the platform libm path is required for exhaustive
// byte-for-byte parity with numpy's C implementation.
function fallbackLog(x: number): number {
  if (!(x > 0) || !Number.isFinite(x)) {
    return Math.log(x);
  }

  view.setFloat64(0, x, false);
  let bits = view.getBigUint64(0, false);
  let exponent = Number((bits >> 52n) & 0x7ffn);

  if (exponent === 0) {
    x *= SUBNORMAL_SCALE;
    view.setFloat64(0, x, false);
    bits = view.getBigUint64(0, false);
    exponent = Number((bits >> 52n) & 0x7ffn) - 56;
  }

  let e = exponent - 1023;
  const mantissa = bits & 0x000f_ffff_ffff_ffffn;
  const significand = TWO_52 + mantissa;
  let denominator = TWO_52;

  if (significand > SQRT2_MANTISSA_CUTOFF) {
    denominator = TWO_53;
    e += 1;
  }

  const numerator = significand - denominator;
  const denominatorSum = significand + denominator;
  const y = (numerator * SCALE) / denominatorSum;
  const y2 = (y * y) / SCALE;

  let term = y;
  let sum = 0n;
  for (let k = 0n; k < 200n; k++) {
    const addend = term / (2n * k + 1n);
    sum += addend;
    if (addend === 0n) {
      break;
    }
    term = (term * y2) / SCALE;
  }

  const logQ = 2n * sum + BigInt(e) * LN2_Q;
  return Number(logQ) / 2 ** Number(SCALE_BITS);
}
