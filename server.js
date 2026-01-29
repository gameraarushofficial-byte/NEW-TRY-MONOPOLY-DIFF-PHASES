import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log("Delhi Monopoly backend running on port", PORT);

/* ---- GAME STATE ---- */

const players = [];
const properties = [
  { id: 1, name: "Shalimar Bagh", price: 60, rent: 10, owner: null },
  { id: 2, name: "Rajendra Place", price: 60, rent: 10, owner: null },
  { id: 3, name: "Green Park", price: 100, rent: 20, owner: null },
  { id: 4, name: "Hauz Khas", price: 120, rent: 25, owner: null },
  { id: 5, name: "Saket", price: 140, rent: 30, owner: null }
];

let currentTurn = 0;

/* ---- HELPERS ---- */

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(msg);
  });
}

function nextTurn() {
  currentTurn = (currentTurn + 1) % players.length;
  broadcast({ type: "TURN", currentTurn });
}

/* ---- SOCKET LOGIC ---- */

wss.on("connection", ws => {
  if (players.length >= 4) {
    ws.close();
    return;
  }

  const player = {
    id: players.length,
    money: 1500,
    position: 0,
    ws
  };

  players.push(player);

  ws.send(JSON.stringify({
    type: "INIT",
    playerId: player.id,
    players,
    properties,
    currentTurn
  }));

  broadcast({ type: "PLAYERS", players });

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    /* ---- ROLL DICE ---- */
    if (data.type === "ROLL" && player.id === currentTurn) {
      const dice = Math.floor(Math.random() * 6) + 1;
      player.position = (player.position + dice) % 12;

      // GO bonus
      if (player.position === 0) player.money += 200;

      broadcast({ type: "MOVE", playerId: player.id, dice, position: player.position });

      // PROPERTY CHECK
      const prop = properties.find(p => p.id === player.position);
      if (prop && prop.owner !== null && prop.owner !== player.id) {
        player.money -= prop.rent;
        players[prop.owner].money += prop.rent;

        broadcast({
          type: "RENT",
          from: player.id,
          to: prop.owner,
          amount: prop.rent
        });
      }

      nextTurn();
    }

    /* ---- BUY PROPERTY ---- */
    if (data.type === "BUY") {
      const prop = properties.find(p => p.id === data.propertyId);
      if (!prop || prop.owner !== null) return;

      if (player.money >= prop.price) {
        player.money -= prop.price;
        prop.owner = player.id;

        broadcast({
          type: "BUY",
          playerId: player.id,
          propertyId: prop.id,
          money: player.money
        });
      }
    }
  });

  ws.on("close", () => {
    console.log("Player disconnected");
  });
});
