const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let players = [];
let turnIndex = 0;

// BASIC ROUTE (Railway health check)
app.get("/", (req, res) => {
  res.send("Monopoly backend running");
});

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join", (name) => {
    if (players.length >= 2) return;

    players.push({
      id: socket.id,
      name
    });

    socket.emit("joined", `Joined as ${name}`);

    if (players.length === 2) {
      turnIndex = 0;
      io.emit("turn", players[turnIndex].id);
    }
  });

  socket.on("roll", () => {
    if (players[turnIndex].id !== socket.id) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    io.emit("diceResult", {
      player: players[turnIndex].name,
      roll
    });

    turnIndex = (turnIndex + 1) % players.length;
    io.emit("turn", players[turnIndex].id);
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    turnIndex = 0;
    io.emit("turn", players[0]?.id || null);
    console.log("Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
