const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let players = [];
let currentTurn = 0;

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("joinGame", (name) => {
    if (!name || name.trim() === "") return;

    if (players.length >= 2) {
      socket.emit("errorMsg", "Room full");
      return;
    }

    players.push({
      id: socket.id,
      name,
      position: 0
    });

    io.emit("playersUpdate", players);
    io.emit("turnUpdate", players[currentTurn]?.id);
  });

  socket.on("rollDice", () => {
    if (players[currentTurn]?.id !== socket.id) {
      socket.emit("errorMsg", "Not your turn");
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    players[currentTurn].position += dice;

    currentTurn = (currentTurn + 1) % players.length;

    io.emit("diceResult", {
      dice,
      players,
      nextTurn: players[currentTurn].id
    });
  });

  socket.on("disconnect", () => {
    players = players.filter(p => p.id !== socket.id);
    currentTurn = 0;

    io.emit("playersUpdate", players);
    if (players.length > 0) {
      io.emit("turnUpdate", players[0].id);
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
