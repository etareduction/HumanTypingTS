import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "HumanTyping"))

from humantyping import MarkovTyper  # noqa: E402


CASES = [
    {
        "name": "qwerty_error_correction_seed123",
        "seed": 123,
        "text": "amazing text",
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
]


def generate_case(case):
    np.random.seed(case["seed"])
    typer = MarkovTyper(
        case["text"],
        target_wpm=case["target_wpm"],
        layout=case["layout"],
    )

    steps = []
    while True:
        event = typer.step()
        if event is None:
            break
        steps.append(
            {
                "event": event,
                "current_text": typer.state.current_text,
                "total_time": typer.state.total_time,
                "last_char_typed": typer.state.last_char_typed,
                "fatigue_multiplier": typer.state.fatigue_multiplier,
                "mental_cursor_pos": typer.state.mental_cursor_pos,
                "history_len": len(typer.state.history),
            }
        )

    return {
        **case,
        "session_wpm": typer.session_wpm,
        "base_keystroke_time": typer.base_keystroke_time,
        "steps": steps,
    }


fixtures = {case["name"]: generate_case(case) for case in CASES}
path = ROOT / "tests" / "humantyping" / "step_fixtures.json"
path.write_text(json.dumps(fixtures, indent=2, ensure_ascii=False) + "\n")
