import http from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Delhi Monopoly WebSocket Server Running");
});

const wss = new WebSocketServer({ server });

let players = [];
let currentTurn = 0;

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

wss.on("connection", ws => {
  ws.playerId = null;

  ws.on("message", message => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      if (players.length >= 2) {
        ws.send(JSON.stringify({ type: "error", message: "Game full" }));
        return;
      }

      ws.playerId = players.length;
      players.push({ name: data.name });

      ws.send(JSON.stringify({
        type: "joined",
        playerId: ws.playerId
      }));

      broadcast({
        type: "state",
        players,
        currentTurn
      });
    }

    if (data.type === "roll") {
      if (ws.playerId !== currentTurn) {
        ws.send(JSON.stringify({ type: "error", message: "Not your turn" }));
        return;
      }

      const dice = Math.floor(Math.random() * 6) + 1;
      currentTurn = (currentTurn + 1) % players.length;

      broadcast({
        type: "dice",
        dice,
        currentTurn
      });
    }
  });

  ws.on("close", () => {
    players = [];
    currentTurn = 0;
    broadcast({ type: "reset" });
  });
});

server.listen(PORT, () => {
  console.log(`🟢 Server listening on ${PORT}`);
});

