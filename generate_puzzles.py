from pathlib import Path
import random

PROJECT_DIR = Path(__file__).resolve().parent
DICTIONARY_FILE = PROJECT_DIR / "data" / "dictionary.txt"
OUTPUT_FILE = PROJECT_DIR / "data" / "uniquepuzzles.txt"
TARGET_PUZZLES = 1000
MAX_ATTEMPTS = 200_000

SLOTS = ("1A", "2A", "3A", "1D", "2D", "3D")
ACROSS = ("1A", "2A", "3A")
DOWN = ("1D", "2D", "3D")
CROSSING_INDEXES = (1, 3, 5)


def load_dictionary(path):
    words = []
    seen = set()

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        word = raw_line.strip().lower()
        if len(word) != 7:
            continue
        if not all(character == "_" or "a" <= character <= "z" for character in word):
            continue
        if word not in seen:
            seen.add(word)
            words.append(word)

    return words, seen


def make_pattern_index(words):
    index = {}

    for word in words:
        signature = tuple(word[position] for position in CROSSING_INDEXES)
        index.setdefault(signature, []).append(word)

    return index


def crossing_requirements(slot, placed):
    required = [None, None, None]

    if slot in ACROSS:
        across_row = ACROSS.index(slot)
        for down_column, down_slot in enumerate(DOWN):
            if down_slot in placed:
                required[down_column] = placed[down_slot][CROSSING_INDEXES[across_row]]
    else:
        down_column = DOWN.index(slot)
        for across_row, across_slot in enumerate(ACROSS):
            if across_slot in placed:
                required[across_row] = placed[across_slot][CROSSING_INDEXES[down_column]]

    return tuple(required)


def candidates_for(slot, placed, pattern_index):
    required = crossing_requirements(slot, placed)
    candidates = []

    for signature, words in pattern_index.items():
        if all(need is None or need == letter for need, letter in zip(required, signature)):
            candidates.extend(words)

    used_base_words = {word.replace("_", "") for word in placed.values()}
    return [word for word in candidates if word.replace("_", "") not in used_base_words]


def crossings_match(grid):
    for across_row, across_slot in enumerate(ACROSS):
        for down_column, down_slot in enumerate(DOWN):
            across_letter = grid[across_slot][CROSSING_INDEXES[down_column]]
            down_letter = grid[down_slot][CROSSING_INDEXES[across_row]]
            if across_letter != down_letter:
                return False
            if across_letter == "_":
                return False
    return True


def make_grid(pattern_index):
    order = list(SLOTS)
    random.shuffle(order)

    def search(position, placed):
        if position == len(order):
            return placed.copy() if crossings_match(placed) else None

        slot = order[position]
        candidates = candidates_for(slot, placed, pattern_index)
        random.shuffle(candidates)

        for word in candidates:
            placed[slot] = word
            result = search(position + 1, placed)
            if result is not None:
                return result
            del placed[slot]

        return None

    return search(0, {})


def grid_record(grid):
    return "".join(grid[slot] for slot in SLOTS)


def main():
    words, dictionary_set = load_dictionary(DICTIONARY_FILE)
    pattern_index = make_pattern_index(words)

    if not words:
        raise RuntimeError(f"No valid seven-character entries found in {DICTIONARY_FILE}")

    unique_records = set()
    attempts = 0

    while len(unique_records) < TARGET_PUZZLES and attempts < MAX_ATTEMPTS:
        attempts += 1
        grid = make_grid(pattern_index)

        if grid is None:
            continue

        record = grid_record(grid)
        slots = [record[index:index + 7] for index in range(0, 42, 7)]

        if len(record) != 42:
            continue
        if not all(slot in dictionary_set for slot in slots):
            continue
        if len({slot.replace("_", "") for slot in slots}) != 6:
            continue
        if not crossings_match(grid):
            continue

        unique_records.add(record)

    if len(unique_records) < TARGET_PUZZLES:
        raise RuntimeError(
            f"Generated only {len(unique_records)} puzzles after {attempts} attempts. "
            "Check the dictionary and crossing rules."
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n".join(sorted(unique_records)) + "\n", encoding="utf-8")

    print(f"Loaded dictionary entries: {len(words)}")
    print(f"Distinct crossing signatures: {len(pattern_index)}")
    print(f"Generated unique puzzles: {len(unique_records)}")
    print(f"Attempts used: {attempts}")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()