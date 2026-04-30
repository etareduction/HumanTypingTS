// NumPy compatibility target: numpy v2.4.4 (legacy np.random.RandomState API).
import {
  InternalRandomState,
  type NumpyChoicePopulation,
  type NumpyChoiceResult,
  type NumpyNormalResult,
  type NumpyRandomResult,
} from "./_random_state.ts";

type NumpyRandomState = {
  random(size?: number): NumpyRandomResult;
  normal(loc?: number, scale?: number, size?: number): NumpyNormalResult;
  choice(
    a: NumpyChoicePopulation,
    size?: number,
    replace?: boolean,
    p?: ArrayLike<number>,
  ): NumpyChoiceResult;
};

type NumpyRandomModule = NumpyRandomState & {
  seed(seed: number): void;
};

export function createRandomState(seed: number): NumpyRandomState {
  const state = new InternalRandomState(seed);
  return Object.freeze({
    random: state.random.bind(state),
    normal: state.normal.bind(state),
    choice: state.choice.bind(state),
  });
}

function randomEntropySeed(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}

let globalState = new InternalRandomState(randomEntropySeed());

export const random: NumpyRandomModule = Object.freeze({
  seed(seed: number): void {
    globalState = new InternalRandomState(seed);
  },

  random(size?: number): NumpyRandomResult {
    return globalState.random(size);
  },

  normal(loc?: number, scale?: number, size?: number): NumpyNormalResult {
    return globalState.normal(loc, scale, size);
  },

  choice(
    a: NumpyChoicePopulation,
    size?: number,
    replace?: boolean,
    p?: ArrayLike<number>,
  ): NumpyChoiceResult {
    return globalState.choice(a, size, replace, p);
  },
});
