"use strict";

const PUZZLE_FILE = "./data/uniquepuzzles-verified.txt";
const DICTIONARY_FILE = "./data/dictionary.txt";

const RECORD_LENGTH = 42;
const ANSWER_LENGTH = 7;
const BOARD_SIZE = 7;
const SCRAMBLE_PAIR_COUNT = 2;

const statusElement = document.querySelector("#status");
const moveCountElement = document.querySelector("#move-count");
const validationElement = document.querySelector("#validation");
const validationSummaryElement = document.querySelector("#validation-summary");
const validationDetailsElement = document.querySelector("#validation-details");

const boardAElement = document.querySelector("#board-a");
const boardBElement = document.querySelector("#board-b");
const puzzleAElement = document.querySelector("#puzzle-a");
const puzzleBElement = document.querySelector("#puzzle-b");
const newPuzzleButton = document.querySelector("#new-puzzle");

let puzzles = [];
let dictionary = new Set();
let game = null;

function coordinateKey(row, column) {
  return `${row},${column}`;
}

function getOppositeBoardId(boardId) {
  return boardId === "A" ? "B" : "A";
}

function selectTwoDifferentPuzzles() {
  const firstIndex = Math.floor(Math.random() * puzzles.length);

  let secondIndex = Math.floor(Math.random() * puzzles.length);

  while (secondIndex === firstIndex) {
    secondIndex = Math.floor(Math.random() * puzzles.length);
  }

  return [puzzles[firstIndex], puzzles[secondIndex]];
}

function splitPuzzleRecord(record) {
  return {
    across1: record.slice(0, 7),
    across2: record.slice(7, 14),
    across3: record.slice(14, 21),
    down1: record.slice(21, 28),
    down2: record.slice(28, 35),
    down3: record.slice(35, 42)
  };
}

function createPuzzleEntry(label, value) {
  const entry = document.createElement("div");
  entry.className = "entry";

  const labelElement = document.createElement("span");
  labelElement.className = "label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.textContent = value;

  entry.append(labelElement, valueElement);
  return entry;
}

function renderDebugSlots(puzzleElement, puzzle) {
  puzzleElement.replaceChildren(
    createPuzzleEntry("1A:", puzzle.across1),
    createPuzzleEntry("2A:", puzzle.across2),
    createPuzzleEntry("3A:", puzzle.across3),
    createPuzzleEntry("1D:", puzzle.down1),
    createPuzzleEntry("2D:", puzzle.down2),
    createPuzzleEntry("3D:", puzzle.down3)
  );
}

/*
  Build the physical tile list for a solved source grid.

  "_" represents a Null optional extension, so it creates no tile.
  The 5×5 core crossings occur at source positions 2, 4 and 6:
  zero-based indices / board coordinates 1, 3 and 5.
*/
function makeBoardCells(puzzle) {
  const cells = new Map();

  function addLetter(row, column, letter) {
    if (letter === "_") {
      return;
    }

    const key = coordinateKey(row, column);
    const existingCell = cells.get(key);

    if (existingCell && existingCell.letter !== letter) {
      throw new Error(
        `Crossing mismatch at row ${row + 1}, column ${column + 1}.`
      );
    }

    cells.set(key, { row, column, letter });
  }

  const acrossWords = [
    { word: puzzle.across1, row: 1 },
    { word: puzzle.across2, row: 3 },
    { word: puzzle.across3, row: 5 }
  ];

  const downWords = [
    { word: puzzle.down1, column: 1 },
    { word: puzzle.down2, column: 3 },
    { word: puzzle.down3, column: 5 }
  ];

  for (const { word, row } of acrossWords) {
    for (let column = 0; column < ANSWER_LENGTH; column += 1) {
      addLetter(row, column, word[column]);
    }
  }

  for (const { word, column } of downWords) {
    for (let row = 0; row < ANSWER_LENGTH; row += 1) {
      addLetter(row, column, word[row]);
    }
  }

  return [...cells.values()];
}

function makeTile(boardId, cell) {
  return {
    id: `${boardId}-r${cell.row}-c${cell.column}`,
    boardId,
    letter: cell.letter,
    home: {
      boardId,
      row: cell.row,
      column: cell.column
    },
    position: {
      boardId,
      row: cell.row,
      column: cell.column
    }
  };
}

function createBoardState() {
  const positions = new Map();

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      positions.set(coordinateKey(row, column), null);
    }
  }

  return positions;
}

function placeTile(board, tile) {
  const key = coordinateKey(tile.position.row, tile.position.column);
  board.set(key, tile);
}

function createGame(puzzleA, puzzleB) {
  const boardA = createBoardState();
  const boardB = createBoardState();

  const tilesA = makeBoardCells(puzzleA).map(cell => makeTile("A", cell));
  const tilesB = makeBoardCells(puzzleB).map(cell => makeTile("B", cell));

  for (const tile of tilesA) {
    placeTile(boardA, tile);
  }

  for (const tile of tilesB) {
    placeTile(boardB, tile);
  }

  return {
    puzzleA,
    puzzleB,
    boards: {
      A: boardA,
      B: boardB
    },
    tiles: [...tilesA, ...tilesB],
    scramblePairs: 0,
    moves: 0,
    solved: false
  };
}

