import http from "http";
import { WebSocketServer } from "ws";

const server = http.createServer();
const wss = new WebSocketServer({ server });

/**
 * GAME STATE (GLOBAL, SIMPLE, SAFE)
 */
let players = []; // [{ name, ws }]
let turnIndex = 0;

function broadcast(data) {
  const msg = JSON.stringify(data);
  players.forEach(p => {
    if (p.ws.readyState === 1) {
      p.ws.send(msg);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    /**
     * JOIN GAME
     */
    if (data.type === "join") {
      if (players.length >= 2) {
        ws.send(JSON.stringify({ type: "error", message: "Game full" }));
        return;
      }

      const playerIndex = players.length;
      players.push({ name: data.name, ws });

      ws.playerIndex = playerIndex;

      ws.send(JSON.stringify({
        type: "joined",
        playerIndex,
        turnIndex,
        players: players.map(p => p.name)
      }));

      broadcast({
        type: "state",
        turnIndex,
        players: players.map(p => p.name)
      });

      console.log(`Player ${data.name} joined as ${playerIndex}`);
    }

    /**
     * ROLL DICE
     */
    if (data.type === "roll") {
      if (ws.playerIndex !== turnIndex) {
        ws.send(JSON.stringify({
          type: "error",
          message: "Not your turn"
        }));
        return;
      }

      const dice = Math.floor(Math.random() * 6) + 1;

      turnIndex = (turnIndex + 1) % players.length;

      broadcast({
        type: "dice",
        dice,
        turnIndex
      });

      console.log(`Dice rolled: ${dice}`);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");

    if (typeof ws.playerIndex === "number") {
      players = players.filter(p => p.ws !== ws);

      // Reset game safely
      turnIndex = 0;

      broadcast({
        type: "state",
        turnIndex,
        players: players.map(p => p.name)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server listening on", PORT);
});
