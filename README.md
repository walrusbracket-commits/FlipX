# FlipX

A fast, satisfying word puzzle for desktop and mobile browsers.

Two small crossword grids have had some letters swapped between them. Click any visible letter to **FlipX** it into the matching position in the other grid. Your goal is to make **both grids contain valid words**.

No installation, account, or sign-up required.

## How to play

1. Look at the two scrambled word grids.
2. Click a visible tile.
3. That tile moves to the same coordinate in the opposite grid.
4. If another tile is present there, the two tiles exchange places.
5. If the opposite position is empty, the clicked tile moves across on its own.
6. Make both grids form valid words to win.

Every visible tile is a legal move. Empty positions cannot be clicked.

## Features

- Four difficulty levels:
  - Beginner
  - Easy
  - Hard
  - Hardest
- Four animation speeds:
  - Normal
  - Faster
  - Fastest
  - Slow
- One-click tile movement between matching positions
- Animated tile flights, so moves are easy to follow
- Move counter and elapsed-time display
- Browser-based dictionary validation of all twelve words
- Completion message with copy-to-clipboard and share options
- Works in modern desktop and mobile web browsers
- No account, installation, or personal information required

## Difficulty

Difficulty controls how many corresponding positions are scrambled at the start of a game.

| Level | Scrambled positions |
|---|---:|
| Beginner | 4 |
| Easy | 8 |
| Hard | 12 |
| Hardest | 16 |

A higher level means more disrupted tiles, although every puzzle has its own character: an Easy puzzle can sometimes be surprisingly tricky, and a Hardest puzzle can occasionally fall into place quickly.

## Run locally

FlipX is a static HTML, CSS, and JavaScript project.

From the project folder, run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not open `index.html` directly from the file manager, because the browser needs a local web server to load the puzzle and dictionary files.

## Project files

```text
flipx/
├── index.html
├── app.js
├── README.md
└── data/
    ├── dictionary.txt
    └── uniquepuzzles-verified.txt
```

- `index.html` contains the page structure and visual styling.
- `app.js` contains the game logic, animation, timing, difficulty, speed, validation, and sharing features.
- `data/uniquepuzzles-verified.txt` contains verified FlipX puzzle records.
- `data/dictionary.txt` provides the in-browser word validation list.

## Privacy

FlipX runs entirely in the browser.

It does not require:

- An account
- A sign-up
- A download or installation
- A server-side game profile
- Personal information

The game stores only selected gameplay preferences, such as difficulty and animation speed, in the browser's local storage.

## Status

This is an active rebuild of an earlier Android version of FlipX, now being developed as a browser game.

It is currently in external play-testing.

## Feedback

Feedback is welcome, especially on:

- Clarity of the rules
- Difficulty balance
- Tile-animation speed
- Mobile usability
- Bugs or unusual puzzle behaviour
- Whether the game is satisfying, frustrating, or both

---

Created by Walrusbracket.