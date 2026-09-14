"use strict";

const PUZZLE_FILE = "./data/uniquepuzzles-verified.txt";
const DICTIONARY_FILE = "./data/dictionary.txt";

const RECORD_LENGTH = 42;
const ANSWER_LENGTH = 7;
const BOARD_SIZE = 7;
const SCRAMBLE_PAIR_COUNT = 2;
const MOVE_DURATION_MS = 1000;

const statusElement = document.querySelector("#status");
const moveCountElement = document.querySelector("#move-count");
const boardAElement = document.querySelector("#board-a");
const boardBElement = document.querySelector("#board-b");
const newPuzzleButton = document.querySelector("#new-puzzle");
const animationLayer = document.querySelector("#animation-layer");
const winDialog = document.querySelector("#win-dialog");
const winMessageElement = document.querySelector("#win-message");
const playAgainButton = document.querySelector("#play-again");

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
  board.set(coordinateKey(tile.position.row, tile.position.column), tile);
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
    boards: {
      A: boardA,
      B: boardB
    },
    tiles: [...tilesA, ...tilesB],
    scramblePairs: 0,
    moves: 0,
    solved: false,
    isAnimating: false
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
    readAcrossWord(boardId, 1),
    readAcrossWord(boardId, 3),
    readAcrossWord(boardId, 5),
    readDownWord(boardId, 1),
    readDownWord(boardId, 3),
    readDownWord(boardId, 5)
  ];
}

function normaliseWord(rawWord) {
  return rawWord.replaceAll("_", "").toLowerCase();
}

