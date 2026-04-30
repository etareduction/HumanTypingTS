import json
import math
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

STRINGS = ["a😀b", ".,😀hello😀,.", "éèàùçâêîôûäëïöü", "İßΣς😀Kẞﬃ"]
CASE_CHARS = ["A", "É", "!", "ǅ", "İ", "ß", "Σ", "ς", "😀", "K", "ẞ", "ﬃ"]


def without_nonspacing_marks(value):
    return "".join(
        c for c in unicodedata.normalize("NFD", value)
        if unicodedata.category(c) != "Mn"
    )


fixtures = {
    "strings": {
        value: {
            "chars": list(value),
            "len": len(value),
        }
        for value in STRINGS
    },
    "case": {
        value: {
            "lower": value.lower(),
            "upper": value.upper(),
            "isupper": value.isupper(),
            "nfd_without_marks": without_nonspacing_marks(value),
        }
        for value in CASE_CHARS
    },
    "strip": [
        {
            "value": ".,😀hello😀,.",
            "chars": ".,😀",
            "expected": ".,😀hello😀,.".strip(".,😀"),
        },
        {
            "value": "...hello",
            "chars": ".",
            "expected": "...hello".strip("."),
        },
        {
            "value": "hello...",
            "chars": ".",
            "expected": "hello...".strip("."),
        },
    ],
    "nan_order": {
        "max_10_nan_is_nan": math.isnan(max(10, math.nan)),
        "max_nan_10_is_nan": math.isnan(max(math.nan, 10)),
        "min_10_nan_is_nan": math.isnan(min(10, math.nan)),
        "min_nan_10_is_nan": math.isnan(min(math.nan, 10)),
    },
}

path = ROOT / "tests" / "humantyping" / "compat_fixtures.json"
path.write_text(json.dumps(fixtures, indent=2, ensure_ascii=False) + "\n")
