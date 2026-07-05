const SUPABASE_REST_URL = "https://uyyeyeyiwwwwnsdlyvgn.supabase.co/rest/v1/";

const identityScreen = document.querySelector("#identityScreen");
const gameScreen = document.querySelector("#gameScreen");
const boardElement = document.querySelector("#board");
const turnText = document.querySelector("#turnText");
const playerText = document.querySelector("#playerText");
const deanScore = document.querySelector("#deanScore");
const otherScore = document.querySelector("#otherScore");
const drawScore = document.querySelector("#drawScore");
const newGameButton = document.querySelector("#newGameButton");
const switchPlayerButton = document.querySelector("#switchPlayerButton");
const choiceButtons = document.querySelectorAll(".choice-button");

const players = {
  X: "Dean",
  O: "Andere Person",
};

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let selectedPlayer = "";
let board = ["", "", "", "", "", "", "", "", ""];
let currentSymbol = "X";
let gameOver = false;
let scores = {
  Dean: 0,
  "Andere Person": 0,
  draw: 0,
};

function choosePlayer(name) {
  selectedPlayer = name;
  identityScreen.classList.add("is-hidden");
  gameScreen.classList.remove("is-hidden");
  startNewRound();
}

function startNewRound() {
  board = ["", "", "", "", "", "", "", "", ""];
  currentSymbol = Math.random() < 0.5 ? "X" : "O";
  gameOver = false;
  render();
}

function render() {
  boardElement.innerHTML = "";

  board.forEach((value, index) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.textContent = value;
    cell.setAttribute("aria-label", `Feld ${index + 1}`);
    cell.disabled = gameOver || value !== "";

    if (value === "X") {
      cell.classList.add("is-x");
    }
    if (value === "O") {
      cell.classList.add("is-o");
    }

    cell.addEventListener("click", () => playTurn(index));
    boardElement.append(cell);
  });

  updateText();
}

function playTurn(index) {
  if (gameOver || board[index] !== "") {
    return;
  }

  board[index] = currentSymbol;
  const result = getGameResult();

  if (result.winner) {
    finishGame(result.winner, result.line);
    return;
  }

  if (result.draw) {
    scores.draw += 1;
    gameOver = true;
    render();
    turnText.textContent = "Unentschieden";
    return;
  }

  currentSymbol = currentSymbol === "X" ? "O" : "X";
  render();
}

function getGameResult() {
  for (const line of winningLines) {
    const [a, b, c] = line;

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a],
        line,
      };
    }
  }

  return {
    draw: board.every((field) => field !== ""),
  };
}

function finishGame(winnerSymbol, line) {
  const winnerName = players[winnerSymbol];
  scores[winnerName] += 1;
  gameOver = true;
  render();
  turnText.textContent = `${winnerName} hat gewonnen`;
  markWinningCells(line);
}

function markWinningCells(line) {
  const cells = boardElement.querySelectorAll(".cell");

  line.forEach((index) => {
    cells[index].classList.add("is-winning");
  });
}

function updateText() {
  const currentName = players[currentSymbol];

  turnText.textContent = gameOver ? turnText.textContent : `${currentName} ist am Zug`;
  playerText.textContent = `Du spielst als ${selectedPlayer}.`;
  deanScore.textContent = scores.Dean;
  otherScore.textContent = scores["Andere Person"];
  drawScore.textContent = scores.draw;
}

function resetScores() {
  scores = {
    Dean: 0,
    "Andere Person": 0,
    draw: 0,
  };
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    choosePlayer(button.dataset.player);
  });
});

newGameButton.addEventListener("click", startNewRound);

switchPlayerButton.addEventListener("click", () => {
  resetScores();
  gameScreen.classList.add("is-hidden");
  identityScreen.classList.remove("is-hidden");
});

console.info("Supabase REST API vorbereitet:", SUPABASE_REST_URL);
