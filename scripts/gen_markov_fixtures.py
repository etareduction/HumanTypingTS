import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "HumanTyping"))

from humantyping import MarkovTyper  # noqa: E402


CASES = [
    {
        "name": "qwerty_simple_seed42",
        "seed": 42,
        "text": "the quick brown fox",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_upper_punctuation_seed7",
        "seed": 7,
        "text": "Hello world!",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_error_correction_seed123",
        "seed": 123,
        "text": "amazing text",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_swap_seed0",
        "seed": 0,
        "text": "the quick brown fox jumps over the lazy dog",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "azerty_accents_seed99",
        "seed": 99,
        "text": "café déjà vu",
        "target_wpm": 60,
        "layout": "azerty",
    },
    {
        "name": "qwerty_non_bmp_seed11",
        "seed": 11,
        "text": "Hi 😀!",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_decomposed_accent_seed13",
        "seed": 13,
        "text": "Cafe\u0301",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_flag_grapheme_seed17",
        "seed": 17,
        "text": "Go 🇺🇸!",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_family_grapheme_seed19",
        "seed": 19,
        "text": "Hi 👨‍👩‍👧‍👦",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_newline_tab_non_bmp_seed23",
        "seed": 23,
        "text": "A\n\t😀",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "qwerty_drift_correction_seed2",
        "seed": 2,
        "text": "abcdefghijklmnopqrstuvwxyz",
        "target_wpm": 60,
        "layout": "qwerty",
    },
    {
        "name": "azerty_high_wpm_seed31",
        "seed": 31,
        "text": "AZERTY 123 éà",
        "target_wpm": 120,
        "layout": "azerty",
    },
    {
        "name": "qwerty_low_wpm_seed37",
        "seed": 37,
        "text": "slow typing",
        "target_wpm": 25,
        "layout": "qwerty",
    },
]


def generate_case(case):
    np.random.seed(case["seed"])
    typer = MarkovTyper(
        case["text"],
        target_wpm=case["target_wpm"],
        layout=case["layout"],
    )
    total_time, history = typer.run()
    return {
        **case,
        "total_time": total_time,
        "history": history,
    }


def main():
    fixtures = {case["name"]: generate_case(case) for case in CASES}
    output = json.dumps(fixtures, indent=2, ensure_ascii=False)

    if "--write" in sys.argv:
        path = ROOT / "tests" / "humantyping" / "markov_fixtures.json"
        path.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)


if __name__ == "__main__":
    main()
