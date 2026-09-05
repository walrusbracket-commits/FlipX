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
      "_" represents no optional extension tile. It is not a blank
      square that should appear on the physical board.
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
    FlipX source strings always have seven characters.

    Their second, fourth and sixth characters form the crossings.
    In zero-based source / board coordinates, that is 1, 3 and 5.

    Across entries occupy board rows 1, 3 and 5.
    Down entries occupy board columns 1, 3 and 5.

    Source positions 0 and 6 may be letters and then become optional
    extensions outside the 5×5 core. "_" creates no tile.
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

function createBoardTile(cell) {
  const tile = document.createElement("div");

  tile.className = "tile";
  tile.style.gridRow = String(cell.row + 1);
  tile.style.gridColumn = String(cell.column + 1);
  tile.setAttribute("role", "gridcell");
  tile.setAttribute(
    "aria-label",
    `Letter ${cell.letter}, row ${cell.row + 1}, column ${cell.column + 1}`
  );
  tile.textContent = cell.letter;

  return tile;
}

function renderBoard(boardElement, puzzle) {
  const cells = makeBoardCells(puzzle);
  const tiles = cells.map(createBoardTile);

  boardElement.replaceChildren(...tiles);
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

    renderBoard(boardAElement, puzzleA);
    renderBoard(boardBElement, puzzleB);

    renderDebugSlots(puzzleAElement, puzzleA);
    renderDebugSlots(puzzleBElement, puzzleB);

    statusElement.textContent =
      `Loaded two different records from ${puzzles.length.toLocaleString("en-GB")} verified puzzles.`;
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