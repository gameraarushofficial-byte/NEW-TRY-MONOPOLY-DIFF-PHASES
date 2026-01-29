const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let players = [];
let turnIndex = 0;

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    // ===== JOIN =====
    if (data.type === "join") {
      if (players.length >= 2) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Game full"
        }));
        return;
      }

      const playerIndex = players.length;
      players.push(ws);

      ws.send(JSON.stringify({
        type: "joined",
        playerIndex,
        turnIndex
      }));

      broadcastState();
    }

    // ===== ROLL =====
    if (data.type === "roll") {
      const playerIndex = players.indexOf(ws);
      if (playerIndex !== turnIndex) return;

      const dice = Math.floor(Math.random() * 6) + 1;
      turnIndex = (turnIndex + 1) % players.length;

      broadcast({
        type: "dice",
        dice,
        turnIndex
      });
    }
  });

  ws.on("close", () => {
    players = players.filter(p => p !== ws);
    turnIndex = 0;
    broadcastState();
  });
});

function broadcastState() {
  broadcast({
    type: "state",
    turnIndex
  });
}

function broadcast(data) {
  players.forEach(p => {
    if (p.readyState === WebSocket.OPEN) {
      p.send(JSON.stringify(data));
    }
  });
}

console.log("Server running on port", PORT);
