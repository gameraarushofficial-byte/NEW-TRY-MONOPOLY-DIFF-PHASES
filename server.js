import WebSocket, { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server });

let players = [];
let currentTurn = 0;

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    const msg = JSON.parse(data);

    // JOIN GAME
    if (msg.type === "joinGame") {
      const player = {
        id: players.length,
        name: msg.name,
        position: 0,
        money: 1500
      };

      players.push(player);
      ws.playerId = player.id;

      ws.send(JSON.stringify({
        type: "joined",
        player,
        yourTurn: player.id === currentTurn
      }));

      broadcast({
        type: "players",
        players,
        currentTurn
      });
    }

    // ROLL DICE
    if (msg.type === "rollDice") {
      if (ws.playerId !== currentTurn) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Not your turn"
        }));
        return;
      }

      const dice = Math.floor(Math.random() * 6) + 1;
      players[currentTurn].position =
        (players[currentTurn].position + dice) % 12;

      currentTurn = (currentTurn + 1) % players.length;

      broadcast({
        type: "diceResult",
        dice,
        players,
        currentTurn
      });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  });
}

server.listen(process.env.PORT || 8080, () => {
  console.log("Server running");
});
