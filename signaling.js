const WebSocket = require("ws");

// Local or cloud version: port 8080 for local testing
const wss = new WebSocket.Server({ port: 8080 });

// Rooms: deviceId(MAC) -> { deviceWS, browserWS }
const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (_) {
      return; // ignore non-JSON (e.g. DataChannel binary)
    }

    //
    // 1. DEVICE REGISTRATION
    //
    if (data.role === "device") {
      const deviceId = data.deviceId;
      rooms[deviceId] = rooms[deviceId] || {};
      rooms[deviceId].deviceWS = ws;
      ws.deviceId = deviceId;

      console.log("Device connected:", deviceId);
      return;
    }

    //
    // 2. BROWSER REQUESTS DEVICE LIST
    //
    if (data.role === "browser" && data.action === "listRooms") {
      const availableDevices = Object.keys(rooms);
      ws.send(JSON.stringify({ rooms: availableDevices }));
      return;
    }

    //
    // 3. BROWSER SELECTS A ROOM/DEVICE
    //
    if (data.role === "browser" && data.action === "joinRoom") {
      const id = data.deviceId;
      rooms[id] = rooms[id] || {};
      rooms[id].browserWS = ws;
      ws.deviceId = id;

      console.log("Browser joined room:", id);
      return;
    }

    //
    // 4. RELAY SIGNALING MESSAGES (SDP + ICE)
    //
    const room = rooms[ws.deviceId];
    if (!room) return;

    // Browser → Device
    if (ws === room.browserWS && room.deviceWS) {
      room.deviceWS.send(JSON.stringify(data));
    }

    // Device → Browser
    if (ws === room.deviceWS && room.browserWS) {
      room.browserWS.send(JSON.stringify(data));
    }
  });
});

console.log("Signaling server running on ws://192.168.1.130:8080");