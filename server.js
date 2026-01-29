import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

/* ================= GAME STATE ================= */

const players = []; // { playerId, socket }
let currentTurnIndex = 0;

/* ================= HELPERS ================= */

function broadcast(data) {
  const msg = JSON.stringify(data);
  players.forEach(p => {
    if (p.socket.readyState === 1) {
      p.socket.send(msg);
    }
  });
}

function getPlayerIndex(playerId) {
  return players.findIndex(p => p.playerId === playerId);
}

/* ================= WEBSOCKET ================= */

wss.on("connection", (socket) => {
  let playerId = null;

  socket.on("message", (raw) => {
    const msg = JSON.parse(raw);

    /* ---- JOIN / RECONNECT ---- */
    if (msg.type === "JOIN") {
      playerId = msg.playerId || uuidv4();

      let index = getPlayerIndex(playerId);

      if (index === -1) {
        players.push({ playerId, socket });
        index = players.length - 1;
      } else {
        players[index].socket = socket; // reconnect
      }

      socket.send(JSON.stringify({
        type: "JOINED",
        playerId,
        playerIndex: index,
        currentTurnIndex
      }));

      broadcast({
        type: "TURN_UPDATE",
        currentTurnIndex
      });
    }

    /* ---- ROLL DICE ---- */
    if (msg.type === "ROLL_DICE") {
      const index = getPlayerIndex(playerId);

      if (index !== currentTurnIndex) {
        socket.send(JSON.stringify({
          type: "ERROR",
          message: "Not your turn"
        }));
        return;
      }

      const dice = Math.floor(Math.random() * 6) + 1;

      broadcast({
        type: "DICE_ROLLED",
        playerIndex: index,
        dice
      });

      currentTurnIndex = (currentTurnIndex + 1) % players.length;

      broadcast({
        type: "TURN_UPDATE",
        currentTurnIndex
      });
    }
  });

  socket.on("close", () => {
    // Do NOTHING on disconnect
    // Player can reconnect safely
  });
});

console.log("✅ WebSocket server running on", PORT);
