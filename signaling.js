import { WebSocketServer } from "ws";

// Use cloud port OR local port
const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// Rooms: deviceId(MAC) -> { deviceWS, browserWS }
const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (_) {
      return; // ignore non-JSON
    }

    // 1. DEVICE REGISTRATION
    if (data.role === "device") {
      const deviceId = data.deviceId;
      rooms[deviceId] = rooms[deviceId] || {};
      rooms[deviceId].deviceWS = ws;
      ws.deviceId = deviceId;

      console.log("Device connected:", deviceId);
      return;
    }

    // 2. BROWSER REQUESTS DEVICE LIST (FILTER OUT OFFLINE DEVICES)
    if (data.role === "browser" && data.action === "listRooms") {
      const activeDevices = Object.keys(rooms).filter((id) => {
        const entry = rooms[id];
        return entry.deviceWS && entry.deviceWS.readyState === ws.OPEN;
      });

      ws.send(JSON.stringify({ rooms: activeDevices }));
      return;
    }

    // 3. BROWSER JOINS ROOM
    if (data.role === "browser" && data.action === "joinRoom") {
      const id = data.deviceId;
      rooms[id] = rooms[id] || {};
      rooms[id].browserWS = ws;
      ws.deviceId = id;
      console.log("Browser joined room:", id);
      return;
    }

    // 4. RELAY SDP + ICE ONLY INSIDE THE ROOM
    const room = rooms[ws.deviceId];
    if (!room) return;

    if (ws === room.browserWS && room.deviceWS) {
      room.deviceWS.send(JSON.stringify(data));
    }

    if (ws === room.deviceWS && room.browserWS) {
      room.browserWS.send(JSON.stringify(data));
    }
  });

  // 5. CLEAN UP ROOM WHEN DEVICE DISCONNECTS
  ws.on("close", () => {
    const id = ws.deviceId;
    if (!id) return;

    const room = rooms[id];
    if (!room) return;

    console.log("Connection closed:", id);

    // Device closed connection → remove whole room
    if (room.deviceWS === ws) {
      console.log("Device disconnected. Removing room:", id);
      delete rooms[id];
    }

    // Browser closed connection → just remove browser
    if (room.browserWS === ws) {
      console.log("Browser left room:", id);
      room.browserWS = null;
    }
  });
});

console.log("Signaling server running on port", PORT);
