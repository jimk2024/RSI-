const WebSocket = require('ws');
const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');

ws.on('open', () => {
  console.log('connected');
  ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "leaderboard" } }));
});

ws.on('message', (data) => {
  console.log(data.toString());
});

setTimeout(() => process.exit(0), 3000);
