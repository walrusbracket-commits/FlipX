"use strict";

const PUZZLE_FILE = "./data/uniquepuzzles-verified.txt";
const RECORD_LENGTH = 42;
const ANSWER_LENGTH = 7;

const statusElement = document.querySelector("#status");
const puzzleElement = document.querySelector("#puzzle");
const newPuzzleButton = document.querySelector("#new-puzzle");

let puzzles = [];

function selectRandomPuzzle() {
  const randomIndex = Math.floor(Math.random() * puzzles.length);
  return puzzles[randomIndex];
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

function displayRandomPuzzle() {
  if (puzzles.length === 0) {
    return;
  }

  const record = selectRandomPuzzle();
  const puzzle = splitPuzzleRecord(record);

  puzzleElement.replaceChildren(
    createPuzzleEntry("1A:", puzzle.across1),
    createPuzzleEntry("2A:", puzzle.across2),
    createPuzzleEntry("3A:", puzzle.across3),
    createPuzzleEntry("1D:", puzzle.down1),
    createPuzzleEntry("2D:", puzzle.down2),
    createPuzzleEntry("3D:", puzzle.down3)
  );

  statusElement.textContent = `Loaded 1 of ${puzzles.length.toLocaleString("en-GB")} verified puzzle records.`;
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

    if (puzzles.length === 0) {
      throw new Error("No valid 42-character puzzle records were found.");
    }

    displayRandomPuzzle();
  } catch (error) {
    console.error(error);
    statusElement.textContent = `Error: ${error.message}`;
  }
}

newPuzzleButton.addEventListener("click", displayRandomPuzzle);

loadPuzzles();