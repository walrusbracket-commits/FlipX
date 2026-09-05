from pathlib import Path
from collections import Counter

PROJECT_DIR = Path(__file__).resolve().parent
DICTIONARY_FILE = PROJECT_DIR / "data" / "dictionary.txt"
INPUT_FILE = PROJECT_DIR / "data" / "uniquepuzzles_2ndGo.txt"
VERIFIED_FILE = PROJECT_DIR / "data" / "uniquepuzzles-verified.txt"
REJECTED_FILE = PROJECT_DIR / "data" / "uniquepuzzles-rejected.txt"
REPORT_FILE = PROJECT_DIR / "data" / "puzzle-validation-report.txt"

SLOT_NAMES = ("1A", "2A", "3A", "1D", "2D", "3D")
CROSSING_INDEXES = (1, 3, 5)


def load_dictionary(path):
    words = set()

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        word = raw_line.strip().lower()
        if len(word) == 7 and all(ch == "_" or "a" <= ch <= "z" for ch in word):
            words.add(word)

    return words


def split_slots(record):
    return [record[start:start + 7] for start in range(0, 42, 7)]


def crossing_errors(slots):
    across = slots[:3]
    down = slots[3:]
    errors = []

    for row in range(3):
        for column in range(3):
            a = across[row][CROSSING_INDEXES[column]]
            d = down[column][CROSSING_INDEXES[row]]
            if a != d:
                errors.append(
                    f"{SLOT_NAMES[row]}[{CROSSING_INDEXES[column] + 1}]={a} "
                    f"does not match {SLOT_NAMES[column + 3]}[{CROSSING_INDEXES[row] + 1}]={d}"
                )
            elif a == "_":
                errors.append(
                    f"null crossing at {SLOT_NAMES[row]} / {SLOT_NAMES[column + 3]}"
                )

    return errors


def validate_record(raw_record, dictionary):
    record = raw_record.rstrip("\r\n")
    reasons = []

    if len(record) != 42:
        reasons.append(f"length={len(record)}")
        return record, reasons

    invalid_chars = sorted({ch for ch in record if ch != "_" and not ("a" <= ch <= "z")})
    if invalid_chars:
        reasons.append("invalid characters=" + repr("".join(invalid_chars)))

    slots = split_slots(record)
    unknown = [f"{name}:{slot}" for name, slot in zip(SLOT_NAMES, slots) if slot not in dictionary]
    if unknown:
        reasons.append("unknown slot(s)=" + ", ".join(unknown))

    if len(set(slots)) != 6:
        reasons.append("repeated exact slot")

    reasons.extend(crossing_errors(slots))
    return record, reasons


def main():
    dictionary = load_dictionary(DICTIONARY_FILE)
    raw_lines = INPUT_FILE.read_text(encoding="utf-8").splitlines()

    verified = []
    rejected = []
    reason_counts = Counter()

    for line_number, raw_line in enumerate(raw_lines, start=1):
        record, reasons = validate_record(raw_line, dictionary)

        if reasons:
            rejected.append(
                f"Line {line_number}: {record}\n"
                + "  - "
                + "\n  - ".join(reasons)
                + "\n"
            )
            for reason in reasons:
                if reason.startswith("length="):
                    reason_counts["wrong length"] += 1
                elif reason.startswith("invalid characters="):
                    reason_counts["invalid characters"] += 1
                elif reason.startswith("unknown slot(s)="):
                    reason_counts["unknown dictionary slot"] += 1
                elif reason == "repeated exact slot":
                    reason_counts["repeated slot"] += 1
                elif reason.startswith("null crossing"):
                    reason_counts["null crossing"] += 1
                else:
                    reason_counts["crossing mismatch"] += 1
        else:
            verified.append(record)

    VERIFIED_FILE.write_text("\n".join(verified) + ("\n" if verified else ""), encoding="utf-8")
    REJECTED_FILE.write_text("\n".join(rejected), encoding="utf-8")

    report = [
        "FlipX puzzle validation report",
        "=" * 31,
        f"Dictionary entries loaded: {len(dictionary)}",
        f"Input records: {len(raw_lines)}",
        f"Verified records: {len(verified)}",
        f"Rejected records: {len(rejected)}",
        "",
        "Rejection counts:",
    ]

    if reason_counts:
        report.extend(f"- {reason}: {count}" for reason, count in reason_counts.most_common())
    else:
        report.append("- None")

    REPORT_FILE.write_text("\n".join(report) + "\n", encoding="utf-8")

    print("Validation complete")
    print(f"Dictionary entries: {len(dictionary)}")
    print(f"Input records: {len(raw_lines)}")
    print(f"Verified records: {len(verified)}")
    print(f"Rejected records: {len(rejected)}")
    print(f"Verified output: {VERIFIED_FILE}")
    print(f"Rejected details: {REJECTED_FILE}")
    print(f"Report: {REPORT_FILE}")


if __name__ == "__main__":
    main()