function isGameSolved() {
  for (const boardId of ["A", "B"]) {
    for (const rawWord of getCurrentBoardWords(boardId)) {
      const candidate = normaliseWord(rawWord);

      if (candidate.length === 0 || !dictionary.has(candidate)) {
        return false;
      }
    }
  }

  return true;
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

function getTileElement(tileId) {
  return document.querySelector(`[data-tile-id="${tileId}"]`);
}

function makeFlyingTile(sourceElement, isFront) {
  const sourceRect = sourceElement.getBoundingClientRect();
  const flyingTile = document.createElement("div");

  flyingTile.className = "flying-tile";

  if (isFront) {
    flyingTile.classList.add("flying-tile--front");
  }

  flyingTile.classList.add(
    sourceElement.classList.contains("tile--a") ? "tile--a" : "tile--b"
  );

  flyingTile.textContent = sourceElement.textContent;
  flyingTile.style.left = `${sourceRect.left}px`;
  flyingTile.style.top = `${sourceRect.top}px`;
  flyingTile.style.width = `${sourceRect.width}px`;
  flyingTile.style.height = `${sourceRect.height}px`;

  animationLayer.append(flyingTile);

  return {
    element: flyingTile,
    rect: sourceRect
  };
}

/*
  Produces the route keyframes for one flying tile.

  The route is intentionally asymmetric:
  - Grid A click: clicked tile bows upward (foreground); returning tile
    bows downward (background).
  - Grid B click: those directions reverse.

  This gives the desired clockwise / anticlockwise visual direction.
*/
function createArcKeyframes(startRect, endRect, isClickedTile, clickedBoardId) {
  const deltaX = endRect.left - startRect.left;
  const deltaY = endRect.top - startRect.top;
  const centreOffset = Math.max(70, Math.abs(deltaX) * 0.3);

  const clickedTravelsRight = clickedBoardId === "A";
  const direction = clickedTravelsRight ? 1 : -1;

  /*
    The selected tile takes the upper/front curve. The opposite tile
    takes the lower/rear curve. When the player clicks Grid B, flip
    those arcs to preserve the apparent rotational direction.
  */
  const frontArc = isClickedTile ? -1 : 1;
  const verticalArcDirection = frontArc * direction;

  const midX = deltaX * 0.5;
  const midY = deltaY * 0.5 + verticalArcDirection * centreOffset;

  return [
    {
      transform: "translate(0, 0) scale(1)",
      offset: 0
    },
    {
      transform: `translate(${midX}px, ${midY}px) scale(1.08)`,
      offset: 0.5
    },
    {
      transform: `translate(${deltaX}px, ${deltaY}px) scale(1)`,
      offset: 1
    }
  ];
}

async function animateTileMovement(clickedTile, oppositeTile) {
  const clickedElement = getTileElement(clickedTile.id);

  if (!clickedElement) {
    throw new Error("Could not find the clicked tile on screen.");
  }

  const clickedFlying = makeFlyingTile(clickedElement, true);
  clickedElement.classList.add("is-flying-origin");

  const clickedBoardId = clickedTile.position.boardId;
  const oppositeBoardId = getOppositeBoardId(clickedBoardId);

  const targetBoardElement =
    oppositeBoardId === "A" ? boardAElement : boardBElement;

  const targetCoordinateSelector =
    `.tile[style*="grid-row: ${clickedTile.position.row + 1}"]` +
    `[style*="grid-column: ${clickedTile.position.column + 1}"]`;

  /*
    If the opposite position holds a tile, it already has a button at
    the target coordinate. Its own rect supplies the other endpoint.
    If it is Null, the invisible board grid coordinate still needs a
    screen location, calculated from the board's box and tile spacing.
  */
  let oppositeElement = null;

  for (const candidate of targetBoardElement.querySelectorAll(".tile")) {
    if (
      candidate.style.gridRow === String(clickedTile.position.row + 1) &&
      candidate.style.gridColumn === String(clickedTile.position.column + 1)
    ) {
      oppositeElement = candidate;
      break;
    }
  }

  const targetRect = oppositeElement
    ? oppositeElement.getBoundingClientRect()
    : getEmptyCoordinateRect(
      targetBoardElement,
      clickedTile.position.row,
      clickedTile.position.column,
      clickedFlying.rect
    );

  const animations = [];

  animations.push(
    clickedFlying.element.animate(
      createArcKeyframes(
        clickedFlying.rect,
        targetRect,
        true,
        clickedBoardId
      ),
      {
        duration: MOVE_DURATION_MS,
        easing: "ease-in-out",
        fill: "forwards"
      }
    ).finished
  );

  if (oppositeTile && oppositeElement) {
    const oppositeFlying = makeFlyingTile(oppositeElement, false);
    oppositeElement.classList.add("is-flying-origin");

    animations.push(
      oppositeFlying.element.animate(
        createArcKeyframes(
          oppositeFlying.rect,
          clickedFlying.rect,
          false,
          clickedBoardId
        ),
        {
          duration: MOVE_DURATION_MS,
          easing: "ease-in-out",
          fill: "forwards"
        }
      ).finished
    );
  }

  try {
    await Promise.all(animations);
  } finally {
    animationLayer.replaceChildren();
  }
}

/*
  Works out the centre position of a Null coordinate in a board.
  The board is a regular CSS grid, so we can use the board rectangle,
  its computed column gap, and one visible tile's dimensions.
*/
function getEmptyCoordinateRect(boardElement, row, column, referenceRect) {
  const boardRect = boardElement.getBoundingClientRect();
  const boardStyle = getComputedStyle(boardElement);
  const gap = Number.parseFloat(boardStyle.columnGap) || 0;

  const cellWidth = referenceRect.width;
  const cellHeight = referenceRect.height;

  return {
    left: boardRect.left + column * (cellWidth + gap),
    top: boardRect.top + row * (cellHeight + gap),
    width: cellWidth,
    height: cellHeight
  };
}

function showWinDialog() {
  winMessageElement.textContent =
    `You made two valid grids in ${game.moves} ` +
    `${game.moves === 1 ? "move" : "moves"}.`;

  if (!winDialog.open) {
    winDialog.showModal();
  }
}

async function handleTileClick(event) {
  if (!game || game.solved || game.isAnimating) {
    return;
  }

  const tileId = event.currentTarget.dataset.tileId;
  const clickedTile = game.tiles.find(tile => tile.id === tileId);

  if (!clickedTile) {
    return;
  }

  const boardId = clickedTile.position.boardId;
  const row = clickedTile.position.row;
  const column = clickedTile.position.column;
  const oppositeBoardId = getOppositeBoardId(boardId);
  const oppositeTile = game.boards[oppositeBoardId].get(
    coordinateKey(row, column)
  );

  game.isAnimating = true;
  newPuzzleButton.disabled = true;
  statusElement.textContent = "Moving tile…";

  try {
    await animateTileMovement(clickedTile, oppositeTile);

    swapCoordinate(boardId, row, column);
    game.moves += 1;
    renderGame();

    if (isGameSolved()) {
      game.solved = true;
      statusElement.textContent = "Both grids contain valid words.";
      showWinDialog();
    } else {
      statusElement.textContent =
        "Click any visible tile to move it to the matching position in the other grid.";
    }
  } catch (error) {
    console.error(error);
    statusElement.textContent = `Error: ${error.message}`;
  } finally {
    game.isAnimating = false;
    newPuzzleButton.disabled = false;
  }
}

function displayTwoPuzzles() {
  if (puzzles.length < 2 || dictionary.size === 0) {
    statusElement.textContent = "Error: Puzzle data is not ready.";
    return;
  }

  if (game?.isAnimating) {
    return;
  }

  if (winDialog.open) {
    winDialog.close();
  }

  try {
    const [recordA, recordB] = selectTwoDifferentPuzzles();
    const puzzleA = splitPuzzleRecord(recordA);
    const puzzleB = splitPuzzleRecord(recordB);

    game = createGame(puzzleA, puzzleB);
    scrambleGame();
    renderGame();

    if (isGameSolved()) {
      game.solved = true;
      statusElement.textContent = "This puzzle pair loaded already solved.";
      showWinDialog();
      return;
    }

    statusElement.textContent =
      "Click any visible tile to move it to the matching position in the other grid.";
  } catch (error) {
    console.error(error);
    boardAElement.replaceChildren();
    boardBElement.replaceChildren();
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
    statusElement.textContent = `Error: ${error.message}`;
  }
}

newPuzzleButton.addEventListener("click", displayTwoPuzzles);
playAgainButton.addEventListener("click", displayTwoPuzzles);

loadGameData();
