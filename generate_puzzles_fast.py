from pathlib import Path
import random

PROJECT_DIR = Path(__file__).resolve().parent
DICTIONARY_FILE = PROJECT_DIR / "data" / "dictionary.txt"
OUTPUT_FILE = PROJECT_DIR / "data" / "uniquepuzzles.txt"
TARGET_PUZZLES = 1_000
MAX_ATTEMPTS = 500_000

SLOTS = ("1A", "2A", "3A", "1D", "2D", "3D")
ACROSS = ("1A", "2A", "3A")
DOWN = ("1D", "2D", "3D")
CROSSING_INDEXES = (1, 3, 5)


def load_dictionary(path):
    words = []
    seen = set()

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        word = raw_line.strip().lower()
        if len(word) == 7 and all(char == "_" or "a" <= char <= "z" for char in word):
            if word not in seen:
                seen.add(word)
                words.append(word)

    return words, seen


def make_pattern_index(words):
    index = {}

    for word in words:
        key = (word[1], word[3], word[5])
        index.setdefault(key, []).append(word)

    return index


def base_word(word):
    return word.replace("_", "")


def candidates_for(slot, placed, index):
    required = [None, None, None]

    if slot in ACROSS:
        row = ACROSS.index(slot)
        for column, down_slot in enumerate(DOWN):
            if down_slot in placed:
                required[column] = placed[down_slot][CROSSING_INDEXES[row]]
    else:
        column = DOWN.index(slot)
        for row, across_slot in enumerate(ACROSS):
            if across_slot in placed:
                required[row] = placed[across_slot][CROSSING_INDEXES[column]]

    used = {base_word(word) for word in placed.values()}
    candidates = []

    for key, bucket in index.items():
        if (
            (required[0] is None or key[0] == required[0])
            and (required[1] is None or key[1] == required[1])
            and (required[2] is None or key[2] == required[2])
        ):
            candidates.extend(word for word in bucket if base_word(word) not in used)

    random.shuffle(candidates)
    return candidates


def crossings_match(grid):
    for row, across_slot in enumerate(ACROSS):
        for column, down_slot in enumerate(DOWN):
            a = grid[across_slot][CROSSING_INDEXES[column]]
            d = grid[down_slot][CROSSING_INDEXES[row]]
            if a != d or a == "_":
                return False
    return True


def make_grid(index):
    order = list(SLOTS)
    random.shuffle(order)

    def search(position, placed):
        if position == 6:
            return placed.copy() if crossings_match(placed) else None

        slot = order[position]
        for word in candidates_for(slot, placed, index):
            placed[slot] = word
            result = search(position + 1, placed)
            if result is not None:
                return result
            del placed[slot]

        return None

    return search(0, {})


def main():
    words, dictionary = load_dictionary(DICTIONARY_FILE)
    index = make_pattern_index(words)
    records = set()
    attempts = 0

    while len(records) < TARGET_PUZZLES and attempts < MAX_ATTEMPTS:
        attempts += 1
        grid = make_grid(index)
        if grid is None or not crossings_match(grid):
            continue

        slots = [grid[slot] for slot in SLOTS]
        if len({base_word(word) for word in slots}) != 6:
            continue
        if not all(word in dictionary for word in slots):
            continue

        records.add("".join(slots))

        if len(records) % 100 == 0:
            print(f"Generated {len(records)} / {TARGET_PUZZLES} puzzles", flush=True)

    if len(records) != TARGET_PUZZLES:
        raise RuntimeError(f"Stopped after {attempts} attempts with {len(records)} puzzles.")

    OUTPUT_FILE.write_text("\n".join(records) + "\n", encoding="utf-8")
    print(f"Done: {len(records)} unique puzzles in {attempts} attempts")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()