function shuffledCopy(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [copy[index], copy[randomIndex]] = [
      copy[randomIndex],
      copy[index]
    ];
  }

  return copy;
}

/*
  Exchange the two occupants at exactly the same coordinate.
  Each occupant can be either a tile or null.

  A tile ↔ null swap is a real move.
  A null ↔ null swap changes nothing and cannot be initiated by a
  player because null positions are never rendered as buttons.
*/
function swapCoordinate(boardId, row, column) {
  const oppositeBoardId = getOppositeBoardId(boardId);
  const key = coordinateKey(row, column);

  const currentBoard = game.boards[boardId];
  const oppositeBoard = game.boards[oppositeBoardId];

  const currentOccupant = currentBoard.get(key);
  const oppositeOccupant = oppositeBoard.get(key);

  currentBoard.set(key, oppositeOccupant);
  oppositeBoard.set(key, currentOccupant);

  if (currentOccupant) {
    currentOccupant.position = {
      boardId: oppositeBoardId,
      row,
      column
    };
  }

  if (oppositeOccupant) {
    oppositeOccupant.position = {
      boardId,
      row,
      column
    };
  }
}

function scrambleGame() {
  const eligibleCoordinates = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const key = coordinateKey(row, column);

      if (game.boards.A.get(key) || game.boards.B.get(key)) {
        eligibleCoordinates.push({ row, column });
      }
    }
  }

  const pairCount = Math.min(
    SCRAMBLE_PAIR_COUNT,
    eligibleCoordinates.length
  );

  if (pairCount === 0) {
    throw new Error("There are no tile positions available to scramble.");
  }

  const selectedCoordinates = shuffledCopy(eligibleCoordinates).slice(
    0,
    pairCount
  );

  for (const { row, column } of selectedCoordinates) {
    swapCoordinate("A", row, column);
  }

  game.scramblePairs = pairCount;
}

/*
  Read one live 7-character entry from a board map.

  A null location becomes "_". Because FlipX Nulls only occur at
  optional first/last letter positions, removing underscores gives the
  actual candidate dictionary word.
*/
function readAcrossWord(boardId, row) {
  let word = "";

  for (let column = 0; column < ANSWER_LENGTH; column += 1) {
    const tile = game.boards[boardId].get(coordinateKey(row, column));
    word += tile ? tile.letter : "_";
  }

  return word;
}

function readDownWord(boardId, column) {
  let word = "";

  for (let row = 0; row < ANSWER_LENGTH; row += 1) {
    const tile = game.boards[boardId].get(coordinateKey(row, column));
    word += tile ? tile.letter : "_";
  }

  return word;
}

function getCurrentBoardWords(boardId) {
  return [
    { label: "1A", raw: readAcrossWord(boardId, 1) },
    { label: "2A", raw: readAcrossWord(boardId, 3) },
    { label: "3A", raw: readAcrossWord(boardId, 5) },
    { label: "1D", raw: readDownWord(boardId, 1) },
    { label: "2D", raw: readDownWord(boardId, 3) },
    { label: "3D", raw: readDownWord(boardId, 5) }
  ];
}

function normaliseWord(rawWord) {
  return rawWord.replaceAll("_", "").toLowerCase();
}

function validateCurrentBoards() {
  const results = [];

  for (const boardId of ["A", "B"]) {
    const words = getCurrentBoardWords(boardId);

    for (const word of words) {
      const candidate = normaliseWord(word.raw);

      results.push({
        boardId,
        label: word.label,
        raw: word.raw,
        candidate,
        valid: candidate.length > 0 && dictionary.has(candidate)
      });
    }
  }

  return results;
}

function renderValidation() {
  const results = validateCurrentBoards();
  const validCount = results.filter(result => result.valid).length;
  const validA = results.filter(
    result => result.boardId === "A" && result.valid
  ).length;
  const validB = results.filter(
    result => result.boardId === "B" && result.valid
  ).length;

  const isSolved = validCount === 12;
  game.solved = isSolved;

  validationElement.classList.toggle("is-solved", isSolved);

  validationSummaryElement.textContent = isSolved
    ? "Solved! All 12 current words are in the dictionary."
    : `Valid words: ${validCount} / 12 — Grid A: ${validA} / 6, Grid B: ${validB} / 6`;

  const rows = results.map(result => {
    const item = document.createElement("li");
    item.className = "validation-word";

    if (result.valid) {
      item.classList.add("is-valid");
    }

    const marker = result.valid ? "✓" : "×";
    item.textContent =
      `Grid ${result.boardId} ${result.label}: ` +
      `${result.raw} → ${result.candidate} ${marker}`;

    return item;
  });

  validationDetailsElement.replaceChildren(...rows);

  return isSolved;
}

