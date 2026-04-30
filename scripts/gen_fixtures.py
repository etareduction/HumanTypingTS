import json

import numpy as np

fixtures = {
    "uniform_seed42": (
        lambda: np.random.RandomState(42).random_sample(20).tolist()
    )(),
    "normal_seed42": (
        lambda: np.random.RandomState(42).normal(size=20).tolist()
    )(),
    "normal_seed7": (
        lambda: np.random.RandomState(7).normal(size=20).tolist()
    )(),
    "randint_seed42_bound17": (
        lambda: np.random.RandomState(42).randint(0, 17, size=20).tolist()
    )(),
    "choice_uniform": (
        lambda: np.random.RandomState(42).choice(10, size=20).tolist()
    )(),
    "choice_weighted": (
        lambda: np.random.RandomState(42).choice(
            5, size=20, p=[0.1, 0.2, 0.3, 0.2, 0.2]
        ).tolist()
    )(),
    "choice_no_replace": (
        lambda: np.random.RandomState(42).choice(20, size=10, replace=False).tolist()
    )(),
    "choice_weighted_no_replace": (
        lambda: np.random.RandomState(42).choice(
            5, size=4, replace=False, p=[0.1, 0.2, 0.3, 0.2, 0.2]
        ).tolist()
    )(),
}

rs = np.random.RandomState(42)
fixtures["interleaved"] = [
    float(rs.random_sample()),
    float(rs.normal()),
    int(rs.choice(10)),
    float(rs.normal()),
    float(rs.random_sample()),
    float(rs.normal()),
    int(rs.choice(5, p=[0.2] * 5)),
    float(rs.normal()),
]

print(json.dumps(fixtures, indent=2))
