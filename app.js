"use strict";

const PUZZLE_FILE = "./data/uniquepuzzles-verified.txt";
const RECORD_LENGTH = 42;
const ANSWER_LENGTH = 7;
const BOARD_SIZE = 7;
const SCRAMBLE_PAIR_COUNT = 4;

const statusElement = document.querySelector("#status");
const moveCountElement = document.querySelector("#move-count");
const boardAElement = document.querySelector("#board-a");
const boardBElement = document.querySelector("#board-b");
const puzzleAElement = document.querySelector("#puzzle-a");
const puzzleBElement = document.querySelector("#puzzle-b");
const newPuzzleButton = document.querySelector("#new-puzzle");

let puzzles = [];
let game = null;

function coordinateKey(row, column) {
  return `${row},${column}`;
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
  Returns every physical tile coordinate in one solved puzzle.

  The source words are always seven characters wide:
  positions 2, 4 and 6 make the 5×5 crossed core;
  positions 1 and 7 are optional outer extensions.

  "_" is a Null: it creates no tile at that location.
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

/*
  Every 7×7 coordinate is represented internally on both boards.
  Its value is either a tile object or null.

  This is the crucial distinction:
  Null locations are stored for movement logic, but never rendered
  as buttons and therefore can never be clicked.
*/
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
    moves: 0
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

function getOppositeBoardId(boardId) {
  return boardId === "A" ? "B" : "A";
}

/*
  Swap the two occupants at one matching coordinate.

  Either occupant may be null:
  tile ↔ tile  = both cross over
  tile ↔ null  = clicked tile moves alone
  null ↔ null  = technically unchanged, but cannot be clicked because
                 neither side renders a tile button.
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

/*
  A scramble chooses any coordinate containing at least one physical tile.
  This means it faithfully includes tile ↔ Null exchanges, just as a
  player move does. Null ↔ Null coordinates are excluded.
*/
function scrambleGame() {
  const eligibleCoordinates = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const key = coordinateKey(row, column);
      const occupantA = game.boards.A.get(key);
      const occupantB = game.boards.B.get(key);

      if (occupantA || occupantB) {
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
  const tiles = [];

  for (const tile of game.boards[boardId].values()) {
    if (tile) {
      tiles.push(tile);
    }
  }

  const tileElements = tiles.map(createBoardTile);
  boardElement.replaceChildren(...tileElements);
}

function renderGame() {
  renderBoard(boardAElement, "A");
  renderBoard(boardBElement, "B");
  moveCountElement.textContent = `Tiles moved: ${game.moves}`;
}

function handleTileClick(event) {
  const tileId = event.currentTarget.dataset.tileId;
  const tile = game.tiles.find(candidate => candidate.id === tileId);

  if (!tile) {
    return;
  }

  /*
    A rendered button always represents a non-null tile. Therefore a
    Null↔Null move cannot occur and cannot increase the move counter.
  */
  swapCoordinate(
    tile.position.boardId,
    tile.position.row,
    tile.position.column
  );

  game.moves += 1;
  renderGame();

  statusElement.textContent =
    `Tiles moved: ${game.moves}. ` +
    `Click any visible tile to move it to the same position in the other grid.`;
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

    const totalTiles = game.tiles.length;
    const movedTiles = game.scramblePairs * 2;

    statusElement.textContent =
      `Loaded two puzzles and scrambled ${game.scramblePairs} positions ` +
      `(${movedTiles} tile movements possible across ${totalTiles} physical tiles). ` +
      `Click any visible tile to move it.`;
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
      throw new Error(
        `Could not load puzzle file: HTTP ${response.status}`
      );
    }

    const text = await response.text();

    puzzles = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length === RECORD_LENGTH);

    if (puzzles.length < 2) {
      throw new Error(
        "At least two valid 42-character puzzle records are required."
      );
    }

    displayTwoPuzzles();
  } catch (error) {
    console.error(error);
    statusElement.textContent = `Error: ${error.message}`;
  }
}

newPuzzleButton.addEventListener("click", displayTwoPuzzles);

loadPuzzles();