function createBoardTile(tile) {
  const tileElement = document.createElement("button");

  tileElement.className = `tile tile--${tile.boardId.toLowerCase()}`;
  tileElement.type = "button";
  tileElement.style.gridRow = String(tile.position.row + 1);
  tileElement.style.gridColumn = String(tile.position.column + 1);
  tileElement.dataset.tileId = tile.id;

  tileElement.setAttribute(
    "aria-label",
    `Move ${tile.letter} from Grid ${tile.position.boardId}, ` +
      `row ${tile.position.row + 1}, column ${tile.position.column + 1}, ` +
      `to the same position in Grid ${getOppositeBoardId(tile.position.boardId)}`
  );

  tileElement.textContent = tile.letter;
  tileElement.addEventListener("click", handleTileClick);

  return tileElement;
}

function renderBoard(boardElement, boardId) {
  const tileElements = [];

  for (const tile of game.boards[boardId].values()) {
    if (tile) {
      tileElements.push(createBoardTile(tile));
    }
  }

  boardElement.replaceChildren(...tileElements);
}

function renderGame() {
  renderBoard(boardAElement, "A");
  renderBoard(boardBElement, "B");
  moveCountElement.textContent = `Tiles moved: ${game.moves}`;
}

function handleTileClick(event) {
  if (!game || game.solved) {
    return;
  }

  const tileId = event.currentTarget.dataset.tileId;
  const tile = game.tiles.find(candidate => candidate.id === tileId);

  if (!tile) {
    return;
  }

  swapCoordinate(
    tile.position.boardId,
    tile.position.row,
    tile.position.column
  );

  game.moves += 1;
  renderGame();

  const isSolved = renderValidation();

  if (isSolved) {
    statusElement.textContent =
      `Well done — both grids now contain valid words in ${game.moves} moves.`;
  } else {
    statusElement.textContent =
      `Tiles moved: ${game.moves}. ` +
      "Click any visible tile to move it to the matching position in the other grid.";
  }
}

function displayTwoPuzzles() {
  if (puzzles.length < 2) {
    statusElement.textContent =
      "Error: At least two puzzle records are required.";
    return;
  }

  try {
    const [recordA, recordB] = selectTwoDifferentPuzzles();
    const puzzleA = splitPuzzleRecord(recordA);
    const puzzleB = splitPuzzleRecord(recordB);

    game = createGame(puzzleA, puzzleB);
    scrambleGame();

    renderDebugSlots(puzzleAElement, puzzleA);
    renderDebugSlots(puzzleBElement, puzzleB);
    renderGame();

    const isSolved = renderValidation();
    const puzzleCount = puzzles.length.toLocaleString("en-GB");
    const dictionaryCount = dictionary.size.toLocaleString("en-GB");

    statusElement.textContent = isSolved
      ? "This puzzle pair loaded already solved. Press New puzzle."
      : `Loaded two puzzles from ${puzzleCount} records and ` +
        `${dictionaryCount} unique dictionary words. ` +
        `Scrambled ${game.scramblePairs} positions.`;
  } catch (error) {
    console.error(error);
    boardAElement.replaceChildren();
    boardBElement.replaceChildren();
    validationSummaryElement.textContent = `Error: ${error.message}`;
    validationDetailsElement.replaceChildren();
    statusElement.textContent = `Error: ${error.message}`;
  }
}

function responseToText(response, fileName) {
  if (!response.ok) {
    throw new Error(`Could not load ${fileName}: HTTP ${response.status}`);
  }

  return response.text();
}

async function loadGameData() {
  try {
    const [puzzleResponse, dictionaryResponse] = await Promise.all([
      fetch(PUZZLE_FILE),
      fetch(DICTIONARY_FILE)
    ]);

    const [puzzleText, dictionaryText] = await Promise.all([
      responseToText(puzzleResponse, "puzzle file"),
      responseToText(dictionaryResponse, "dictionary file")
    ]);

    puzzles = puzzleText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length === RECORD_LENGTH);

    dictionary = new Set(
      dictionaryText
        .split(/\r?\n/)
        .map(line => line.trim().toLowerCase())
        .map(word => word.replaceAll("_", ""))
        .filter(Boolean)
    );

    if (puzzles.length < 2) {
      throw new Error(
        "At least two valid 42-character puzzle records are required."
      );
    }

    if (dictionary.size === 0) {
      throw new Error("No usable words were found in dictionary.txt.");
    }

    displayTwoPuzzles();
  } catch (error) {
    console.error(error);
    validationSummaryElement.textContent = `Error: ${error.message}`;
    validationDetailsElement.replaceChildren();
    statusElement.textContent = `Error: ${error.message}`;
  }
}

newPuzzleButton.addEventListener("click", displayTwoPuzzles);

loadGameData();
