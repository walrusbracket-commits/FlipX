"use strict";

const PUZZLE_FILE = "./data/uniquepuzzles-verified.txt";
const RECORD_LENGTH = 42;
const ANSWER_LENGTH = 7;

const statusElement = document.querySelector("#status");
const boardAElement = document.querySelector("#board-a");
const boardBElement = document.querySelector("#board-b");
const puzzleAElement = document.querySelector("#puzzle-a");
const puzzleBElement = document.querySelector("#puzzle-b");
const newPuzzleButton = document.querySelector("#new-puzzle");

let puzzles = [];
let game = null;

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

function makeBoardCells(puzzle) {
  const cells = new Map();

  function addLetter(row, column, letter) {
    /*
      "_" means that optional end extension is absent, so it does not
      create a tile.
    */
    if (letter === "_") {
      return;
    }

    const key = `${row},${column}`;
    const existingCell = cells.get(key);

    if (existingCell && existingCell.letter !== letter) {
      throw new Error(
        `Crossing mismatch at row ${row + 1}, column ${column + 1}.`
      );
    }

    cells.set(key, { row, column, letter });
  }

  /*
    The central FlipX lattice crosses at source positions 2, 4 and 6.
    In JavaScript's zero-based coordinates, that is rows/columns 1, 3, 5.

    Across words: rows 1, 3, 5.
    Down words: columns 1, 3, 5.

    Positions 0 and 6 are optional word extensions. "_" means no tile.
  */
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

function createGame(puzzleA, puzzleB) {
  const tiles = [
    ...makeBoardCells(puzzleA).map(cell => makeTile("A", cell)),
    ...makeBoardCells(puzzleB).map(cell => makeTile("B", cell))
  ];

  return {
    puzzleA,
    puzzleB,
    tiles
  };
}

function createBoardTile(tile) {
  const tileElement = document.createElement("button");

  tileElement.className = `tile tile--${tile.boardId.toLowerCase()}`;
  tileElement.type = "button";
  tileElement.style.gridRow = String(tile.position.row + 1);
  tileElement.style.gridColumn = String(tile.position.column + 1);
  tileElement.dataset.tileId = tile.id;
  tileElement.dataset.homeBoard = tile.home.boardId;
  tileElement.dataset.homeRow = String(tile.home.row);
  tileElement.dataset.homeColumn = String(tile.home.column);

  tileElement.setAttribute(
    "aria-label",
    `Grid ${tile.position.boardId}, letter ${tile.letter}, ` +
      `originally from Grid ${tile.home.boardId}, ` +
      `row ${tile.home.row + 1}, column ${tile.home.column + 1}`
  );

  tileElement.textContent = tile.letter;

  return tileElement;
}

function renderBoard(boardElement, boardId) {
  const boardTiles = game.tiles.filter(tile => tile.position.boardId === boardId);
  const tileElements = boardTiles.map(createBoardTile);

  boardElement.replaceChildren(...tileElements);
}

function renderGame() {
  renderBoard(boardAElement, "A");
  renderBoard(boardBElement, "B");
}

function displayTwoPuzzles() {
  if (puzzles.length < 2) {
    statusElement.textContent = "Error: At least two puzzle records are required.";
    return;
  }

  try {
    const [recordA, recordB] = selectTwoDifferentPuzzles();
    const puzzleA = splitPuzzleRecord(recordA);
    const puzzleB = splitPuzzleRecord(recordB);

    game = createGame(puzzleA, puzzleB);

    renderGame();

    renderDebugSlots(puzzleAElement, puzzleA);
    renderDebugSlots(puzzleBElement, puzzleB);

    const tileCount = game.tiles.length;

    statusElement.textContent =
      `Loaded two different records from ${puzzles.length.toLocaleString("en-GB")} verified puzzles ` +
      `(${tileCount} physical tiles).`;
  } catch (error) {
    console.error(error);
    boardAElement.replaceChildren();
    boardBElement.replaceChildren();
    statusElement.textContent = `Error: ${error.message}`;
  }
}

async function loadPuzzles() {
  try {
    const response = await fetch(PUZZLE_FILE);

    if (!response.ok) {
      throw new Error(`Could not load puzzle file: HTTP ${response.status}`);
    }

    const text = await response.text();

    puzzles = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length === RECORD_LENGTH);

    if (puzzles.length < 2) {
      throw new Error("At least two valid 42-character puzzle records are required.");
    }

    displayTwoPuzzles();
  } catch (error) {
    console.error(error);
    statusElement.textContent = `Error: ${error.message}`;
  }
}

newPuzzleButton.addEventListener("click", displayTwoPuzzles);

loadPuzzles();