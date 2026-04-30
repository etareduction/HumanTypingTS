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

export function createRandomState(seed: number): NumpyRandomState {
  const state = new InternalRandomState(seed);
  return Object.freeze({
    random: state.random.bind(state),
    normal: state.normal.bind(state),
    choice: state.choice.bind(state),
  });
}
