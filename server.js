const http = require("http");
const WebSocket = require("ws");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const gameState = {
  players: {},
  turnOrder: [],
  currentTurnIndex: 0,
};

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(msg);
  });
}

function currentPlayerId() {
  return gameState.turnOrder[gameState.currentTurnIndex];
}

wss.on("connection", (ws) => {
  ws.playerId = null;

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);

    if (msg.type === "JOIN") {
      if (gameState.turnOrder.length >= 2) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Game full" }));
        return;
      }

      const playerId = "p" + Date.now();
      ws.playerId = playerId;

      gameState.players[playerId] = {
        name: msg.name,
        position: 0,
      };

      gameState.turnOrder.push(playerId);

      broadcast({ type: "STATE", state: gameState });
    }

    if (msg.type === "ROLL") {
      if (ws.playerId !== currentPlayerId()) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Not your turn" }));
        return;
      }

      const dice = Math.floor(Math.random() * 6) + 1;
      gameState.players[ws.playerId].position += dice;

      gameState.currentTurnIndex =
        (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;

      broadcast({ type: "ROLL_RESULT", dice, state: gameState });
    }
  });

  ws.on("close", () => {
    if (!ws.playerId) return;

    delete gameState.players[ws.playerId];
    gameState.turnOrder = gameState.turnOrder.filter(p => p !== ws.playerId);

    if (gameState.currentTurnIndex >= gameState.turnOrder.length) {
      gameState.currentTurnIndex = 0;
    }

    broadcast({ type: "STATE", state: gameState });
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log("🟢 Server listening on", PORT);
});
