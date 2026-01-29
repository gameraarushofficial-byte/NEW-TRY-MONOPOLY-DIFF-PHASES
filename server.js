const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

let players = [];
let currentTurn = 0;

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    // 🔹 JOIN GAME
    if (data.type === "JOIN") {
      const playerId = players.length;

      const player = {
        id: playerId,
        name: data.name,
        password: data.password,
        money: 15000,
        position: 0,
        ws
      };

      players.push(player);

      // Send INIT to this player
      ws.send(JSON.stringify({
        type: "INIT",
        playerId,
        currentTurn,
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          money: p.money,
          position: p.position
        }))
      }));

      // Notify everyone
      broadcast({
        type: "PLAYERS_UPDATE",
        players: players.map(p => ({
          id: p.id,
          name: p.name,
          money: p.money,
          position: p.position
        }))
      });

      return;
    }

    // 🔹 ROLL DICE
    if (data.type === "ROLL") {
      if (data.playerId !== currentTurn) return;

      const dice = Math.floor(Math.random() * 6) + 1;
      const player = players[currentTurn];

      player.position = (player.position + dice) % 12;

      currentTurn = (currentTurn + 1) % players.length;

      broadcast({
        type: "ROLL_RESULT",
        dice,
        playerId: player.id,
        position: player.position,
        currentTurn
      });
    }
  });

  ws.on("close", () => {
    players = players.filter(p => p.ws !== ws);
    currentTurn = 0;
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  players.forEach(p => {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  });
}

console.log("✅ Monopoly WebSocket running on", PORT);
