
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

let browser = null;
let device = null;

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try { data = JSON.parse(msg); }
    catch { return; }

    if (data.role === "browser") {
      browser = ws;
      console.log("Browser connected");
      return;
    }

    if (data.role === "device") {
      device = ws;
      console.log("Device connected");
      return;
    }

    if (ws === browser && device) {
      device.send(JSON.stringify(data));
    }

    if (ws === device && browser) {
      browser.send(JSON.stringify(data));
    }
  });
});

console.log("Signaling server running on port", PORT);