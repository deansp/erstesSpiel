const SUPABASE_REST_URL = "https://uyyeyeyiwwwwnsdlyvgn.supabase.co/rest/v1/";
const SUPABASE_URL = "https://uyyeyeyiwwwwnsdlyvgn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eWV5ZXlpd3d3d25zZGx5dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjYyMzUsImV4cCI6MjA5ODc0MjIzNX0.8AvFK6Lyet4By7h9uuG0uBUXTiP5QRvyQ4P_OhoCf6c";

const identityScreen = document.querySelector("#identityScreen");
const gameScreen = document.querySelector("#gameScreen");
const boardElement = document.querySelector("#board");
const turnText = document.querySelector("#turnText");
const statusText = document.querySelector("#statusText");
const messageText = document.querySelector("#messageText");
const playerText = document.querySelector("#playerText");
const gameIdText = document.querySelector("#gameIdText");
const newGameButton = document.querySelector("#newGameButton");
const copyLinkButton = document.querySelector("#copyLinkButton");
const switchPlayerButton = document.querySelector("#switchPlayerButton");
const choiceButtons = document.querySelectorAll(".choice-button");

const emptyBoard = ["", "", "", "", "", "", "", "", ""];
const players = {
  X: "Dean",
  O: "Gast",
};
const symbols = {
  Dean: "X",
  Gast: "O",
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
let gameId = new URLSearchParams(window.location.search).get("game");
let board = [...emptyBoard];
let currentSymbol = "X";
let winner = "";
let isLoading = false;
let hasError = false;
let pollingId = null;
let supabaseClient = null;
let realtimeChannel = null;
let winningLine = [];

function getSupabaseClient() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabaseClient;
}

function supabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_REST_URL}${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Supabase konnte nicht erreicht werden.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function choosePlayer(name) {
  selectedPlayer = name;
  identityScreen.classList.add("is-hidden");
  gameScreen.classList.remove("is-hidden");
  render();

  try {
    hasError = false;
    setLoading(true, "Verbinde...");

    if (!gameId && selectedPlayer === "Gast") {
      throw new Error("Gast braucht den Link von Dean.");
    }

    if (gameId) {
      await loadGame();
    } else {
      await createGame();
    }

    startRealtime();
    startPolling();
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

async function createGame() {
  const startSymbol = Math.random() < 0.5 ? "X" : "O";
  const [newGame] = await supabaseRequest("games", {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      board: emptyBoard,
      current_symbol: startSymbol,
      winner: null,
      player_dean: "Dean",
      player_other: "Gast",
    }),
  });

  gameId = newGame.id;
  applyGame(newGame);
  updateUrl();
}

async function loadGame() {
  const games = await supabaseRequest(`games?id=eq.${gameId}&select=*`);

  if (games.length === 0) {
    throw new Error("Diese Partie wurde nicht gefunden.");
  }

  applyGame(games[0]);
}

async function saveGame(nextBoard, nextSymbol, nextWinner) {
  const [savedGame] = await supabaseRequest(`games?id=eq.${gameId}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      board: nextBoard,
      current_symbol: nextSymbol,
      winner: nextWinner || null,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!savedGame) {
    throw new Error("Der Zug wurde nicht gespeichert.");
  }

  applyGame(savedGame);
}

function applyGame(game) {
  board = Array.isArray(game.board) ? game.board : [...emptyBoard];
  currentSymbol = game.current_symbol || "X";
  winner = game.winner || "";
  winningLine = getWinningLine();
  render();
}

function broadcastGame(nextBoard, nextSymbol, nextWinner) {
  if (!realtimeChannel) {
    return;
  }

  realtimeChannel.send({
    type: "broadcast",
    event: "game-state",
    payload: {
      board: nextBoard,
      current_symbol: nextSymbol,
      winner: nextWinner || "",
    },
  });
}

async function playTurn(index) {
  if (!canPlay(index)) {
    return;
  }

  const nextBoard = [...board];
  nextBoard[index] = symbols[selectedPlayer];
  const result = getGameResult(nextBoard);
  const nextWinner = result.winner ? players[result.winner] : result.draw ? "Unentschieden" : "";
  const nextSymbol = currentSymbol === "X" ? "O" : "X";

  try {
    hasError = false;
    applyGame({
      board: nextBoard,
      current_symbol: nextSymbol,
      winner: nextWinner,
    });
    broadcastGame(nextBoard, nextSymbol, nextWinner);
    setLoading(true, "Speichere Zug...");
    await saveGame(nextBoard, nextSymbol, nextWinner);
  } catch (error) {
    showError(error);
    loadGame().catch(console.error);
  } finally {
    setLoading(false);
  }
}

async function startNewRound() {
  if (!gameId) {
    return;
  }

  try {
    hasError = false;
    setLoading(true, "Starte neue Runde...");
    const startSymbol = Math.random() < 0.5 ? "X" : "O";
    applyGame({
      board: [...emptyBoard],
      current_symbol: startSymbol,
      winner: "",
    });
    broadcastGame([...emptyBoard], startSymbol, "");
    await saveGame([...emptyBoard], startSymbol, "");
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

function canPlay(index) {
  const mySymbol = symbols[selectedPlayer];
  return !isLoading && gameId && !winner && board[index] === "" && currentSymbol === mySymbol;
}

function render() {
  boardElement.innerHTML = "";

  board.forEach((value, index) => {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.textContent = value;
    cell.setAttribute("aria-label", `Feld ${index + 1}`);
    cell.disabled = !canPlay(index);

    if (value === "X") {
      cell.classList.add("is-x");
    }
    if (value === "O") {
      cell.classList.add("is-o");
    }
    if (winningLine.includes(index)) {
      cell.classList.add("is-winning");
    }

    cell.addEventListener("click", () => playTurn(index));
    boardElement.append(cell);
  });

  updateText();
}

function updateText() {
  const currentName = players[currentSymbol];
  const mySymbol = symbols[selectedPlayer];

  playerText.textContent = selectedPlayer
    ? `Du spielst als ${selectedPlayer} (${mySymbol}).`
    : "Waehle zuerst eine Person.";

  if (hasError) {
    gameIdText.textContent = gameId ? `Partie: ${gameId.slice(0, 8)}` : "Kein Spiel-Link";
    return;
  }

  if (!gameId) {
    turnText.textContent = "Partie wird erstellt";
    messageText.textContent = "Gleich bekommst du einen Link zum Teilen.";
    gameIdText.textContent = "Noch keine Partie";
    return;
  }

  gameIdText.textContent = `Partie: ${gameId.slice(0, 8)}`;

  if (winner) {
    turnText.textContent = winner === "Unentschieden" ? "Unentschieden" : `${winner} hat gewonnen`;
    messageText.textContent = "Mit Neue Runde koennt ihr direkt weiterspielen.";
    return;
  }

  turnText.textContent = `${currentName} ist am Zug`;
  messageText.textContent =
    currentSymbol === mySymbol ? "Du bist dran." : "Warte, bis die andere Person gespielt hat.";

  if (!isLoading && !hasError && statusText.textContent !== "Live verbunden") {
    statusText.textContent = "Online verbunden";
  }
}

function getGameResult(testBoard) {
  for (const line of winningLines) {
    const [a, b, c] = line;

    if (testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
      return {
        winner: testBoard[a],
        line,
      };
    }
  }

  return {
    draw: testBoard.every((field) => field !== ""),
  };
}

function getWinningLine() {
  const result = getGameResult(board);
  return result.line || [];
}

function updateUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("game", gameId);
  window.history.replaceState({}, "", url);
}

function startPolling() {
  window.clearInterval(pollingId);
  pollingId = window.setInterval(() => {
    if (!isLoading && gameId) {
      loadGame().catch(showError);
    }
  }, 500);
}

function startRealtime() {
  const client = getSupabaseClient();

  if (!client || !gameId) {
    statusText.textContent = "Online verbunden";
    window.setTimeout(() => {
      if (gameId && !realtimeChannel) {
        startRealtime();
      }
    }, 500);
    return;
  }

  if (realtimeChannel) {
    client.removeChannel(realtimeChannel);
  }

  realtimeChannel = client
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        if (payload.new) {
          hasError = false;
          applyGame(payload.new);
        }
      },
    )
    .on("broadcast", { event: "game-state" }, (message) => {
      if (message.payload) {
        hasError = false;
        applyGame(message.payload);
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED" && !hasError) {
        statusText.textContent = "Live verbunden";
      }
    });
}

function setLoading(value, text = "") {
  isLoading = value;

  if (!hasError) {
    statusText.textContent = value ? text : realtimeChannel ? "Live verbunden" : "Online verbunden";
  }

  render();
}

function showError(error) {
  hasError = true;
  statusText.textContent = "Fehler";
  turnText.textContent = "Das klappt noch nicht";
  messageText.textContent = error.message || "Supabase ist noch nicht bereit.";
  console.error(error);
}

async function copyGameLink() {
  if (!gameId) {
    return;
  }

  try {
    await navigator.clipboard.writeText(window.location.href);
    messageText.textContent = "Link kopiert. Schick ihn deinem Freund.";
  } catch {
    messageText.textContent = window.location.href;
  }
}

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    choosePlayer(button.dataset.player);
  });
});

newGameButton.addEventListener("click", startNewRound);
copyLinkButton.addEventListener("click", copyGameLink);

switchPlayerButton.addEventListener("click", () => {
  window.clearInterval(pollingId);
  const client = getSupabaseClient();

  if (realtimeChannel && client) {
    client.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  gameScreen.classList.add("is-hidden");
  identityScreen.classList.remove("is-hidden");
});

render();
